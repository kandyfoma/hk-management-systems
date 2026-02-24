"""
ISO 27001 & ISO 45001 Compliance API ViewSets

REST API endpoints for ISO 27001 (Information Security) and ISO 45001 (OH&S) compliance management.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.utils import timezone
from datetime import timedelta, date
from django.db.models import Q,  Count, Sum, Avg

# ISO 27001 Imports
from .models_iso27001 import (
    AuditLog, AccessControl, SecurityIncident, VulnerabilityRecord,
    AccessRequest, DataRetentionPolicy, EncryptionKeyRecord, ComplianceDashboard,
)
from .serializers_iso27001 import (
    AuditLogSerializer, AccessControlSerializer, SecurityIncidentSerializer,
    VulnerabilityRecordSerializer, AccessRequestSerializer, DataRetentionPolicySerializer,
    EncryptionKeyRecordSerializer, ComplianceDashboardSerializer,
)

# ISO 45001 Imports
from .models_iso45001 import (
    OHSPolicy, HazardRegister, IncidentInvestigation, SafetyTraining,
    TrainingCertification, EmergencyProcedure, EmergencyDrill,  
    HealthSurveillance, PerformanceIndicator, ComplianceAudit,
    ContractorQualification, ManagementReview, WorkerFeedback,
)
from .serializers_iso45001 import (
    OHSPolicySerializer, HazardRegisterSerializer, IncidentInvestigationSerializer,
    SafetyTrainingSerializer, TrainingCertificationSerializer, EmergencyProcedureSerializer,
    EmergencyDrillSerializer, HealthSurveillanceSerializer, PerformanceIndicatorSerializer,
    ComplianceAuditSerializer, ContractorQualificationSerializer, ManagementReviewSerializer,
    WorkerFeedbackSerializer,
)


# ==================== ISO 27001 VIEWSETS ====================

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """Audit log retrieval and filtering"""
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['user', 'action', 'resource_type', 'status', 'timestamp']
    search_fields = ['resource_name', 'description', 'ip_address']
    ordering_fields = ['-timestamp', 'action', 'user']
    
    @action(detail=False, methods=['get'])
    def user_activity(self, request):
        """Get activity for a specific user"""
        user_id = request.query_params.get('user_id')
        days = int(request.query_params.get('days', 30))
        
        cutoff_date = timezone.now() - timedelta(days=days)
        logs = AuditLog.objects.filter(user_id=user_id, timestamp__gte=cutoff_date).order_by('-timestamp')
        
        serializer = self.get_serializer(logs, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def export_audit_trail(self, request):
        """Export audit logs as CSV"""
        from django.http import HttpResponse
        import csv
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="audit_trail.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Timestamp', 'User', 'Action', 'Resource Type', 'Resource ID', 'IP Address', 'Status'])
        
        queryset = self.filter_queryset(self.get_queryset())
        for log in queryset:
            writer.writerow([
                log.timestamp,
                log.user or 'System',
                log.get_action_display(),
                log.resource_type,
                log.resource_id or '',
                log.ip_address or '',
                log.status
            ])
        
        return response


class AccessControlViewSet(viewsets.ModelViewSet):
    """Access control management with approval workflows"""
    queryset = AccessControl.objects.all()
    serializer_class = AccessControlSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['user', 'resource_type', 'permission_type', 'active', 'enterprise']
    search_fields = ['user__first_name', 'user__last_name', 'resource_type']
    ordering_fields = ['-granted_date', 'user', 'expires_date']
    
    @action(detail=False, methods=['get'])
    def expired_access(self, request):
        """Get expired access controls that need renewal"""
        expired = AccessControl.objects.filter(expires_date__lt=timezone.now().date(), active=True)
        serializer = self.get_serializer(expired, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def pending_expiry(self, request):
        """Get access expiring in next 30 days"""
        thirty_days = timezone.now().date() + timedelta(days=30)
        pending = AccessControl.objects.filter(
            expires_date__lte=thirty_days,
            expires_date__gt=timezone.now().date(),
            active=True
        )
        serializer = self.get_serializer(pending, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def revoke_access(self, request):
        """Revoke access immediately"""
        access_ids = request.data.get('access_ids', [])
        count = AccessControl.objects.filter(id__in=access_ids).update(active=False)
        return Response({'revoked': count})


class SecurityIncidentViewSet(viewsets.ModelViewSet):
    """Security incident tracking and response"""
    queryset = SecurityIncident.objects.all()
    serializer_class = SecurityIncidentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['severity', 'status', 'external_reporting']
    search_fields = ['incident_id', 'title', 'affected_systems']
    ordering_fields = ['-report_date', 'severity', 'status']
    
    @action(detail=False, methods=['get'])
    def open_incidents(self, request):
        """Get all open security incidents"""
        open_states = ['reported', 'investigating', 'contained']
        incidents = SecurityIncident.objects.filter(status__in=open_states).order_by('-report_date')
        serializer = self.get_serializer(incidents, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """Update incident status"""
        incident = self.get_object()
        new_status = request.data.get('status')
        incident.status = new_status
        incident.save()
        return Response(self.get_serializer(incident).data)


class VulnerabilityRecordViewSet(viewsets.ModelViewSet):
    """Vulnerability tracking and patch management"""
    queryset = VulnerabilityRecord.objects.all()
    serializer_class = VulnerabilityRecordSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['severity', 'status', 'affected_component']
    search_fields = ['vulnerability_id', 'affected_component', 'title']
    ordering_fields = ['-published_date', 'severity', 'status']
    
    @action(detail=False, methods=['get'])
    def unpatched_vulnerabilities(self, request):
        """Get critical unpatched vulnerabilities"""
        unpatched = VulnerabilityRecord.objects.exclude(status='verified_fixed').filter(severity='critical')
        serializer = self.get_serializer(unpatched, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def patch_schedule(self, request):
        """Get vulnerability patch schedule"""
        scheduled = VulnerabilityRecord.objects.filter(status='scheduled').order_by('patch_date')
        serializer = self.get_serializer(scheduled, many=True)
        return Response(serializer.data)


class DataRetentionPolicyViewSet(viewsets.ModelViewSet):
    """Data retention policy management"""
    queryset = DataRetentionPolicy.objects.all()
    serializer_class = DataRetentionPolicySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['data_category', 'auto_purge_enabled']
    search_fields = ['policy_name', 'data_category']
    ordering_fields = ['-effective_date']


class EncryptionKeyRecordViewSet(viewsets.ModelViewSet):
    """Encryption key lifecycle management"""
    queryset = EncryptionKeyRecord.objects.all()
    serializer_class = EncryptionKeyRecordSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'algorithm']
    search_fields = ['key_id', 'application_name']
    ordering_fields = ['-created_date', 'next_rotation_date']
    
    @action(detail=False, methods=['get'])
    def due_for_rotation(self, request):
        """Get keys due for rotation"""
        today = date.today()
        due = EncryptionKeyRecord.objects.filter(next_rotation_date__lte=today, status='active')
        serializer = self.get_serializer(due, many=True)
        return Response(serializer.data)


class AccessRequestViewSet(viewsets.ModelViewSet):
    """Access request workflow management"""
    queryset = AccessRequest.objects.all()
    serializer_class = AccessRequestSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'request_date']
    search_fields = ['request_id', 'requester__first_name', 'requester__last_name']
    ordering_fields = ['-request_date', 'status']
    
    @action(detail=False, methods=['get'])
    def pending_approvals(self, request):
        """Get pending access requests for approval"""
        pending = AccessRequest.objects.filter(status='pending')
        serializer = self.get_serializer(pending, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve access request"""
        access_req = self.get_object()
        access_req.status = 'approved'
        access_req.approver = request.user
        access_req.approval_date = timezone.now()
        access_req.approval_notes = request.data.get('notes', '')
        access_req.save()
        return Response(self.get_serializer(access_req).data)
    
    @action(detail=True, methods=['post'])
    def deny(self, request, pk=None):
        """Deny access request"""
        access_req = self.get_object()
        access_req.status = 'denied'
        access_req.approver = request.user
        access_req.approval_date = timezone.now()
        access_req.approval_notes = request.data.get('notes', '')
        access_req.save()
        return Response(self.get_serializer(access_req).data)


