import json
import logging
from contextlib import contextmanager
from datetime import date
from typing import Iterable

import redis
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.conf import settings

logger = logging.getLogger(__name__)

QUEUE_UPDATES_CHANNEL = "queue_updates"


def get_redis_client() -> redis.Redis:
    return redis.Redis(
        host=settings.REDIS_HOST,
        port=settings.REDIS_PORT,
        db=0,
        decode_responses=True,
    )


def queue_cache_key(clinic_id: str, doctor_id: str, queue_date: date) -> str:
    return f"queue:{clinic_id}:{doctor_id}:{queue_date.isoformat()}"


def queue_group_name(clinic_id: str, doctor_id: str, queue_date: date) -> str:
    return f"queue_updates_{clinic_id}_{doctor_id}_{queue_date.isoformat()}"


def queue_updates_channel_name(clinic_id: str, doctor_id: str) -> str:
    return f"queue_updates:{clinic_id}:{doctor_id}"


def queue_group_name_scoped(clinic_id: str, doctor_id: str) -> str:
    return f"queue_updates_{clinic_id}_{doctor_id}"


def update_queue_sorted_set(clinic_id: str, doctor_id: str, queue_date: date, queue_rows: Iterable[dict]) -> str:
    key = queue_cache_key(clinic_id=clinic_id, doctor_id=doctor_id, queue_date=queue_date)
    redis_client = get_redis_client()
    pipe = redis_client.pipeline()
    pipe.delete(key)
    for row in queue_rows:
        member = str(row.get("encounter_id") or row["id"])
        score = int(row["position"])
        pipe.zadd(key, {member: score})
    pipe.expire(key, 300)
    pipe.execute()
    return key


def publish_queue_update(clinic_id: str, doctor_id: str, queue_date: date, queue_rows: list[dict]) -> None:
    top_queue = list(queue_rows[:3])
    payload = {
        "type": "SMART_QUEUE_UPDATE",
        "doctor_id": str(doctor_id),
        "clinic_id": str(clinic_id),
        "data": {
            "top_queue": top_queue,
            "total_active": len(queue_rows),
        },
    }
    body = json.dumps(payload)
    try:
        redis_client = get_redis_client()
        redis_client.publish(queue_updates_channel_name(clinic_id=str(clinic_id), doctor_id=str(doctor_id)), body)
        redis_client.publish(QUEUE_UPDATES_CHANNEL, body)
    except Exception:
        logger.exception("Failed publishing queue update on Redis channel")

    channel_layer = get_channel_layer()
    if channel_layer is None:
        return
    try:
        async_to_sync(channel_layer.group_send)(
            queue_group_name_scoped(clinic_id=str(clinic_id), doctor_id=str(doctor_id)),
            {
                "type": "queue.update",
                "payload": payload,
            },
        )
    except Exception:
        logger.exception("Failed broadcasting queue update over channel layer")


@contextmanager
def queue_reorder_lock(doctor_id: str, timeout_seconds: int = 5):
    lock = get_redis_client().lock(f"queue_lock:{doctor_id}", timeout=timeout_seconds, blocking_timeout=timeout_seconds)
    acquired = False
    try:
        acquired = lock.acquire(blocking=True)
        if not acquired:
            raise TimeoutError("Could not acquire queue reorder lock")
        yield
    finally:
        if acquired:
            try:
                lock.release()
            except Exception:
                logger.exception("Failed releasing queue reorder lock")
