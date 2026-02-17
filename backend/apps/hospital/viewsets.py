"""
Hospital ViewSets - Enhanced relationship handling for complex medical data

Optimized ViewSets with proper query optimization, nested relationships,
and comprehensive CRUD operations for hospital encounters and related data.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Count, Q, Prefetch
from django.utils import timezone

from .models import HospitalEncounter, VitalSigns, HospitalDepartment, HospitalBed
from .serializers import (
    HospitalEncounterSerializer, HospitalEncounterCreateSerializer, 
    HospitalEncounterListSerializer, HospitalEncounterDetailSerializer,
    VitalSignsSerializer, VitalSignsCreateSerializer, VitalSignsListSerializer,
    HospitalDepartmentSerializer, HospitalBedSerializer
)
from apps.audit.decorators import audit_critical_action


class HospitalEncounterViewSet(viewsets.ModelViewSet):
    """
    Enhanced Hospital Encounter ViewSet with comprehensive relationship handling
    """
    permission_classes = []  # Add appropriate permissions
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = [
        'patient', 'encounter_type', 'status', 'attending_physician', 
        'department', 'organization'
    ]
    search_fields = [
        'encounter_number', 'patient__first_name', 'patient__last_name',
        'patient__patient_number', 'chief_complaint'
    ]
    ordering_fields = ['created_at', 'status', 'encounter_type']
    ordering = ['-created_at']

    def get_queryset(self):
        """Optimized queryset with proper relationship loading"""
        return HospitalEncounter.objects.select_related(
            'patient', 'organization', 'attending_physician', 'created_by', 'updated_by'
        ).prefetch_related(
            'nursing_staff',
            Prefetch('vital_signs', queryset=VitalSigns.objects.select_related('measured_by')),
            # Add prescription prefetch if available
        ).annotate(
            vital_signs_count=Count('vital_signs', distinct=True),
            prescriptions_count=Count('prescriptions', distinct=True)
        )

    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return HospitalEncounterCreateSerializer
        elif self.action in ['list']:
            return HospitalEncounterListSerializer
        elif self.action in ['retrieve']:
            return HospitalEncounterDetailSerializer
        return HospitalEncounterSerializer

    @audit_critical_action(description="Création de consultation hospitalière")
    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.user.organization,
            created_by=self.request.user
        )

    @audit_critical_action(description="Modification de consultation hospitalière")
    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    @action(detail=True, methods=['get'])
    def vital_signs(self, request, pk=None):
        """Get all vital signs for this encounter"""
        encounter = self.get_object()
        vital_signs = encounter.vital_signs.select_related(
            'measured_by', 'verified_by'
        ).order_by('-measured_at')
        
        serializer = VitalSignsListSerializer(vital_signs, many=True)
        return Response({
            'encounter': {
                'id': str(encounter.id),
                'encounter_number': encounter.encounter_number,
                'patient_name': encounter.patient.full_name
            },
            'vital_signs': serializer.data,
            'count': vital_signs.count()
        })

    @action(detail=True, methods=['get'])
    def prescriptions(self, request, pk=None):
        """Get all prescriptions for this encounter"""
        encounter = self.get_object()
        
        # Try to get prescriptions if the relationship exists
        try:
            from apps.prescriptions.serializers import PrescriptionListSerializer
            prescriptions = encounter.prescriptions.select_related(
                'patient', 'doctor', 'organization'
            ).prefetch_related('items').order_by('-created_at')
            
            serializer = PrescriptionListSerializer(prescriptions, many=True)
            return Response({
                'encounter': {
                    'id': str(encounter.id),
                    'encounter_number': encounter.encounter_number,
                    'patient_name': encounter.patient.full_name
                },
                'prescriptions': serializer.data,
                'count': prescriptions.count()
            })
        except ImportError:
            return Response({
                'error': 'Prescriptions module not available'
            }, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get encounter statistics"""
        today = timezone.now().date()
        
        queryset = self.get_queryset()
        
        stats = {
            'total_encounters': queryset.count(),
            'today_encounters': queryset.filter(created_at__date=today).count(),
            'active_encounters': queryset.filter(
                status__in=['checked_in', 'in_progress']
            ).count(),
            'emergency_encounters': queryset.filter(
                encounter_type='emergency',
                status__in=['checked_in', 'in_progress']
            ).count(),
            'inpatient_count': queryset.filter(
                encounter_type='inpatient',
                status='in_progress'
            ).count(),
            # Status breakdown
            'status_breakdown': dict(
                queryset.values('status').annotate(count=Count('id')).values_list('status', 'count')
            ),
            # Type breakdown
            'type_breakdown': dict(
                queryset.values('encounter_type').annotate(count=Count('id')).values_list('encounter_type', 'count')
            )
        }
        
        return Response(stats)

    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get all active encounters"""
        active_encounters = self.get_queryset().filter(
            status__in=['checked_in', 'in_progress']
        )
        
        serializer = self.get_serializer(active_encounters, many=True)
        return Response({
            'results': serializer.data,
            'count': active_encounters.count()
        })


class VitalSignsViewSet(viewsets.ModelViewSet):
    """
    Enhanced Vital Signs ViewSet with encounter relationship handling
    """
    permission_classes = []  # Add appropriate permissions
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['patient', 'encounter', 'measured_by', 'is_abnormal']
    search_fields = ['patient__first_name', 'patient__last_name', 'patient__patient_number']
    ordering_fields = ['measured_at', 'created_at', 'temperature', 'heart_rate']
    ordering = ['-measured_at']

    def get_queryset(self):
        """Optimized queryset with relationships"""
        return VitalSigns.objects.select_related(
            'patient', 'encounter', 'encounter__patient', 'encounter__attending_physician',
            'measured_by', 'verified_by', 'created_by', 'updated_by'
        )

    def get_serializer_class(self):
        if self.action == 'create':
            return VitalSignsCreateSerializer
        elif self.action in ['list']:
            return VitalSignsListSerializer
        return VitalSignsSerializer

    @audit_critical_action(description="Création de signes vitaux")
    def perform_create(self, serializer):
        serializer.save(
            created_by=self.request.user,
            measured_by=self.request.user
        )

    @audit_critical_action(description="Modification de signes vitaux")
    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    @action(detail=False, methods=['get'])
    def abnormal(self, request):
        """Get all abnormal vital signs for today"""
        today = timezone.now().date()
        abnormal_vitals = self.get_queryset().filter(
            measured_at__date=today
        )
        
        # Filter for abnormal values (this assumes is_abnormal property exists)
        abnormal_list = [v for v in abnormal_vitals if hasattr(v, 'is_abnormal') and v.is_abnormal]
        
        serializer = VitalSignsListSerializer(abnormal_list, many=True)
        return Response({
            'count': len(abnormal_list),
            'results': serializer.data
        })

    @action(detail=False, methods=['get'])
    def patient_history(self, request):
        """Get vital signs history for a specific patient"""
        patient_id = request.query_params.get('patient_id')
        if not patient_id:
            return Response(
                {'error': 'patient_id parameter is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        vital_signs = self.get_queryset().filter(
            patient_id=patient_id
        ).order_by('-measured_at')[:20]  # Last 20 measurements
        
        serializer = VitalSignsListSerializer(vital_signs, many=True)
        return Response({
            'patient_id': patient_id,
            'count': vital_signs.count(),
            'results': serializer.data
        })