from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django_filters import rest_framework as filters
from django.db.models import Q
from django.utils import timezone
from datetime import timedelta
from .models import License, LicenseDocument, LicenseRenewal, LicenseType, LicenseStatus
from .serializers import (
    LicenseSerializer, LicenseListSerializer, LicenseCreateSerializer, LicenseUpdateSerializer,
    LicenseDocumentSerializer, LicenseRenewalSerializer,
    LicenseTypeChoicesSerializer, LicenseStatusChoicesSerializer,
    ExpiringLicensesSerializer
)


class LicenseFilter(filters.FilterSet):
    type = filters.ChoiceFilter(choices=LicenseType.choices)
    status = filters.ChoiceFilter(choices=LicenseStatus.choices)
    organization = filters.UUIDFilter()
    issuing_authority = filters.CharFilter(lookup_expr='icontains')
    expiry_date_from = filters.DateFilter(field_name='expiry_date', lookup_expr='gte')
    expiry_date_to = filters.DateFilter(field_name='expiry_date', lookup_expr='lte')
    is_expired = filters.BooleanFilter(method='filter_expired')
    is_expiring_soon = filters.BooleanFilter(method='filter_expiring_soon')
    search = filters.CharFilter(method='filter_search')

    class Meta:
        model = License
        fields = ['type', 'status', 'organization', 'issuing_authority']

    def filter_expired(self, queryset, name, value):
        today = timezone.now().date()
        if value:
            return queryset.filter(expiry_date__lt=today)
        return queryset.filter(expiry_date__gte=today)

    def filter_expiring_soon(self, queryset, name, value):
        today = timezone.now().date()
        warning_date = today + timedelta(days=30)
        if value:
            return queryset.filter(expiry_date__lte=warning_date, expiry_date__gte=today)
        return queryset.exclude(expiry_date__lte=warning_date)

    def filter_search(self, queryset, name, value):
        return queryset.filter(
            Q(license_number__icontains=value) |
            Q(title__icontains=value) |
            Q(organization__name__icontains=value)
        )


class LicenseListCreateAPIView(generics.ListCreateAPIView):
    queryset = License.objects.select_related(
        'organization', 'created_by'
    ).prefetch_related('documents', 'renewals')
    filter_backends = [DjangoFilterBackend]
    filterset_class = LicenseFilter
    search_fields = ['license_number', 'title', 'organization__name']
    ordering_fields = ['license_number', 'type', 'status', 'expiry_date', 'created_at']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return LicenseCreateSerializer
        return LicenseListSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class LicenseDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = License.objects.select_related(
        'organization', 'created_by'
    ).prefetch_related('documents', 'renewals')
    serializer_class = LicenseSerializer

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return LicenseUpdateSerializer
        return LicenseSerializer

    def perform_update(self, serializer):
        serializer.save()


class LicenseDocumentListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = LicenseDocumentSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['license', 'document_type']

    def get_queryset(self):
        return LicenseDocument.objects.select_related('license', 'uploaded_by')

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)


class LicenseDocumentDetailAPIView(generics.RetrieveDestroyAPIView):
    queryset = LicenseDocument.objects.select_related('license', 'uploaded_by')
    serializer_class = LicenseDocumentSerializer


class LicenseRenewalListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = LicenseRenewalSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['license']

    def get_queryset(self):
        return LicenseRenewal.objects.select_related('license', 'processed_by')

    def perform_create(self, serializer):
        renewal = serializer.save(processed_by=self.request.user)
        
        # Update the license expiry date
        license_obj = renewal.license
        license_obj.expiry_date = renewal.new_expiry_date
        license_obj.status = LicenseStatus.ACTIVE
        license_obj.save()


class LicenseRenewalDetailAPIView(generics.RetrieveAPIView):
    queryset = LicenseRenewal.objects.select_related('license', 'processed_by')
    serializer_class = LicenseRenewalSerializer


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def license_type_choices_view(request):
    """Get license type choices"""
    choices = [
        {'value': choice[0], 'label': choice[1]}
        for choice in LicenseType.choices
    ]
    return Response(choices)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def license_status_choices_view(request):
    """Get license status choices"""
    choices = [
        {'value': choice[0], 'label': choice[1]}
        for choice in LicenseStatus.choices
    ]
    return Response(choices)


@api_view(['GET'])
def expiring_licenses_view(request):
    """Get licenses expiring soon"""
    days = request.GET.get('days', 30)
    try:
        days = int(days)
    except (ValueError, TypeError):
        days = 30

    today = timezone.now().date()
    warning_date = today + timedelta(days=days)
    
    licenses = License.objects.filter(
        status=LicenseStatus.ACTIVE,
        expiry_date__lte=warning_date,
        expiry_date__gte=today
    ).select_related('organization').order_by('expiry_date')

    data = []
    for license_obj in licenses:
        holder_name = None
        holder_type = 'organization'
        
        if license_obj.organization:
            holder_name = license_obj.organization.name

        data.append({
            'license_id': license_obj.id,
            'license_number': license_obj.license_number,
            'type_display': license_obj.get_type_display(),
            'holder_name': holder_name,
            'holder_type': holder_type,
            'expiry_date': license_obj.expiry_date,
            'days_until_expiry': license_obj.days_until_expiry
        })

    return Response({
        'licenses': data,
        'count': len(data),
        'days_threshold': days
    })


