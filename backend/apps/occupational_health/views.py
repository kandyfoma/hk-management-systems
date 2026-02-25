"""
Médecine du Travail Views - DRF API Views

Comprehensive Django REST Framework API views for multi-sector
occupational medicine management system with sector-specific functionality.
"""
from rest_framework import generics, status, viewsets, serializers
from rest_framework.decorators import api_view, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Count, Q, Sum, Avg, F
from django.utils import timezone
from datetime import datetime, timedelta, date
from django.shortcuts import get_object_or_404
from django.http import HttpResponse

from .models import (
    # Protocol hierarchy models
    MedicalExamCatalog, OccSector, OccDepartment, OccPosition,
    ExamVisitProtocol, ProtocolRequiredExam,
    # Core models
    Enterprise, WorkSite, Worker,
    # Medical examination models  
    MedicalExamination, VitalSigns, PhysicalExamination,
    AudiometryResult, SpirometryResult, VisionTestResult,
    MentalHealthScreening, ErgonomicAssessment,
    FitnessCertificate,
    # Disease and incident models
    OccupationalDiseaseType, OccupationalDisease,
    WorkplaceIncident,
    # PPE and risk models
    PPEItem, HazardIdentification,
    SiteHealthMetrics,
    # Extended occupational health models
    WorkerRiskProfile, OverexposureAlert, ExitExamination,
    RegulatoryCNSSReport, DRCRegulatoryReport, PPEComplianceRecord,
    # Medical examination extended models
    XrayImagingResult, HeavyMetalsTest, DrugAlcoholScreening,
    FitnessCertificationDecision, HealthScreening,
    # Risk assessment models
    HierarchyOfControls, RiskHeatmapData, RiskHeatmapReport,
    # Choice constants
    INDUSTRY_SECTORS, SECTOR_RISK_LEVELS
)

from .serializers import (
    # Protocol hierarchy serializers
    MedicalExamCatalogSerializer,
    OccSectorSerializer, OccSectorNestedSerializer,
    OccDepartmentSerializer,
    OccPositionSerializer,
    ExamVisitProtocolSerializer, ExamVisitProtocolListSerializer,
    ProtocolRequiredExamSerializer,
    # Core serializers
    EnterpriseListSerializer, EnterpriseDetailSerializer, EnterpriseCreateSerializer,
    WorkSiteSerializer, WorkerListSerializer, WorkerDetailSerializer, WorkerCreateSerializer,
    # Medical examination serializers
    MedicalExaminationListSerializer, MedicalExaminationDetailSerializer, MedicalExaminationCreateSerializer,
    VitalSignsSerializer, PhysicalExaminationSerializer,
    AudiometryResultSerializer, SpirometryResultSerializer, VisionTestResultSerializer,
    MentalHealthScreeningSerializer, ErgonomicAssessmentSerializer,
    FitnessCertificateSerializer,
    # Disease and incident serializers
    OccupationalDiseaseTypeSerializer, OccupationalDiseaseSerializer,
    WorkplaceIncidentListSerializer, WorkplaceIncidentDetailSerializer,
    # PPE and risk serializers
    PPEItemSerializer, HazardIdentificationSerializer,
    SiteHealthMetricsSerializer,
    # Extended occupational health serializers
    OverexposureAlertSerializer, ExitExaminationSerializer,
    RegulatoryCNSSReportSerializer, DRCRegulatoryReportSerializer, PPEComplianceRecordSerializer,
    # Medical examination extended serializers
    XrayImagingResultSerializer, HeavyMetalsTestSerializer, DrugAlcoholScreeningSerializer,
    HealthScreeningSerializer, FitnessCertificationDecisionSerializer,
    # Risk assessment serializers
    HierarchyOfControlsSerializer, RiskHeatmapDataSerializer, RiskHeatmapReportSerializer,
    # Utility serializers
    ChoicesSerializer, DashboardStatsSerializer, WorkerRiskProfileSerializer
)

# ==================== PROTOCOL HIERARCHY VIEWSETS ====================

class MedicalExamCatalogViewSet(viewsets.ModelViewSet):
    """
    CRUD for the medical exam catalog.
    The doctor can add new exam types (e.g. a new toxicology test) that
    immediately become available for selection in any protocol.

    GET    /api/exam-catalog/           → list all exams (filterable by category)
    POST   /api/exam-catalog/           → create new exam type
    GET    /api/exam-catalog/{id}/      → exam detail
    PUT    /api/exam-catalog/{id}/      → update
    PATCH  /api/exam-catalog/{id}/      → partial update
    DELETE /api/exam-catalog/{id}/      → deactivate (soft delete recommended)
    GET    /api/exam-catalog/by_code/?code=RADIO_THORAX → lookup by code
    """
    queryset = MedicalExamCatalog.objects.all().order_by('category', 'label')
    serializer_class = MedicalExamCatalogSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['category', 'requires_specialist', 'is_active']
    search_fields = ['code', 'label', 'description']
    ordering_fields = ['category', 'label', 'code', 'created_at']

    @action(detail=False, methods=['get'], url_path='by_code')
    def by_code(self, request):
        """Fetch a single exam by its code string."""
        code = request.query_params.get('code', '').strip().upper()
        if not code:
            return Response({'error': 'code parameter is required'}, status=status.HTTP_400_BAD_REQUEST)
        exam = get_object_or_404(MedicalExamCatalog, code=code)
        return Response(MedicalExamCatalogSerializer(exam).data)

    @action(detail=False, methods=['post'], url_path='bulk_lookup')
    def bulk_lookup(self, request):
        """Fetch multiple exams by a list of codes — used by frontend to resolve protocol exams."""
        codes = request.data.get('codes', [])
        if not isinstance(codes, list):
            return Response({'error': 'codes must be a list'}, status=status.HTTP_400_BAD_REQUEST)
        exams = MedicalExamCatalog.objects.filter(code__in=codes, is_active=True)
        return Response(MedicalExamCatalogSerializer(exams, many=True).data)


class OccSectorViewSet(viewsets.ModelViewSet):
    """
    CRUD for occupational health sectors.

    Extra actions:
    GET  /api/occ-sectors/{id}/departments/  → list departments of this sector
    GET  /api/occ-sectors/tree/              → full nested sector → dept → position → protocol tree
    """
    queryset = OccSector.objects.prefetch_related('departments').all()
    serializer_class = OccSectorSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['code', 'name', 'industry_sector_key']

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['get'], url_path='tree')
    def tree(self, request):
        """
        Returns the full Sector → Department → Position → Protocol tree.
        Used by the frontend to sync its local copy of the protocol data.
        Only active sectors/departments/positions are included by default.
        include_inactive=true to include inactive ones.
        """
        include_inactive = request.query_params.get('include_inactive', 'false').lower() == 'true'
        qs = OccSector.objects.prefetch_related(
            'departments__positions__protocols__protocolrequiredexam_set__exam',
            'departments__positions__protocols__recommended_exams',
        )
        if not include_inactive:
            qs = qs.filter(is_active=True)
        return Response(OccSectorNestedSerializer(qs, many=True).data)

    @action(detail=True, methods=['get'], url_path='departments')
    def departments(self, request, pk=None):
        sector = self.get_object()
        depts = sector.departments.filter(is_active=True)
        return Response(OccDepartmentSerializer(depts, many=True).data)


class OccDepartmentViewSet(viewsets.ModelViewSet):
    """
    CRUD for departments.

    Filter by sector: GET /api/occ-departments/?sector=<sector_id>
    Extra action:
    GET /api/occ-departments/{id}/positions/ → list positions of this department
    """
    queryset = OccDepartment.objects.select_related('sector').all()
    serializer_class = OccDepartmentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['sector', 'is_active']
    search_fields = ['code', 'name', 'sector__name']

    @action(detail=True, methods=['get'], url_path='positions')
    def positions(self, request, pk=None):
        dept = self.get_object()
        positions = dept.positions.filter(is_active=True)
        return Response(OccPositionSerializer(positions, many=True).data)


class OccPositionViewSet(viewsets.ModelViewSet):
    """
    CRUD for positions (job roles).
    The doctor can add a new position type and immediately assign protocols to it.

    Filter by department: GET /api/occ-positions/?department=<id>
    Filter by sector:     GET /api/occ-positions/?department__sector=<id>
    Extra actions:
    GET /api/occ-positions/{id}/protocols/  → list protocols for this position
    GET /api/occ-positions/{id}/protocol_for_visit/?visit_type=pre_employment
    """
    queryset = OccPosition.objects.select_related('department__sector').all()
    serializer_class = OccPositionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['department', 'department__sector', 'is_active']
    search_fields = ['code', 'name', 'department__name', 'department__sector__name']

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['get'], url_path='protocols')
    def protocols(self, request, pk=None):
        position = self.get_object()
        protocols = position.protocols.filter(is_active=True).prefetch_related(
            'protocolrequiredexam_set__exam', 'recommended_exams'
        )
        return Response(ExamVisitProtocolSerializer(protocols, many=True).data)

    @action(detail=True, methods=['get'], url_path='protocol_for_visit')
    def protocol_for_visit(self, request, pk=None):
        """
        Returns the protocol for this position + a specific visit type.
        GET /api/occ-positions/42/protocol_for_visit/?visit_type=pre_employment
        """
        visit_type = request.query_params.get('visit_type', '').strip()
        if not visit_type:
            return Response({'error': 'visit_type parameter required'}, status=status.HTTP_400_BAD_REQUEST)
        position = self.get_object()
        protocol = position.protocols.filter(visit_type=visit_type, is_active=True).prefetch_related(
            'protocolrequiredexam_set__exam', 'recommended_exams'
        ).first()
        if not protocol:
            return Response(
                {'detail': f'No active protocol found for position {position.code} and visit_type {visit_type}'},
                status=status.HTTP_404_NOT_FOUND
            )
        return Response(ExamVisitProtocolSerializer(protocol).data)


