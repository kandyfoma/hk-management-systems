from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta, datetime
from django.http import HttpResponse
import csv
import json

from .models import AuditLog, PharmacyAuditLog, AuditLogSummary, AuditActionType, AuditSeverity
from .serializers import (
    AuditLogSerializer, AuditLogListSerializer, PharmacyAuditLogSerializer,
    AuditLogSummarySerializer, AuditSearchSerializer, AuditAnalyticsSerializer,
    VerificationSerializer, PharmacyAuditAnalyticsSerializer
)
from .utils import log_pharmacy_action


class AuditLogListAPIView(generics.ListAPIView):
    """List audit logs with filtering and search"""
    queryset = AuditLog.objects.select_related('user', 'organization', 'content_type')
    serializer_class = AuditLogListSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['action', 'severity', 'success', 'module', 'user', 'organization']
    search_fields = ['username', 'description', 'ip_address', 'object_repr']
    ordering = ['-timestamp']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by user's organization if not admin
        if not self.request.user.is_staff:
            queryset = queryset.filter(organization=self.request.user.organization)
        
        return queryset


class AuditLogDetailAPIView(generics.RetrieveAPIView):
    """Detailed view of specific audit log entry"""
    queryset = AuditLog.objects.select_related('user', 'organization', 'content_type')
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by user's organization if not admin
        if not self.request.user.is_staff:
            queryset = queryset.filter(organization=self.request.user.organization)
        
        return queryset


class PharmacyAuditLogListAPIView(generics.ListAPIView):
    """List pharmacy-specific audit logs"""
    queryset = PharmacyAuditLog.objects.select_related(
        'audit_log__user', 'audit_log__organization', 'verified_by'
    )
    serializer_class = PharmacyAuditLogSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['requires_verification', 'verified_by']
    search_fields = [
        'prescription_number', 'product_name', 'product_sku', 
        'batch_number', 'sale_number'
    ]
    ordering = ['-audit_log__timestamp']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by user's organization if not admin
        if not self.request.user.is_staff:
            queryset = queryset.filter(audit_log__organization=self.request.user.organization)
        
        return queryset


