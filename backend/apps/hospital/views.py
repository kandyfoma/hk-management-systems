from rest_framework import generics, status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework.parsers import MultiPartParser, FormParser

from .models import (
    HospitalEncounter, VitalSigns, HospitalDepartment,
    HospitalBed, EncounterType, EncounterStatus, BedStatus,
    Triage, TriageLevel, TriageStatus
)
from .serializers import (
    HospitalEncounterSerializer, HospitalEncounterCreateSerializer, HospitalEncounterListSerializer,
    HospitalEncounterDetailSerializer, VitalSignsSerializer, VitalSignsCreateSerializer, VitalSignsListSerializer,
    HospitalDepartmentSerializer, HospitalBedSerializer, HospitalBedListSerializer,
    EncounterTypeChoicesSerializer, EncounterStatusChoicesSerializer, BedStatusChoicesSerializer,
    TriageSerializer, TriageListSerializer
)
from apps.audit.decorators import audit_critical_action


# ═══════════════════════════════════════════════════════════════
#  VITAL SIGNS API VIEWS
# ═══════════════════════════════════════════════════════════════

class VitalSignsListCreateAPIView(generics.ListCreateAPIView):
    """List and create vital signs"""
    queryset = VitalSigns.objects.select_related(
        'patient', 'encounter', 'measured_by', 'verified_by', 'created_by', 'updated_by'
    ).prefetch_related('encounter__nursing_staff')
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['patient', 'encounter', 'measured_by', 'is_abnormal']
    search_fields = ['patient__first_name', 'patient__last_name', 'patient__patient_number']
    ordering_fields = ['measured_at', 'created_at', 'temperature', 'heart_rate']
    ordering = ['-measured_at']

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return VitalSignsCreateSerializer
        return VitalSignsListSerializer

    @audit_critical_action(description="Création de signes vitaux")
    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.user.organization,
            created_by=self.request.user,
            measured_by=self.request.user
        )


class VitalSignsDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update or delete vital signs"""
    queryset = VitalSigns.objects.select_related(
        'patient', 'encounter', 'measured_by', 'verified_by', 'created_by', 'updated_by'
    )
    serializer_class = VitalSignsSerializer

    @audit_critical_action(description="Modification de signes vitaux")
    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    @audit_critical_action(description="Suppression de signes vitaux")
    def perform_destroy(self, instance):
        super().perform_destroy(instance)


@api_view(['GET'])
def vital_signs_patient_history_view(request, patient_id):
    """Get vital signs history for a specific patient"""
    try:
        vital_signs = VitalSigns.objects.filter(
            patient_id=patient_id
        ).select_related('measured_by', 'encounter').order_by('-measured_at')[:20]
        
        serializer = VitalSignsListSerializer(vital_signs, many=True)
        return Response({
            'count': vital_signs.count(),
            'results': serializer.data
        })
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['GET'])
def vital_signs_abnormal_view(request):
    """Get all abnormal vital signs"""
    abnormal_vitals = VitalSigns.objects.filter(
        measured_at__date=timezone.now().date()
    ).select_related('patient', 'measured_by')
    
    # Filter for abnormal values
    abnormal_list = [v for v in abnormal_vitals if v.is_abnormal]
    
    serializer = VitalSignsListSerializer(abnormal_list, many=True)
    return Response({
        'count': len(abnormal_list),
        'results': serializer.data
    })


# ═══════════════════════════════════════════════════════════════
#  HOSPITAL ENCOUNTER API VIEWS
# ═══════════════════════════════════════════════════════════════

class HospitalEncounterListCreateAPIView(generics.ListCreateAPIView):
    """List and create hospital encounters"""
    queryset = HospitalEncounter.objects.select_related(
        'patient', 'organization', 'attending_physician', 'created_by', 'updated_by'
    ).prefetch_related('nursing_staff')
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['encounter_type', 'status', 'attending_physician', 'department']
    search_fields = [
        'encounter_number', 'patient__first_name', 'patient__last_name',
        'patient__patient_number', 'chief_complaint'
    ]
    ordering_fields = ['created_at', 'admission_date', 'encounter_number']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return HospitalEncounterCreateSerializer
        return HospitalEncounterListSerializer

    @audit_critical_action(description="Création de consultation hospitalière")
    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.user.organization,
            created_by=self.request.user
        )


class HospitalEncounterDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update or delete hospital encounter"""
    queryset = HospitalEncounter.objects.select_related(
        'patient', 'organization', 'attending_physician', 'created_by', 'updated_by'
    ).prefetch_related('nursing_staff', 'vital_signs', 'prescriptions')
    serializer_class = HospitalEncounterDetailSerializer

    @audit_critical_action(description="Modification de consultation hospitalière")
    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    @audit_critical_action(description="Suppression de consultation hospitalière")
    def perform_destroy(self, instance):
        super().perform_destroy(instance)


