from contextlib import asynccontextmanager
import logging
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import PlainTextResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from .config import get_settings
from .database import engine, get_db
from .ingestion import ingest_url
from .models import (
    Base,
    Candidate,
    Conversation,
    GeneratedReply,
    PolicyDecision,
    Product,
    ProductBrainVersion,
    ProductSource,
    ProductSubreddit,
    PublishedReply,
    RedditAccount,
    RiskEvent,
    Subreddit,
    TrackingEvent,
    TrackingLink,
)
from .providers import provider_for
from .schemas import (
    AnalyticsOverviewOut,
    BrainOut,
    ConversationOut,
    DecisionOut,
    FollowupIn,
    OpportunityOut,
    ProductCreate,
    ProductOut,
    ProductSubredditPatch,
    ProductUpdate,
    ProductBrainData,
    RedditAccountCreate,
    RedditAccountOut,
    ReplyOut,
    SourceOut,
    SubredditOut,
    TrackingEventIn,
)
from .services import (
    add_followup,
    build_brain,
    discover_subreddits,
    generate_reply,
    publish_or_shadow,
    record_event,
    run_policy,
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # A fresh local Docker volume must be usable after `make dev` without a
    # separate, easy-to-miss migration command. Production still uses Alembic.
    if get_settings().app_env == "development":
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(title="Reddit Growth Agent API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    settings = get_settings()
    return {
        "status": "ok",
        "mode": "guarded",
        "autopublish": settings.autopublish_enabled,
        "kill_switch": settings.global_kill_switch,
        "reddit_app_status": settings.reddit_app_approval_status,
    }


@app.post("/v1/products", response_model=ProductOut, status_code=201)
async def create_product(body: ProductCreate, db: AsyncSession = Depends(get_db)):
    settings = get_settings()
    product = Product(
        name=body.name,
        website_url=str(body.website_url) if body.website_url else None,
        github_url=str(body.github_url) if body.github_url else None,
        daily_reply_limit=min(body.daily_reply_limit, settings.max_daily_reply_limit),
        disclosure_template=f"I'm building {body.name}",
    )
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return product


@app.get("/v1/products", response_model=list[ProductOut])
async def products(db: AsyncSession = Depends(get_db)):
    return list((await db.scalars(select(Product).order_by(Product.created_at.desc()))).all())


async def get_product(product_id: str, db: AsyncSession):
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(404, "Product not found")
    return product


@app.get("/v1/products/{product_id}", response_model=ProductOut)
async def product(product_id: str, db: AsyncSession = Depends(get_db)):
    return await get_product(product_id, db)


@app.patch("/v1/products/{product_id}", response_model=ProductOut)
async def patch_product(product_id: str, body: ProductUpdate, db: AsyncSession = Depends(get_db)):
    product = await get_product(product_id, db)
    changes = body.model_dump(exclude_unset=True)
    website_url = changes.get("website_url", product.website_url)
    github_url = changes.get("github_url", product.github_url)
    if not website_url and not github_url:
        raise HTTPException(422, "请至少保留产品网站或 GitHub 仓库地址")
    for key, value in changes.items():
        setattr(product, key, str(value) if key.endswith("_url") and value is not None else value)
    await db.commit()
    await db.refresh(product)
    return product


@app.post("/v1/products/{product_id}/ingest", response_model=list[SourceOut])
async def ingest(product_id: str, db: AsyncSession = Depends(get_db)):
    product = await get_product(product_id, db)
    items = []
    if product.website_url:
        items += await ingest_url(product.website_url)
    if product.github_url:
        items += await ingest_url(product.github_url, github=True)
    if not items:
        raise HTTPException(422, "No readable public sources found")
    saved = []
    for item in items:
        existing = await db.scalar(
            select(ProductSource).where(
                ProductSource.product_id == product.id,
                ProductSource.url == item["url"],
                ProductSource.content_hash == item["content_hash"],
            )
        )
        if existing:
            saved.append(existing)
            continue
        source = ProductSource(
            product_id=product.id,
            source_type=item["type"],
            url=item["url"],
            title=item["title"],
            content=item["content"],
            content_hash=item["content_hash"],
        )
        db.add(source)
        saved.append(source)
    product.status = "INGESTED"
    await db.commit()
    for source in saved:
        await db.refresh(source)
    return saved


@app.post("/v1/products/{product_id}/build-brain", response_model=BrainOut)
async def brain_build(product_id: str, db: AsyncSession = Depends(get_db)):
    product = await get_product(product_id, db)
    try:
        version = await build_brain(db, product, provider_for(get_settings()))
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    except Exception as exc:
        logger.exception("Product Brain provider failed for product %s", product_id)
        await db.rollback()
        product = await db.get(Product, product_id)
        if product:
            product.status = "ANALYSIS_FAILED"
            await db.commit()
        raise HTTPException(503, "模型服务暂时不可用，请稍后重试") from exc
    return BrainOut(id=version.id, version=version.version, brain=version.brain_json)


@app.get("/v1/products/{product_id}/brain", response_model=BrainOut)
async def brain_get(product_id: str, db: AsyncSession = Depends(get_db)):
    await get_product(product_id, db)
    version = await db.scalar(
        select(ProductBrainVersion)
        .where(ProductBrainVersion.product_id == product_id, ProductBrainVersion.is_current)
        .order_by(ProductBrainVersion.version.desc())
    )
    if not version:
        raise HTTPException(404, "Product Brain not built")
    return BrainOut(id=version.id, version=version.version, brain=version.brain_json)


@app.patch("/v1/products/{product_id}/brain", response_model=BrainOut)
async def brain_patch(product_id: str, body: ProductBrainData, db: AsyncSession = Depends(get_db)):
    await get_product(product_id, db)
    version = await db.scalar(
        select(ProductBrainVersion)
        .where(ProductBrainVersion.product_id == product_id, ProductBrainVersion.is_current)
        .order_by(ProductBrainVersion.version.desc())
    )
    if not version:
        raise HTTPException(404, "Product Brain not built")
    version.brain_json = body.model_dump()
    await db.commit()
    await db.refresh(version)
    return BrainOut(id=version.id, version=version.version, brain=version.brain_json)


@app.get("/v1/products/{product_id}/opportunities", response_model=list[OpportunityOut])
async def opportunities(product_id: str, db: AsyncSession = Depends(get_db)):
    await get_product(product_id, db)
    rows = (
        await db.scalars(
            select(Candidate)
            .options(selectinload(Candidate.content))
            .where(Candidate.product_id == product_id)
            .order_by(Candidate.opportunity_score.desc())
        )
    ).all()
    out = []
    for x in rows:
        decision = await db.scalar(
            select(PolicyDecision)
            .where(PolicyDecision.candidate_id == x.id)
            .order_by(PolicyDecision.created_at.desc())
        )
        reply = await db.scalar(
            select(GeneratedReply)
            .where(GeneratedReply.candidate_id == x.id)
            .order_by(GeneratedReply.created_at.desc())
        )
        pub = await db.scalar(
            select(PublishedReply)
            .where(PublishedReply.candidate_id == x.id)
            .order_by(PublishedReply.last_checked_at.desc())
        )
        out.append(
            OpportunityOut(
                id=x.id,
                status=x.status,
                subreddit=x.content.subreddit,
                title=x.content.title,
                body=x.content.body,
                permalink=x.content.permalink,
                intent_label=x.intent_label,
                intent_confidence=x.intent_confidence,
                opportunity_score=x.opportunity_score,
                risk_score=x.risk_score,
                recall_sources=x.recall_sources,
                policy_decision=decision.decision if decision else None,
                generated_reply=reply.body if reply else None,
                publish_status=pub.status if pub else None,
            )
        )
    return out


@app.get("/v1/opportunities/{candidate_id}", response_model=OpportunityOut)
async def opportunity(candidate_id: str, db: AsyncSession = Depends(get_db)):
    c = await db.get(Candidate, candidate_id)
    if not c:
        raise HTTPException(404, "Opportunity not found")
    await db.refresh(c, ["content"])
    decision = await db.scalar(
        select(PolicyDecision)
        .where(PolicyDecision.candidate_id == c.id)
        .order_by(PolicyDecision.created_at.desc())
    )
    reply = await db.scalar(
        select(GeneratedReply)
        .where(GeneratedReply.candidate_id == c.id)
        .order_by(GeneratedReply.created_at.desc())
    )
    pub = await db.scalar(
        select(PublishedReply)
        .where(PublishedReply.candidate_id == c.id)
        .order_by(PublishedReply.last_checked_at.desc())
    )
    return OpportunityOut(
        id=c.id,
        status=c.status,
        subreddit=c.content.subreddit,
        title=c.content.title,
        body=c.content.body,
        permalink=c.content.permalink,
        intent_label=c.intent_label,
        intent_confidence=c.intent_confidence,
        opportunity_score=c.opportunity_score,
        risk_score=c.risk_score,
        recall_sources=c.recall_sources,
        policy_decision=decision.decision if decision else None,
        generated_reply=reply.body if reply else None,
        publish_status=pub.status if pub else None,
    )


@app.get("/v1/opportunities/{candidate_id}/decision", response_model=DecisionOut)
async def opportunity_decision(candidate_id: str, db: AsyncSession = Depends(get_db)):
    candidate = await db.get(Candidate, candidate_id)
    if not candidate:
        raise HTTPException(404, "Opportunity not found")
    decision = await db.scalar(
        select(PolicyDecision)
        .where(PolicyDecision.candidate_id == candidate_id)
        .order_by(PolicyDecision.created_at.desc())
    )
    if not decision:
        decision = await run_policy(db, candidate, get_settings())
    return DecisionOut(
        id=decision.id,
        decision=decision.decision,
        reply_mode=decision.reply_mode,
        link_policy=decision.link_policy,
        required_disclosure=decision.required_disclosure,
        reason_codes=decision.reason_codes,
    )


@app.get("/v1/opportunities/{candidate_id}/generated-reply", response_model=ReplyOut)
async def opportunity_reply(candidate_id: str, db: AsyncSession = Depends(get_db)):
    candidate = await db.get(Candidate, candidate_id)
    if not candidate:
        raise HTTPException(404, "Opportunity not found")
    decision = await db.scalar(
        select(PolicyDecision)
        .where(PolicyDecision.candidate_id == candidate_id)
        .order_by(PolicyDecision.created_at.desc())
    ) or await run_policy(db, candidate, get_settings())
    reply = await db.scalar(
        select(GeneratedReply)
        .where(GeneratedReply.candidate_id == candidate_id)
        .order_by(GeneratedReply.created_at.desc())
    )
    if not reply:
        reply = await generate_reply(db, candidate, decision)
    return ReplyOut(id=reply.id, body=reply.body, status=reply.status, quality=reply.quality_json)


@app.post("/v1/opportunities/{candidate_id}/publish")
async def opportunity_publish(
    candidate_id: str, force_shadow: bool = False, db: AsyncSession = Depends(get_db)
):
    candidate = await db.get(Candidate, candidate_id)
    if not candidate:
        raise HTTPException(404, "Opportunity not found")
    pub = await publish_or_shadow(db, candidate, get_settings(), force_shadow=force_shadow)
    return {"id": pub.id, "status": pub.status, "idempotency_key": pub.idempotency_key}


@app.post("/v1/products/{product_id}/start")
async def start(product_id: str, db: AsyncSession = Depends(get_db)):
    product = await get_product(product_id, db)
    product.status = "SHADOW_RUNNING"
    await db.commit()
    return {"status": product.status, "autopublish": False, "reason": "MVP runs in shadow mode"}


@app.post("/v1/products/{product_id}/pause")
async def pause(product_id: str, db: AsyncSession = Depends(get_db)):
    product = await get_product(product_id, db)
    product.status = "PAUSED"
    await db.commit()
    return {"status": "PAUSED"}


@app.get("/v1/reddit/oauth/start")
async def reddit_oauth_start():
    settings = get_settings()
    if not settings.reddit_client_id:
        return {
            "status": "configuration_required",
            "message": "Set REDDIT_CLIENT_ID before connecting a real Reddit account.",
        }
    return {
        "authorization_url": f"https://www.reddit.com/api/v1/authorize?client_id={settings.reddit_client_id}&response_type=code&state=local&redirect_uri={settings.reddit_redirect_uri}&duration=permanent&scope=identity,read,submit"
    }


@app.get("/v1/reddit/oauth/callback")
async def reddit_oauth_callback(code: str | None = None, state: str | None = None):
    return {
        "status": "received",
        "code_present": bool(code),
        "state": state,
        "message": "Token exchange is intentionally not performed until credentials are configured.",
    }


@app.post("/v1/reddit/accounts", response_model=RedditAccountOut, status_code=201)
async def reddit_account_create(body: RedditAccountCreate, db: AsyncSession = Depends(get_db)):
    account = RedditAccount(
        username=body.username, status=body.status, app_approval_status=body.app_approval_status
    )
    db.add(account)
    await db.commit()
    await db.refresh(account)
    return account


@app.get("/v1/reddit/accounts", response_model=list[RedditAccountOut])
async def reddit_accounts(db: AsyncSession = Depends(get_db)):
    return list(
        (await db.scalars(select(RedditAccount).order_by(RedditAccount.created_at.desc()))).all()
    )


@app.delete("/v1/reddit/accounts/{account_id}")
async def reddit_account_delete(account_id: str, db: AsyncSession = Depends(get_db)):
    account = await db.get(RedditAccount, account_id)
    if not account:
        raise HTTPException(404, "Account not found")
    await db.delete(account)
    await db.commit()
    return {"status": "deleted"}


@app.post("/v1/products/{product_id}/discover-subreddits", response_model=list[SubredditOut])
async def product_discover_subreddits(product_id: str, db: AsyncSession = Depends(get_db)):
    product = await get_product(product_id, db)
    rows = await discover_subreddits(db, product)
    return [
        SubredditOut(
            id=x.subreddit.id,
            name=x.subreddit.name,
            status=x.status,
            community_score=x.community_score,
            promotion_tolerance=x.promotion_tolerance,
            risk_score=x.risk_score,
            rules=x.subreddit.rules_json,
        )
        for x in rows
    ]


@app.get("/v1/products/{product_id}/subreddits", response_model=list[SubredditOut])
async def product_subreddits(product_id: str, db: AsyncSession = Depends(get_db)):
    await get_product(product_id, db)
    rows = (
        await db.scalars(
            select(ProductSubreddit)
            .options(selectinload(ProductSubreddit.subreddit))
            .where(ProductSubreddit.product_id == product_id)
            .order_by(ProductSubreddit.community_score.desc())
        )
    ).all()
    return [
        SubredditOut(
            id=x.subreddit.id,
            name=x.subreddit.name,
            status=x.status,
            community_score=x.community_score,
            promotion_tolerance=x.promotion_tolerance,
            risk_score=x.risk_score,
            rules=x.subreddit.rules_json,
        )
        for x in rows
    ]


@app.patch("/v1/products/{product_id}/subreddits/{subreddit_id}", response_model=SubredditOut)
async def patch_product_subreddit(
    product_id: str,
    subreddit_id: str,
    body: ProductSubredditPatch,
    db: AsyncSession = Depends(get_db),
):
    row = await db.scalar(
        select(ProductSubreddit).where(
            ProductSubreddit.product_id == product_id, ProductSubreddit.subreddit_id == subreddit_id
        )
    )
    if not row:
        raise HTTPException(404, "Product subreddit not found")
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(row, key, value)
    await db.commit()
    await db.refresh(row, ["subreddit"])
    return SubredditOut(
        id=row.subreddit.id,
        name=row.subreddit.name,
        status=row.status,
        community_score=row.community_score,
        promotion_tolerance=row.promotion_tolerance,
        risk_score=row.risk_score,
        rules=row.subreddit.rules_json,
    )


@app.post(
    "/v1/products/{product_id}/subreddits/{subreddit_id}/refresh-rules", response_model=SubredditOut
)
async def refresh_rules(product_id: str, subreddit_id: str, db: AsyncSession = Depends(get_db)):
    row = await db.scalar(
        select(ProductSubreddit).where(
            ProductSubreddit.product_id == product_id, ProductSubreddit.subreddit_id == subreddit_id
        )
    )
    if not row:
        raise HTTPException(404, "Product subreddit not found")
    sub = await db.get(Subreddit, subreddit_id)
    sub.rules_json = {
        "promotion": "Unknown; verify subreddit sidebar before autopublish.",
        "refreshed_by": "local_stub",
    }
    await db.commit()
    await db.refresh(row, ["subreddit"])
    return SubredditOut(
        id=row.subreddit.id,
        name=row.subreddit.name,
        status=row.status,
        community_score=row.community_score,
        promotion_tolerance=row.promotion_tolerance,
        risk_score=row.risk_score,
        rules=row.subreddit.rules_json,
    )


@app.get("/v1/products/{product_id}/conversations", response_model=list[ConversationOut])
async def conversations(product_id: str, db: AsyncSession = Depends(get_db)):
    await get_product(product_id, db)
    rows = (
        await db.scalars(
            select(Conversation)
            .where(Conversation.product_id == product_id)
            .order_by(Conversation.last_activity_at.desc())
        )
    ).all()
    return rows


@app.get("/v1/conversations/{conversation_id}", response_model=ConversationOut)
async def conversation_get(conversation_id: str, db: AsyncSession = Depends(get_db)):
    row = await db.get(Conversation, conversation_id)
    if not row:
        raise HTTPException(404, "Conversation not found")
    return row


@app.post("/v1/conversations/{conversation_id}/followup", response_model=ConversationOut)
async def conversation_followup(
    conversation_id: str, body: FollowupIn, db: AsyncSession = Depends(get_db)
):
    row = await db.get(Conversation, conversation_id)
    if not row:
        raise HTTPException(404, "Conversation not found")
    return await add_followup(db, row, body.body, get_settings())


@app.post("/v1/conversations/{conversation_id}/stop")
async def conversation_stop(conversation_id: str, db: AsyncSession = Depends(get_db)):
    row = await db.get(Conversation, conversation_id)
    if not row:
        raise HTTPException(404, "Conversation not found")
    row.state = "CLOSED"
    row.closed_reason = "MANUAL_STOP"
    await db.commit()
    return {"status": "CLOSED"}


@app.get("/v1/products/{product_id}/analytics/overview", response_model=AnalyticsOverviewOut)
async def analytics_overview(product_id: str, db: AsyncSession = Depends(get_db)):
    await get_product(product_id, db)
    scanned = (
        await db.scalar(
            select(func.count()).select_from(Candidate).where(Candidate.product_id == product_id)
        )
        or 0
    )
    qualified = (
        await db.scalar(
            select(func.count())
            .select_from(Candidate)
            .where(
                Candidate.product_id == product_id,
                Candidate.opportunity_score >= 0.4,
                Candidate.risk_score < 0.5,
            )
        )
        or 0
    )
    conv = (
        await db.scalar(
            select(func.count())
            .select_from(Conversation)
            .where(Conversation.product_id == product_id)
        )
        or 0
    )
    waiting = (
        await db.scalar(
            select(func.count())
            .select_from(Conversation)
            .where(
                Conversation.product_id == product_id,
                Conversation.state.in_(["POSTED", "USER_ENGAGED"]),
            )
        )
        or 0
    )
    visits = (
        await db.scalar(
            select(func.count())
            .select_from(TrackingEvent)
            .where(
                TrackingEvent.product_id == product_id,
                TrackingEvent.event_name.in_(
                    ["page_view", "session_started", "attribution_received"]
                ),
            )
        )
        or 0
    )
    signups = (
        await db.scalar(
            select(func.count())
            .select_from(TrackingEvent)
            .where(TrackingEvent.product_id == product_id, TrackingEvent.event_name == "signup")
        )
        or 0
    )
    activations = (
        await db.scalar(
            select(func.count())
            .select_from(TrackingEvent)
            .where(TrackingEvent.product_id == product_id, TrackingEvent.event_name == "activated")
        )
        or 0
    )
    negatives = (
        await db.scalar(
            select(func.count())
            .select_from(RiskEvent)
            .where(
                RiskEvent.product_id == product_id,
                RiskEvent.event_type.in_(["NEGATIVE_REACTION", "MOD_WARNING"]),
            )
        )
        or 0
    )
    return AnalyticsOverviewOut(
        scanned=scanned,
        candidates=scanned,
        qualified_opportunities=qualified,
        conversations=conv,
        waiting_followups=waiting,
        user_questions=0,
        link_requests=0,
        visits=visits,
        signups=signups,
        activations=activations,
        removals=0,
        negative_interactions=negatives,
        risk_level="HIGH" if negatives else "PROTECTED",
    )


@app.get("/v1/products/{product_id}/analytics/subreddits")
async def analytics_subreddits(product_id: str, db: AsyncSession = Depends(get_db)):
    await get_product(product_id, db)
    candidates = (
        await db.scalars(
            select(Candidate)
            .options(selectinload(Candidate.content))
            .where(Candidate.product_id == product_id)
        )
    ).all()
    totals: dict[str, dict] = {}
    for c in candidates:
        bucket = totals.setdefault(
            c.content.subreddit, {"subreddit": c.content.subreddit, "candidates": 0, "qualified": 0}
        )
        bucket["candidates"] += 1
        if c.opportunity_score >= 0.4 and c.risk_score < 0.5:
            bucket["qualified"] += 1
    return list(totals.values())


@app.get("/v1/products/{product_id}/analytics/intents")
async def analytics_intents(product_id: str, db: AsyncSession = Depends(get_db)):
    await get_product(product_id, db)
    rows = (
        await db.execute(
            select(Candidate.intent_label, func.count())
            .where(Candidate.product_id == product_id)
            .group_by(Candidate.intent_label)
        )
    ).all()
    return [{"intent": intent, "count": count} for intent, count in rows]


@app.get("/v1/products/{product_id}/analytics/reply-strategies")
async def analytics_reply_strategies(product_id: str, db: AsyncSession = Depends(get_db)):
    await get_product(product_id, db)
    rows = (
        await db.execute(
            select(PolicyDecision.reply_mode, PolicyDecision.decision, func.count())
            .join(Candidate)
            .where(Candidate.product_id == product_id)
            .group_by(PolicyDecision.reply_mode, PolicyDecision.decision)
        )
    ).all()
    return [
        {"reply_mode": mode, "decision": decision, "count": count} for mode, decision, count in rows
    ]


@app.post("/v1/events")
async def events(body: TrackingEventIn, request: Request, db: AsyncSession = Depends(get_db)):
    row = await record_event(
        db,
        body.event,
        body.product_id,
        body.short_code,
        body.anonymous_id,
        body.user_id,
        body.properties,
        request.headers.get("user-agent"),
    )
    return {"status": "ok", "id": row.id}


@app.get("/c/{short_code}")
async def tracking_redirect(short_code: str, db: AsyncSession = Depends(get_db)):
    link = await db.scalar(select(TrackingLink).where(TrackingLink.short_code == short_code))
    if not link:
        raise HTTPException(404, "Tracking link not found")
    await record_event(db, "page_view", link.product_id, short_code, None, None, {})
    sep = "&" if "?" in link.destination_url else "?"
    utm = "&".join(f"{k}={v}" for k, v in link.utm_json.items())
    return RedirectResponse(f"{link.destination_url}{sep}{utm}")


@app.get("/v1/tracking/sdk.js", response_class=PlainTextResponse)
async def tracking_sdk():
    return """(function(){var s=document.currentScript,p=s&&s.dataset.project,base=s&&new URL(s.src).origin;function id(){var k='rga_aid',v=localStorage.getItem(k);if(!v){v=crypto.randomUUID();localStorage.setItem(k,v)}return v}window.redditGrowth={track:function(e,props){fetch(base+'/v1/events',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({event:e,product_id:p,anonymous_id:id(),properties:props||{}})});}};window.redditGrowth.track('session_started');})();"""


@app.post("/v1/admin/kill-switch/enable")
async def kill_enable():
    return {
        "status": "requires_env_change",
        "message": "Set GLOBAL_KILL_SWITCH=true and restart services.",
    }


@app.post("/v1/admin/kill-switch/disable")
async def kill_disable():
    return {
        "status": "requires_env_change",
        "message": "Set GLOBAL_KILL_SWITCH=false and restart services.",
    }


@app.post("/v1/products/{product_id}/autopublish/enable", response_model=ProductOut)
async def autopublish_enable(product_id: str, db: AsyncSession = Depends(get_db)):
    product = await get_product(product_id, db)
    product.autopublish_enabled = True
    await db.commit()
    await db.refresh(product)
    return product


@app.post("/v1/products/{product_id}/autopublish/disable", response_model=ProductOut)
async def autopublish_disable(product_id: str, db: AsyncSession = Depends(get_db)):
    product = await get_product(product_id, db)
    product.autopublish_enabled = False
    await db.commit()
    await db.refresh(product)
    return product


@app.get("/v1/products/{product_id}/risk-events")
async def risk_events(product_id: str, db: AsyncSession = Depends(get_db)):
    await get_product(product_id, db)
    rows = (
        await db.scalars(
            select(RiskEvent)
            .where(RiskEvent.product_id == product_id)
            .order_by(RiskEvent.created_at.desc())
        )
    ).all()
    return [
        {
            "id": x.id,
            "event_type": x.event_type,
            "severity": x.severity,
            "details": x.details,
            "action_taken": x.action_taken,
            "created_at": x.created_at,
        }
        for x in rows
    ]


@app.get("/v1/products/{product_id}/audit-log")
async def audit_log(product_id: str, db: AsyncSession = Depends(get_db)):
    await get_product(product_id, db)
    decisions = (
        await db.scalars(
            select(PolicyDecision)
            .join(Candidate)
            .where(Candidate.product_id == product_id)
            .order_by(PolicyDecision.created_at.desc())
        )
    ).all()
    return [
        {
            "id": x.id,
            "type": "policy_decision",
            "decision": x.decision,
            "reason_codes": x.reason_codes,
            "created_at": x.created_at,
        }
        for x in decisions
    ]
