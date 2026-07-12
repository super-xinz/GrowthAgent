import hashlib
import secrets
from datetime import timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import (
    Product,
    ProductBrainVersion,
    XiaohongshuConfirmation,
    XiaohongshuContent,
    XiaohongshuOpportunity,
    now,
)


class ConfirmationError(ValueError):
    pass


def validate_xiaohongshu_draft(body: str) -> str:
    normalized = body.strip()
    false_affiliation = "我是" in normalized and any(
        word in normalized for word in ("开发者", "官方", "团队成员", "工作人员")
    )
    if false_affiliation:
        raise ValueError("草稿包含未经验证的身份声明")
    if "http://" in normalized or "https://" in normalized:
        raise ValueError("草稿不能包含链接")
    if len(normalized) < 12:
        raise ValueError("草稿内容过短")
    return normalized


def ensure_daily_quota(comments_today: int, daily_limit: int) -> None:
    if comments_today >= daily_limit:
        raise ConfirmationError("今天已达到该产品的评论上限")


def _user(data: dict[str, Any], key: str = "user") -> tuple[str, str]:
    user = data.get(key) or {}
    return (
        str(user.get("userId") or user.get("user_id") or ""),
        str(user.get("nickname") or user.get("nickName") or ""),
    )


def normalize_search_results(payload: dict[str, Any], *, keyword: str) -> list[dict[str, Any]]:
    """Normalize the MCP search response while retaining the token required for detail calls."""
    rows: list[dict[str, Any]] = []
    seen: set[str] = set()
    for feed in payload.get("feeds") or []:
        if feed.get("modelType") not in (None, "note"):
            continue
        feed_id = str(feed.get("id") or "")
        if not feed_id or feed_id in seen:
            continue
        seen.add(feed_id)
        card = feed.get("noteCard") or feed.get("note_card") or {}
        author_id, author_name = _user(card)
        rows.append(
            {
                "platform": "xiaohongshu",
                "platform_content_id": feed_id,
                "xsec_token": str(feed.get("xsecToken") or feed.get("xsec_token") or ""),
                "title": str(card.get("displayTitle") or card.get("display_title") or ""),
                "author_id": author_id,
                "author_name": author_name,
                "source_keyword": keyword,
                "raw_json": feed,
            }
        )
    return rows


def opportunity_records(
    detail: dict[str, Any], *, source_keyword: str
) -> list[dict[str, Any]]:
    """Create stable note and first-level comment targets from a feed detail response."""
    detail = detail.get("data") or detail
    note = detail.get("note") or {}
    note_id = str(note.get("noteId") or note.get("note_id") or "")
    xsec_token = str(note.get("xsecToken") or note.get("xsec_token") or "")
    author_id, author_name = _user(note)
    rows = [
        {
            "platform": "xiaohongshu",
            "target_type": "NOTE",
            "platform_content_id": note_id,
            "parent_content_id": None,
            "xsec_token": xsec_token,
            "title": str(note.get("title") or ""),
            "body": str(note.get("desc") or ""),
            "author_id": author_id,
            "author_name": author_name,
            "source_keyword": source_keyword,
            "dedupe_key": f"xiaohongshu:NOTE:{note_id}",
            "raw_json": note,
        }
    ]
    comments = (detail.get("comments") or {}).get("list") or []
    for comment in comments:
        comment_id = str(comment.get("id") or "")
        if not comment_id:
            continue
        comment_author_id, comment_author_name = _user(comment, "userInfo")
        rows.append(
            {
                "platform": "xiaohongshu",
                "target_type": "COMMENT",
                "platform_content_id": comment_id,
                "parent_content_id": note_id,
                "xsec_token": xsec_token,
                "title": str(note.get("title") or ""),
                "body": str(comment.get("content") or ""),
                "author_id": comment_author_id,
                "author_name": comment_author_name,
                "source_keyword": source_keyword,
                "dedupe_key": f"xiaohongshu:COMMENT:{note_id}:{comment_id}",
                "raw_json": comment,
            }
        )
    return rows


