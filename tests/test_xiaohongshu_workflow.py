import pytest

from app.xiaohongshu_service import normalize_search_results, opportunity_records
from app.xiaohongshu_service import (
    ConfirmationError,
    consume_confirmation,
    create_confirmation,
    ensure_daily_quota,
    import_search_opportunities,
    validate_xiaohongshu_draft,
)


def sample_search_payload():
    return {
        "feeds": [
            {
                "id": "note-1",
                "xsecToken": "xsec-1",
                "noteCard": {
                    "displayTitle": "怎样找到真正有需求的用户",
                    "user": {"userId": "user-1", "nickname": "产品小王"},
                    "interactInfo": {"likedCount": "12", "commentCount": "2"},
                },
            },
            {
                "id": "note-1",
                "xsecToken": "xsec-new",
                "noteCard": {"displayTitle": "重复结果"},
            },
            {
                "id": "recommendation-placeholder",
                "modelType": "rec_query",
                "xsecToken": "not-a-note-token",
                "noteCard": {"displayTitle": ""},
            },
        ]
    }


def test_search_normalization_keeps_xsec_token_and_suppresses_duplicates():
    rows = normalize_search_results(sample_search_payload(), keyword="用户研究")

    assert len(rows) == 1
    assert rows[0]["platform_content_id"] == "note-1"
    assert rows[0]["xsec_token"] == "xsec-1"
    assert rows[0]["title"] == "怎样找到真正有需求的用户"
    assert rows[0]["author_id"] == "user-1"
    assert rows[0]["source_keyword"] == "用户研究"


def test_detail_creates_note_and_comment_opportunities_with_stable_keys():
    detail = {
        "note": {
            "noteId": "note-1",
            "xsecToken": "xsec-1",
            "title": "有没有好用的用户研究工具",
            "desc": "团队访谈整理太慢了，求推荐。",
            "user": {"userId": "author-1", "nickname": "创业者"},
        },
        "comments": {
            "list": [
                {
                    "id": "comment-1",
                    "noteId": "note-1",
                    "content": "我也想知道，有没有能自动整理证据的？",
                    "userInfo": {"userId": "commenter-1", "nickname": "同问"},
                }
            ]
        },
    }

    rows = opportunity_records({"feed_id": "note-1", "data": detail}, source_keyword="用户研究")

    assert [row["target_type"] for row in rows] == ["NOTE", "COMMENT"]
    assert rows[0]["dedupe_key"] == "xiaohongshu:NOTE:note-1"
    assert rows[1]["dedupe_key"] == "xiaohongshu:COMMENT:note-1:comment-1"
    assert rows[1]["parent_content_id"] == "note-1"
    assert rows[1]["author_id"] == "commenter-1"


class FakeXiaohongshuClient:
    async def search_feeds(self, keyword, filters=None):
        return sample_search_payload()

    async def feed_detail(self, feed_id, xsec_token):
        return {
            "data": {
                "note": {
                    "noteId": feed_id,
                    "xsecToken": xsec_token,
                    "title": "寻找用户研究工具",
                    "desc": "有没有可以保留证据、整理访谈的工具？",
                    "user": {"userId": "author-1", "nickname": "创业者"},
                },
                "comments": {
                    "list": [
                        {
                            "id": "comment-1",
                            "content": "同问，最好能自动整理。",
                            "userInfo": {"userId": "commenter-1", "nickname": "同问"},
                        }
                    ]
                },
            }
        }


@pytest.mark.asyncio
async def test_search_import_persists_once_and_suppresses_duplicate_targets(tmp_path):
    from sqlalchemy import func, select
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from app.models import Base, Product, XiaohongshuContent, XiaohongshuOpportunity

    engine = create_async_engine(f"sqlite+aiosqlite:///{tmp_path / 'xhs.db'}")
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    async with sessions() as db:
        product = Product(name="测试产品", website_url="https://example.com")
        db.add(product)
        await db.commit()
        await import_search_opportunities(db, product.id, FakeXiaohongshuClient(), "用户研究")
        await import_search_opportunities(db, product.id, FakeXiaohongshuClient(), "用户研究")
        assert await db.scalar(select(func.count(XiaohongshuContent.id))) == 2
        assert await db.scalar(select(func.count(XiaohongshuOpportunity.id))) == 2
    await engine.dispose()


@pytest.mark.asyncio
async def test_confirmation_is_target_bound_and_single_use(tmp_path):
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from app.models import Base, Product, XiaohongshuContent, XiaohongshuOpportunity

    engine = create_async_engine(f"sqlite+aiosqlite:///{tmp_path / 'confirm.db'}")
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    async with sessions() as db:
        product = Product(name="测试产品", website_url="https://example.com")
        content = XiaohongshuContent(
            dedupe_key="xiaohongshu:COMMENT:note-1:comment-1",
            target_type="COMMENT",
            platform_content_id="comment-1",
            parent_content_id="note-1",
            xsec_token="xsec-1",
            body="有没有推荐？",
        )
        db.add_all([product, content])
        await db.flush()
        opportunity = XiaohongshuOpportunity(product_id=product.id, content_id=content.id)
        db.add(opportunity)
        await db.commit()

        confirmation = await create_confirmation(
            db, opportunity.id, "可以先确认具体需求。", account_id="account-1"
        )
        with pytest.raises(ConfirmationError, match="账号不匹配"):
            await consume_confirmation(
                db,
                confirmation.token,
                "可以先确认具体需求。",
                account_id="account-2",
            )
        with pytest.raises(ConfirmationError, match="目标不匹配"):
            await consume_confirmation(
                db,
                confirmation.token,
                "可以先确认具体需求。",
                opportunity_id="other-opportunity",
            )
        with pytest.raises(ConfirmationError, match="草稿已变化"):
            await consume_confirmation(db, confirmation.token, "被修改的草稿")
        consumed = await consume_confirmation(db, confirmation.token, "可以先确认具体需求。")
        assert consumed.used_at is not None
        with pytest.raises(ConfirmationError, match="已使用"):
            await consume_confirmation(db, confirmation.token, "可以先确认具体需求。")
    await engine.dispose()


def test_draft_quality_rejects_false_affiliation_and_links():
    with pytest.raises(ValueError, match="身份声明"):
        validate_xiaohongshu_draft("我是 DeepSeek 的开发者，可以帮你解决。")
    with pytest.raises(ValueError, match="链接"):
        validate_xiaohongshu_draft("可以先按步骤排查，详情见 https://example.com")
    assert validate_xiaohongshu_draft("可以先保存出错截图和复现步骤，再通过应用内反馈提交。")


def test_daily_quota_blocks_at_limit():
    ensure_daily_quota(2, 3)
    with pytest.raises(ConfirmationError, match="评论上限"):
        ensure_daily_quota(3, 3)