class AuditLogSummaryListAPIView(generics.ListAPIView):
    """List audit log daily summaries"""
    queryset = AuditLogSummary.objects.select_related('organization')
    serializer_class = AuditLogSummarySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['organization', 'date']
    ordering = ['-date']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by user's organization if not admin
        if not self.request.user.is_staff:
            queryset = queryset.filter(organization=self.request.user.organization)
        
        return queryset


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def search_audit_logs(request):
    """Advanced search for audit logs"""
    serializer = AuditSearchSerializer(data=request.data)
    if serializer.is_valid():
        queryset = AuditLog.objects.select_related('user', 'organization', 'content_type')
        
        # Apply filters
        filters = serializer.validated_data
        
        if filters.get('user'):
            queryset = queryset.filter(user_id=filters['user'])
        
        if filters.get('username'):
            queryset = queryset.filter(username__icontains=filters['username'])
        
        if filters.get('action'):
            queryset = queryset.filter(action=filters['action'])
        
        if filters.get('severity'):
            queryset = queryset.filter(severity=filters['severity'])
        
        if filters.get('module'):
            queryset = queryset.filter(module=filters['module'])
        
        if filters.get('success') is not None:
            queryset = queryset.filter(success=filters['success'])
        
        if filters.get('start_date'):
            queryset = queryset.filter(timestamp__gte=filters['start_date'])
        
        if filters.get('end_date'):
            queryset = queryset.filter(timestamp__lte=filters['end_date'])
        
        if filters.get('ip_address'):
            queryset = queryset.filter(ip_address=filters['ip_address'])
        
        if filters.get('description_contains'):
            queryset = queryset.filter(description__icontains=filters['description_contains'])
        
        if filters.get('organization'):
            queryset = queryset.filter(organization_id=filters['organization'])
        
        # Filter by user's organization if not admin
        if not request.user.is_staff:
            queryset = queryset.filter(organization=request.user.organization)
        
        # Paginate results
        page = request.GET.get('page', 1)
        page_size = min(int(request.GET.get('page_size', 20)), 100)
        
        start = (int(page) - 1) * page_size
        end = start + page_size
        
        results = queryset.order_by('-timestamp')[start:end]
        serializer = AuditLogListSerializer(results, many=True)
        
        return Response({
            'results': serializer.data,
            'count': queryset.count(),
            'page': int(page),
            'page_size': page_size
        })
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def audit_analytics(request):
    """Get audit analytics data"""
    serializer = AuditAnalyticsSerializer(data=request.GET)
    if serializer.is_valid():
        filters = serializer.validated_data
        period = filters.get('period', 'day')
        
        # Base queryset
        queryset = AuditLog.objects.all()
        
        # Filter by organization
        if filters.get('organization'):
            queryset = queryset.filter(organization_id=filters['organization'])
        elif not request.user.is_staff:
            queryset = queryset.filter(organization=request.user.organization)
        
        # Filter by date range
        if filters.get('start_date'):
            queryset = queryset.filter(timestamp__date__gte=filters['start_date'])
        if filters.get('end_date'):
            queryset = queryset.filter(timestamp__date__lte=filters['end_date'])
        
        # Get analytics data
        analytics = {
            'total_actions': queryset.count(),
            'successful_actions': queryset.filter(success=True).count(),
            'failed_actions': queryset.filter(success=False).count(),
            'critical_actions': queryset.filter(severity=AuditSeverity.CRITICAL).count(),
            'unique_users': queryset.values('user').distinct().count(),
            'unique_ips': queryset.values('ip_address').distinct().count(),
        }
        
        # Action breakdown
        action_breakdown = queryset.values('action').annotate(
            count=Count('id')
        ).order_by('-count')
        
        # Severity breakdown  
        severity_breakdown = queryset.values('severity').annotate(
            count=Count('id')
        ).order_by('-count')
        
        # Module breakdown
        module_breakdown = queryset.values('module').annotate(
            count=Count('id')
        ).order_by('-count')
        
        # Time series data (last 7 days)
        time_series = []
        for i in range(7):
            date = timezone.now().date() - timedelta(days=i)
            daily_count = queryset.filter(timestamp__date=date).count()
            time_series.append({
                'date': date.isoformat(),
                'count': daily_count
            })
        
        analytics.update({
            'action_breakdown': list(action_breakdown),
            'severity_breakdown': list(severity_breakdown),
            'module_breakdown': list(module_breakdown),
            'time_series': list(reversed(time_series))
        })
        
        return Response(analytics)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pharmacy_audit_analytics(request):
    """Get pharmacy-specific audit analytics"""
    serializer = PharmacyAuditAnalyticsSerializer(data=request.GET)
    if serializer.is_valid():
        filters = serializer.validated_data
        
        # Base queryset
        queryset = PharmacyAuditLog.objects.select_related('audit_log')
        
        # Filter by organization
        if filters.get('organization'):
            queryset = queryset.filter(audit_log__organization_id=filters['organization'])
        elif not request.user.is_staff:
            queryset = queryset.filter(audit_log__organization=request.user.organization)
        
        # Additional filters
        if filters.get('start_date'):
            queryset = queryset.filter(audit_log__timestamp__date__gte=filters['start_date'])
        if filters.get('end_date'):
            queryset = queryset.filter(audit_log__timestamp__date__lte=filters['end_date'])
        if filters.get('product_sku'):
            queryset = queryset.filter(product_sku__icontains=filters['product_sku'])
        if filters.get('prescription_number'):
            queryset = queryset.filter(prescription_number__icontains=filters['prescription_number'])
        
        analytics = {
            'total_pharmacy_actions': queryset.count(),
            'verification_required': queryset.filter(requires_verification=True).count(),
            'verified_actions': queryset.filter(verified_by__isnull=False).count(),
            'pending_verification': queryset.filter(
                requires_verification=True, 
                verified_by__isnull=True
            ).count(),
        }
        
        # Prescription analytics
        prescription_actions = queryset.exclude(prescription_number='')
        analytics['prescription_actions'] = prescription_actions.count()
        
        # Product analytics  
        product_actions = queryset.exclude(product_name='')
        analytics['product_actions'] = product_actions.count()
        
        # Top products by activity
        top_products = queryset.exclude(product_name='').values('product_name').annotate(
            count=Count('id')
        ).order_by('-count')[:10]
        analytics['top_products'] = list(top_products)
        
        # Sales vs dispensing activities
        sales_count = queryset.exclude(sale_number='').count()
        dispensing_count = queryset.filter(
            audit_log__action=AuditActionType.DISPENSE
        ).count()
        
        analytics.update({
            'sales_actions': sales_count,
            'dispensing_actions': dispensing_count
        })
        
        return Response(analytics)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_pharmacy_audits(request):
    """Mark pharmacy audit entries as verified"""
    serializer = VerificationSerializer(data=request.data)
    if serializer.is_valid():
        pharmacy_audit_ids = serializer.validated_data['pharmacy_audit_ids']
        verification_notes = serializer.validated_data.get('verification_notes', '')
        
        # Update the records
        updated_count = PharmacyAuditLog.objects.filter(
            id__in=pharmacy_audit_ids,
            requires_verification=True,
            verified_by__isnull=True
        ).update(
            verified_by=request.user,
            verification_timestamp=timezone.now()
        )
        
        # Log the verification action
        log_pharmacy_action(
            user=request.user,
            action=AuditActionType.UPDATE,
            description=f"Vérification de {updated_count} entrées d'audit pharmacie",
            severity=AuditSeverity.MEDIUM,
            additional_data={
                'verified_ids': pharmacy_audit_ids,
                'verification_notes': verification_notes
            }
        )
        
        return Response({
            'message': f'{updated_count} entrées marquées comme vérifiées',
            'verified_count': updated_count
        })
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def export_audit_logs(request):
    """Export audit logs to CSV"""
    # Get query parameters for filtering
    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')
    organization_id = request.GET.get('organization')
    
    queryset = AuditLog.objects.select_related('user', 'organization')
    
    # Apply filters
    if start_date:
        try:
            start_date = datetime.fromisoformat(start_date)
            queryset = queryset.filter(timestamp__gte=start_date)
        except ValueError:
            pass
    
    if end_date:
        try:
            end_date = datetime.fromisoformat(end_date)
            queryset = queryset.filter(timestamp__lte=end_date)
        except ValueError:
            pass
    
    if organization_id:
        queryset = queryset.filter(organization_id=organization_id)
    
    # Create CSV response
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="audit_export_{timezone.now().strftime("%Y%m%d_%H%M%S")}.csv"'
    
    writer = csv.writer(response)
    writer.writerow([
        'Horodatage', 'Utilisateur', 'Email', 'Action', 'Sévérité',
        'Description', 'Succès', 'Adresse IP', 'Module', 'Organisation',
        'Méthode', 'Chemin', 'Durée (ms)'
    ])
    
    for audit in queryset.order_by('-timestamp'):
        writer.writerow([
            audit.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
            audit.username,
            audit.user_email,
            audit.get_action_display(),
            audit.get_severity_display(),
            audit.description,
            'Oui' if audit.success else 'Non',
            audit.ip_address,
            audit.module,
            audit.organization.name if audit.organization else '',
            audit.request_method,
            audit.request_path,
            audit.duration_ms or ''
        ])
    
    # Log the export action
    log_pharmacy_action(
        user=request.user,
        action=AuditActionType.EXPORT,
        description=f"Exportation de {queryset.count()} entrées d'audit",
        severity=AuditSeverity.MEDIUM
    )
    
    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_audit_logs(request):
    """Get current user's audit logs"""
    queryset = AuditLog.objects.filter(user=request.user).select_related('organization')
    
    # Optional filtering
    action = request.GET.get('action')
    if action:
        queryset = queryset.filter(action=action)
    
    days = request.GET.get('days', 30)
    try:
        days = int(days)
        start_date = timezone.now() - timedelta(days=days)
        queryset = queryset.filter(timestamp__gte=start_date)
    except ValueError:
        pass
    
    queryset = queryset.order_by('-timestamp')[:50]  # Limit to 50 recent entries
    
    serializer = AuditLogListSerializer(queryset, many=True)
    return Response({
        'results': serializer.data,
        'count': queryset.count()
    })