class ComplianceDashboardViewSet(viewsets.ReadOnlyModelViewSet):
    """Real-time ISO 27001 compliance status"""
    queryset = ComplianceDashboard.objects.all()
    serializer_class = ComplianceDashboardSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def current_status(self, request):
        """Get current compliance status"""
        dashboard = ComplianceDashboard.objects.first() or ComplianceDashboard.objects.create()
        return Response(self.get_serializer(dashboard).data)
    
    @action(detail=False, methods=['post'])
    def refresh_metrics(self, request):
        """Refresh compliance metrics from current data"""
        from django.utils import timezone
        dashboard = ComplianceDashboard.objects.first() or ComplianceDashboard.objects.create()
        
        # Update metrics
        thirty_days_ago = timezone.now() - timedelta(days=30)
        dashboard.audit_logs_created_last_30_days = AuditLog.objects.filter(timestamp__gte=thirty_days_ago).count()
        dashboard.open_security_incidents = SecurityIncident.objects.filter(status__in=['reported', 'investigating']).count()
        dashboard.critical_vulnerabilities = VulnerabilityRecord.objects.filter(severity='critical').exclude(status='verified_fixed').count()
        dashboard.active_users = AccessControl.objects.filter(active=True).values('user').distinct().count()
        dashboard.save()
        
        return Response(self.get_serializer(dashboard).data)


