from django_filters import rest_framework as filters
from .models import Application


class ApplicationFilter(filters.FilterSet):
    """
    FilterSet for filtering applications by status, company, role, location,
    and applied date ranges.
    """
    status = filters.CharFilter(field_name='status', lookup_expr='iexact')
    company = filters.CharFilter(field_name='company', lookup_expr='icontains')
    role = filters.CharFilter(field_name='role', lookup_expr='icontains')
    location = filters.CharFilter(field_name='location', lookup_expr='icontains')
    applied_after = filters.DateFilter(field_name='applied_date', lookup_expr='gte')
    applied_before = filters.DateFilter(field_name='applied_date', lookup_expr='lte')

    class Meta:
        model = Application
        fields = ['status', 'company', 'role', 'location', 'applied_after', 'applied_before']
