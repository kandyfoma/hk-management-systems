from rest_framework import generics, status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count
from django.utils import timezone
from .models import (
    Prescription, PrescriptionItem, PrescriptionNote, PrescriptionImage,
    PrescriptionStatus, PrescriptionItemStatus
)
from .serializers import (
    PrescriptionListSerializer, PrescriptionDetailSerializer, PrescriptionCreateSerializer,
    PrescriptionUpdateSerializer, PrescriptionItemSerializer, PrescriptionNoteSerializer,
    PrescriptionImageSerializer, DispensingSerializer
)
from apps.audit.decorators import (
    audit_dispense, audit_prescription_action, audit_critical_action
)
from apps.audit.models import AuditActionType


class PrescriptionListCreateAPIView(generics.ListCreateAPIView):
    queryset = Prescription.objects.select_related('patient', 'doctor', 'organization')
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'doctor']
    search_fields = ['prescription_number', 'patient__first_name', 'patient__last_name']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return PrescriptionCreateSerializer
        return PrescriptionListSerializer

    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.user.organization,
            created_by=self.request.user
        )


class PrescriptionDetailAPIView(generics.RetrieveUpdateAPIView):
    queryset = Prescription.objects.select_related(
        'patient', 'doctor', 'organization'
    ).prefetch_related('items', 'notes', 'images')

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return PrescriptionUpdateSerializer
        return PrescriptionDetailSerializer


class PrescriptionItemListCreateAPIView(generics.ListCreateAPIView):
    queryset = PrescriptionItem.objects.select_related('prescription', 'product')
    serializer_class = PrescriptionItemSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status']

    def get_queryset(self):
        prescription_id = self.kwargs.get('prescription_id')
        return self.queryset.filter(prescription_id=prescription_id)


class PrescriptionItemDetailAPIView(generics.RetrieveUpdateAPIView):
    queryset = PrescriptionItem.objects.select_related('prescription', 'product')
    serializer_class = PrescriptionItemSerializer


class PrescriptionNoteListCreateAPIView(generics.ListCreateAPIView):
    queryset = PrescriptionNote.objects.select_related('prescription', 'created_by')
    serializer_class = PrescriptionNoteSerializer
    
    def get_queryset(self):
        prescription_id = self.kwargs.get('prescription_id')
        return self.queryset.filter(prescription_id=prescription_id)
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class PrescriptionImageListCreateAPIView(generics.ListCreateAPIView):
    queryset = PrescriptionImage.objects.select_related('prescription', 'uploaded_by')
    serializer_class = PrescriptionImageSerializer
    
    def get_queryset(self):
        prescription_id = self.kwargs.get('prescription_id')
        return self.queryset.filter(prescription_id=prescription_id)
    
    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)


@api_view(['POST'])
@audit_dispense(description="Dispensation d'ordonnance")
def dispense_prescription_view(request, prescription_id):
    """Process prescription dispensing"""
    serializer = DispensingSerializer(data=request.data)
    if serializer.is_valid():
        try:
            prescription = serializer.dispense(prescription_id, request.user)
            return Response({
                'message': 'Dispensation mise à jour avec succès',
                'prescription_id': prescription.id,
                'status': prescription.status
            })
        except Exception as e:
            return Response({'error': str(e)}, status=400)
    return Response(serializer.errors, status=400)


@api_view(['POST'])
def dispense_item_view(request, item_id):
    """Dispense individual prescription item"""
    try:
        item = PrescriptionItem.objects.get(id=item_id)
        quantity = request.data.get('quantity', 0)
        # Implementation would handle item dispensing
        return Response({'message': f'{quantity} unités dispensées'})
    except PrescriptionItem.DoesNotExist:
        return Response({'error': 'Élément de prescription introuvable'}, status=404)


@api_view(['GET'])
def pending_prescriptions_view(request):
    """Get pending prescriptions"""
    prescriptions = Prescription.objects.filter(
        status=PrescriptionStatus.PENDING
    ).select_related('patient', 'doctor')
    
    return Response({
        'count': prescriptions.count(),
        'prescriptions': PrescriptionListSerializer(prescriptions, many=True).data
    })


@api_view(['GET'])
def expired_prescriptions_view(request):
    """Get expired prescriptions"""
    today = timezone.now().date()
    expired = Prescription.objects.filter(
        valid_until__lt=today,
        status__in=[PrescriptionStatus.PENDING, PrescriptionStatus.PARTIALLY_DISPENSED]
    )
    
    return Response({'count': expired.count()})


@api_view(['GET'])
def prescription_stats_view(request):
    """Get prescription statistics"""
    stats = {
        'total_prescriptions': Prescription.objects.count(),
        'pending_count': Prescription.objects.filter(status=PrescriptionStatus.PENDING).count(),
        'completed_count': Prescription.objects.filter(status=PrescriptionStatus.FULLY_DISPENSED).count(),
        'expired_count': Prescription.objects.filter(status=PrescriptionStatus.EXPIRED).count(),
    }
    return Response(stats)


@api_view(['POST'])
@audit_prescription_action(AuditActionType.PRESCRIPTION_REJECT, "Annulation d'ordonnance")
def cancel_prescription_view(request, prescription_id):
    """Cancel a prescription"""
    try:
        prescription = Prescription.objects.get(id=prescription_id)
        prescription.status = PrescriptionStatus.CANCELLED
        prescription.save()
        return Response({'message': 'Prescription annulée'})
    except Prescription.DoesNotExist:
        return Response({'error': 'Prescription introuvable'}, status=404)


@api_view(['POST'])
@audit_prescription_action(AuditActionType.PRESCRIPTION_VALIDATE, "Validation d'ordonnance")
def complete_prescription_view(request, prescription_id):
    """Mark prescription as complete"""
    try:
        prescription = Prescription.objects.get(id=prescription_id)
        prescription.status = PrescriptionStatus.FULLY_DISPENSED
        prescription.is_complete = True
        prescription.save()
        return Response({'message': 'Prescription marquée comme terminée'})
    except Prescription.DoesNotExist:
        return Response({'error': 'Prescription introuvable'}, status=404)