# ==================== ISO 45001 VIEWSETS ====================

class OHSPolicyViewSet(viewsets.ModelViewSet):
    """OH&S Policy documentation management"""
    queryset = OHSPolicy.objects.all()
    serializer_class = OHSPolicySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['policy_code', 'title']
    ordering_fields = ['-effective_date', 'version']
    
    @action(detail=False, methods=['get'])
    def active_policies(self, request):
        """Get all active OH&S policies"""
        active = OHSPolicy.objects.filter(is_active=True)
        serializer = self.get_serializer(active, many=True)
        return Response(serializer.data)


class HazardRegisterViewSet(viewsets.ModelViewSet):
    """Hazard identification and control tracking"""
    queryset = HazardRegister.objects.all()
    serializer_class = HazardRegisterSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['enterprise', 'work_site', 'hazard_type', 'control_effectiveness', 'active']
    search_fields = ['hazard_id', 'description', 'location']
    ordering_fields = ['-identified_date', 'control_effectiveness']
    
    @action(detail=False, methods=['get'])
    def high_risk_hazards(self, request):
        """Get hazards with high residual risk"""
        hazards = HazardRegister.objects.filter(residual_risk_acceptable=False, active=True).order_by('-risk_score_after')
        serializer = self.get_serializer(hazards, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def due_for_review(self, request):
        """Get hazards due for review"""
        today = date.today()
        hazards = HazardRegister.objects.filter(next_review_date__lte=today)
        serializer = self.get_serializer(hazards, many=True)
        return Response(serializer.data)


class IncidentInvestigationViewSet(viewsets.ModelViewSet):
    """Incident investigation and CAPA tracking"""
    queryset = IncidentInvestigation.objects.all()
    serializer_class = IncidentInvestigationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'rca_method']
    search_fields = ['investigation_id']
    ordering_fields = ['-investigation_date', 'status']
    
    @action(detail=False, methods=['get'])
    def open_investigations(self, request):
        """Get investigations not yet closed"""
        open_states = ['reported', 'under_investigation', 'root_cause_identified', 'corrective_action_planned', 'corrective_action_implemented']
        investigations = IncidentInvestigation.objects.filter(status__in=open_states)
        serializer = self.get_serializer(investigations, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def overdue_capa(self, request):
        """Get corrective actions overdue for completion"""
        today = date.today()
        overdue = IncidentInvestigation.objects.filter(
            corrective_action_deadline__lt=today,
            corrective_action_implemented_date__isnull=True
        )
        serializer = self.get_serializer(overdue, many=True)
        return Response(serializer.data)


class SafetyTrainingViewSet(viewsets.ReadOnlyModelViewSet):
    """Safety training course catalog"""
    queryset = SafetyTraining.objects.all()
    serializer_class = SafetyTrainingSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['training_type', 'mandatory', 'delivery_method']
    search_fields = ['training_code', 'title']


class TrainingCertificationViewSet(viewsets.ModelViewSet):
    """Employee training records and certification"""
    queryset = TrainingCertification.objects.all()
    serializer_class = TrainingCertificationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['employee', 'training', 'status']
    search_fields = ['employee__first_name', 'employee__last_name']
    ordering_fields = ['-completion_date', 'expiry_date']
    
    @action(detail=False, methods=['get'])
    def expiring_certifications(self, request):
        """Get certifications expiring in next 30 days"""
        thirty_days = date.today() + timedelta(days=30)
        expiring = TrainingCertification.objects.filter(
            expiry_date__lte=thirty_days,
            expiry_date__gte=date.today(),
            status__in=['completed', 'renewal_due']
        )
        serializer = self.get_serializer(expiring, many=True)
        return Response(serializer.data)


class EmergencyProcedureViewSet(viewsets.ModelViewSet):
    """Emergency response procedures management"""
    queryset = EmergencyProcedure.objects.all()
    serializer_class = EmergencyProcedureSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['emergency_type', 'work_site']
    search_fields = ['procedure_code', 'title']


class EmergencyDrillViewSet(viewsets.ModelViewSet):
    """Emergency drill scheduling and results"""
    queryset = EmergencyDrill.objects.all()
    serializer_class = EmergencyDrillSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['procedure', 'effectiveness_rating']
    search_fields = ['drill_id']
    ordering_fields = ['-actual_date']
    
    @action(detail=False, methods=['get'])
    def overdue_drills(self, request):
        """Get drills overdue for completion"""
        today = date.today()
        overdue = EmergencyDrill.objects.filter(scheduled_date__lt=today, actual_date__isnull=True)
        serializer = self.get_serializer(overdue, many=True)
        return Response(serializer.data)


class HealthSurveillanceViewSet(viewsets.ModelViewSet):
    """Medical surveillance program monitoring"""
    queryset = HealthSurveillance.objects.all()
    serializer_class = HealthSurveillanceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['enterprise', 'program_type']
    search_fields = ['program_id', 'title']


class PerformanceIndicatorViewSet(viewsets.ModelViewSet):
    """OH&S performance indicators tracking"""
    queryset = PerformanceIndicator.objects.all()
    serializer_class = PerformanceIndicatorSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['indicator_type', 'measurement_frequency', 'trend']
    search_fields = ['indicator_code', 'indicator_name']
    
    @action(detail=False, methods=['get'])
    def out_of_bounds(self, request):
        """Get indicators outside acceptable bounds"""
        from django.db.models import Q
        out_of_bounds = PerformanceIndicator.objects.filter(
            Q(current_value__lt=F('acceptable_lower_bound')) |
            Q(current_value__gt=F('acceptable_upper_bound'))
        )
        serializer = self.get_serializer(out_of_bounds, many=True)
        return Response(serializer.data)


class ComplianceAuditViewSet(viewsets.ModelViewSet):
    """Compliance audit management"""
    queryset = ComplianceAudit.objects.all()
    serializer_class = ComplianceAuditSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['audit_type', 'enterprise']
    search_fields = ['audit_id']
    ordering_fields = ['-actual_date']


class ContractorQualificationViewSet(viewsets.ModelViewSet):
    """Third-party contractor safety management"""
    queryset = ContractorQualification.objects.all()
    serializer_class = ContractorQualificationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'work_site']
    search_fields = ['contractor_id', 'company_name']
    
    @action(detail=False, methods=['get'])  
    def pending_review(self, request):
        """Get contractors pending safety review"""
        pending = ContractorQualification.objects.filter(status='pending_review')
        serializer = self.get_serializer(pending, many=True)
        return Response(serializer.data)


