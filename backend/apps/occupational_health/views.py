"""
Occupational Health Views - DRF API Views

Comprehensive Django REST Framework API views for multi-sector
occupational health management system with sector-specific functionality.
"""
from rest_framework import generics, status, viewsets
from rest_framework.decorators import api_view, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Count, Q, Sum, Avg, F
from django.utils import timezone
from datetime import datetime, timedelta
from django.shortcuts import get_object_or_404

from .models import (
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
    # Choice constants
    INDUSTRY_SECTORS, SECTOR_RISK_LEVELS
)

from .serializers import (
    # Core serializers
    EnterpriseListSerializer, EnterpriseDetailSerializer,
    WorkSiteSerializer, WorkerListSerializer, WorkerDetailSerializer,
    # Medical examination serializers
    MedicalExaminationListSerializer, MedicalExaminationDetailSerializer,
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
    # Utility serializers
    ChoicesSerializer, DashboardStatsSerializer, WorkerRiskProfileSerializer
)

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
        if self.action in ['list']:
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
        return WorkSite.objects.select_related('enterprise')

class WorkerViewSet(viewsets.ModelViewSet):
    """Worker management API with occupational health profile"""
    
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = [
        'enterprise', 'work_site', 'job_category', 'employment_status',
        'current_fitness_status', 'gender'
    ]
    search_fields = ['first_name', 'last_name', 'employee_id', 'job_title']
    ordering_fields = ['last_name', 'hire_date', 'next_exam_due']
    ordering = ['last_name', 'first_name']
    
    def get_queryset(self):
        return Worker.objects.select_related('enterprise', 'work_site', 'created_by')
    
    def get_serializer_class(self):
        if self.action in ['list']:
            return WorkerListSerializer
        return WorkerDetailSerializer
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
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
        return MedicalExamination.objects.select_related('worker', 'worker__enterprise', 'examining_doctor')
    
    def get_serializer_class(self):
        if self.action in ['list']:
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

# ==================== DASHBOARD AND ANALYTICS VIEWS ====================

@api_view(['GET'])
def dashboard_stats(request):
    """Get comprehensive dashboard statistics"""
    
    current_date = timezone.now().date()
    current_month_start = current_date.replace(day=1)
    current_year_start = current_date.replace(month=1, day=1)
    
    # Basic counts
    total_enterprises = Enterprise.objects.filter(is_active=True).count()
    total_workers = Worker.objects.count()
    active_workers = Worker.objects.filter(employment_status='active').count()
    
    # Examination stats
    total_examinations_this_month = MedicalExamination.objects.filter(
        exam_date__gte=current_month_start
    ).count()
    
    overdue_examinations = Worker.objects.filter(
        employment_status='active',
        next_exam_due__lt=current_date
    ).count()
    
    # Incident stats
    total_incidents_this_month = WorkplaceIncident.objects.filter(
        incident_date__gte=current_month_start
    ).count()
    
    # Disease stats  
    total_diseases_this_year = OccupationalDisease.objects.filter(
        diagnosis_date__gte=current_year_start
    ).count()
    
    # Compliance rates
    overall_fitness_rate = Worker.objects.filter(
        employment_status='active',
        current_fitness_status__in=['fit', 'fit_with_restrictions']
    ).count() / max(active_workers, 1) * 100
    
    exam_compliance_rate = (active_workers - overdue_examinations) / max(active_workers, 1) * 100
    
    # PPE compliance (simplified)
    ppe_compliance_rate = 85.0  # Placeholder - would need actual PPE compliance logic
    
    # Safety metrics (YTD - simplified calculation)
    ytd_incidents = WorkplaceIncident.objects.filter(incident_date__gte=current_year_start)
    ytd_ltifr = 2.1  # Placeholder  
    ytd_trifr = 4.5  # Placeholder
    ytd_severity_rate = 0.3  # Placeholder
    
    # Sector breakdown
    sector_breakdown = dict(
        Enterprise.objects.filter(is_active=True)
        .values_list('sector')
        .annotate(count=Count('id'))
    )
    
    # Risk level breakdown  
    risk_breakdown = {}
    for sector, count in sector_breakdown.items():
        risk_level = SECTOR_RISK_LEVELS.get(sector, 'moderate')
        risk_breakdown[risk_level] = risk_breakdown.get(risk_level, 0) + count
    
    stats = {
        'total_enterprises': total_enterprises,
        'total_workers': total_workers,
        'active_workers': active_workers,
        'total_examinations_this_month': total_examinations_this_month,
        'overdue_examinations': overdue_examinations,
        'total_incidents_this_month': total_incidents_this_month,
        'total_diseases_this_year': total_diseases_this_year,
        'overall_fitness_rate': round(overall_fitness_rate, 2),
        'exam_compliance_rate': round(exam_compliance_rate, 2),
        'ppe_compliance_rate': ppe_compliance_rate,
        'ytd_ltifr': ytd_ltifr,
        'ytd_trifr': ytd_trifr,
        'ytd_severity_rate': ytd_severity_rate,
        'sector_breakdown': sector_breakdown,
        'risk_level_breakdown': risk_breakdown
    }
    
    serializer = DashboardStatsSerializer(stats)
    return Response(serializer.data)

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