@api_view(['GET'])
def encounter_stats_view(request):
    """Get encounter statistics"""
    today = timezone.now().date()
    
    stats = {
        'today_encounters': HospitalEncounter.objects.filter(
            created_at__date=today
        ).count(),
        'active_encounters': HospitalEncounter.objects.filter(
            status__in=[EncounterStatus.CHECKED_IN, EncounterStatus.IN_PROGRESS]
        ).count(),
        'emergency_encounters': HospitalEncounter.objects.filter(
            encounter_type=EncounterType.EMERGENCY,
            status__in=[EncounterStatus.CHECKED_IN, EncounterStatus.IN_PROGRESS]
        ).count(),
        'inpatient_count': HospitalEncounter.objects.filter(
            encounter_type=EncounterType.INPATIENT,
            status=EncounterStatus.IN_PROGRESS
        ).count()
    }
    
    return Response(stats)


@api_view(['GET'])
def encounter_prescriptions_view(request, encounter_id):
    """Get all prescriptions for a specific encounter"""
    try:
        # Import here to avoid circular import
        from apps.prescriptions.serializers import PrescriptionListSerializer
        from apps.prescriptions.models import Prescription
        
        encounter = HospitalEncounter.objects.get(id=encounter_id)
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
    except HospitalEncounter.DoesNotExist:
        return Response(
            {'error': 'Encounter not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_400_BAD_REQUEST
        )


# ═══════════════════════════════════════════════════════════════
#  HOSPITAL DEPARTMENT API VIEWS
# ═══════════════════════════════════════════════════════════════

class HospitalDepartmentListCreateAPIView(generics.ListCreateAPIView):
    """List and create hospital departments"""
    queryset = HospitalDepartment.objects.select_related(
        'organization', 'department_head'
    ).prefetch_related('beds')
    serializer_class = HospitalDepartmentSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['organization', 'is_active', 'department_head']
    search_fields = ['name', 'code', 'description']
    ordering_fields = ['name', 'code', 'created_at']
    ordering = ['name']

    @audit_critical_action(description="Création de service hospitalier")
    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization)


class HospitalDepartmentDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update or delete hospital department"""
    queryset = HospitalDepartment.objects.select_related(
        'organization', 'department_head'
    ).prefetch_related('beds')
    serializer_class = HospitalDepartmentSerializer

    @audit_critical_action(description="Modification de service hospitalier")
    def perform_update(self, serializer):
        serializer.save()

    @audit_critical_action(description="Suppression de service hospitalier")
    def perform_destroy(self, instance):
        # Soft delete - mark as inactive instead
        instance.is_active = False
        instance.save()


# ═══════════════════════════════════════════════════════════════
#  HOSPITAL BED API VIEWS
# ═══════════════════════════════════════════════════════════════

class HospitalBedListCreateAPIView(generics.ListCreateAPIView):
    """List and create hospital beds"""
    queryset = HospitalBed.objects.select_related(
        'department__organization', 'current_patient', 'current_encounter'
    )
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['department', 'status', 'bed_type', 'is_active']
    search_fields = ['bed_number', 'room_number', 'department__name']
    ordering_fields = ['department__name', 'room_number', 'bed_number']
    ordering = ['department__name', 'room_number', 'bed_number']

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return HospitalBedListSerializer
        return HospitalBedSerializer

    @audit_critical_action(description="Création de lit hospitalier")
    def perform_create(self, serializer):
        serializer.save()


class HospitalBedDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update or delete hospital bed"""
    queryset = HospitalBed.objects.select_related(
        'department__organization', 'current_patient', 'current_encounter'
    )
    serializer_class = HospitalBedSerializer

    @audit_critical_action(description="Modification de lit hospitalier")
    def perform_update(self, serializer):
        serializer.save()

    @audit_critical_action(description="Suppression de lit hospitalier")
    def perform_destroy(self, instance):
        # Soft delete - mark as inactive instead
        instance.is_active = False
        instance.save()


