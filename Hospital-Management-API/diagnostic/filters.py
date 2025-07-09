# diagnostics/filters.py
import django_filters
from .models import DiagnosticLabAddress

class DiagnosticLabAddressFilter(django_filters.FilterSet):
    pincode = django_filters.CharFilter(lookup_expr='exact')
    city = django_filters.CharFilter(lookup_expr='icontains')
    state = django_filters.CharFilter(lookup_expr='icontains')

    class Meta:
        model = DiagnosticLabAddress
        fields = ['pincode', 'city', 'state']