@api_view(['GET'])
def expired_licenses_view(request):
    """Get expired licenses"""
    today = timezone.now().date()
    
    licenses = License.objects.filter(
        expiry_date__lt=today
    ).select_related('organization').order_by('-expiry_date')

    serializer = LicenseListSerializer(licenses, many=True)
    return Response({
        'licenses': serializer.data,
        'count': licenses.count()
    })


@api_view(['POST'])
def renew_license_view(request, license_id):
    """Renew a license"""
    try:
        license_obj = License.objects.get(id=license_id)
        
        renewal_data = request.data.copy()
        renewal_data['license'] = license_id
        
        serializer = LicenseRenewalSerializer(data=renewal_data)
        if serializer.is_valid():
            renewal = serializer.save(processed_by=request.user)
            
            # Update license
            license_obj.expiry_date = renewal.new_expiry_date
            license_obj.status = LicenseStatus.ACTIVE
            license_obj.save()
            
            return Response({
                'message': 'License renewed successfully',
                'renewal': serializer.data,
                'license': LicenseSerializer(license_obj).data
            }, status=status.HTTP_201_CREATED)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    except License.DoesNotExist:
        return Response({'error': 'License not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
def suspend_license_view(request, license_id):
    """Suspend a license"""
    try:
        license_obj = License.objects.get(id=license_id)
        
        if license_obj.status == LicenseStatus.SUSPENDED:
            return Response({'message': 'License is already suspended'})
        
        license_obj.status = LicenseStatus.SUSPENDED
        license_obj.save()
        
        return Response({
            'message': 'License suspended successfully',
            'license': LicenseSerializer(license_obj).data
        })
        
    except License.DoesNotExist:
        return Response({'error': 'License not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
def reactivate_license_view(request, license_id):
    """Reactivate a suspended license"""
    try:
        license_obj = License.objects.get(id=license_id)
        
        if license_obj.status != LicenseStatus.SUSPENDED:
            return Response({'error': 'Only suspended licenses can be reactivated'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Check if license is not expired
        if license_obj.is_expired:
            return Response({'error': 'Cannot reactivate expired license. Please renew first.'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        license_obj.status = LicenseStatus.ACTIVE
        license_obj.save()
        
        return Response({
            'message': 'License reactivated successfully',
            'license': LicenseSerializer(license_obj).data
        })
        
    except License.DoesNotExist:
        return Response({'error': 'License not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])  # License validation doesn't require authentication
def validate_license(request):
    """
    Validate a license key for app/device activation
    POST /licenses/validate/
    
    Request body:
    {
        "license_key": "LICENSE-KEY-STRING"
    }
    
    Response:
    {
        "isValid": true/false,
        "license": {license data},
        "organization": {organization data},
        "errors": [error messages]
    }
    """
    license_key = request.data.get('license_key', '').strip()
    
    if not license_key:
        return Response({
            'isValid': False,
            'errors': ['License key is required']
        }, status=status.HTTP_400_BAD_REQUEST)
    
    errors = []
    
    try:
        # Find license by license number
        license_obj = License.objects.get(license_number=license_key)
    except License.DoesNotExist:
        return Response({
            'isValid': False,
            'errors': ['License key not found']
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Check if license is active
    if license_obj.status != LicenseStatus.ACTIVE:
        errors.append(f'License is {license_obj.get_status_display()}')
    
    # Check if license is expired
    if license_obj.is_expired:
        errors.append('License has expired')
    
    # Get organization
    organization = license_obj.organization
    if not organization:
        errors.append('Organization not found')
    elif not organization.is_active:
        errors.append('Organization is inactive')
    
    if errors:
        return Response({
            'isValid': False,
            'errors': errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # License is valid
    license_serializer = LicenseSerializer(license_obj)
    from apps.organizations.serializers import OrganizationSerializer
    org_serializer = OrganizationSerializer(organization)
    
    return Response({
        'isValid': True,
        'license': license_serializer.data,
        'organization': org_serializer.data,
        'errors': []
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
def license_stats_view(request):
    """Get license statistics"""
    today = timezone.now().date()
    warning_date = today + timedelta(days=30)
    
    stats = {
        'total': License.objects.count(),
        'active': License.objects.filter(status=LicenseStatus.ACTIVE).count(),
        'expired': License.objects.filter(expiry_date__lt=today).count(),
        'expiring_soon': License.objects.filter(
            status=LicenseStatus.ACTIVE,
            expiry_date__lte=warning_date,
            expiry_date__gte=today
        ).count(),
        'suspended': License.objects.filter(status=LicenseStatus.SUSPENDED).count(),
        'by_type': {},
        'by_holder_type': {
            'organizations': License.objects.filter(organization__isnull=False).count()
        }
    }
    
    # Count by license type
    from django.db.models import Count
    type_counts = License.objects.values('type').annotate(count=Count('id'))
    for type_count in type_counts:
        license_type = type_count['type']
        count = type_count['count']
        type_display = dict(LicenseType.choices).get(license_type, license_type)
        stats['by_type'][type_display] = count
    
    return Response(stats)