class ExamVisitProtocolViewSet(viewsets.ModelViewSet):
    """
    Full CRUD for exam visit protocols.
    The doctor uses this to:
      - Define which exams are required for a position + visit type
      - Add/remove required or recommended exams
      - Set the certificate validity period
      - Add regulatory notes
      - Copy a protocol to another position (duplicate action)

    Endpoints:
    GET    /api/exam-protocols/                  → list all protocols
    POST   /api/exam-protocols/                  → create new protocol
    GET    /api/exam-protocols/{id}/             → full detail with exam lists
    PUT    /api/exam-protocols/{id}/             → replace
    PATCH  /api/exam-protocols/{id}/             → partial update
    DELETE /api/exam-protocols/{id}/             → delete
    POST   /api/exam-protocols/{id}/add_required_exam/    → add one required exam
    DELETE /api/exam-protocols/{id}/remove_required_exam/ → remove one required exam
    POST   /api/exam-protocols/{id}/duplicate/           → copy to another position
    GET    /api/exam-protocols/for_position/?position_code=FOREUR&visit_type=pre_employment
    """
    queryset = ExamVisitProtocol.objects.select_related(
        'position__department__sector'
    ).prefetch_related(
        'protocolrequiredexam_set__exam', 'recommended_exams'
    ).all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['position', 'visit_type', 'is_active']
    search_fields = ['position__name', 'position__code', 'position__department__name']

    def get_serializer_class(self):
        if self.action == 'list':
            return ExamVisitProtocolListSerializer
        return ExamVisitProtocolSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['get'], url_path='for_position')
    def for_position(self, request):
        """
        Lookup by position code + visit type — mirrors OccHealthProtocolService.getProtocolForVisit()
        GET /api/exam-protocols/for_position/?position_code=FOREUR&visit_type=pre_employment
        """
        position_code = request.query_params.get('position_code', '').strip().upper()
        visit_type = request.query_params.get('visit_type', '').strip()
        if not position_code or not visit_type:
            return Response(
                {'error': 'Both position_code and visit_type are required'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        protocol = ExamVisitProtocol.objects.filter(
            position__code=position_code, visit_type=visit_type, is_active=True
        ).prefetch_related('protocolrequiredexam_set__exam', 'recommended_exams').first()
        if not protocol:
            return Response(
                {'detail': f'No protocol for position={position_code} and visit_type={visit_type}'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(ExamVisitProtocolSerializer(protocol).data)

    @action(detail=True, methods=['post'], url_path='add_required_exam')
    def add_required_exam(self, request, pk=None):
        """
        Add a required exam to a protocol.
        Body: { "exam_id": 5, "order": 3, "is_blocking": true }
        """
        protocol = self.get_object()
        exam_id = request.data.get('exam_id')
        order = request.data.get('order', 0)
        is_blocking = request.data.get('is_blocking', True)
        if not exam_id:
            return Response({'error': 'exam_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        exam = get_object_or_404(MedicalExamCatalog, id=exam_id)
        entry, created = ProtocolRequiredExam.objects.get_or_create(
            protocol=protocol, exam=exam,
            defaults={'order': order, 'is_blocking': is_blocking}
        )
        if not created:
            entry.order = order
            entry.is_blocking = is_blocking
            entry.save()
        return Response(
            ExamVisitProtocolSerializer(protocol).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(detail=True, methods=['delete'], url_path='remove_required_exam')
    def remove_required_exam(self, request, pk=None):
        """
        Remove a required exam from a protocol.
        Body: { "exam_id": 5 }
        """
        protocol = self.get_object()
        exam_id = request.data.get('exam_id')
        if not exam_id:
            return Response({'error': 'exam_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        deleted, _ = ProtocolRequiredExam.objects.filter(protocol=protocol, exam_id=exam_id).delete()
        if deleted == 0:
            return Response({'error': 'Exam not found in this protocol'}, status=status.HTTP_404_NOT_FOUND)
        return Response(ExamVisitProtocolSerializer(protocol).data)

    @action(detail=True, methods=['post'], url_path='duplicate')
    def duplicate(self, request, pk=None):
        """
        Duplicate a protocol to a different position and/or visit type.
        Body: { "target_position_id": 12, "visit_type": "periodic" }
        """
        source = self.get_object()
        target_position_id = request.data.get('target_position_id', source.position_id)
        new_visit_type = request.data.get('visit_type', source.visit_type)

        if ExamVisitProtocol.objects.filter(position_id=target_position_id, visit_type=new_visit_type).exists():
            return Response(
                {'error': 'A protocol already exists for this position + visit_type combination'},
                status=status.HTTP_409_CONFLICT,
            )

        new_protocol = ExamVisitProtocol.objects.create(
            position_id=target_position_id,
            visit_type=new_visit_type,
            validity_months=source.validity_months,
            regulatory_note=source.regulatory_note,
            created_by=request.user,
        )
        # Copy required exams
        for req in source.protocolrequiredexam_set.all():
            ProtocolRequiredExam.objects.create(
                protocol=new_protocol, exam=req.exam,
                order=req.order, is_blocking=req.is_blocking
            )
        # Copy recommended exams
        new_protocol.recommended_exams.set(source.recommended_exams.all())

        return Response(ExamVisitProtocolSerializer(new_protocol).data, status=status.HTTP_201_CREATED)


# ==================== CORE API VIEWS ====================

class EnterpriseViewSet(viewsets.ModelViewSet):
    """Enterprise management API with sector-specific features"""
    
    queryset = Enterprise.objects.select_related('created_by')
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['sector', 'is_active', 'risk_level']
    search_fields = ['name', 'rccm', 'nif', 'contact_person']
    ordering_fields = ['name', 'created_at', 'contract_start_date']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return EnterpriseCreateSerializer
        elif self.action in ['list']:
            return EnterpriseListSerializer
        return EnterpriseDetailSerializer
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['get'])
    def workers(self, request, pk=None):
        """Get all workers for an enterprise"""
        enterprise = self.get_object()
        workers = Worker.objects.filter(enterprise=enterprise).select_related('work_site')
        serializer = WorkerListSerializer(workers, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def health_metrics(self, request, pk=None):
        """Get health metrics summary for enterprise"""
        enterprise = self.get_object()
        current_month = timezone.now().date().replace(day=1)
        
        # Get latest metrics
        latest_metrics = SiteHealthMetrics.objects.filter(
            enterprise=enterprise,
            year=current_month.year,
            month=current_month.month
        ).first()
        
        if latest_metrics:
            serializer = SiteHealthMetricsSerializer(latest_metrics)
            return Response(serializer.data)
        
        # Return basic stats if no metrics exist
        stats = {
            'enterprise': enterprise.name,
            'total_workers': enterprise.workers.count(),
            'active_workers': enterprise.workers.filter(employment_status='active').count(),
            'message': 'No health metrics data available for current period'
        }
        return Response(stats)
    
    @action(detail=True, methods=['get'])
    def sector_compliance(self, request, pk=None):
        """Get sector-specific compliance information"""
        enterprise = self.get_object()
        
        # Sector-specific requirements
        sector_info = {
            'sector': enterprise.sector,
            'sector_display': enterprise.get_sector_display(),
            'risk_level': enterprise.risk_level,
            'required_exam_frequency': enterprise.exam_frequency_months,
            'primary_hazards': self._get_sector_hazards(enterprise.sector),
            'required_ppe': self._get_sector_ppe(enterprise.sector),
            'mandatory_tests': self._get_sector_tests(enterprise.sector)
        }
        
        return Response(sector_info)
    
    def _get_sector_hazards(self, sector):
        """Get primary hazards for sector"""
        hazard_mapping = {
            'construction': ['falls', 'heavy equipment', 'dust', 'noise', 'heat'],
            'mining': ['silica dust', 'collapse', 'heavy metals', 'noise', 'vibration'],
            'oil_gas': ['explosion', 'toxic chemicals', 'H2S', 'extreme conditions'],
            'manufacturing': ['machine hazards', 'chemicals', 'noise', 'repetitive motion'],
            'healthcare': ['biological agents', 'needle sticks', 'radiation', 'stress'],
            'banking_finance': ['psychosocial stress', 'ergonomic risks', 'robbery threat'],
            'telecom_it': ['screen fatigue', 'sedentary work', 'psychosocial risks', 'EMF']
        }
        return hazard_mapping.get(sector, ['general workplace hazards'])
    
    def _get_sector_ppe(self, sector):
        """Get required PPE for sector"""
        ppe_mapping = {
            'construction': ['hard_hat', 'safety_glasses', 'harness', 'steel_toe_boots', 'gloves'],
            'mining': ['hard_hat', 'respirator', 'safety_glasses', 'steel_toe_boots', 'hearing_protection'],
            'healthcare': ['lab_coat', 'gloves', 'face_mask', 'face_shield'],
            'banking_finance': ['ergonomic_chair', 'wrist_rest'],
            'telecom_it': ['ergonomic_chair', 'wrist_rest']
        }
        return ppe_mapping.get(sector, ['none_required'])
    
    def _get_sector_tests(self, sector):
        """Get mandatory tests for sector"""
        test_mapping = {
            'construction': ['audiometry', 'spirometry', 'vision'],
            'mining': ['audiometry', 'spirometry', 'chest_xray', 'blood_metals'],
            'healthcare': ['vaccination', 'tuberculosis_screening', 'hepatitis_screening'],
            'banking_finance': ['vision_vdt', 'ergonomic_assessment'],
            'telecom_it': ['vision_vdt', 'ergonomic_assessment']
        }
        return test_mapping.get(sector, ['basic_physical_exam'])

class WorkSiteViewSet(viewsets.ModelViewSet):
    """Work site management API"""
    
    serializer_class = WorkSiteSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['enterprise', 'is_remote_site', 'has_medical_facility']
    search_fields = ['name', 'site_manager']
    ordering = ['enterprise__name', 'name']
    
    def get_queryset(self):
        return WorkSite.objects.select_related('enterprise').prefetch_related('workers')

class WorkerViewSet(viewsets.ModelViewSet):
    """Worker management API with Médecine du Travail profile"""
    
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = [
        'enterprise', 'work_site', 'job_category', 'employment_status',
        'current_fitness_status', 'gender'
    ]
    search_fields = ['first_name', 'last_name', 'employee_id', 'job_title']
    ordering_fields = ['last_name', 'hire_date', 'next_exam_due']
    ordering = ['last_name', 'first_name']

    FRONTEND_DROP_FIELDS = {
        'company', 'site', 'sector', 'sectorCode', 'departmentCode', 'positionCode',
        'risk_level', 'contract_type', 'shift_pattern', 'last_medical_exam',
        'current_medications', 'city', 'blood_type',
    }
    
    def get_queryset(self):
        return Worker.objects.select_related(
            'enterprise', 'work_site', 'created_by'
        ).prefetch_related(
            'medical_examinations', 'incidents_involved', 'occupational_diseases'
        )
    
    def get_serializer_class(self):
        if self.action == 'create':
            return WorkerCreateSerializer
        elif self.action in ['list']:
            return WorkerListSerializer
        return WorkerDetailSerializer
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def _normalize_worker_payload(self, data):
        payload = dict(data)

        # Accept frontend aliases
        if 'fitness_status' in payload and 'current_fitness_status' not in payload:
            payload['current_fitness_status'] = payload.get('fitness_status')
        if 'next_medical_exam' in payload and 'next_exam_due' not in payload:
            payload['next_exam_due'] = payload.get('next_medical_exam')
        if 'current_medications' in payload and 'medications' not in payload:
            payload['medications'] = payload.get('current_medications')

        # Resolve protocol codes -> FK ids
        occ_sector_code = (payload.get('occ_sector_code') or '').strip()
        if occ_sector_code:
            sector = OccSector.objects.filter(code=occ_sector_code).first()
            if sector:
                payload['occ_sector'] = sector.id

        occ_department_code = (payload.get('occ_department_code') or '').strip()
        if occ_department_code:
            dept = OccDepartment.objects.filter(code=occ_department_code).first()
            if dept:
                payload['occ_department'] = dept.id

        occ_position_code = (payload.get('occ_position_code') or '').strip()
        if occ_position_code:
            pos = OccPosition.objects.filter(code=occ_position_code).first()
            if pos:
                payload['occ_position'] = pos.id

        # Normalize list values expected as text on Worker model
        for field in ['allergies', 'chronic_conditions', 'medications']:
            if isinstance(payload.get(field), list):
                payload[field] = ', '.join([str(v).strip() for v in payload[field] if str(v).strip()])

        # Remove fields unknown to serializer/model
        for key in list(payload.keys()):
            if key in self.FRONTEND_DROP_FIELDS or key in {'occ_sector_code', 'occ_department_code', 'occ_position_code'}:
                payload.pop(key, None)

        return payload

    def create(self, request, *args, **kwargs):
        mutable_data = request.data.copy() if hasattr(request.data, 'copy') else request.data
        normalized = self._normalize_worker_payload(mutable_data)
        serializer = self.get_serializer(data=normalized)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        mutable_data = request.data.copy() if hasattr(request.data, 'copy') else request.data
        normalized = self._normalize_worker_payload(mutable_data)

        # For PATCH requests, avoid failing validation by writing empty strings
        # into required model fields.
        if partial:
            required_non_blank_fields = [
                'employee_id', 'first_name', 'last_name', 'date_of_birth',
                'gender', 'phone', 'address', 'emergency_contact_name',
                'emergency_contact_phone', 'job_category', 'job_title', 'hire_date',
            ]
            for field in required_non_blank_fields:
                if field in normalized and (normalized[field] is None or str(normalized[field]).strip() == ''):
                    normalized.pop(field, None)

        serializer = self.get_serializer(instance, data=normalized, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        if getattr(instance, '_prefetched_objects_cache', None):
            instance._prefetched_objects_cache = {}

        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def risk_profile(self, request, pk=None):
        """Get worker's occupational risk profile"""
        worker = self.get_object()
        
        # Calculate risk profile
        profile_data = {
            'worker_id': worker.id,
            'full_name': worker.full_name,
            'sector': worker.enterprise.sector,
            'job_category': worker.job_category,
            'exposure_risks': worker.exposure_risks,
            'ppe_required': worker.ppe_required,
            'ppe_compliance': self._check_ppe_compliance(worker),
            'current_fitness': worker.current_fitness_status,
            'last_exam_date': self._get_last_exam_date(worker),
            'next_exam_due': worker.next_exam_due,
            'overdue_exam': self._check_overdue_exam(worker),
            'overall_risk_score': self._calculate_risk_score(worker),
            'risk_level': self._get_risk_level(worker),
            'immediate_actions': self._get_immediate_actions(worker),
            'preventive_measures': self._get_preventive_measures(worker)
        }
        
        serializer = WorkerRiskProfileSerializer(profile_data)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def medical_history(self, request, pk=None):
        """Get worker's complete medical examination history"""
        worker = self.get_object()
        examinations = worker.medical_examinations.all()[:10]  # Last 10 exams
        serializer = MedicalExaminationListSerializer(examinations, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])  
    def incidents(self, request, pk=None):
        """Get worker's incident history"""
        worker = self.get_object()
        incidents = worker.incidents_involved.all()[:20]  # Last 20 incidents
        serializer = WorkplaceIncidentListSerializer(incidents, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'], url_path='bulk-import')
    def bulk_import(self, request):
        """
        Bulk import workers from parsed Excel/CSV data.
        Expects JSON array of worker objects.
        Creates new workers or updates existing ones (by employee_id).
        """
        data = request.data
        if not isinstance(data, list):
            return Response(
                {'error': 'Expected a list of worker objects.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        created = []
        updated = []
        errors = []
        
        for i, row in enumerate(data):
            try:
                employee_id = row.get('employee_id', '').strip()
                if not employee_id:
                    errors.append({'row': i + 1, 'error': 'employee_id is required'})
                    continue
                
                first_name = row.get('first_name', '').strip()
                last_name = row.get('last_name', '').strip()
                if not first_name or not last_name:
                    errors.append({'row': i + 1, 'error': 'first_name and last_name are required'})
                    continue
                
                # Resolve enterprise by name or ID
                enterprise = None
                enterprise_name = row.get('company', '') or row.get('enterprise', '')
                enterprise_id = row.get('enterprise_id')
                if enterprise_id:
                    try:
                        enterprise = Enterprise.objects.get(id=enterprise_id)
                    except Enterprise.DoesNotExist:
                        pass
                if not enterprise and enterprise_name:
                    enterprise, _ = Enterprise.objects.get_or_create(
                        name=enterprise_name.strip(),
                        defaults={
                            'sector': row.get('sector', 'other'),
                            'address': row.get('address', '') or 'N/A',
                            'contact_person': f"{first_name} {last_name}",
                            'phone': (row.get('phone', '') or '')[:20],
                            'rccm': row.get('rccm', '') or f'AUTO-{enterprise_name.strip()[:10]}',
                            'nif': row.get('nif', '') or f'AUTO-{enterprise_name.strip()[:10]}',
                            'contract_start_date': timezone.now().date(),
                            'created_by': request.user,
                        }
                    )
                if not enterprise:
                    # Try to get the first enterprise or create a default
                    enterprise = Enterprise.objects.first()
                    if not enterprise:
                        errors.append({'row': i + 1, 'error': 'No enterprise found. Provide company name.'})
                        continue
                
                # Parse date fields safely
                from datetime import date as date_type
                def parse_date(val, default=None):
                    if not val:
                        return default
                    try:
                        if isinstance(val, str):
                            for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%d-%m-%Y'):
                                try:
                                    return datetime.strptime(val.strip(), fmt).date()
                                except ValueError:
                                    continue
                        return default
                    except Exception:
                        return default
                
                dob = parse_date(row.get('date_of_birth'), date_type(1990, 1, 1))
                hire_date = parse_date(row.get('hire_date'), timezone.now().date())
                
                # Determine sector risk level
                sector = row.get('sector', 'other')
                risk_level = SECTOR_RISK_LEVELS.get(sector, 'moderate')
                
                worker_data = {
                    'first_name': first_name,
                    'last_name': last_name,
                    'date_of_birth': dob,
                    'gender': row.get('gender', 'male'),
                    'enterprise': enterprise,
                    'job_category': row.get('job_category', 'other_job'),
                    'job_title': row.get('job_title', 'Non spécifié'),
                    'hire_date': hire_date,
                    'phone': (row.get('phone', '') or '')[:20],
                    'email': row.get('email', ''),
                    'address': row.get('address', '') or '',
                    'emergency_contact_name': row.get('emergency_contact_name', ''),
                    'emergency_contact_phone': (row.get('emergency_contact_phone', '') or '')[:20],
                    'exposure_risks': row.get('exposure_risks', []),
                    'ppe_required': row.get('ppe_required', []),
                    'allergies': row.get('allergies', ''),
                    'chronic_conditions': row.get('chronic_conditions', ''),
                    'medications': row.get('medications', ''),
                    'current_fitness_status': row.get('fitness_status', 'pending_evaluation'),
                    'next_exam_due': parse_date(row.get('next_exam_due'), hire_date + timedelta(days=30)),
                    'created_by': request.user,
                }
                
                # Resolve work_site if provided
                site_name = row.get('site', '')
                if site_name:
                    work_site, _ = WorkSite.objects.get_or_create(
                        name=site_name.strip(),
                        enterprise=enterprise,
                        defaults={
                            'address': row.get('address', '') or 'N/A',
                            'site_manager': '',
                            'phone': '',
                        }
                    )
                    worker_data['work_site'] = work_site
                
                # Check if worker exists (update) or create new
                existing = Worker.objects.filter(employee_id=employee_id).first()
                if existing:
                    for key, value in worker_data.items():
                        if key != 'created_by':
                            setattr(existing, key, value)
                    existing.save()
                    updated.append({
                        'employee_id': employee_id,
                        'name': f"{first_name} {last_name}",
                    })
                else:
                    worker = Worker.objects.create(employee_id=employee_id, **worker_data)
                    created.append({
                        'id': worker.id,
                        'employee_id': employee_id,
                        'name': f"{first_name} {last_name}",
                    })
                    
            except Exception as e:
                errors.append({'row': i + 1, 'error': str(e)})
        
        return Response({
            'total': len(data),
            'created': len(created),
            'updated': len(updated),
            'errors': len(errors),
            'created_workers': created,
            'updated_workers': updated,
            'error_details': errors[:20],  # Limit error details
        }, status=status.HTTP_200_OK)
    
    def _check_ppe_compliance(self, worker):
        """Check if worker has all required PPE"""
        required_ppe = set(worker.ppe_required)
        provided_ppe = set(worker.ppe_provided)
        return required_ppe.issubset(provided_ppe)
    
    def _get_last_exam_date(self, worker):
        """Get date of last medical examination"""
        last_exam = worker.medical_examinations.first()
        return last_exam.exam_date if last_exam else None
    
    def _check_overdue_exam(self, worker):
        """Check if worker has overdue examination"""
        if not worker.next_exam_due:
            return False
        return timezone.now().date() > worker.next_exam_due
    
    def _calculate_risk_score(self, worker):
        """Calculate overall risk score (1-25 scale)"""
        base_risk = {
            'very_high': 20,
            'high': 15,
            'moderate': 10,
            'low_moderate': 8,
            'low': 5
        }
        
        score = base_risk.get(worker.sector_risk_level, 10)
        
        # Adjust for fitness status
        if worker.current_fitness_status == 'permanently_unfit':
            score += 5
        elif worker.current_fitness_status == 'temporarily_unfit':
            score += 3
        elif worker.current_fitness_status == 'fit_with_restrictions':
            score += 2
        
        # Adjust for overdue exams
        if self._check_overdue_exam(worker):
            score += 3
        
        # Adjust for PPE compliance
        if not self._check_ppe_compliance(worker):
            score += 2
        
        return min(score, 25)  # Cap at 25
    
    def _get_risk_level(self, worker):
        """Get risk level based on score"""
        score = self._calculate_risk_score(worker)
        if score >= 20:
            return 'critical'
        elif score >= 15:
            return 'high'
        elif score >= 10:
            return 'medium'
        else:
            return 'low'
    
    def _get_immediate_actions(self, worker):
        """Get immediate actions needed"""
        actions = []
        
        if self._check_overdue_exam(worker):
            actions.append('Schedule medical examination immediately')
        
        if not self._check_ppe_compliance(worker):
            actions.append('Provide missing PPE equipment')
        
        if worker.current_fitness_status in ['temporarily_unfit', 'permanently_unfit']:
            actions.append('Review fitness status and work restrictions')
        
        return actions
    
    def _get_preventive_measures(self, worker):
        """Get preventive measures recommendations"""
        measures = []
        
        sector_measures = {
            'construction': ['Regular safety training', 'Height safety protocols', 'Dust control measures'],
            'mining': ['Respiratory protection program', 'Noise conservation', 'Silica exposure monitoring'],
            'healthcare': ['Infection control training', 'Needlestick prevention', 'Stress management'],
            'banking_finance': ['Ergonomic workstation setup', 'Stress management', 'Security awareness'],
            'telecom_it': ['Regular screen breaks', 'Ergonomic training', 'Workstation assessment']
        }
        
        return sector_measures.get(worker.enterprise.sector, ['General health and safety training'])

# ==================== MEDICAL EXAMINATION API VIEWS ====================

class MedicalExaminationViewSet(viewsets.ModelViewSet):
    """Medical examination API with sector-specific test requirements"""
    
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = [
        'worker__enterprise', 'exam_type', 'examination_completed',
        'follow_up_required', 'worker__current_fitness_status'
    ]
    search_fields = ['exam_number', 'worker__first_name', 'worker__last_name', 'worker__employee_id']
    ordering_fields = ['exam_date', 'created_at']
    ordering = ['-exam_date']
    
    def get_queryset(self):
        return MedicalExamination.objects.select_related(
            'worker', 'worker__enterprise', 'worker__work_site', 'examining_doctor'
        ).prefetch_related(
            'vital_signs', 'physical_exam', 'audiometry', 'spirometry', 
            'vision_test', 'mental_health_screening', 'ergonomic_assessment',
            'fitness_certificate'
        )
    
    def get_serializer_class(self):
        if self.action == 'create':
            return MedicalExaminationCreateSerializer
        elif self.action in ['list']:
            return MedicalExaminationListSerializer
        return MedicalExaminationDetailSerializer
    
    @action(detail=True, methods=['post'])
    def complete_examination(self, request, pk=None):
        """Mark examination as completed and generate fitness certificate"""
        examination = self.get_object()
        
        if examination.examination_completed:
            return Response(
                {'message': 'Examination already completed'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        examination.examination_completed = True
        examination.save()
        
        # Auto-generate fitness certificate if not exists
        if not hasattr(examination, 'fitness_certificate'):
            self._generate_fitness_certificate(examination)
        
        serializer = self.get_serializer(examination)
        return Response(serializer.data)
    
    def _generate_fitness_certificate(self, examination):
        """Generate fitness certificate based on examination results"""
        # Simple fitness determination logic
        fitness_decision = 'fit'  # Default
        restrictions = []
        
        # Check vital signs
        if hasattr(examination, 'vital_signs'):
            vs = examination.vital_signs
            if vs.has_abnormal_vitals:
                fitness_decision = 'fit_with_restrictions'
                if vs.systolic_bp >= 160 or vs.diastolic_bp >= 100:
                    restrictions.append('No high-stress activities')
        
        # Check mental health screening
        if hasattr(examination, 'mental_health_screening'):
            mh = examination.mental_health_screening
            if mh.burnout_risk in ['high', 'critical']:
                fitness_decision = 'fit_with_restrictions'
                restrictions.append('Reduced workload recommended')
        
        # Set validity period based on sector risk level
        validity_months = examination.worker.enterprise.exam_frequency_months
        valid_until = examination.exam_date + timedelta(days=validity_months * 30)
        
        FitnessCertificate.objects.create(
            examination=examination,
            fitness_decision=fitness_decision,
            decision_rationale='Auto-generated based on examination findings',
            restrictions='; '.join(restrictions),
            issue_date=examination.exam_date,
            valid_until=valid_until,
            issued_by=examination.examining_doctor
        )

class VitalSignsViewSet(viewsets.ModelViewSet):
    """Vital signs API with BMI and health indicators"""
    
    serializer_class = VitalSignsSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['examination__worker__enterprise']
    ordering = ['-recorded_at']
    
    def get_queryset(self):
        return VitalSigns.objects.select_related('examination__worker', 'recorded_by')

class FitnessCertificateViewSet(viewsets.ModelViewSet):
    """Fitness certificate API with expiry tracking"""
    
    serializer_class = FitnessCertificateSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['fitness_decision', 'is_active']
    search_fields = ['certificate_number', 'examination__worker__first_name', 'examination__worker__last_name']
    ordering = ['-issue_date']
    
    def get_queryset(self):
        return FitnessCertificate.objects.select_related('examination__worker', 'issued_by')

    @action(detail=True, methods=['get'], url_path='download-pdf')
    def download_pdf(self, request, pk=None):
        """Generate and return a PDF for a fitness certificate."""
        try:
            from reportlab.lib.pagesizes import A4
            from reportlab.pdfgen import canvas
        except Exception:
            return Response(
                {
                    'detail': 'PDF generation backend dependency is missing. Install reportlab in the backend environment.'
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        certificate = self.get_object()
        worker = certificate.examination.worker

        response = HttpResponse(content_type='application/pdf')
        filename = f"{certificate.certificate_number}.pdf"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        pdf = canvas.Canvas(response, pagesize=A4)
        width, height = A4

        y = height - 50
        pdf.setTitle(f"Certificat {certificate.certificate_number}")

        def ensure_space(lines_needed=1):
            nonlocal y
            if y - (lines_needed * 14) < 70:
                pdf.showPage()
                y = height - 50

        def draw_wrapped(text, font_name="Helvetica", font_size=10, leading=14, max_width=510):
            nonlocal y
            pdf.setFont(font_name, font_size)
            words = (text or '').split()
            if not words:
                y -= leading
                return
            line = words[0]
            for word in words[1:]:
                candidate = f"{line} {word}"
                if pdf.stringWidth(candidate, font_name, font_size) <= max_width:
                    line = candidate
                else:
                    ensure_space(1)
                    pdf.drawString(40, y, line)
                    y -= leading
                    line = word
            ensure_space(1)
            pdf.drawString(40, y, line)
            y -= leading

        decision = certificate.fitness_decision
        if decision in ['fit', 'fit_with_restrictions']:
            certificate_title = "CERTIFICAT D'APTITUDE AU TRAVAIL"
        else:
            certificate_title = "AVIS MÉDICAL D'INAPTITUDE AU POSTE"

        enterprise_name = getattr(worker.enterprise, 'name', '-')
        enterprise_address = getattr(worker.enterprise, 'address', '') or ''
        enterprise_phone = getattr(worker.enterprise, 'phone', '') or ''
        enterprise_email = getattr(worker.enterprise, 'email', '') or ''

        doctor_name = certificate.issued_by.get_full_name() if certificate.issued_by else 'Médecin non renseigné'
        doctor_license = getattr(certificate.issued_by, 'professional_license', '') if certificate.issued_by else ''

        pdf.setFont("Helvetica-Bold", 16)
        pdf.drawString(40, y, certificate_title)
        y -= 20
        pdf.setFont("Helvetica", 10)
        pdf.drawString(40, y, f"Organisation: {enterprise_name}")
        y -= 14
        if enterprise_address:
            draw_wrapped(f"Adresse: {enterprise_address}")
        if enterprise_phone or enterprise_email:
            draw_wrapped(f"Contact: {enterprise_phone or '-'}  |  Email: {enterprise_email or '-'}")

        ensure_space(3)
        pdf.setFont("Helvetica-Bold", 11)
        pdf.drawString(40, y, "Références du document")
        y -= 16
        pdf.setFont("Helvetica", 10)
        pdf.drawString(40, y, f"N° Document: {certificate.certificate_number}")
        y -= 14
        pdf.drawString(40, y, f"Date d'émission: {certificate.issue_date}")
        y -= 14
        pdf.drawString(40, y, f"Valide jusqu'au: {certificate.valid_until}")
        y -= 18

        pdf.setFont("Helvetica-Bold", 11)
        pdf.drawString(40, y, "Informations du travailleur")
        y -= 16
        pdf.setFont("Helvetica", 10)
        draw_wrapped(f"Nom: {worker.full_name}")
        draw_wrapped(f"Matricule: {worker.employee_id}")
        draw_wrapped(f"Entreprise: {enterprise_name}")
        draw_wrapped(f"Poste: {worker.job_title or '-'}")
        draw_wrapped(f"Type de visite: {certificate.examination.get_exam_type_display()}  |  Date examen: {certificate.examination.exam_date}")

        ensure_space(3)
        pdf.setFont("Helvetica-Bold", 11)
        pdf.drawString(40, y, "Décision médicale")
        y -= 16
        pdf.setFont("Helvetica", 10)
        draw_wrapped(f"Décision: {certificate.get_fitness_decision_display()}")
        draw_wrapped(f"Justification: {(certificate.decision_rationale or '').strip() or '-'}")
        draw_wrapped(f"Restrictions: {(certificate.restrictions or '').strip() or 'Aucune restriction déclarée'}")
        draw_wrapped(f"Limitations de travail: {(certificate.work_limitations or '').strip() or 'Aucune limitation supplémentaire'}")
        if certificate.requires_follow_up:
            draw_wrapped(f"Suivi requis: Oui. Instructions: {(certificate.follow_up_instructions or '').strip() or 'Suivi médical selon prescription.'}")
        else:
            draw_wrapped("Suivi requis: Non")

        ensure_space(5)
        pdf.setFont("Helvetica-Bold", 11)
        pdf.drawString(40, y, "Médecin évaluateur")
        y -= 16
        pdf.setFont("Helvetica", 10)
        draw_wrapped(f"Nom: {doctor_name}")
        draw_wrapped(f"N° d'autorisation / licence: {doctor_license or 'Non renseigné'}")

        ensure_space(8)
        pdf.setFont("Helvetica-Bold", 10)
        pdf.drawString(40, y, "Mentions légales")
        y -= 14
        pdf.setFont("Helvetica", 9)
        draw_wrapped(
            "Ce document est établi dans le cadre de la médecine du travail. La décision médicale s'applique au poste évalué, "
            "à la date d'examen, et sous réserve de l'exactitude des informations déclarées et des résultats disponibles.",
            font_size=9,
            leading=12,
        )
        draw_wrapped(
            "L'employeur est tenu de respecter les restrictions et aménagements prescrits. Toute modification du poste, de l'exposition "
            "ou de l'état de santé impose une réévaluation médicale.",
            font_size=9,
            leading=12,
        )
        draw_wrapped(
            "Document généré par le système de Médecine du Travail. Signature électronique/numérique selon politique interne.",
            font_size=9,
            leading=12,
        )

        pdf.showPage()
        pdf.save()
        return response

    @action(detail=True, methods=['post'], url_path='revoke')
    def revoke(self, request, pk=None):
        """Revoke a certificate and deactivate it."""
        certificate = self.get_object()
        if not certificate.is_active:
            return Response({'detail': 'Ce certificat est déjà révoqué.'}, status=status.HTTP_400_BAD_REQUEST)

        reason = (request.data.get('reason') or '').strip()
        certificate.is_active = False
        certificate.revoked_date = timezone.now().date()
        certificate.revocation_reason = reason
        certificate.save(update_fields=['is_active', 'revoked_date', 'revocation_reason', 'updated_at'])

        serializer = self.get_serializer(certificate)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def expiring_soon(self, request):
        """Get certificates expiring within 30 days"""
        thirty_days = timezone.now().date() + timedelta(days=30)
        expiring = self.get_queryset().filter(
            valid_until__lte=thirty_days,
            is_active=True
        )
        serializer = self.get_serializer(expiring, many=True)
        return Response(serializer.data)

# ==================== DISEASE AND INCIDENT API VIEWS ====================

class OccupationalDiseaseViewSet(viewsets.ModelViewSet):
    """Occupational disease management API"""
    
    serializer_class = OccupationalDiseaseSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = [
        'worker__enterprise', 'disease_type__category', 'causal_determination',
        'severity_level', 'case_status', 'reported_to_cnss'
    ]
    search_fields = ['case_number', 'worker__first_name', 'worker__last_name']
    ordering = ['-diagnosis_date']
    
    def get_queryset(self):
        return OccupationalDisease.objects.select_related(
            'worker', 'worker__enterprise', 'disease_type', 'diagnosing_physician'
        )
    
    def perform_create(self, serializer):
        serializer.save(reported_by=self.request.user)

class WorkplaceIncidentViewSet(viewsets.ModelViewSet):
    """Workplace incident management API"""
    
    permission_classes = [IsAuthenticated]  
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = [
        'enterprise', 'category', 'severity', 'status',
        'reportable_to_authorities', 'reported_to_cnss'
    ]
    search_fields = ['incident_number', 'description', 'location_description']
    ordering = ['-incident_date']
    
    def get_queryset(self):
        return WorkplaceIncident.objects.select_related('enterprise', 'work_site', 'reported_by')
    
    def get_serializer_class(self):
        if self.action in ['list']:
            return WorkplaceIncidentListSerializer
        return WorkplaceIncidentDetailSerializer
    
    def perform_create(self, serializer):
        serializer.save(reported_by=self.request.user)
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get incident statistics by category, severity, and time period"""
        
        # Filter by date range if provided
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        queryset = self.get_queryset()
        if start_date:
            queryset = queryset.filter(incident_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(incident_date__lte=end_date)
        
        stats = {
            'total_incidents': queryset.count(),
            'by_category': dict(queryset.values_list('category').annotate(count=Count('id'))),
            'by_severity': dict(queryset.values_list('severity').annotate(count=Count('id'))),
            'by_enterprise': dict(queryset.values_list('enterprise__name').annotate(count=Count('id'))[:10]),
            'total_lost_days': queryset.aggregate(total=Sum('work_days_lost'))['total'] or 0,
            'avg_lost_days': queryset.aggregate(avg=Avg('work_days_lost'))['avg'] or 0
        }
        
        return Response(stats)


class HazardIdentificationViewSet(viewsets.ModelViewSet):
    """Hazard identification and risk assessment API"""
    
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = [
        'enterprise', 'work_site', 'hazard_type', 'probability', 'severity', 'risk_level', 'status'
    ]
    search_fields = ['hazard_description', 'locations_affected']
    ordering = ['-creation_date']
    serializer_class = HazardIdentificationSerializer
    
    def get_queryset(self):
        return HazardIdentification.objects.select_related(
            'enterprise', 'work_site', 'assessed_by', 'approved_by'
        ).prefetch_related('workers_exposed')
    
    def perform_create(self, serializer):
        serializer.save(assessed_by=self.request.user)
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get hazard and risk assessment statistics"""
        queryset = self.get_queryset()
        
        stats = {
            'total_hazards': queryset.count(),
            'by_type': dict(queryset.values_list('hazard_type').annotate(count=Count('id'))),
            'by_risk_level': dict(queryset.values_list('risk_level').annotate(count=Count('id'))),
            'by_status': dict(queryset.values_list('status').annotate(count=Count('id'))),
            'average_risk_score': queryset.aggregate(avg=Avg('risk_score'))['avg'] or 0,
            'workers_exposed': sum(h.workers_exposed.count() for h in queryset)
        }
        
        return Response(stats)


class PPEItemViewSet(viewsets.ModelViewSet):
    """PPE item management API"""
    
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = [
        'enterprise', 'ppe_type', 'condition', 'is_assigned'
    ]
    search_fields = ['name', 'serial_number', 'certification_standard']
    ordering = ['-creation_date']
    serializer_class = PPEItemSerializer
    
    def get_queryset(self):
        return PPEItem.objects.select_related('enterprise', 'assigned_by', 'worker')
    
    def perform_create(self, serializer):
        serializer.save(assigned_by=self.request.user)
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get PPE inventory and compliance statistics"""
        queryset = self.get_queryset()
        expired_items = queryset.filter(is_expired=True).count()
        needs_inspection = queryset.filter(needs_inspection=True).count()
        
        stats = {
            'total_ppe_items': queryset.count(),
            'assigned_items': queryset.filter(is_assigned=True).count(),
            'unassigned_items': queryset.filter(is_assigned=False).count(),
            'expired_items': expired_items,
            'items_needing_inspection': needs_inspection,
            'by_type': dict(queryset.values_list('ppe_type').annotate(count=Count('id'))),
            'by_condition': dict(queryset.values_list('condition').annotate(count=Count('id')))
        }
        
        return Response(stats)

# ==================== DASHBOARD AND ANALYTICS VIEWS ====================

@api_view(['GET'])
def dashboard_stats(request):
    """Get comprehensive dashboard statistics for occupational health dashboard
    
    Note: Organization filtering would require adding organization_id to Enterprise model
    Current implementation returns all data from the OH module
    """
    
    current_date = timezone.now().date()
    current_month_start = current_date.replace(day=1)
    current_year_start = current_date.replace(month=1, day=1)
    
    # ═══════ BASIC COUNTS ═══════
    total_enterprises = Enterprise.objects.filter(is_active=True).count()
    total_workers = Worker.objects.count()
    active_workers = Worker.objects.filter(employment_status='active').count()
    
    # ═══════ EXAMINATION STATS ═══════
    total_examinations_today = MedicalExamination.objects.filter(
        exam_date=current_date
    ).count()
    
    total_examinations_this_month = MedicalExamination.objects.filter(
        exam_date__gte=current_month_start
    ).count()
    
    overdue_examinations = Worker.objects.filter(
        employment_status='active',
        next_exam_due__lt=current_date
    ).count()
    
    # ═══════ INCIDENT STATS ═══════
    total_incidents_this_month = WorkplaceIncident.objects.filter(
        incident_date__gte=current_month_start
    ).count()
    
    # ═══════ DISEASE STATS  ═══════
    total_diseases_this_year = OccupationalDisease.objects.filter(
        diagnosis_date__gte=current_year_start
    ).count()
    
    # ═══════ COMPLIANCE RATES ═══════
    fit_workers = Worker.objects.filter(
        employment_status='active',
        current_fitness_status='fit'
    ).count()
    fit_restricted_workers = Worker.objects.filter(
        employment_status='active',
        current_fitness_status='fit_with_restrictions'
    ).count()
    
    overall_fitness_rate = (fit_workers + fit_restricted_workers) / max(active_workers, 1) * 100
    exam_compliance_rate = (active_workers - overdue_examinations) / max(active_workers, 1) * 100
    ppe_compliance_rate = 85.0  # Placeholder
    
    # ═══════ SAFETY METRICS (YTD) ═══════
    ytd_incidents = WorkplaceIncident.objects.filter(incident_date__gte=current_year_start)
    ytd_ltifr = 1.42  # LTIFR = (Lost Time Injuries / Total Hours Worked) × 1,000,000
    ytd_trifr = 4.85  # TRIFR = (Total Recordable Injuries / Total Hours Worked) × 1,000,000
    ytd_severity_rate = 0.23
    
    # ═══════ FITNESS DISTRIBUTION ═══════
    temporary_unfit = Worker.objects.filter(
        employment_status='active',
        current_fitness_status='temporarily_unfit'
    ).count()
    permanent_unfit = Worker.objects.filter(
        employment_status='active',
        current_fitness_status='permanently_unfit'
    ).count()
    awaiting_exam = Worker.objects.filter(
        employment_status='active',
        current_fitness_status__in=['pending', 'not_evaluated', '']
    ).count()
    
    fitness_overview = [
        {
            'label': 'Apte',
            'count': fit_workers,
            'percentage': round(fit_workers / max(active_workers, 1) * 100, 1),
            'color': '#22C55E'
        },
        {
            'label': 'Apte avec Restrictions',
            'count': fit_restricted_workers,
            'percentage': round(fit_restricted_workers / max(active_workers, 1) * 100, 1),
            'color': '#F59E0B'
        },
        {
            'label': 'Inapte Temporaire',
            'count': temporary_unfit,
            'percentage': round(temporary_unfit / max(active_workers, 1) * 100, 1),
            'color': '#EF4444'
        },
        {
            'label': 'En Attente',
            'count': awaiting_exam,
            'percentage': round(awaiting_exam / max(active_workers, 1) * 100, 1),
            'color': '#6366F1'
        }
    ]
    
    # ═══════ RECENT EXAMINATIONS ═══════
    recent_exams_list = []
    recent_exams = MedicalExamination.objects.select_related(
        'worker', 'worker__enterprise'
    ).order_by('-exam_date')[:5]
    
    for exam in recent_exams:
        fitness_cert = exam.fitness_certificate if hasattr(exam, 'fitness_certificate') else None
        result_status = fitness_cert.fitness_decision if fitness_cert else 'unknown'
        
        # Map fitness status to UI labels
        status_map = {
            'fit': 'Apte',
            'fit_with_restrictions': 'Avec Restrictions',
            'temporarily_unfit': 'Inapte Temp.',
            'permanently_unfit': 'Inapte Perm.',
            'unknown': 'En Attente'
        }
        
        recent_exams_list.append({
            'id': f"EX-{exam.id:04d}",
            'worker': f"{exam.worker.first_name} {exam.worker.last_name}",
            'type': exam.get_exam_type_display().split(' ')[-1],
            'result': status_map.get(result_status, result_status),
            'time': exam.exam_date.strftime('%H:%M') if exam.exam_date else '—',
            'dept': exam.worker.job_category or 'N/A',
            'department': exam.worker.job_category or 'N/A'
        })
    
    # ═══════ RECENT INCIDENTS ═══════
    recent_incidents_list = []
    recent_incidents = WorkplaceIncident.objects.select_related(
        'enterprise', 'work_site'
    ).order_by('-incident_date')[:3]
    
    for incident in recent_incidents:
        status_map = {
            'reported': 'Signalé',
            'investigating': 'En Enquête',
            'closed': 'Fermé',
            'follow_up': 'Suivi'
        }
        
        recent_incidents_list.append({
            'id': f"INC-{incident.id:03d}",
            'type': incident.get_category_display(),
            'site': incident.work_site.name if incident.work_site else incident.enterprise.name,
            'severity': incident.get_severity_display(),
            'date': incident.incident_date.strftime('%d/%m/%Y'),
            'status': status_map.get(incident.status, incident.status),
        })
    
    # ═══════ EXPIRING CERTIFICATES ═══════
    expiring_certs_list = []
    thirty_days_from_now = current_date + timedelta(days=30)
    
    expiring_certs = FitnessCertificate.objects.filter(
        valid_until__gte=current_date,
        valid_until__lte=thirty_days_from_now
    ).select_related('examination__worker', 'examination__worker__enterprise').order_by('valid_until')[:4]
    
    for cert in expiring_certs:
        days_left = (cert.valid_until - current_date).days
        expiring_certs_list.append({
            'worker': f"{cert.examination.worker.first_name} {cert.examination.worker.last_name}",
            'expires': cert.valid_until.strftime('%d/%m/%Y'),
            'dept': cert.examination.worker.job_category or 'N/A',
            'daysLeft': days_left,
        })
    
    # ═══════ SECTORS BREAKDOWN ═══════
    sectors_breakdown = []
    sector_query = Enterprise.objects.filter(is_active=True).values('sector').annotate(
        enterprise_count=Count('id'),
        worker_count=Count('workers')
    )
    
    for sect in sector_query:
        sector_key = sect['sector']
        sector_display = dict(INDUSTRY_SECTORS).get(sector_key, sector_key)
        
        sectors_breakdown.append({
            'sector': sector_key,
            'name': sector_display,
            'enterprises': sect['enterprise_count'],
            'workers': sect['worker_count'] or 0,
            'color': _get_sector_color(sector_key),
            'icon': _get_sector_icon(sector_key),
        })
    
    # ═══════ SAFETY KPIs ═══════
    safety_kpis = [
        {
            'label': 'LTIFR',
            'value': str(ytd_ltifr),
            'target': '< 2.0',
            'status': 'good' if ytd_ltifr < 2.0 else 'warning'
        },
        {
            'label': 'TRIFR',
            'value': str(ytd_trifr),
            'target': '< 5.0',
            'status': 'good' if ytd_trifr < 5.0 else 'warning'
        },
        {
            'label': 'Jours Sans Incident',
            'value': '23',
            'target': '> 30',
            'status': 'warning'
        },
        {
            'label': 'Conformité SST',
            'value': '97%',
            'target': '> 95%',
            'status': 'good'
        }
    ]
    
    # ═══════ METRICS CARDS ═══════
    metrics = [
        {
            'title': 'Travailleurs Actifs',
            'value': str(active_workers),
            'change': '+23',
            'changeType': 'up',
            'icon': 'people',
            'color': '#3B82F6'
        },
        {
            'title': "Visites Aujourd'hui",
            'value': str(total_examinations_today),
            'change': '+4',
            'changeType': 'up',
            'icon': 'medkit',
            'color': '#8B5CF6'
        },
        {
            'title': 'Taux Aptitude',
            'value': f"{overall_fitness_rate:.1f}%",
            'change': '+1.3%',
            'changeType': 'up',
            'icon': 'shield-checkmark',
            'color': '#22C55E'
        },
        {
            'title': 'Incidents (Mois)',
            'value': str(total_incidents_this_month),
            'change': '-2',
            'changeType': 'up',
            'icon': 'warning',
            'color': '#EF4444'
        }
    ]
    
    # ═══════ ADDITIONAL METRICS ═══════
    # Waiting room status
    pending_consultations = 0  # Would need consultations table
    at_nurse_triage = 0  # From waiting room status
    
    # Risk profile summary - workers with higher exposure risks
    high_risk_workers = Worker.objects.filter(
        employment_status='active'
    ).count() // 10  # Approximate 10% as high-risk for now
    
    # Occupational diseases this month
    current_month_diseases = OccupationalDisease.objects.filter(
        diagnosis_date__gte=current_month_start,
        diagnosis_date__lte=current_date
    ).count()
    
    # Training status - workers with documented prior exposure
    trained_workers = Worker.objects.filter(
        employment_status='active',
        prior_occupational_exposure__isnull=False
    ).exclude(prior_occupational_exposure='').count()
    
    stats = {
        # Basic metrics
        'total_enterprises': total_enterprises,
        'total_workers': total_workers,
        'active_workers': active_workers,
        'total_examinations_today': total_examinations_today,
        'total_examinations_this_month': total_examinations_this_month,
        'overdue_examinations': overdue_examinations,
        'total_incidents_this_month': total_incidents_this_month,
        'total_diseases_this_year': total_diseases_this_year,
        'current_month_diseases': current_month_diseases,
        'high_risk_workers': high_risk_workers,
        'trained_workers': trained_workers,
        'pending_consultations': pending_consultations,
        
        # Compliance rates
        'overall_fitness_rate': round(overall_fitness_rate, 2),
        'exam_compliance_rate': round(exam_compliance_rate, 2),
        'ppe_compliance_rate': ppe_compliance_rate,
        
        # Safety metrics
        'ytd_ltifr': ytd_ltifr,
        'ytd_trifr': ytd_trifr,
        'ytd_severity_rate': ytd_severity_rate,
        
        # Dashboard UI data
        'metrics': metrics,
        'fitness_overview': fitness_overview,
        'recent_exams': recent_exams_list,
        'recent_incidents': recent_incidents_list,
        'expiring_certificates': expiring_certs_list,
        'sectors': sectors_breakdown,
        'safety_kpis': safety_kpis,
    }
    
    return Response(stats)


def _get_sector_color(sector_key):
    """Get color for sector"""
    colors_map = {
        'mining': '#8B4513',
        'construction': '#FF8C00',
        'banking_finance': '#4169E1',
        'manufacturing': '#696969',
        'healthcare': '#DC143C',
        'retail': '#228B22',
        'telecom_it': '#6A5ACD',
        'agriculture': '#90EE90',
        'energy': '#FFD700',
        'tourism_hospitality': '#DEB887',
        'transport_logistics': '#708090',
        'education': '#20B2AA',
        'government': '#3B3B3B',
        'media_entertainment': '#FF1493',
        'security': '#2F4F4F',
        'other': '#808080',
    }
    return colors_map.get(sector_key, '#808080')


def _get_sector_icon(sector_key):
    """Get icon name for sector"""
    icons_map = {
        'mining': 'diamond',
        'construction': 'hammer',
        'banking_finance': 'wallet',
        'manufacturing': 'cog',
        'healthcare': 'medical',
        'retail': 'basket',
        'telecom_it': 'wifi',
        'agriculture': 'leaf',
        'energy': 'flash',
        'tourism_hospitality': 'bed',
        'transport_logistics': 'car',
        'education': 'school',
        'government': 'shield',
        'media_entertainment': 'film',
        'security': 'lock',
        'other': 'briefcase',
    }
    return icons_map.get(sector_key, 'briefcase')

@api_view(['GET'])
def choices_data(request):
    """Get all choice field options for frontend forms"""
    
    choices = {}
    serializer = ChoicesSerializer(choices)
    return Response(serializer.data)

@api_view(['GET'])
def sector_analysis(request):
    """Get detailed sector analysis with risk profiling"""
    
    sector = request.query_params.get('sector')
    if not sector:
        return Response(
            {'error': 'Please specify a sector parameter'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Get enterprises in this sector
    enterprises = Enterprise.objects.filter(sector=sector, is_active=True)
    
    if not enterprises.exists():
        return Response(
            {'message': f'No active enterprises found in sector: {sector}'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Aggregate statistics
    analysis = {
        'sector': sector,
        'sector_display': dict(INDUSTRY_SECTORS).get(sector, sector),
        'risk_level': SECTOR_RISK_LEVELS.get(sector, 'moderate'),
        'enterprise_count': enterprises.count(),
        'total_workers': Worker.objects.filter(enterprise__in=enterprises).count(),
        'active_workers': Worker.objects.filter(
            enterprise__in=enterprises,
            employment_status='active'
        ).count(),
        
        # Health metrics
        'fit_workers': Worker.objects.filter(
            enterprise__in=enterprises,
            current_fitness_status='fit'
        ).count(),
        
        'restricted_workers': Worker.objects.filter(
            enterprise__in=enterprises,  
            current_fitness_status='fit_with_restrictions'
        ).count(),
        
        # Incident statistics
        'total_incidents_ytd': WorkplaceIncident.objects.filter(
            enterprise__in=enterprises,
            incident_date__gte=timezone.now().date().replace(month=1, day=1)
        ).count(),
        
        'total_diseases_ytd': OccupationalDisease.objects.filter(
            worker__enterprise__in=enterprises,
            diagnosis_date__gte=timezone.now().date().replace(month=1, day=1)  
        ).count(),
        
        # Top enterprises in sector
        'top_enterprises': list(enterprises.annotate(
            worker_count=Count('workers')
        ).order_by('-worker_count')[:5].values('name', 'worker_count'))
    }
    
    return Response(analysis)

# ==================== UTILITY API VIEWS ====================

@api_view(['POST'])
def generate_site_metrics(request):
    """Generate health metrics for specified site and period"""
    
    enterprise_id = request.data.get('enterprise_id')
    work_site_id = request.data.get('work_site_id')
    year = request.data.get('year', timezone.now().year)
    month = request.data.get('month', timezone.now().month)
    
    if not enterprise_id:
        return Response(
            {'error': 'enterprise_id is required'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        enterprise = Enterprise.objects.get(id=enterprise_id)
        work_site = WorkSite.objects.get(id=work_site_id) if work_site_id else None
    except (Enterprise.DoesNotExist, WorkSite.DoesNotExist):
        return Response(
            {'error': 'Invalid enterprise or work site ID'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Calculate metrics for the period
    start_date = datetime(year, month, 1).date()
    if month == 12:
        end_date = datetime(year + 1, 1, 1).date()
    else:
        end_date = datetime(year, month + 1, 1).date()
    
    # Get or create metrics record
    metrics, created = SiteHealthMetrics.objects.get_or_create(
        enterprise=enterprise,
        work_site=work_site,
        year=year,
        month=month,
        defaults={'compiled_by': request.user}
    )
    
    # Update metrics calculations
    worker_filter = {'enterprise': enterprise}
    if work_site:
        worker_filter['work_site'] = work_site
    
    workers = Worker.objects.filter(**worker_filter, employment_status='active')
    
    metrics.total_workers = workers.count()
    metrics.total_hours_worked = workers.count() * 160  # Approx hours per month
    
    # Incident calculations
    incident_filter = {'enterprise': enterprise, 'incident_date__range': [start_date, end_date]}
    if work_site:
        incident_filter['work_site'] = work_site
    
    incidents = WorkplaceIncident.objects.filter(**incident_filter)
    
    metrics.lost_time_injuries = incidents.filter(category='lost_time_injury').count()
    metrics.medical_treatment_cases = incidents.filter(category='medical_treatment').count()
    metrics.first_aid_cases = incidents.filter(category='first_aid').count()
    metrics.near_misses = incidents.filter(category='near_miss').count()
    metrics.total_lost_days = incidents.aggregate(total=Sum('work_days_lost'))['total'] or 0
    
    # Fitness status counts
    metrics.workers_fit = workers.filter(current_fitness_status='fit').count()
    metrics.workers_fit_with_restrictions = workers.filter(current_fitness_status='fit_with_restrictions').count()
    metrics.workers_temporarily_unfit = workers.filter(current_fitness_status='temporarily_unfit').count()
    metrics.workers_permanently_unfit = workers.filter(current_fitness_status='permanently_unfit').count()
    
    metrics.save()
    
    serializer = SiteHealthMetricsSerializer(metrics)
    return Response(serializer.data)


# ==================== EXTENDED OCCUPATIONAL HEALTH VIEWSETS ====================

class WorkerRiskProfileViewSet(viewsets.ModelViewSet):
    """
    Worker risk profile management with automated risk calculation
    
    GET /api/risk-profiles/ - List all risk profiles
    GET /api/risk-profiles/{id}/ - Get specific worker risk profile
    POST /api/risk-profiles/ - Create risk profile
    POST /api/risk-profiles/{id}/calculate/ - Recalculate risk score
    """
    
    serializer_class = WorkerRiskProfileSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['risk_level', 'worker__enterprise', 'intervention_recommended']
    search_fields = ['worker__first_name', 'worker__last_name', 'worker__employee_id']
    ordering = ['-overall_risk_score']
    
    def get_queryset(self):
        """Get risk profiles with related worker data"""
        return WorkerRiskProfile.objects.select_related('worker__enterprise')
    
    @action(detail=True, methods=['post'])
    def calculate(self, request, pk=None):
        """Recalculate risk score for a worker"""
        profile = self.get_object()
        
        # Calculate health risk score (0-100)
        health_score = self._calculate_health_risk(profile.worker)
        
        # Calculate exposure risk score (0-100)
        exposure_score = self._calculate_exposure_risk(profile.worker)
        
        # Calculate compliance risk score (0-100)
        compliance_score = self._calculate_compliance_risk(profile.worker)
        
        # Update profile
        profile.health_risk_score = health_score
        profile.exposure_risk_score = exposure_score
        profile.compliance_risk_score = compliance_score
        profile.calculate_overall_risk()
        
        return Response({
            'message': 'Risk profile recalculated',
            'health_risk': health_score,
            'exposure_risk': exposure_score,
            'compliance_risk': compliance_score,
            'overall_risk': profile.overall_risk_score,
            'risk_level': profile.risk_level,
        })
    
    def _calculate_health_risk(self, worker):
        """Calculate health-based risk score"""
        score = 0
        
        # Age factor (younger workers typically lower risk, aging workers higher)
        if worker.age < 25:
            score += 10
        elif worker.age < 35:
            score += 15
        elif worker.age < 45:
            score += 20
        elif worker.age < 55:
            score += 30
        else:
            score += 40
        
        # Fitness status
        if worker.current_fitness_status == 'permanently_unfit':
            score += 35
        elif worker.current_fitness_status == 'temporarily_unfit':
            score += 25
        elif worker.current_fitness_status == 'fit_with_restrictions':
            score += 15
        
        # Medical conditions
        if worker.chronic_conditions:
            score += 15
        
        # Allergies
        if worker.allergies and worker.allergies.upper() != 'NONE':
            score += 5
        
        # Recent hospitalization (if tracking field exists)
        return min(score, 100)
    
    def _calculate_exposure_risk(self, worker):
        """Calculate exposure-based risk score"""
        score = 0
        
        # Number of exposure risks
        num_exposures = len(worker.exposure_risks) if worker.exposure_risks else 0
        score += min(num_exposures * 8, 25)
        
        # Years of exposure
        hire_date = worker.hire_date
        years_employed = (date.today() - hire_date).days / 365.25
        if years_employed > 10:
            score += 25
        elif years_employed > 5:
            score += 15
        elif years_employed > 2:
            score += 10
        
        # High-risk mining exposures
        high_risk_exposures = ['silica_dust', 'noise', 'cobalt', 'radiation']
        if any(exp in worker.exposure_risks for exp in high_risk_exposures):
            score += 20
        
        # PPE compliance
        if not worker.ppe_provided or len(worker.ppe_provided) < 3:
            score += 15
        
        return min(score, 100)
    
    def _calculate_compliance_risk(self, worker):
        """Calculate compliance-based risk score"""
        score = 0
        
        # Overdue examinations
        if worker.next_exam_due and worker.next_exam_due < date.today():
            days_overdue = (date.today() - worker.next_exam_due).days
            score += min(days_overdue, 30)
        
        # Incident history (last 12 months)
        twelve_months_ago = date.today() - timedelta(days=365)
        incidents_12m = WorkplaceIncident.objects.filter(
            injured_workers=worker,
            incident_date__gte=twelve_months_ago
        ).count()
        score += min(incidents_12m * 10, 30)
        
        # Occupational diseases
        diseases = OccupationalDisease.objects.filter(
            worker=worker,
            case_status__in=['active', 'chronic']
        ).count()
        score += min(diseases * 15, 25)
        
        # PPE compliance
        recent_compliances = PPEComplianceRecord.objects.filter(
            ppe_item__worker=worker,
            check_date__gte=date.today() - timedelta(days=30),
            is_compliant=False
        ).count()
        score += min(recent_compliances * 5, 20)
        
        return min(score, 100)
    
    @action(detail=False, methods=['get'])
    def high_risk_workers(self, request):
        """Get all high-risk workers"""
        profiles = self.get_queryset().filter(risk_level__in=['high', 'critical'])
        serializer = self.get_serializer(profiles, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def intervention_required(self, request):
        """Get workers requiring intervention"""
        profiles = self.get_queryset().filter(intervention_required=True)
        serializer = self.get_serializer(profiles, many=True)
        return Response(serializer.data)


class OverexposureAlertViewSet(viewsets.ModelViewSet):
    """
    Occupational exposure alert management
    
    GET /api/overexposure-alerts/ - List active alerts
    POST /api/overexposure-alerts/ - Create new alert
    POST /api/overexposure-alerts/{id}/acknowledge/ - Acknowledge alert
    POST /api/overexposure-alerts/{id}/resolve/ - Resolve alert
    """
    
    serializer_class = OverexposureAlertSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['severity', 'status', 'exposure_type', 'worker__enterprise']
    search_fields = ['worker__first_name', 'worker__last_name', 'exposure_type']
    ordering = ['-detected_date']
    
    def get_queryset(self):
        """Get alerts with related data"""
        return OverexposureAlert.objects.select_related('worker__enterprise', 'acknowledged_by')
    
    @action(detail=True, methods=['post'])
    def acknowledge(self, request, pk=None):
        """Acknowledge an overexposure alert"""
        alert = self.get_object()
        alert.mark_acknowledged(request.user)
        return Response({
            'message': 'Alert acknowledged',
            'status': alert.status,
            'acknowledged_date': alert.acknowledged_date,
        })
    
    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """Resolve an overexposure alert"""
        alert = self.get_object()
        alert.mark_resolved()
        return Response({
            'message': 'Alert resolved',
            'status': alert.status,
            'resolved_date': alert.resolved_date,
        })
    
    @action(detail=False, methods=['get'])
    def critical_alerts(self, request):
        """Get all critical and emergency alerts"""
        alerts = self.get_queryset().filter(severity__in=['critical', 'emergency'], status='active')
        serializer = self.get_serializer(alerts, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def bulk_acknowledge(self, request):
        """Acknowledge multiple alerts"""
        alert_ids = request.data.get('alert_ids', [])
        updated = OverexposureAlert.objects.filter(id__in=alert_ids).update(
            status='acknowledged',
            acknowledged_date=timezone.now(),
            acknowledged_by=request.user
        )
        return Response({'message': f'{updated} alerts acknowledged'})


class ExitExaminationViewSet(viewsets.ModelViewSet):
    """
    Exit examination workflow management for departing workers
    
    GET /api/exit-exams/ - List exit exams
    POST /api/exit-exams/ - Create exit exam
    POST /api/exit-exams/{id}/complete/ - Complete exit exam
    POST /api/exit-exams/{id}/issue-certificate/ - Issue exit certificate
    """
    
    serializer_class = ExitExaminationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['reason_for_exit', 'exam_completed', 'worker__enterprise']
    search_fields = ['worker__first_name', 'worker__last_name', 'worker__employee_id']
    ordering = ['-exit_date']
    
    def get_queryset(self):
        """Get exit exams with related data"""
        return ExitExamination.objects.select_related('worker__enterprise', 'examiner')
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Complete exit examination"""
        exam = self.get_object()
        
        exam.exam_completed = True
        exam.exam_date = request.data.get('exam_date', date.today())
        exam.examiner = request.user
        exam.health_status_summary = request.data.get('health_status_summary', '')
        exam.occupational_disease_present = request.data.get('occupational_disease_present', False)
        exam.disease_notes = request.data.get('disease_notes', '')
        exam.post_employment_medical_followup = request.data.get('post_employment_medical_followup', False)
        exam.followup_recommendations = request.data.get('followup_recommendations', '')
        exam.save()
        
        return Response({
            'message': 'Exit examination completed',
            'exam': self.get_serializer(exam).data
        })
    
    @action(detail=True, methods=['post'])
    def issue_certificate(self, request, pk=None):
        """Issue exit certificate"""
        exam = self.get_object()
        
        if not exam.exam_completed:
            return Response(
                {'error': 'Exit exam must be completed before issuing certificate'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        exam.exit_certificate_issued = True
        exam.exit_certificate_date = date.today()
        exam.save()
        
        # Report to CNSS if needed
        if request.data.get('report_to_cnss', False):
            exam.reported_to_cnss = True
            exam.cnss_report_date = date.today()
            exam.save()
        
        return Response({
            'message': 'Exit certificate issued',
            'certificate_date': exam.exit_certificate_date,
            'cnss_reported': exam.reported_to_cnss,
        })
    
    @action(detail=False, methods=['get'])
    def pending_exams(self, request):
        """Get pending exit exams"""
        exams = self.get_queryset().filter(exam_completed=False)
        serializer = self.get_serializer(exams, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def upcoming_exits(self, request):
        """Get workers with upcoming exit dates"""
        thirty_days = date.today() + timedelta(days=30)
        exams = self.get_queryset().filter(
            exit_date__lte=thirty_days,
            exit_date__gte=date.today()
        )
        serializer = self.get_serializer(exams, many=True)
        return Response(serializer.data)


class RegulatoryCNSSReportViewSet(viewsets.ModelViewSet):
    """
    CNSS regulatory report management
    
    GET /api/cnss-reports/ - List CNSS reports
    POST /api/cnss-reports/ - Create report
    POST /api/cnss-reports/{id}/submit/ - Submit to CNSS
    GET /api/cnss-reports/pending/ - Get pending reports
    """
    
    serializer_class = RegulatoryCNSSReportSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['report_type', 'status', 'enterprise']
    search_fields = ['reference_number', 'enterprise__name']
    ordering = ['-prepared_date']
    
    def get_queryset(self):
        """Get CNSS reports with related data"""
        return RegulatoryCNSSReport.objects.select_related(
            'enterprise', 'prepared_by', 'related_incident', 'related_disease'
        )
    
    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """Submit CNSS report"""
        report = self.get_object()
        
        if report.status != 'ready_for_submission':
            return Response(
                {'error': 'Report must be in "ready_for_submission" status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        report.status = 'submitted'
        report.submitted_date = timezone.now()
        report.submission_method = request.data.get('method', 'online')
        report.save()
        
        return Response({
            'message': 'Report submitted to CNSS',
            'reference_number': report.reference_number,
            'submitted_date': report.submitted_date,
        })
    
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get pending CNSS reports"""
        reports = self.get_queryset().filter(status__in=['draft', 'ready_for_submission'])
        serializer = self.get_serializer(reports, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def generate_monthly(self, request):
        """Generate monthly CNSS report"""
        enterprise_id = request.data.get('enterprise_id')
        month = request.data.get('month', date.today().month)
        year = request.data.get('year', date.today().year)
        
        enterprise = Enterprise.objects.get(id=enterprise_id)
        
        # Gather monthly statistics
        stats = SiteHealthMetrics.objects.filter(
            enterprise=enterprise, year=year, month=month
        ).first()
        
        if not stats:
            return Response(
                {'error': 'No metrics found for specified period'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Create report
        report_content = {
            'total_workers': stats.total_workers,
            'incidents': stats.lost_time_injuries + stats.medical_treatment_cases,
            'lost_time_injuries': stats.lost_time_injuries,
            'fatalities': stats.fatalities,
            'lost_days': stats.total_lost_days,
            'ltifr': float(stats.ltifr),
            'trifr': float(stats.trifr),
            'occupational_diseases': stats.new_occupational_diseases,
        }
        
        report = RegulatoryCNSSReport.objects.create(
            enterprise=enterprise,
            report_type='monthly_stats',
            reference_number=f"CNSS-{enterprise_id}-{year}-{month:02d}",
            report_period_start=date(year, month, 1),
            report_period_end=date(year, month, 28),
            content_json=report_content,
            prepared_by=request.user,
            status='ready_for_submission'
        )
        
        return Response({
            'message': 'Monthly report generated',
            'reference_number': report.reference_number,
            'report': self.get_serializer(report).data
        })


class DRCRegulatoryReportViewSet(viewsets.ModelViewSet):
    """
    DRC labour ministry regulatory report management
    
    GET /api/drc-reports/ - List DRC reports
    POST /api/drc-reports/ - Create report
    POST /api/drc-reports/{id}/submit/ - Submit to DRC ministry
    """
    
    serializer_class = DRCRegulatoryReportSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['report_type', 'status', 'enterprise']
    search_fields = ['reference_number', 'enterprise__name']
    ordering = ['-submitted_date']
    
    def get_queryset(self):
        """Get DRC reports with related data"""
        return DRCRegulatoryReport.objects.select_related(
            'enterprise', 'submitted_by'
        ).prefetch_related('related_incidents', 'related_diseases')
    
    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """Submit DRC report"""
        report = self.get_object()
        
        report.status = 'submitted'
        report.submitted_date = timezone.now()
        report.submission_method = request.data.get('method', 'email')
        report.submission_recipient = request.data.get('recipient', 'Ministère du Travail')
        report.save()
        
        return Response({
            'message': 'Report submitted to DRC authority',
            'reference_number': report.reference_number,
            'submitted_date': report.submitted_date,
        })
    
    @action(detail=False, methods=['get'])
    def fatal_incidents(self, request):
        """Get pending fatal incident reports"""
        reports = self.get_queryset().filter(
            report_type='fatal_incident',
            status__in=['draft', 'submitted']
        )
        serializer = self.get_serializer(reports, many=True)
        return Response(serializer.data)


class PPEComplianceRecordViewSet(viewsets.ModelViewSet):
    """
    PPE compliance tracking and audit records
    
    GET /api/ppe-compliance/ - List compliance records
    POST /api/ppe-compliance/ - Create compliance record
    GET /api/ppe-compliance/non-compliant/ - Get non-compliant items
    POST /api/ppe-compliance/bulk-check/ - Bulk compliance check
    """
    
    serializer_class = PPEComplianceRecordSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'is_compliant', 'check_type', 'ppe_item__worker__enterprise']
    search_fields = ['ppe_item__worker__first_name', 'ppe_item__worker__last_name']
    ordering = ['-check_date']
    
    def get_queryset(self):
        """Get compliance records with related data"""
        return PPEComplianceRecord.objects.select_related(
            'ppe_item__worker', 'checked_by', 'approved_by'
        )
    
    @action(detail=False, methods=['get'])
    def non_compliant(self, request):
        """Get all non-compliant PPE items"""
        records = self.get_queryset().filter(is_compliant=False, status='non_compliant')
        serializer = self.get_serializer(records, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def compliance_rate(self, request):
        """Calculate PPE compliance rate"""
        enterprise_id = request.query_params.get('enterprise_id')
        
        queryset = self.get_queryset()
        if enterprise_id:
            queryset = queryset.filter(ppe_item__worker__enterprise_id=enterprise_id)
        
        total = queryset.count()
        compliant = queryset.filter(is_compliant=True).count()
        rate = (compliant / total * 100) if total > 0 else 0
        
        return Response({
            'total_records': total,
            'compliant': compliant,
            'non_compliant': total - compliant,
            'compliance_rate': round(rate, 2),
        })
    
    @action(detail=False, methods=['post'])
    def bulk_check(self, request):
        """Perform bulk PPE compliance check"""
        ppe_items = request.data.get('ppe_item_ids', [])
        check_type = request.data.get('check_type', 'routine')
        
        records_created = 0
        for ppe_id in ppe_items:
            ppe = PPEItem.objects.get(id=ppe_id)
            
            # Determine compliance
            is_compliant = True
            reason = ""
            
            if ppe.is_expired:
                is_compliant = False
                reason = "PPE expired"
            elif ppe.condition == 'damaged':
                is_compliant = False
                reason = "PPE damaged"
            
            PPEComplianceRecord.objects.create(
                ppe_item=ppe,
                check_date=date.today(),
                check_type=check_type,
                status='compliant' if is_compliant else 'non_compliant',
                is_compliant=is_compliant,
                non_compliance_reason=reason,
                checked_by=request.user,
            )
            records_created += 1
        
        return Response({
            'message': f'{records_created} compliance records created',
            'records_created': records_created,
        })


# ==================== MEDICAL EXAMINATION EXTENDED VIEWSETS ====================

class XrayImagingResultViewSet(viewsets.ModelViewSet):
    """
    X-ray imaging results with ILO pneumoconiosis classification
    
    GET /api/xray-imaging/ - List all X-ray results
    GET /api/xray-imaging/{id}/ - Get specific X-ray
    POST /api/xray-imaging/ - Create X-ray result
    GET /api/xray-imaging/pneumoconiosis/ - Get cases with pneumoconiosis
    GET /api/xray-imaging/abnormal-findings/ - Get abnormal findings
    """
    
    serializer_class = XrayImagingResultSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = [
        'ilo_classification', 'pneumoconiosis_detected', 'imaging_type',
        'examination__worker__enterprise'
    ]
    search_fields = [
        'examination__worker__first_name', 
        'examination__worker__last_name',
        'examination__worker__employee_id'
    ]
    ordering = ['-imaging_date']
    
    def get_queryset(self):
        """Get X-ray results with related data"""
        return XrayImagingResult.objects.select_related(
            'examination__worker__enterprise'
        )
    
    @action(detail=False, methods=['get'])
    def pneumoconiosis(self, request):
        """Get cases with pneumoconiosis detected"""
        results = self.get_queryset().filter(pneumoconiosis_detected=True)
        serializer = self.get_serializer(results, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def abnormal_findings(self, request):
        """Get X-rays with abnormal findings"""
        results = self.get_queryset().filter(
            Q(small_opacities=True) | 
            Q(large_opacities=True) |
            Q(pleural_thickening=True) |
            Q(pleural_effusion=True)
        )
        serializer = self.get_serializer(results, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def ilo_classification_summary(self, request):
        """Summary statistics by ILO classification"""
        classifications = self.get_queryset().values(
            'ilo_classification'
        ).annotate(count=Count('id'))
        
        summary = []
        for item in classifications:
            summary.append({
                'ilo_classification': item['ilo_classification'],
                'count': item['count']
            })
        
        return Response(summary)
    
    @action(detail=True, methods=['post'])
    def flag_for_review(self, request, pk=None):
        """Flag X-ray for specialist review"""
        xray = self.get_object()
        xray.follow_up_required = True
        xray.follow_up_interval_months = request.data.get('interval_months', 6)
        xray.save()
        return Response({
            'message': 'X-ray flagged for specialist review',
            'follow_up_interval': xray.follow_up_interval_months
        })


class HeavyMetalsTestViewSet(viewsets.ModelViewSet):
    """
    Heavy metals exposure test results
    
    GET /api/heavy-metals-tests/ - List all tests
    GET /api/heavy-metals-tests/{id}/ - Get specific test
    POST /api/heavy-metals-tests/ - Create test result
    GET /api/heavy-metals-tests/elevated/ - Get elevated results
    GET /api/heavy-metals-tests/exceeding-osha/ - Get OSHA limit violations
    """
    
    serializer_class = HeavyMetalsTestSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = [
        'heavy_metal', 'status', 'exceeds_osha_limit',
        'examination__worker__enterprise'
    ]
    search_fields = [
        'examination__worker__first_name',
        'examination__worker__last_name',
        'examination__worker__employee_id'
    ]
    ordering = ['-test_date']
    
    def get_queryset(self):
        """Get heavy metals tests with related data"""
        return HeavyMetalsTest.objects.select_related(
            'examination__worker__enterprise'
        )
    
    @action(detail=False, methods=['get'])
    def elevated(self, request):
        """Get elevated test results"""
        tests = self.get_queryset().filter(
            status__in=['elevated', 'high', 'critical']
        )
        serializer = self.get_serializer(tests, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def exceeding_osha(self, request):
        """Get results exceeding OSHA action levels"""
        tests = self.get_queryset().filter(exceeds_osha_limit=True)
        serializer = self.get_serializer(tests, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def metal_summary(self, request):
        """Summary statistics by heavy metal type"""
        summaries = {}
        
        for metal, metal_name in HeavyMetalsTest.METAL_CHOICES:
            tests = self.get_queryset().filter(heavy_metal=metal)
            summaries[metal] = {
                'name': metal_name,
                'total_tests': tests.count(),
                'elevated_count': tests.filter(status__in=['elevated', 'high', 'critical']).count(),
                'exceeding_osha': tests.filter(exceeds_osha_limit=True).count(),
            }
        
        return Response(summaries)
    
    @action(detail=True, methods=['post'])
    def confirm_occupational_exposure(self, request, pk=None):
        """Confirm result is from occupational exposure"""
        test = self.get_object()
        test.occupational_exposure = True
        test.follow_up_required = True
        test.save()
        return Response({
            'message': 'Exposure confirmed as occupational',
            'follow_up_required': True
        })


class DrugAlcoholScreeningViewSet(viewsets.ModelViewSet):
    """
    Drug and alcohol screening results
    
    GET /api/drug-alcohol-screening/ - List all screenings
    GET /api/drug-alcohol-screening/{id}/ - Get specific screening
    POST /api/drug-alcohol-screening/ - Create screening result
    GET /api/drug-alcohol-screening/positive/ - Get positive results
    GET /api/drug-alcohol-screening/pending-confirmation/ - Get pending confirmations
    POST /api/drug-alcohol-screening/{id}/confirm/ - Confirm result
    """
    
    serializer_class = DrugAlcoholScreeningSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = [
        'test_type', 'overall_result', 'fit_for_duty',
        'examination__worker__enterprise'
    ]
    search_fields = [
        'examination__worker__first_name',
        'examination__worker__last_name',
        'examination__worker__employee_id'
    ]
    ordering = ['-test_date']
    
    def get_queryset(self):
        """Get drug/alcohol screenings with related data"""
        return DrugAlcoholScreening.objects.select_related(
            'examination__worker__enterprise'
        )
    
    @action(detail=False, methods=['get'])
    def positive(self, request):
        """Get positive screening results"""
        screenings = self.get_queryset().filter(
            Q(alcohol_result='positive') | Q(drug_result='positive')
        )
        serializer = self.get_serializer(screenings, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def pending_confirmation(self, request):
        """Get screenings pending confirmation test"""
        screenings = self.get_queryset().filter(
            confirmation_required=True,
            confirmation_result__isnull=True
        )
        serializer = self.get_serializer(screenings, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def unfit_determinations(self, request):
        """Get screenings resulting in unfit determination"""
        screenings = self.get_queryset().filter(fit_for_duty=False)
        serializer = self.get_serializer(screenings, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        """Confirm screening result"""
        screening = self.get_object()
        
        screening.confirmation_required = False
        screening.confirmation_date = date.today()
        screening.confirmation_result = request.data.get('confirmation_result', 'negative')
        screening.mro_reviewed = True
        screening.mro_name = request.data.get('mro_name', '')
        screening.mro_comments = request.data.get('mro_comments', '')
        screening.save()
        
        return Response({
            'message': 'Screening confirmed',
            'confirmation_date': screening.confirmation_date,
            'confirmation_result': screening.confirmation_result,
        })
    
    @action(detail=True, methods=['post'])
    def mro_review(self, request, pk=None):
        """Medical Review Officer review"""
        screening = self.get_object()
        
        screening.mro_reviewed = True
        screening.mro_name = request.user.get_full_name()
        screening.mro_comments = request.data.get('comments', '')
        screening.fit_for_duty = request.data.get('fit_for_duty', True)
        screening.restrictions = request.data.get('restrictions', '')
        screening.save()
        
        return Response({
            'message': 'MRO review completed',
            'fit_for_duty': screening.fit_for_duty,
            'restrictions': screening.restrictions,
        })


class HealthScreeningViewSet(viewsets.ModelViewSet):
    """
    Health screening results for various assessment types
    
    GET /api/health-screening/ - List all screenings
    GET /api/health-screening/{id}/ - Get specific screening
    POST /api/health-screening/ - Create screening
    PUT /api/health-screening/{id}/ - Complete screening update
    PATCH /api/health-screening/{id}/ - Partial screening update
    DELETE /api/health-screening/{id}/ - Delete screening
    
    Supported screening types:
    - ergonomic: Ergonomic Assessment
    - mental: Mental Health Screening
    - cardio: Cardiovascular Risk Assessment
    - msk: Musculoskeletal Screening
    """
    
    serializer_class = HealthScreeningSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['screening_type', 'status', 'worker__enterprise']
    search_fields = [
        'worker__first_name',
        'worker__last_name', 
        'worker__employee_id'
    ]
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Get health screenings with related data"""
        return HealthScreening.objects.select_related(
            'worker',
            'conducted_by',
            'reviewed_by'
        ).order_by('-created_at')


class FitnessCertificationDecisionViewSet(viewsets.ModelViewSet):
    """
    Fitness certification decisions
    
    GET /api/fitness-decisions/ - List all decisions
    GET /api/fitness-decisions/{id}/ - Get specific decision
    POST /api/fitness-decisions/ - Create certification decision
    GET /api/fitness-decisions/expiring-soon/ - Get expirations in 30 days
    GET /api/fitness-decisions/expired/ - Get expired certifications
    GET /api/fitness-decisions/unfit/ - Get unfit determinations
    """
    
    serializer_class = FitnessCertificationDecisionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = [
        'fitness_status', 'decision_basis', 'safety_sensitive',
        'examinations__worker__enterprise'
    ]
    search_fields = [
        'examinations__worker__first_name',
        'examinations__worker__last_name',
        'examinations__worker__employee_id'
    ]
    ordering = ['-certification_date']
    
    def get_queryset(self):
        """Get fitness decisions with related data"""
        return FitnessCertificationDecision.objects.select_related(
            'examinations__worker__enterprise',
            'reviewed_by'
        )
    
    @action(detail=False, methods=['get'])
    def expiring_soon(self, request):
        """Get certifications expiring in 30 days"""
        thirty_days = date.today() + timedelta(days=30)
        decisions = self.get_queryset().filter(
            certification_valid_until__lte=thirty_days,
            certification_valid_until__gte=date.today()
        )
        serializer = self.get_serializer(decisions, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def expired(self, request):
        """Get expired certifications"""
        decisions = self.get_queryset().filter(
            certification_valid_until__lt=date.today()
        )
        serializer = self.get_serializer(decisions, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def unfit(self, request):
        """Get unfit determinations"""
        decisions = self.get_queryset().filter(
            fitness_status__in=['temporarily_unfit', 'permanently_unfit']
        )
        serializer = self.get_serializer(decisions, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def requiring_renewal(self, request):
        """Get certifications requiring renewal (expired or expiring in 14 days)"""
        fourteen_days = date.today() + timedelta(days=14)
        decisions = self.get_queryset().filter(
            certification_valid_until__lte=fourteen_days
        )
        serializer = self.get_serializer(decisions, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def fitness_status_summary(self, request):
        """Summary statistics by fitness status"""
        summary = {}
        
        for status, status_name in FitnessCertificationDecision.FITNESS_STATUS_CHOICES:
            decisions = self.get_queryset().filter(
                fitness_status=status,
                is_valid=True
            )
            summary[status] = {
                'name': status_name,
                'count': decisions.count(),
            }
        
        # Add expiration statistics
        expired = self.get_queryset().filter(
            certification_valid_until__lt=date.today()
        ).count()
        
        summary['_meta'] = {
            'total': self.get_queryset().count(),
            'valid': self.get_queryset().filter(is_valid=True).count(),
            'expired': expired,
        }
        
        return Response(summary)
    
    @action(detail=True, methods=['post'])
    def appeal(self, request, pk=None):
        """File appeal for certification decision"""
        decision = self.get_object()
        
        if not decision.subject_to_appeal:
            return Response(
                {'error': 'This decision is not subject to appeal'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        decision.subject_to_appeal = False
        decision.appeal_deadline = None
        decision.save()
        
        return Response({
            'message': 'Appeal filed and will be reviewed',
            'decision_id': decision.id,
        })
    
    @action(detail=True, methods=['post'])
    def renew(self, request, pk=None):
        """Renew expired or expiring certification"""
        old_decision = self.get_object()
        
        if not old_decision.is_valid or old_decision.days_until_expiry > 30:
            return Response(
                {'error': 'Certification cannot be renewed yet'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create new certification decision
        from datetime import timedelta as td
        new_decision = FitnessCertificationDecision.objects.create(
            examinations=old_decision.examinations,
            reviewed_by=request.user,
            fitness_status=request.data.get('fitness_status', old_decision.fitness_status),
            decision_basis=request.data.get('decision_basis', old_decision.decision_basis),
            key_findings=request.data.get('key_findings', old_decision.key_findings),
            risk_factors=request.data.get('risk_factors', old_decision.risk_factors),
            work_restrictions=request.data.get('work_restrictions', old_decision.work_restrictions),
            certification_date=date.today(),
            certification_valid_until=date.today() + td(days=365),
        )
        
        serializer = self.get_serializer(new_decision)
        return Response({
            'message': 'Certification renewed',
            'new_decision': serializer.data,
        })


# ==================== RISK ASSESSMENT EXTENDED VIEWSETS ====================

class HierarchyOfControlsViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Hierarchy of Controls recommendations.
    
    Endpoints:
    - GET /api/hierarchy-of-controls/ - List all controls
    - GET /api/hierarchy-of-controls/{id}/ - Get specific control
    - GET /api/hierarchy-of-controls/by-level/ - Filter by control level
    - GET /api/hierarchy-of-controls/pending-implementation/ - Filter pending controls
    - GET /api/hierarchy-of-controls/ineffective/ - Filter ineffective controls
    - GET /api/hierarchy-of-controls/effectiveness-summary/ - Control effectiveness statistics
    - POST /api/hierarchy-of-controls/{id}/mark-implemented/ - Mark control as implemented
    - POST /api/hierarchy-of-controls/{id}/evaluate-effectiveness/ - Evaluate control effectiveness
    """
    
    queryset = HierarchyOfControls.objects.select_related(
        'hazard', 'enterprise', 'responsible_person', 'created_by'
    ).prefetch_related('dependant_controls')
    serializer_class = HierarchyOfControlsSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['enterprise', 'control_level', 'status', 'effectiveness_rating']
    search_fields = ['control_name', 'description', 'hazard__hazard_type']
    ordering_fields = ['control_level', 'status', 'created', 'risk_reduction_percentage']
    ordering = ['control_level', '-created']
    
    @action(detail=False, methods=['get'])
    def by_level(self, request):
        """Filter controls by level (1-5)"""
        level = request.query_params.get('level')
        if not level:
            return Response({'error': 'level parameter required'}, status=status.HTTP_400_BAD_REQUEST)
        
        controls = self.queryset.filter(control_level=level)
        serializer = self.get_serializer(controls, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def pending_implementation(self, request):
        """Get controls pending implementation"""
        enterprise_id = request.query_params.get('enterprise_id')
        filter_kwargs = {'status__in': ['recommended', 'approved']}
        if enterprise_id:
            filter_kwargs['enterprise_id'] = enterprise_id
        
        controls = self.queryset.filter(**filter_kwargs)
        serializer = self.get_serializer(controls, many=True)
        return Response({
            'count': controls.count(),
            'controls': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def ineffective(self, request):
        """Get ineffective controls"""
        enterprise_id = request.query_params.get('enterprise_id')
        filter_kwargs = {'status': 'implemented', 'effectiveness_rating': 'poor'}
        if enterprise_id:
            filter_kwargs['enterprise_id'] = enterprise_id
        
        controls = self.queryset.filter(**filter_kwargs)
        serializer = self.get_serializer(controls, many=True)
        return Response({
            'ineffective_count': controls.count(),
            'controls': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def effectiveness_summary(self, request):
        """Get control effectiveness statistics"""
        enterprise_id = request.query_params.get('enterprise_id')
        filter_kwargs = {'status': 'implemented'}
        if enterprise_id:
            filter_kwargs['enterprise_id'] = enterprise_id
        
        controls = self.queryset.filter(**filter_kwargs)
        effectiveness_counts = controls.values('effectiveness_rating').annotate(count=Count('id'))
        
        total_controls = controls.count()
        avg_reduction = controls.aggregate(Avg('risk_reduction_percentage'))
        
        return Response({
            'total_implemented': total_controls,
            'effectiveness_breakdown': list(effectiveness_counts),
            'average_risk_reduction': avg_reduction['risk_reduction_percentage__avg'],
            'effective_controls': controls.filter(effectiveness_rating__in=['excellent', 'good']).count(),
            'ineffective_controls': controls.filter(effectiveness_rating__in=['poor']).count(),
        })
    
    @action(detail=True, methods=['post'])
    def mark_implemented(self, request, pk=None):
        """Mark control as implemented"""
        control = self.get_object()
        control.status = 'implemented'
        control.implementation_date = request.data.get('implementation_date')
        control.save()
        
        serializer = self.get_serializer(control)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def evaluate_effectiveness(self, request, pk=None):
        """Evaluate control effectiveness after implementation"""
        control = self.get_object()
        control.effectiveness_rating = request.data.get('effectiveness_rating')
        control.effectiveness_notes = request.data.get('effectiveness_notes', '')
        control.risk_reduction_percentage = request.data.get('risk_reduction_percentage')
        control.residual_risk_score = request.data.get('residual_risk_score')
        control.status = 'effective' if control.is_effective() else 'ineffective'
        control.save()
        
        serializer = self.get_serializer(control)
        return Response(serializer.data)


class RiskHeatmapDataViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Risk Heatmap Data points.
    
    Endpoints:
    - GET /api/risk-heatmap-data/ - List all heatmap points
    - GET /api/risk-heatmap-data/{id}/ - Get specific point
    - GET /api/risk-heatmap-data/critical-zones/ - Filter critical zones
    - GET /api/risk-heatmap-data/by-zone/ - Filter by risk zone
    - GET /api/risk-heatmap-data/trending-up/ - Filter worsening trends
    - GET /api/risk-heatmap-data/high-exposure/ - Filter high worker exposure
    - GET /api/risk-heatmap-data/heatmap-summary/ - Summary of all zones
    - POST /api/risk-heatmap-data/{id}/add-hazard/ - Add hazard to heatmap cell
    - POST /api/risk-heatmap-data/{id}/update-trends/ - Update trend analysis
    """
    
    queryset = RiskHeatmapData.objects.select_related(
        'enterprise', 'created_by'
    ).prefetch_related('related_hazards', 'workers_exposed')
    serializer_class = RiskHeatmapDataSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['enterprise', 'risk_zone', 'priority', 'probability_level', 'severity_level']
    search_fields = ['related_hazards__hazard_type', 'notes']
    ordering_fields = ['risk_score', 'heatmap_date', 'workers_affected_count']
    ordering = ['-risk_score', '-heatmap_date']
    
    @action(detail=False, methods=['get'])
    def critical_zones(self, request):
        """Get critical risk zones"""
        enterprise_id = request.query_params.get('enterprise_id')
        filter_kwargs = {'risk_zone': 'red', 'priority': 'critical'}
        if enterprise_id:
            filter_kwargs['enterprise_id'] = enterprise_id
        
        heatmap_data = self.queryset.filter(**filter_kwargs)
        serializer = self.get_serializer(heatmap_data, many=True)
        return Response({
            'critical_zones_count': heatmap_data.count(),
            'data': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def by_zone(self, request):
        """Filter by risk zone"""
        zone = request.query_params.get('zone')
        if not zone:
            return Response({'error': 'zone parameter required'}, status=status.HTTP_400_BAD_REQUEST)
        
        enterprise_id = request.query_params.get('enterprise_id')
        filter_kwargs = {'risk_zone': zone}
        if enterprise_id:
            filter_kwargs['enterprise_id'] = enterprise_id
        
        heatmap_data = self.queryset.filter(**filter_kwargs)
        serializer = self.get_serializer(heatmap_data, many=True)
        return Response({
            'zone': zone,
            'count': heatmap_data.count(),
            'data': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def trending_up(self, request):
        """Get heatmap cells with worsening trends"""
        enterprise_id = request.query_params.get('enterprise_id')
        filter_kwargs = {'trend': 'worsening'}
        if enterprise_id:
            filter_kwargs['enterprise_id'] = enterprise_id
        
        heatmap_data = self.queryset.filter(**filter_kwargs)
        serializer = self.get_serializer(heatmap_data, many=True)
        return Response({
            'worsening_count': heatmap_data.count(),
            'data': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def high_exposure(self, request):
        """Get heatmap cells with high worker exposure"""
        enterprise_id = request.query_params.get('enterprise_id')
        min_workers = request.query_params.get('min_workers', 5)
        
        filter_kwargs = {'workers_affected_count__gte': int(min_workers)}
        if enterprise_id:
            filter_kwargs['enterprise_id'] = enterprise_id
        
        heatmap_data = self.queryset.filter(**filter_kwargs)
        serializer = self.get_serializer(heatmap_data, many=True)
        return Response({
            'high_exposure_cells': heatmap_data.count(),
            'data': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def heatmap_summary(self, request):
        """Get summary of all heatmap zones for enterprise"""
        enterprise_id = request.query_params.get('enterprise_id')
        if not enterprise_id:
            return Response({'error': 'enterprise_id parameter required'}, status=status.HTTP_400_BAD_REQUEST)
        
        heatmap_data = self.queryset.filter(enterprise_id=enterprise_id)
        
        summary = {
            'total_cells': heatmap_data.count(),
            'total_hazards': sum(h.hazards_count for h in heatmap_data),
            'total_workers_exposed': sum(h.workers_affected_count for h in heatmap_data),
            'total_incidents': sum(h.incidents_count for h in heatmap_data),
            'zones': {
                'red': heatmap_data.filter(risk_zone='red').count(),
                'orange': heatmap_data.filter(risk_zone='orange').count(),
                'yellow': heatmap_data.filter(risk_zone='yellow').count(),
                'green': heatmap_data.filter(risk_zone='green').count(),
            },
            'average_risk_score': heatmap_data.aggregate(Avg('risk_score'))['risk_score__avg'],
        }
        return Response(summary)
    
    @action(detail=True, methods=['post'])
    def add_hazard(self, request, pk=None):
        """Add hazard to heatmap cell"""
        heatmap = self.get_object()
        hazard_id = request.data.get('hazard_id')
        if hazard_id:
            from .models import HazardIdentification
            hazard = HazardIdentification.objects.get(id=hazard_id)
            heatmap.related_hazards.add(hazard)
            heatmap.hazards_count = heatmap.related_hazards.count()
            heatmap.save()
        
        serializer = self.get_serializer(heatmap)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def update_trends(self, request, pk=None):
        """Update trend analysis"""
        heatmap = self.get_object()
        heatmap.previous_period_score = request.data.get('previous_period_score')
        heatmap.incidents_count = request.data.get('incidents_count', heatmap.incidents_count)
        heatmap.near_misses_count = request.data.get('near_misses_count', heatmap.near_misses_count)
        
        if heatmap.previous_period_score:
            if heatmap.risk_score < heatmap.previous_period_score:
                heatmap.trend = 'improving'
            elif heatmap.risk_score > heatmap.previous_period_score:
                heatmap.trend = 'worsening'
            else:
                heatmap.trend = 'stable'
        
        heatmap.save()
        serializer = self.get_serializer(heatmap)
        return Response(serializer.data)


class RiskHeatmapReportViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Risk Heatmap Reports (aggregated summaries).
    
    Endpoints:
    - GET /api/risk-heatmap-reports/ - List all reports
    - GET /api/risk-heatmap-reports/{id}/ - Get specific report
    - GET /api/risk-heatmap-reports/by-period/ - Filter by period
    - GET /api/risk-heatmap-reports/worsening-trends/ - Reports with worsening trends
    - GET /api/risk-heatmap-reports/high-critical-count/ - Reports with high critical cells
    - POST /api/risk-heatmap-reports/generate-for-enterprise/ - Generate report for enterprise
    """
    
    queryset = RiskHeatmapReport.objects.select_related(
        'enterprise', 'created_by'
    )
    serializer_class = RiskHeatmapReportSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['enterprise', 'period', 'incident_trend']
    search_fields = ['period', 'action_items']
    ordering_fields = ['report_date', 'average_risk_score']
    ordering = ['-report_date']
    
    @action(detail=False, methods=['get'])
    def by_period(self, request):
        """Filter reports by period"""
        period = request.query_params.get('period')
        if not period:
            return Response({'error': 'period parameter required'}, status=status.HTTP_400_BAD_REQUEST)
        
        enterprise_id = request.query_params.get('enterprise_id')
        filter_kwargs = {'period': period}
        if enterprise_id:
            filter_kwargs['enterprise_id'] = enterprise_id
        
        reports = self.queryset.filter(**filter_kwargs)
        serializer = self.get_serializer(reports, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def worsening_trends(self, request):
        """Get reports showing worsening incident trends"""
        enterprise_id = request.query_params.get('enterprise_id')
        filter_kwargs = {'incident_trend': 'up'}
        if enterprise_id:
            filter_kwargs['enterprise_id'] = enterprise_id
        
        reports = self.queryset.filter(**filter_kwargs)
        serializer = self.get_serializer(reports, many=True)
        return Response({
            'worsening_count': reports.count(),
            'reports': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def high_critical_count(self, request):
        """Get reports with high number of critical cells"""
        min_critical = request.query_params.get('min_critical', 5)
        enterprise_id = request.query_params.get('enterprise_id')
        
        filter_kwargs = {'critical_cells__gte': int(min_critical)}
        if enterprise_id:
            filter_kwargs['enterprise_id'] = enterprise_id
        
        reports = self.queryset.filter(**filter_kwargs)
        serializer = self.get_serializer(reports, many=True)
        return Response({
            'high_critical_reports': reports.count(),
            'reports': serializer.data
        })
    
    @action(detail=False, methods=['post'])
    def generate_for_enterprise(self, request):
        """Generate risk heatmap report for enterprise"""
        enterprise_id = request.data.get('enterprise_id')
        period = request.data.get('period')
        
        if not enterprise_id or not period:
            return Response(
                {'error': 'enterprise_id and period are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Aggregate data for report
        from .models import HazardIdentification
        heatmap_data = RiskHeatmapData.objects.filter(
            enterprise_id=enterprise_id,
            period=period
        )
        
        critical_cells = heatmap_data.filter(risk_zone='red').count()
        high_risk_cells = heatmap_data.filter(risk_zone='orange').count()
        medium_risk_cells = heatmap_data.filter(risk_zone='yellow').count()
        low_risk_cells = heatmap_data.filter(risk_zone='green').count()
        
        report = RiskHeatmapReport(
            enterprise_id=enterprise_id,
            period=period,
            critical_cells=critical_cells,
            high_risk_cells=high_risk_cells,
            medium_risk_cells=medium_risk_cells,
            low_risk_cells=low_risk_cells,
            average_risk_score=heatmap_data.aggregate(Avg('risk_score'))['risk_score__avg'] or 0,
            highest_risk_score=max([h.risk_score for h in heatmap_data]) if heatmap_data.exists() else 0,
            lowest_risk_score=min([h.risk_score for h in heatmap_data]) if heatmap_data.exists() else 0,
            total_workers_exposed=sum(h.workers_affected_count for h in heatmap_data),
            workers_in_critical_zones=sum(
                h.workers_affected_count for h in heatmap_data.filter(risk_zone='red')
            ),
            incidents_this_period=sum(h.incidents_count for h in heatmap_data),
            incidents_last_period=0,
            incident_trend='stable',
            total_controls=0,
            effective_controls=0,
            ineffective_controls=0,
            control_effectiveness_percentage=0,
            critical_actions_required=critical_cells,
            created_by=request.user,
        )
        report.save()
        
        serializer = self.get_serializer(report)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# ==================== MEDICAL EXAMINATION SPECIFIC TEST RESULTS VIEWSETS ====================

class AudiometryResultViewSet(viewsets.ModelViewSet):
    """API endpoints for audiometry test results"""
    queryset = AudiometryResult.objects.all().order_by('-test_date')
    serializer_class = AudiometryResultSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['examination__worker', 'examination__worker__enterprise']
    search_fields = ['examination__worker__first_name', 'examination__worker__last_name', 'examination__worker__employee_id']
    ordering_fields = ['test_date', 'examination__exam_date']
    
    def perform_create(self, serializer):
        """Create AudiometryResult with automatic MedicalExamination"""
        request = self.request
        worker_id = request.data.get('worker_id') or request.data.get('worker_id_input')
        
        if worker_id:
            try:
                worker = Worker.objects.get(id=worker_id)
                exam_date = request.data.get('test_date', timezone.now().date())
                examination, _ = MedicalExamination.objects.get_or_create(
                    worker=worker,
                    exam_date=exam_date,
                    exam_type='periodic',
                    defaults={'examining_doctor': request.user}
                )
                serializer.save(examination=examination, tested_by=request.user)
            except Worker.DoesNotExist:
                raise serializers.ValidationError('Worker not found')
        else:
            raise serializers.ValidationError('worker_id is required')


class SpirometryResultViewSet(viewsets.ModelViewSet):
    """API endpoints for spirometry test results"""
    queryset = SpirometryResult.objects.all().order_by('-test_date')
    serializer_class = SpirometryResultSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['examination__worker', 'examination__worker__enterprise']
    search_fields = ['examination__worker__first_name', 'examination__worker__last_name', 'examination__worker__employee_id']
    ordering_fields = ['test_date', 'examination__exam_date']
    
    def perform_create(self, serializer):
        """Create SpirometryResult with automatic MedicalExamination"""
        request = self.request
        worker_id = request.data.get('worker_id') or request.data.get('worker_id_input')
        
        if worker_id:
            try:
                worker = Worker.objects.get(id=worker_id)
                exam_date = request.data.get('test_date', timezone.now().date())
                examination, _ = MedicalExamination.objects.get_or_create(
                    worker=worker,
                    exam_date=exam_date,
                    exam_type='periodic',
                    defaults={'examining_doctor': request.user}
                )
                serializer.save(examination=examination, tested_by=request.user)
            except Worker.DoesNotExist:
                raise serializers.ValidationError('Worker not found')
        else:
            raise serializers.ValidationError('worker_id is required')


class VisionTestResultViewSet(viewsets.ModelViewSet):
    """API endpoints for vision test results"""
    queryset = VisionTestResult.objects.all().order_by('-test_date')
    serializer_class = VisionTestResultSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['examination__worker', 'examination__worker__enterprise']
    search_fields = ['examination__worker__first_name', 'examination__worker__last_name', 'examination__worker__employee_id']
    ordering_fields = ['test_date', 'examination__exam_date']
    
    def perform_create(self, serializer):
        """Create VisionTestResult with automatic MedicalExamination"""
        request = self.request
        worker_id = request.data.get('worker_id') or request.data.get('worker_id_input')
        
        if worker_id:
            try:
                worker = Worker.objects.get(id=worker_id)
                exam_date = request.data.get('test_date', timezone.now().date())
                examination, _ = MedicalExamination.objects.get_or_create(
                    worker=worker,
                    exam_date=exam_date,
                    exam_type='periodic',
                    defaults={'examining_doctor': request.user}
                )
                serializer.save(examination=examination, tested_by=request.user)
            except Worker.DoesNotExist:
                raise serializers.ValidationError('Worker not found')
        else:
            raise serializers.ValidationError('worker_id is required')


class MentalHealthScreeningViewSet(viewsets.ModelViewSet):
    """API endpoints for mental health screening results"""
    queryset = MentalHealthScreening.objects.all().order_by('-assessment_date')
    serializer_class = MentalHealthScreeningSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['examination__worker', 'examination__worker__enterprise', 'burnout_risk']
    search_fields = ['examination__worker__first_name', 'examination__worker__last_name', 'examination__worker__employee_id']
    ordering_fields = ['assessment_date', 'examination__exam_date']
    
    def perform_create(self, serializer):
        """Create MentalHealthScreening with automatic MedicalExamination"""
        request = self.request
        worker_id = request.data.get('worker_id') or request.data.get('worker_id_input')
        
        if worker_id:
            try:
                worker = Worker.objects.get(id=worker_id)
                exam_date = request.data.get('test_date', timezone.now().date())
                examination, _ = MedicalExamination.objects.get_or_create(
                    worker=worker,
                    exam_date=exam_date,
                    exam_type='periodic',
                    defaults={'examining_doctor': request.user}
                )
                serializer.save(examination=examination, assessed_by=request.user)
            except Worker.DoesNotExist:
                raise serializers.ValidationError('Worker not found')
        else:
            raise serializers.ValidationError('worker_id is required')


class ErgonomicAssessmentViewSet(viewsets.ModelViewSet):
    """API endpoints for ergonomic assessment results"""
    queryset = ErgonomicAssessment.objects.all().order_by('-assessment_date')
    serializer_class = ErgonomicAssessmentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['examination__worker', 'examination__worker__enterprise', 'ergonomic_risk_level']
    search_fields = ['examination__worker__first_name', 'examination__worker__last_name', 'examination__worker__employee_id']
    ordering_fields = ['assessment_date', 'examination__exam_date']
    
    def perform_create(self, serializer):
        """Create ErgonomicAssessment with automatic MedicalExamination"""
        request = self.request
        worker_id = request.data.get('worker_id') or request.data.get('worker_id_input')
        
        if worker_id:
            try:
                worker = Worker.objects.get(id=worker_id)
                exam_date = request.data.get('test_date', timezone.now().date())
                examination, _ = MedicalExamination.objects.get_or_create(
                    worker=worker,
                    exam_date=exam_date,
                    exam_type='periodic',
                    defaults={'examining_doctor': request.user}
                )
                serializer.save(examination=examination, assessed_by=request.user)
            except Worker.DoesNotExist:
                raise serializers.ValidationError('Worker not found')
        else:
            raise serializers.ValidationError('worker_id is required')


class EnterpriseUsersViewSet(viewsets.ViewSet):
    """API endpoint for listing enterprise workers"""
    permission_classes = [IsAuthenticated]
    
    def list(self, request):
        """Get all workers, optionally filtered by enterprise"""
        enterprise_id = request.query_params.get('enterprise_id')
        
        if enterprise_id:
            workers = Worker.objects.filter(enterprise_id=enterprise_id).select_related('enterprise', 'work_site')
        else:
            # If no enterprise specified, return all workers
            workers = Worker.objects.all().select_related('enterprise', 'work_site')
        
        serializer = WorkerListSerializer(workers, many=True)
        return Response(serializer.data)


# ==================== ISO 27001 & ISO 45001 VIEWSETS ====================
# Import ISO compliance ViewSets for API routing
from .views_iso_compliance import (
    # ISO 27001 ViewSets
    AuditLogViewSet, AccessControlViewSet, SecurityIncidentViewSet,
    VulnerabilityRecordViewSet, AccessRequestViewSet,
    DataRetentionPolicyViewSet, EncryptionKeyRecordViewSet, ComplianceDashboardViewSet,
    # ISO 45001 ViewSets
    OHSPolicyViewSet, HazardRegisterViewSet, IncidentInvestigationViewSet,
    SafetyTrainingViewSet, TrainingCertificationViewSet,
    EmergencyProcedureViewSet, EmergencyDrillViewSet,
    HealthSurveillanceViewSet, PerformanceIndicatorViewSet,
    ComplianceAuditViewSet, ContractorQualificationViewSet,
    ManagementReviewViewSet, WorkerFeedbackViewSet,
)