async def import_search_opportunities(
    db: AsyncSession, product_id: str, client, keyword: str, *, detail_limit: int = 5
) -> list[XiaohongshuOpportunity]:
    search_payload = await client.search_feeds(keyword)
    search_rows = normalize_search_results(search_payload, keyword=keyword)
    imported: list[XiaohongshuOpportunity] = []
    for search_row in search_rows[:detail_limit]:
        detail = await client.feed_detail(
            search_row["platform_content_id"], search_row["xsec_token"]
        )
        for record in opportunity_records(detail, source_keyword=keyword):
            content = await db.scalar(
                select(XiaohongshuContent).where(
                    XiaohongshuContent.dedupe_key == record["dedupe_key"]
                )
            )
            if content is None:
                content = XiaohongshuContent(
                    dedupe_key=record["dedupe_key"],
                    target_type=record["target_type"],
                    platform_content_id=record["platform_content_id"],
                    parent_content_id=record["parent_content_id"],
                    xsec_token=record["xsec_token"],
                    title=record["title"],
                    body=record["body"],
                    author_id=record["author_id"],
                    author_name=record["author_name"],
                    source_keyword=record["source_keyword"],
                    raw_json=record["raw_json"],
                )
                db.add(content)
                await db.flush()
            opportunity = await db.scalar(
                select(XiaohongshuOpportunity).where(
                    XiaohongshuOpportunity.product_id == product_id,
                    XiaohongshuOpportunity.content_id == content.id,
                )
            )
            if opportunity is None:
                text = f"{content.title} {content.body}"
                demand_signal = any(mark in text for mark in ("?", "？", "求", "推荐", "有没有", "怎么"))
                opportunity = XiaohongshuOpportunity(
                    product_id=product_id,
                    content_id=content.id,
                    opportunity_score=0.75 if demand_signal else 0.5,
                    risk_score=0.1,
                )
                db.add(opportunity)
            imported.append(opportunity)
    await db.commit()
    return imported


async def create_confirmation(
    db: AsyncSession,
    opportunity_id: str,
    body: str,
    *,
    account_id: str,
    ttl_minutes: int = 10,
) -> XiaohongshuConfirmation:
    normalized = body.strip()
    row = XiaohongshuConfirmation(
        opportunity_id=opportunity_id,
        token=secrets.token_urlsafe(32),
        account_id=account_id,
        body=normalized,
        body_hash=hashlib.sha256(normalized.encode()).hexdigest(),
        expires_at=now() + timedelta(minutes=ttl_minutes),
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


async def consume_confirmation(
    db: AsyncSession,
    token: str,
    body: str,
    *,
    opportunity_id: str | None = None,
    account_id: str | None = None,
) -> XiaohongshuConfirmation:
    row = await db.scalar(
        select(XiaohongshuConfirmation)
        .where(XiaohongshuConfirmation.token == token)
        .with_for_update()
    )
    if row is None:
        raise ConfirmationError("确认令牌无效")
    if opportunity_id is not None and row.opportunity_id != opportunity_id:
        raise ConfirmationError("确认令牌与目标不匹配")
    if account_id is not None and row.account_id != account_id:
        raise ConfirmationError("确认令牌与当前小红书账号不匹配")
    if row.used_at is not None:
        raise ConfirmationError("确认令牌已使用")
    expires_at = row.expires_at
    current = now()
    if expires_at.tzinfo is None:
        current = current.replace(tzinfo=None)
    if expires_at <= current:
        raise ConfirmationError("确认令牌已过期")
    normalized = body.strip()
    if hashlib.sha256(normalized.encode()).hexdigest() != row.body_hash:
        raise ConfirmationError("草稿已变化，请重新确认")
    row.used_at = now()
    await db.commit()
    await db.refresh(row)
    return row


async def generate_xiaohongshu_draft(db: AsyncSession, opportunity, provider) -> str:
    await db.refresh(opportunity, ["content"])
    product = await db.get(Product, opportunity.product_id)
    brain = await db.scalar(
        select(ProductBrainVersion).where(
            ProductBrainVersion.product_id == opportunity.product_id,
            ProductBrainVersion.is_current,
        )
    )
    brain_data = brain.brain_json if brain else {}
    claims = [item.get("claim", "") for item in brain_data.get("supported_claims", [])[:3]]
    prompt = f"""你在为小红书公开讨论撰写一条有帮助的中文评论草稿。
目标类型：{opportunity.content.target_type}
笔记标题：{opportunity.content.title}
目标内容：{opportunity.content.body}
产品：{product.name if product else ''}
已验证能力：{'；'.join(claims) or '没有可引用的能力声明'}
身份边界：你不是该产品官方人员，也不是该产品开发者；不得暗示任何官方关系。

要求：先直接帮助对方解决问题；不得自称官方、开发者或团队成员；不得编造操作步骤、产品行为或能力；没有证据时明确说不确定；不放链接；不用营销腔；80到180个中文字符；只输出评论正文。"""
    last_error: ValueError | None = None
    for attempt in range(2):
        retry_note = (
            "\n上次草稿不合格，请严格避免虚假身份、链接和未经证实的细节。"
            if attempt
            else ""
        )
        body = (await provider.generate_text(prompt + retry_note)).strip()[:500]
        if not body:
            last_error = ValueError("模型没有生成评论草稿")
            continue
        try:
            return validate_xiaohongshu_draft(body)
        except ValueError as error:
            last_error = error
    raise last_error or ValueError("模型没有生成合格评论草稿")
