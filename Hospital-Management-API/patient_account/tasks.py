from celery import shared_task
from django.core.cache import cache

@shared_task
def invalidate_patient_search_cache(query):
    cache_key = f"patient_search:{query}"
    cache.delete(cache_key)