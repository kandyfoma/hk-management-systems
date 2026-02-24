"""
Surveillance Programs Views - DRF API Views

Django REST Framework ViewSets for surveillance program management,
enrollment tracking, violation handling, and compliance reporting.
"""

from rest_framework import viewsets, status, generics, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db.models import Q, Count, F, Sum
from datetime import datetime, timedelta

from .models import Worker, MedicalExamination
from .models_surveillance import (
    SurveillanceProgram,
    SurveillanceEnrollment,
    ThresholdViolation,
    ComplianceMetrics,
)
from .serializers_surveillance import (
    SurveillanceProgramSerializer,
    SurveillanceProgramListSerializer,
    SurveillanceEnrollmentSerializer,
    SurveillanceEnrollmentListSerializer,
    EnrollWorkerSerializer,
    ThresholdViolationSerializer,
    ThresholdViolationListSerializer,
    AcknowledgeViolationSerializer,
    ResolveViolationSerializer,
    CheckExamThresholdsSerializer,
    ComplianceMetricsSerializer,
    SurveillanceDashboardSerializer,
    ComplianceReportSerializer,
    TrendDataSerializer,
)


# ==================== PAGINATION ====================

class StandardPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 1000


# ==================== SURVEILLANCE PROGRAM VIEWSETS ====================

class SurveillanceProgramViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Surveillance Programs
    
    CRUD operations for surveillance program definitions.
    
    List: GET /surveillance/programs/
    Create: POST /surveillance/programs/
    Retrieve: GET /surveillance/programs/{id}/
    Update: PUT /surveillance/programs/{id}/
    Partial Update: PATCH /surveillance/programs/{id}/
    Delete: DELETE /surveillance/programs/{id}/
    """
    
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['enterprise', 'sector', 'is_active', 'status']
    search_fields = ['name', 'code', 'description']
    ordering_fields = ['name', 'created_at', '-updated_at']
    ordering = ['-updated_at']
    
    def get_queryset(self):
        """Filter by enterprise if user is limited to one"""
        queryset = SurveillanceProgram.objects.all()
        
        # Optional: filter by user's enterprise if role-based
        user = self.request.user
        if hasattr(user, 'enterprise') and user.enterprise:
            queryset = queryset.filter(enterprise=user.enterprise)
        
        return queryset.select_related('enterprise', 'created_by')
    
    def get_serializer_class(self):
        if self.action == 'list':
            return SurveillanceProgramListSerializer
        return SurveillanceProgramSerializer
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=False, methods=['get'])
    def by_sector(self, request):
        """Get programs grouped by sector"""
        sector = request.query_params.get('sector')
        if not sector:
            return Response(
                {'error': 'sector query parameter required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        programs = self.get_queryset().filter(sector=sector)
        serializer = SurveillanceProgramListSerializer(programs, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def enrollment_stats(self, request, pk=None):
        """Get enrollment statistics for a program"""
        program = self.get_object()
        
        enrollments = program.enrollments.all()
        active = enrollments.filter(is_active=True).count()
        inactive = enrollments.filter(is_active=False).count()
        compliant = enrollments.filter(compliance_status='compliant').count()
        overdue = enrollments.filter(compliance_status='overdue').count()
        
        data = {
            'program_id': program.id,
            'program_name': program.name,
            'total_enrollments': enrollments.count(),
            'active_enrollments': active,
            'inactive_enrollments': inactive,
            'compliant_workers': compliant,
            'overdue_workers': overdue,
            'non_compliant_workers': enrollments.filter(compliance_status='non_compliant').count(),
            'pending_workers': enrollments.filter(compliance_status='pending').count(),
        }
        return Response(data)


# ==================== ENROLLMENT VIEWSETS ====================

class SurveillanceEnrollmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Surveillance Enrollments
    
    Manage worker enrollments in surveillance programs.
    
    List: GET /surveillance/enrollments/
    Create: POST /surveillance/enrollments/
    Retrieve: GET /surveillance/enrollments/{id}/
    Update: PUT /surveillance/enrollments/{id}/
    """
    
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['program', 'worker', 'is_active', 'compliance_status']
    search_fields = ['worker__first_name', 'worker__last_name', 'program__name']
    ordering_fields = ['enrollment_date', 'next_screening_due', 'compliance_rate']
    ordering = ['-enrollment_date']
    
    def get_queryset(self):
        queryset = SurveillanceEnrollment.objects.all()
        
        # Filter by program if provided
        program_id = self.request.query_params.get('program_id')
        if program_id:
            queryset = queryset.filter(program_id=program_id)
        
        return queryset.select_related('program', 'worker', 'enrolled_by')
    
    def get_serializer_class(self):
        if self.action == 'list':
            return SurveillanceEnrollmentListSerializer
        return SurveillanceEnrollmentSerializer
    
    def perform_create(self, serializer):
        serializer.save(enrolled_by=self.request.user)
    
    @action(detail=False, methods=['post'])
    def enroll_worker(self, request):
        """Enroll a worker in a program"""
        serializer = EnrollWorkerSerializer(data=request.data)
        if serializer.is_valid():
            try:
                worker = Worker.objects.get(id=serializer.validated_data['worker_id'])
                program = SurveillanceProgram.objects.get(id=serializer.validated_data['program_id'])
                
                enrollment, created = SurveillanceEnrollment.objects.get_or_create(
                    program=program,
                    worker=worker,
                    defaults={
                        'enrolled_by': request.user,
                        'reason_for_enrollment': serializer.validated_data.get('reason_for_enrollment', ''),
                        'next_screening_due': (timezone.now() + timedelta(days=30*program.screening_interval_months)).date(),
                    }
                )
                
                if not created:
                    enrollment.is_active = True
                    enrollment.save()
                
                response_serializer = SurveillanceEnrollmentSerializer(enrollment)
                return Response(
                    response_serializer.data,
                    status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
                )
            except Exception as e:
                return Response(
                    {'error': str(e)},
                    status=status.HTTP_400_BAD_REQUEST
                )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def mark_screening_completed(self, request, pk=None):
        """Record completed screening for enrollment"""
        enrollment = self.get_object()
        enrollment.mark_screening_completed()
        
        serializer = SurveillanceEnrollmentSerializer(enrollment)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'])
    def overdue_screenings(self, request):
        """Get all workers with overdue screenings"""
        today = timezone.now().date()
        overdue = self.get_queryset().filter(
            next_screening_due__lt=today,
            is_active=True
        )
        
        serializer = SurveillanceEnrollmentListSerializer(overdue, many=True)
        return Response(serializer.data)


# ==================== THRESHOLD VIOLATION VIEWSETS ====================

class ThresholdViolationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Threshold Violations
    
    Manage and track threshold violations from medical exams.
    
    List: GET /surveillance/violations/
    Retrieve: GET /surveillance/violations/{id}/
    """
    
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['program', 'worker', 'severity', 'status']
    search_fields = ['worker__first_name', 'worker__last_name', 'parameter_tested']
    ordering_fields = ['violation_date', 'severity', 'status']
    ordering = ['-violation_date']
    
    def get_queryset(self):
        queryset = ThresholdViolation.objects.all()
        
        # Filter by status if provided
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        
        return queryset.select_related('program', 'worker', 'enrollment', 'resolved_by', 'acknowledged_by')
    
    def get_serializer_class(self):
        if self.action == 'list':
            return ThresholdViolationListSerializer
        return ThresholdViolationSerializer
    
    @action(detail=True, methods=['post'])
    def acknowledge(self, request, pk=None):
        """Acknowledge a violation"""
        violation = self.get_object()
        violation.acknowledge(request.user)
        
        serializer = ThresholdViolationSerializer(violation)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """Resolve a violation"""
        serializer = ResolveViolationSerializer(data=request.data)
        if serializer.is_valid():
            violation = self.get_object()
            violation.resolve(
                request.user,
                notes=serializer.validated_data.get('resolution_notes', '')
            )
            
            response_serializer = ThresholdViolationSerializer(violation)
            return Response(response_serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def open_violations(self, request):
        """Get all open violations"""
        open_violations = self.get_queryset().filter(status__in=['open', 'acknowledged', 'in_progress'])
        
        paginator = StandardPagination()
        page = paginator.paginate_queryset(open_violations, request)
        if page is not None:
            serializer = ThresholdViolationListSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)
        
        serializer = ThresholdViolationListSerializer(open_violations, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def critical_violations(self, request):
        """Get all critical violations"""
        critical = self.get_queryset().filter(
            severity='critical',
            status__in=['open', 'acknowledged']
        )
        
        serializer = ThresholdViolationListSerializer(critical, many=True)
        return Response(serializer.data)


# ==================== COMPLIANCE CHECK VIEWS ====================

class CheckExamThresholdsView(generics.GenericAPIView):
    """
    Check exam results against program thresholds
    
    POST /surveillance/check-thresholds/
    {
        "exam_id": 123,
        "program_id": 456
    }
    
    Returns violations found or empty list if compliant
    """
    
    permission_classes = [IsAuthenticated]
    serializer_class = CheckExamThresholdsSerializer
    
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            exam_id = serializer.validated_data['exam_id']
            program_id = serializer.validated_data['program_id']
            
            try:
                exam = MedicalExamination.objects.get(id=exam_id)
                program = SurveillanceProgram.objects.get(id=program_id)
                
                # Check thresholds and create violations if needed
                violations_data = self._check_and_create_violations(exam, program)
                
                return Response({
                    'exam_id': exam_id,
                    'program_id': program_id,
                    'violations': violations_data,
                    'overall_status': 'compliant' if not violations_data else 'non-compliant'
                }, status=status.HTTP_200_OK)
            
            except Exception as e:
                return Response(
                    {'error': str(e)},
                    status=status.HTTP_400_BAD_REQUEST
                )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def _check_and_create_violations(self, exam, program):
        """Check exam results and create violations"""
        violations_list = []
        
        # This is a placeholder - actual threshold checking logic would go here
        # In reality, you'd parse exam results (vital signs, spirometry, etc.)
        # and compare them against program action_levels
        
        try:
            enrollment = SurveillanceEnrollment.objects.get(
                worker=exam.worker,
                program=program
            )
            
            # Example: Check vital signs if available
            if hasattr(exam, 'vital_signs') and exam.vital_signs:
                vs = exam.vital_signs
                if program.action_levels.get('systolic_bp'):
                    threshold = program.action_levels['systolic_bp'].get('action')
                    if threshold and vs.systolic_bp > threshold:
                        violation = ThresholdViolation.objects.create(
                            enrollment=enrollment,
                            program=program,
                            worker=exam.worker,
                            related_exam=exam,
                            parameter_tested='Systolic BP',
                            measured_value=vs.systolic_bp,
                            unit_of_measurement='mmHg',
                            threshold_value=threshold,
                            threshold_type='action',
                            severity='action',
                            status='open',
                            action_required='Medical review recommended',
                        )
                        violations_list.append(ThresholdViolationListSerializer(violation).data)
        
        except SurveillanceEnrollment.DoesNotExist:
            pass
        
        return violations_list


# ==================== COMPLIANCE METRICS VIEWS ====================

class ComplianceMetricsViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for Compliance Metrics (Read-only)
    
    Get compliance metrics for surveillance programs.
    """
    
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['program', 'period']
    ordering_fields = ['-metrics_date']
    ordering = ['-metrics_date']
    
    def get_queryset(self):
        return ComplianceMetrics.objects.all().select_related('program')
    
    serializer_class = ComplianceMetricsSerializer


