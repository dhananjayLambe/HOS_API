from django.core.management.base import BaseCommand
from consultations.models import AdviceTemplate
from utils.static_data_service import StaticDataService

class Command(BaseCommand):
    help = 'Load predefined advice templates into AdviceTemplate table'

    def handle(self, *args, **kwargs):
        advice_list = StaticDataService.get_advice_templates()

        created_count = 0
        for advice in advice_list:
            obj, created = AdviceTemplate.objects.get_or_create(description=advice)
            if created:
                created_count += 1
        self.stdout.write(self.style.SUCCESS(f'Successfully loaded {created_count} advice templates.'))