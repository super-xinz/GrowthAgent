from celery import Celery
from .config import get_settings

settings = get_settings()
celery_app = Celery(
    "reddit_growth", broker=settings.celery_broker_url, backend=settings.celery_result_backend
)
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    task_acks_late=True,
)


@celery_app.task(name="healthcheck")
def healthcheck():
    return {"status": "ok", "mode": "shadow"}


PIPELINE_TASKS = [
    "ingest_product_sources",
    "refresh_product_sources",
    "build_product_brain",
    "generate_query_graph",
    "discover_subreddits",
    "refresh_subreddit_rules",
    "poll_subreddit_submissions",
    "poll_subreddit_comments",
    "run_candidate_recall",
    "run_embedding_rerank",
    "classify_candidate_intent",
    "score_opportunity",
    "run_policy_engine",
    "generate_reply_plan",
    "validate_claims",
    "write_reply",
    "run_quality_gate",
    "publish_reply",
    "schedule_conversation_checks",
    "poll_conversation",
    "classify_followup",
    "respond_to_followup",
    "refresh_published_reply_status",
    "process_tracking_events",
    "aggregate_analytics",
    "update_query_weights",
    "run_risk_monitor",
]


@celery_app.task(name="pipeline_task_stub")
def pipeline_task_stub(task_name: str, entity_id: str):
    if task_name not in PIPELINE_TASKS:
        return {"status": "rejected", "reason": "unknown_task", "task_name": task_name}
    return {"status": "queued_stub", "task_name": task_name, "entity_id": entity_id}
