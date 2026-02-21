from django.contrib.postgres.search import SearchQuery, SearchRank
from django.db.models import Q
from medicines.models import DrugMaster

class DrugSearchService:

    @staticmethod
    def search(query):
        search_query = SearchQuery(query)

        return (
            DrugMaster.objects
            .annotate(rank=SearchRank("search_vector", search_query))
            .filter(
                Q(search_vector=search_query) |
                Q(brand_name__icontains=query) |
                Q(generic_name__icontains=query),
                is_active=True
            )
            .order_by("-rank")[:20]
        )