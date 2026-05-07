from rest_framework import generics

from reports.api.serializers import ReportSerializer
from reports.models import Report


class ReportListView(generics.ListAPIView):
    queryset = Report.objects.all()
    serializer_class = ReportSerializer

