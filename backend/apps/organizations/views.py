from rest_framework import generics, permissions
from rest_framework.decorators import api_view, permission_classes
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


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def current_organization_licenses(request):
    """Get licenses for the current user's organization"""
    try:
        user = request.user
        if not user.organization:
            return Response({'error': 'User not associated with an organization'}, status=400)
        
        organization = user.organization
        licenses = organization.licenses.all().order_by('-created_at')
        
        # Transform licenses to match frontend License model
        license_data = []
        for license_obj in licenses:
            # Map backend license type → frontend moduleType (keep as-is for known types)
            module_type = license_obj.type  # PHARMACY, HOSPITAL, OCCUPATIONAL_HEALTH, PHARMACY_HOSPITAL, HOSPITAL_OCCUPATIONAL_HEALTH, COMBINED
            if module_type not in ('PHARMACY', 'HOSPITAL', 'OCCUPATIONAL_HEALTH', 'PHARMACY_HOSPITAL', 'HOSPITAL_OCCUPATIONAL_HEALTH', 'COMBINED'):
                module_type = 'TRIAL'
            
            # Define features based on license type
            features = []
            if license_obj.type == 'COMBINED':
                # Combined license includes all features from all modules
                features = [
                    # Hospital features
                    'patient_management', 'appointment_scheduling', 'medical_records',
                    'emergency_management', 'ward_management', 'laboratory_integration',
                    'clinical_notes', 'hospital_billing', 'consultation_management',
                    'admission_management', 'medication_administration', 'triage_system',
                    
                    # Pharmacy features
                    'pos_system', 'basic_inventory', 'advanced_inventory',
                    'prescription_management', 'supplier_management', 'stock_alerts',
                    'expiry_tracking', 'dispensing_records', 'drug_interaction_checking',
                    
                    # Occupational Health features
                    'occupational_health', 'health_surveillance', 'risk_assessment',
                    'ppe_management', 'incident_reporting', 'compliance_tracking',
                    'certificate_management', 'medical_examinations',
                    
                    # General features
                    'basic_reporting', 'advanced_reporting', 'analytics',
                    'user_management', 'audit_trail', 'data_export'
                ]
            elif license_obj.type == 'HOSPITAL':
                features = [
                    'patient_management', 'appointment_scheduling', 'medical_records',
                    'emergency_management', 'ward_management', 'laboratory_integration',
                    'clinical_notes', 'hospital_billing', 'consultation_management',
                    'admission_management', 'medication_administration', 'triage_system',
                    'basic_reporting', 'user_management', 'audit_trail'
                ]
            elif license_obj.type == 'PHARMACY':
                features = [
                    'pos_system', 'basic_inventory', 'advanced_inventory',
                    'prescription_management', 'supplier_management', 'stock_alerts',
                    'expiry_tracking', 'dispensing_records', 'drug_interaction_checking',
                    'basic_reporting', 'user_management', 'audit_trail'
                ]
            elif license_obj.type == 'OCCUPATIONAL_HEALTH':
                features = [
                    'occupational_health', 'health_surveillance', 'risk_assessment',
                    'ppe_management', 'incident_reporting', 'compliance_tracking',
                    'certificate_management', 'medical_examinations', 'patient_management',
                    'basic_reporting', 'user_management', 'audit_trail'
                ]
            elif license_obj.type == 'PHARMACY_HOSPITAL':
                features = [
                    # Pharmacy features
                    'pos_system', 'basic_inventory', 'advanced_inventory',
                    'prescription_management', 'supplier_management', 'stock_alerts',
                    'expiry_tracking', 'dispensing_records', 'drug_interaction_checking',
                    # Hospital features
                    'patient_management', 'appointment_scheduling', 'medical_records',
                    'emergency_management', 'ward_management', 'laboratory_integration',
                    'clinical_notes', 'hospital_billing', 'consultation_management',
                    'admission_management', 'medication_administration', 'triage_system',
                    # General
                    'basic_reporting', 'advanced_reporting', 'user_management', 'audit_trail'
                ]
            elif license_obj.type == 'HOSPITAL_OCCUPATIONAL_HEALTH':
                features = [
                    # Hospital features
                    'patient_management', 'appointment_scheduling', 'medical_records',
                    'emergency_management', 'ward_management', 'laboratory_integration',
                    'clinical_notes', 'hospital_billing', 'consultation_management',
                    'admission_management', 'medication_administration', 'triage_system',
                    # Occupational Health features
                    'occupational_health', 'health_surveillance', 'risk_assessment',
                    'ppe_management', 'incident_reporting', 'compliance_tracking',
                    'certificate_management', 'medical_examinations',
                    # General
                    'basic_reporting', 'advanced_reporting', 'user_management', 'audit_trail'
                ]
            else:  # TRIAL / unknown
                features = [
                    'patient_management', 'basic_inventory', 'prescription_management',
                    'basic_reporting', 'medical_records'
                ]
            
            license_data.append({
                'id': str(license_obj.id),
                'licenseKey': license_obj.license_number,
                'organizationId': str(organization.id),
                'moduleType': module_type,
                'licenseTier': 'PROFESSIONAL',  # Default tier for now
                'isActive': license_obj.status == 'active',
                'issuedDate': license_obj.issued_date.isoformat(),
                'expiryDate': license_obj.expiry_date.isoformat() if license_obj.expiry_date else None,
                'maxUsers': None,  # Unlimited for now
                'maxFacilities': None,  # Unlimited for now
                'features': features,
                'billingCycle': 'ANNUAL',
                'autoRenew': license_obj.renewal_required,
                'createdAt': license_obj.created_at.isoformat(),
                'updatedAt': license_obj.updated_at.isoformat() if license_obj.updated_at else None,
                'metadata': license_obj.metadata or {}
            })
        
        return Response(license_data)
        
    except Exception as e:
        return Response({'error': str(e)}, status=500)