@api_view(['POST'])
@audit_critical_action(description="Assignation de lit à un patient")
def assign_bed_view(request, bed_id):
    """Assign a bed to a patient and encounter"""
    try:
        bed = HospitalBed.objects.get(id=bed_id)
        patient_id = request.data.get('patient_id')
        encounter_id = request.data.get('encounter_id')
        
        if bed.status != BedStatus.AVAILABLE:
            return Response(
                {'error': 'Le lit n\'est pas disponible'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update bed assignment
        bed.status = BedStatus.OCCUPIED
        bed.current_patient_id = patient_id
        bed.current_encounter_id = encounter_id
        bed.save()
        
        # Update encounter with bed info
        if encounter_id:
            encounter = HospitalEncounter.objects.get(id=encounter_id)
            encounter.room_number = bed.room_number
            encounter.bed_number = bed.bed_number
            encounter.save()
        
        serializer = HospitalBedSerializer(bed)
        return Response(serializer.data)
        
    except HospitalBed.DoesNotExist:
        return Response(
            {'error': 'Lit non trouvé'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
@audit_critical_action(description="Libération de lit hospitalier")
def release_bed_view(request, bed_id):
    """Release a bed from current patient"""
    try:
        bed = HospitalBed.objects.get(id=bed_id)
        
        # Clear bed assignment
        bed.status = BedStatus.CLEANING
        bed.current_patient = None
        bed.current_encounter = None
        bed.last_cleaned = timezone.now()
        bed.save()
        
        serializer = HospitalBedSerializer(bed)
        return Response(serializer.data)
        
    except HospitalBed.DoesNotExist:
        return Response(
            {'error': 'Lit non trouvé'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['GET'])
def bed_occupancy_view(request):
    """Get bed occupancy statistics"""
    total_beds = HospitalBed.objects.filter(is_active=True).count()
    occupied_beds = HospitalBed.objects.filter(
        is_active=True,
        status=BedStatus.OCCUPIED
    ).count()
    available_beds = HospitalBed.objects.filter(
        is_active=True,
        status=BedStatus.AVAILABLE
    ).count()
    
    # Department breakdown
    department_stats = HospitalDepartment.objects.filter(
        is_active=True
    ).annotate(
        total_beds=Count('beds', filter=Q(beds__is_active=True)),
        occupied_beds=Count('beds', filter=Q(
            beds__is_active=True,
            beds__status=BedStatus.OCCUPIED
        )),
        available_beds=Count('beds', filter=Q(
            beds__is_active=True,
            beds__status=BedStatus.AVAILABLE
        ))
    ).values('name', 'total_beds', 'occupied_beds', 'available_beds')
    
    occupancy_rate = round((occupied_beds / total_beds * 100), 1) if total_beds > 0 else 0
    
    return Response({
        'total_beds': total_beds,
        'occupied_beds': occupied_beds,
        'available_beds': available_beds,
        'occupancy_rate': occupancy_rate,
        'departments': list(department_stats)
    })


# ═══════════════════════════════════════════════════════════════
#  CHOICE FIELD API VIEWS
# ═══════════════════════════════════════════════════════════════

@api_view(['GET'])
def encounter_type_choices_view(request):
    """Get encounter type choices"""
    choices = [
        {'value': choice[0], 'label': choice[1]}
        for choice in EncounterType.choices
    ]
    return Response(choices)


@api_view(['GET'])
def encounter_status_choices_view(request):
    """Get encounter status choices"""
    choices = [
        {'value': choice[0], 'label': choice[1]}
        for choice in EncounterStatus.choices
    ]
    return Response(choices)


@api_view(['GET'])
def bed_status_choices_view(request):
    """Get bed status choices"""
    choices = [
        {'value': choice[0], 'label': choice[1]}
        for choice in BedStatus.choices
    ]
    return Response(choices)


# ═══════════════════════════════════════════════════════════════
#  DASHBOARD AND STATISTICS
# ═══════════════════════════════════════════════════════════════

@api_view(['GET'])
def hospital_dashboard_view(request):
    """Get hospital dashboard statistics"""
    today = timezone.now().date()
    
    # Today's statistics
    today_encounters = HospitalEncounter.objects.filter(created_at__date=today).count()
    today_vitals = VitalSigns.objects.filter(measured_at__date=today).count()
    
    # Active statistics
    active_encounters = HospitalEncounter.objects.filter(
        status__in=[EncounterStatus.CHECKED_IN, EncounterStatus.IN_PROGRESS]
    ).count()
    
    emergency_cases = HospitalEncounter.objects.filter(
        encounter_type=EncounterType.EMERGENCY,
        status__in=[EncounterStatus.CHECKED_IN, EncounterStatus.IN_PROGRESS]
    ).count()
    
    # Bed occupancy
    total_beds = HospitalBed.objects.filter(is_active=True).count()
    occupied_beds = HospitalBed.objects.filter(
        is_active=True,
        status=BedStatus.OCCUPIED
    ).count()
    occupancy_rate = round((occupied_beds / total_beds * 100), 1) if total_beds > 0 else 0
    
    # Abnormal vitals today
    abnormal_vitals = VitalSigns.objects.filter(
        measured_at__date=today
    )
    abnormal_count = len([v for v in abnormal_vitals if v.is_abnormal])
    
    return Response({
        'today_encounters': today_encounters,
        'today_vitals': today_vitals,
        'active_encounters': active_encounters,
        'emergency_cases': emergency_cases,
        'total_beds': total_beds,
        'occupied_beds': occupied_beds,
        'available_beds': total_beds - occupied_beds,
        'occupancy_rate': occupancy_rate,
        'abnormal_vitals_today': abnormal_count,
        'departments_count': HospitalDepartment.objects.filter(is_active=True).count()
    })


@api_view(['GET'])
def patient_medical_summary_view(request, patient_id):
    """Get comprehensive medical summary for a patient"""
    try:
        from apps.patients.models import Patient
        from apps.prescriptions.models import Prescription, PrescriptionStatus
        from apps.prescriptions.serializers import PrescriptionListSerializer
        
        patient = Patient.objects.get(id=patient_id)
        
        # Get recent encounters
        recent_encounters = HospitalEncounter.objects.filter(
            patient=patient
        ).select_related('attending_physician').order_by('-created_at')[:5]
        
        # Get recent prescriptions
        recent_prescriptions = Prescription.objects.filter(
            patient=patient
        ).select_related('doctor', 'encounter').order_by('-created_at')[:5]
        
        # Get recent vital signs
        recent_vitals = VitalSigns.objects.filter(
            patient=patient
        ).select_related('measured_by', 'encounter').order_by('-measured_at')[:5]
        
        encounter_serializer = HospitalEncounterListSerializer(recent_encounters, many=True)
        prescription_serializer = PrescriptionListSerializer(recent_prescriptions, many=True)
        vitals_serializer = VitalSignsListSerializer(recent_vitals, many=True)
        
        return Response({
            'patient': {
                'id': str(patient.id),
                'full_name': patient.full_name,
                'patient_number': patient.patient_number,
                'age': patient.age,
                'gender': patient.get_gender_display(),
                'blood_type': patient.blood_type,
                'allergies': patient.allergies,
                'chronic_conditions': patient.chronic_conditions
            },
            'recent_encounters': encounter_serializer.data,
            'recent_prescriptions': prescription_serializer.data,
            'recent_vital_signs': vitals_serializer.data,
            'statistics': {
                'total_encounters': HospitalEncounter.objects.filter(patient=patient).count(),
                'total_prescriptions': Prescription.objects.filter(patient=patient).count(),
                'active_prescriptions': Prescription.objects.filter(
                    patient=patient, 
                    status=PrescriptionStatus.PENDING
                ).count()
            }
        })
    except Patient.DoesNotExist:
        return Response(
            {'error': 'Patient not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_400_BAD_REQUEST
        )


# ═══════════════════════════════════════════════════════════════
#  TRIAGE API VIEWS
# ═══════════════════════════════════════════════════════════════

class TriageListCreateAPIView(generics.ListCreateAPIView):
    """List and create triages"""
    queryset = Triage.objects.select_related(
        'patient', 'encounter', 'nurse', 'assigned_doctor', 'organization'
    )
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['patient', 'triage_level', 'status', 'organization']
    search_fields = ['patient__first_name', 'patient__last_name', 'patient__patient_number', 'triage_number', 'chief_complaint']
    ordering_fields = ['triage_date', 'triage_level', 'created_at']
    ordering = ['-triage_date']

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return TriageListSerializer
        return TriageSerializer

    @audit_critical_action(description="Création d'un triage")
    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.user.organization,
            nurse=self.request.user
        )


class TriageDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a triage"""
    queryset = Triage.objects.select_related(
        'patient', 'encounter', 'nurse', 'assigned_doctor', 'organization'
    )
    serializer_class = TriageSerializer

    @audit_critical_action(description="Mise à jour d'un triage")
    def perform_update(self, serializer):
        serializer.save()

    @audit_critical_action(description="Suppression d'un triage")
    def perform_destroy(self, instance):
        instance.delete()


@api_view(['GET'])
def triage_by_patient_view(request, patient_id):
    """Get triages for a specific patient"""
    try:
        triages = Triage.objects.filter(patient_id=patient_id).select_related(
            'patient', 'encounter', 'nurse', 'assigned_doctor', 'organization'
        ).order_by('-triage_date')
        
        serializer = TriageListSerializer(triages, many=True)
        return Response({
            'success': True,
            'count': triages.count(),
            'results': serializer.data
        })
    except Exception as e:
        return Response(
            {'success': False, 'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['GET'])
def triage_by_level_view(request, level):
    """Get triages by priority level"""
    try:
        triages = Triage.objects.filter(triage_level=level, status__in=[
            TriageStatus.IN_PROGRESS, TriageStatus.COMPLETED
        ]).select_related(
            'patient', 'encounter', 'nurse', 'assigned_doctor', 'organization'
        ).order_by('-triage_date')
        
        serializer = TriageListSerializer(triages, many=True)
        return Response({
            'success': True,
            'level': level,
            'count': triages.count(),
            'results': serializer.data
        })
    except Exception as e:
        return Response(
            {'success': False, 'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )

# ═══════════════════════════════════════════════════════════════
#  CONSULTATION RECORDING TRANSCRIPTION API
# ═══════════════════════════════════════════════════════════════

class ConsultationRecordingTranscriptionView(generics.CreateAPIView):
    """
    Transcribe consultation recording and generate structured notes using Gemini Flash
    
    POST /api/v1/hospital/transcribe-recording/
    - Accepts audio file upload
    - Uses Gemini Flash to transcribe and generate clinical notes
    - Returns structured consultation notes
    """
    parser_classes = (MultiPartParser, FormParser)
    
    def post(self, request, *args, **kwargs):
        """Handle audio file upload and transcription"""
        try:
            audio_file = request.FILES.get('audio')
            if not audio_file:
                return Response(
                    {'success': False, 'error': 'No audio file provided'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Extract consultation context if provided
            import json
            consultation_context = None
            if 'consultationContext' in request.POST:
                try:
                    consultation_context = json.loads(request.POST.get('consultationContext', '{}'))
                except json.JSONDecodeError:
                    logger = __import__('logging').getLogger(__name__)
                    logger.warning("Could not parse consultation context")
            
            # Import here to avoid circular imports
            from .gemini_service import get_gemini_service
            import tempfile
            import os
            
            # Save temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp:
                for chunk in audio_file.chunks():
                    tmp.write(chunk)
                tmp_path = tmp.name
            
            try:
                # Transcribe with Gemini, passing consultation context
                service = get_gemini_service()
                result = service.transcribe_and_generate_notes(tmp_path, consultation_context=consultation_context)
                
                return Response(result, status=status.HTTP_200_OK)
            finally:
                # Clean up temp file
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)
        
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error transcribing recording: {str(e)}")
            return Response(
                {'success': False, 'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )