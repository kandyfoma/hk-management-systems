from rest_framework import generics, permissions
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django_filters import rest_framework as filters
from django.db.models import Q
from .models import Supplier, SupplierContact, PaymentTerms
from .serializers import (
    SupplierSerializer, SupplierListSerializer, SupplierCreateSerializer,
    SupplierUpdateSerializer, SupplierContactSerializer
)


class SupplierFilter(filters.FilterSet):
    payment_terms = filters.ChoiceFilter(choices=PaymentTerms.choices)
    is_active = filters.BooleanFilter()
    city = filters.CharFilter(lookup_expr='icontains')
    country = filters.CharFilter(lookup_expr='icontains')
    rating_min = filters.NumberFilter(field_name='rating', lookup_expr='gte')
    search = filters.CharFilter(method='filter_search')

    class Meta:
        model = Supplier
        fields = ['payment_terms', 'is_active', 'city', 'country']

    def filter_search(self, queryset, name, value):
        return queryset.filter(
            Q(name__icontains=value) |
            Q(code__icontains=value) |
            Q(contact_person__icontains=value) |
            Q(license_number__icontains=value)
        )


class SupplierListCreateAPIView(generics.ListCreateAPIView):
    queryset = Supplier.objects.select_related('organization').prefetch_related('contacts')
    filter_backends = [DjangoFilterBackend]
    filterset_class = SupplierFilter
    search_fields = ['name', 'code', 'contact_person']
    ordering_fields = ['name', 'rating', 'created_at']
    ordering = ['name']

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return SupplierCreateSerializer
        return SupplierListSerializer

    def perform_create(self, serializer):
        # Assign to user's organization
        serializer.save(organization=self.request.user.organization)


class SupplierDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Supplier.objects.select_related('organization').prefetch_related('contacts')
    serializer_class = SupplierSerializer

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return SupplierUpdateSerializer
        return SupplierSerializer

    def perform_destroy(self, instance):
        # Soft delete
        instance.is_active = False
        instance.save()


@api_view(['GET'])
def payment_terms_choices_view(request):
    """Get payment terms choices"""
    choices = [
        {'value': choice[0], 'label': choice[1]}
        for choice in PaymentTerms.choices
    ]
    return Response(choices)