class ManagementReviewViewSet(viewsets.ModelViewSet):
    """Management review record tracking"""
    queryset = ManagementReview.objects.all()
    serializer_class = ManagementReviewSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['enterprise', 'ohs_system_effectiveness']
    search_fields = ['review_id']
    ordering_fields = ['-review_date']


class WorkerFeedbackViewSet(viewsets.ModelViewSet):
    """Worker incident reporting and safety suggestions"""
    queryset = WorkerFeedback.objects.all()
    serializer_class = WorkerFeedbackSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['feedback_type', 'status']
    search_fields = ['feedback_id', 'title']
    ordering_fields = ['-submitted_date', 'status']
    
    @action(detail=False, methods=['get'])
    def unacknowledged(self, request):
        """Get feedback not yet acknowledged"""
        unacknowledged = WorkerFeedback.objects.filter(status='submitted')
        serializer = self.get_serializer(unacknowledged, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def acknowledge(self, request, pk=None):
        """Acknowledge worker feedback"""
        feedback = self.get_object()
        feedback.status = 'acknowledged'
        feedback.acknowledged_by = request.user
        feedback.acknowledged_date = timezone.now()
        feedback.acknowledgement_message = request.data.get('message', '')
        feedback.save()
        return Response(self.get_serializer(feedback).data)
