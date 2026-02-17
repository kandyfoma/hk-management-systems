from rest_framework import generics, permissions
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django_filters import rest_framework as filters
from django.db.models import Q, Count
from django.utils import timezone
from datetime import timedelta
from .models import Organization, OrganizationType
from .serializers import (
    OrganizationSerializer, OrganizationListSerializer,
    OrganizationCreateSerializer, OrganizationUpdateSerializer,
    OrganizationTypeChoicesSerializer
)


class OrganizationFilter(filters.FilterSet):
    type = filters.ChoiceFilter(choices=OrganizationType.choices)
    is_active = filters.BooleanFilter()
    city = filters.CharFilter(lookup_expr='icontains')
    country = filters.CharFilter(lookup_expr='icontains')
    search = filters.CharFilter(method='filter_search')

    class Meta:
        model = Organization
        fields = ['type', 'is_active', 'city', 'country']

    def filter_search(self, queryset, name, value):
        return queryset.filter(
            Q(name__icontains=value) |
            Q(registration_number__icontains=value) |
            Q(license_number__icontains=value) |
            Q(director_name__icontains=value)
        )


class OrganizationListCreateAPIView(generics.ListCreateAPIView):
    queryset = Organization.objects.annotate(
        active_users_count=Count('users', filter=Q(users__is_active=True)),
        total_users_count=Count('users')
    )
    filter_backends = [DjangoFilterBackend]
    filterset_class = OrganizationFilter
    search_fields = ['name', 'registration_number', 'director_name']
    ordering_fields = ['name', 'type', 'created_at', 'established_date']
    ordering = ['name']

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return OrganizationCreateSerializer
        return OrganizationListSerializer

    def perform_create(self, serializer):
        serializer.save()


class OrganizationDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Organization.objects.annotate(
        active_users_count=Count('users', filter=Q(users__is_active=True)),
        total_users_count=Count('users')
    )
    serializer_class = OrganizationSerializer

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return OrganizationUpdateSerializer
        return OrganizationSerializer

    def perform_update(self, serializer):
        serializer.save()

    def perform_destroy(self, instance):
        # Soft delete - set is_active to False instead of deleting
        instance.is_active = False
        instance.save()


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def organization_type_choices_view(request):
    """Get organization type choices"""
    choices = [
        {'value': choice[0], 'label': choice[1]}
        for choice in OrganizationType.choices
    ]
    return Response(choices)


@api_view(['GET'])
def organization_users_view(request, organization_id):
    """Get users belonging to a specific organization"""
    try:
        organization = Organization.objects.get(id=organization_id)
        users = organization.users.filter(is_active=True)
        
        # Import here to avoid circular import
        from apps.accounts.serializers import UserListSerializer
        serializer = UserListSerializer(users, many=True)
        return Response({
            'organization': {
                'id': organization.id,
                'name': organization.name,
                'type': organization.get_type_display()
            },
            'users': serializer.data,
            'count': users.count()
        })
    except Organization.DoesNotExist:
        return Response({'error': 'Organization not found'}, status=404)


@api_view(['GET'])
def organization_licenses_view(request, organization_id):
    """Get licenses belonging to a specific organization"""
    try:
        organization = Organization.objects.get(id=organization_id)
        licenses = organization.licenses.all()
        
        # Import here to avoid circular import
        from apps.licenses.serializers import LicenseListSerializer
        serializer = LicenseListSerializer(licenses, many=True)
        return Response({
            'organization': {
                'id': organization.id,
                'name': organization.name,
                'type': organization.get_type_display()
            },
            'licenses': serializer.data,
            'count': licenses.count()
        })
    except Organization.DoesNotExist:
        return Response({'error': 'Organization not found'}, status=404)


@api_view(['GET'])
def organization_stats_view(request, organization_id):
    """Get statistics for a specific organization"""
    try:
        organization = Organization.objects.get(id=organization_id)
        
        stats = {
            'organization': {
                'id': organization.id,
                'name': organization.name,
                'type': organization.get_type_display()
            },
            'users': {
                'total': organization.users.count(),
                'active': organization.users.filter(is_active=True).count(),
                'inactive': organization.users.filter(is_active=False).count(),
                'by_role': {}
            },
            'licenses': {
                'total': organization.licenses.count(),
                'active': organization.licenses.filter(status='active').count(),
                'expired': organization.licenses.filter(status='expired').count(),
                'expiring_soon': organization.licenses.filter(
                    status='active',
                    expiry_date__lte=timezone.now().date() + timedelta(days=30)
                ).count()
            }
        }
        
        # Count users by role
        from apps.accounts.models import UserRole
        from django.db.models import Count
        role_counts = organization.users.values('primary_role').annotate(
            count=Count('id')
        )
        
        for role_count in role_counts:
            role = role_count['primary_role']
            count = role_count['count']
            role_display = dict(UserRole.choices).get(role, role)
            stats['users']['by_role'][role_display] = count
        
        return Response(stats)
        
    except Organization.DoesNotExist:
        return Response({'error': 'Organization not found'}, status=404)