# ==================== SURVEILLANCE COMPLIANCE DASHBOARD VIEW ====================

class SurveillanceComplianceDashboardView(generics.GenericAPIView):
    """
    Surveillance Compliance Dashboard
    
    GET /surveillance/compliance-dashboard/
    
    Returns aggregated compliance metrics for all programs
    in the user's enterprise.
    """
    
    permission_classes = [IsAuthenticated]
    serializer_class = SurveillanceDashboardSerializer
    
    def get(self, request):
        try:
            from .models import Enterprise
            
            # Get enterprise (from user context or query parameter)
            enterprise_id = request.query_params.get('enterprise_id')
            
            if not enterprise_id:
                # Try to get from user's profile
                if hasattr(request.user, 'enterprise_id'):
                    enterprise_id = request.user.enterprise_id
                else:
                    return Response(
                        {'error': 'enterprise_id required'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            enterprise = Enterprise.objects.get(id=enterprise_id)
            programs = SurveillanceProgram.objects.filter(enterprise=enterprise)
            
            # Aggregate metrics
            total_programs = programs.count()
            total_enrollments = SurveillanceEnrollment.objects.filter(
                program__enterprise=enterprise
            ).count()
            total_violations = ThresholdViolation.objects.filter(
                program__enterprise=enterprise
            ).count()
            open_violations = ThresholdViolation.objects.filter(
                program__enterprise=enterprise,
                status__in=['open', 'acknowledged']
            ).count()
            
            # Calculate compliance rate
            compliant_count = SurveillanceEnrollment.objects.filter(
                program__enterprise=enterprise,
                compliance_status='compliant'
            ).count()
            overall_compliance_rate = (
                (compliant_count / total_enrollments * 100)
                if total_enrollments > 0 else 0
            )
            
            # Violations by severity
            violations_by_severity = ThresholdViolation.objects.filter(
                program__enterprise=enterprise
            ).values('severity').annotate(count=Count('id'))
            severity_dict = {v['severity']: v['count'] for v in violations_by_severity}
            
            # Violations by status
            violations_by_status = ThresholdViolation.objects.filter(
                program__enterprise=enterprise
            ).values('status').annotate(count=Count('id'))
            status_dict = {v['status']: v['count'] for v in violations_by_status}
            
            # Recent violations
            recent_violations = ThresholdViolation.objects.filter(
                program__enterprise=enterprise
            ).order_by('-violation_date')[:10]
            
            # Overdue by program
            today = timezone.now().date()
            overdue_by_program = {}
            for program in programs:
                overdue_count = program.enrollments.filter(
                    next_screening_due__lt=today,
                    is_active=True
                ).count()
                if overdue_count > 0:
                    overdue_by_program[program.name] = overdue_count
            
            data = {
                'total_programs': total_programs,
                'total_workers_enrolled': total_enrollments,
                'total_violations': total_violations,
                'open_violations_count': open_violations,
                'overall_compliance_rate': overall_compliance_rate,
                'programs_by_status': {},
                'violations_by_severity': severity_dict,
                'violations_by_status': status_dict,
                'recent_violations': ThresholdViolationListSerializer(recent_violations, many=True).data,
                'overdue_workers_by_program': overdue_by_program,
            }
            
            serializer = self.get_serializer(data)
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


# ==================== COMPLIANCE REPORT VIEW ====================

class ComplianceReportView(generics.GenericAPIView):
    """
    Generate Compliance Report
    
    POST /surveillance/compliance-report/
    {
        "program_id": 123,
        "start_date": "2026-01-01",
        "end_date": "2026-02-28",
        "format": "pdf"
    }
    """
    
    permission_classes = [IsAuthenticated]
    serializer_class = ComplianceReportSerializer
    
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            # Generate report (implementation depends on format)
            # For now, just return summary data
            
            program_id = serializer.validated_data.get('program_id')
            start_date = serializer.validated_data.get('start_date')
            end_date = serializer.validated_data.get('end_date')
            format_type = serializer.validated_data.get('format', 'json')
            
            try:
                program = SurveillanceProgram.objects.get(id=program_id)
                
                # Filter data by date range
                query = ThresholdViolation.objects.filter(program=program)
                if start_date:
                    query = query.filter(violation_date__gte=start_date)
                if end_date:
                    query = query.filter(violation_date__lte=end_date)
                
                # Generate report data
                report_data = {
                    'program': SurveillanceProgramSerializer(program).data,
                    'period': f"{start_date} to {end_date}" if start_date and end_date else "All time",
                    'total_violations': query.count(),
                    'violations_by_severity': list(
                        query.values('severity').annotate(count=Count('id'))
                    ),
                    'violations_by_status': list(
                        query.values('status').annotate(count=Count('id'))
                    ),
                }
                
                return Response(report_data, status=status.HTTP_200_OK)
            
            except Exception as e:
                return Response(
                    {'error': str(e)},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ==================== SURVEILLANCE TRENDS VIEW ====================

class SurveillanceTrendsView(generics.GenericAPIView):
    """
    Get Surveillance Trends
    
    GET /surveillance/trends/?program_id=123&months=6
    
    Returns historical trend data for compliance.
    """
    
    permission_classes = [IsAuthenticated]
    serializer_class = TrendDataSerializer
    
    def get(self, request):
        program_id = request.query_params.get('program_id')
        months = int(request.query_params.get('months', 6))
        
        try:
            program = SurveillanceProgram.objects.get(id=program_id)
        except SurveillanceProgram.DoesNotExist:
            return Response(
                {'error': 'Program not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Generate trend data for past N months
        trends = []
        for i in range(months, 0, -1):
            month_start = timezone.now().replace(day=1) - timedelta(days=30*i)
            month_end = month_start + timedelta(days=30)
            
            completed = SurveillanceEnrollment.objects.filter(
                program=program,
                last_screening_date__gte=month_start,
                last_screening_date__lte=month_end
            ).count()
            
            pending = SurveillanceEnrollment.objects.filter(
                program=program,
                compliance_status='pending'
            ).count()
            
            overdue = SurveillanceEnrollment.objects.filter(
                program=program,
                next_screening_due__lt=month_end,
                last_screening_date__lt=month_start
            ).count()
            
            violations = ThresholdViolation.objects.filter(
                program=program,
                violation_date__gte=month_start,
                violation_date__lte=month_end
            ).count()
            
            trends.append({
                'month': month_start.strftime('%b %Y'),
                'completed': completed,
                'pending': pending,
                'overdue': overdue,
                'violations': violations,
            })
        
        serializer = TrendDataSerializer(trends, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
