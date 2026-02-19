from rest_framework import generics, status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django_filters import rest_framework as filters
from django.db.models import Q
from django.utils import timezone
from .models import Patient, Gender, BloodType, PatientStatus
from .serializers import PatientSerializer, PatientListSerializer


class PatientFilter(filters.FilterSet):
    gender = filters.ChoiceFilter(choices=Gender.choices)
    blood_type = filters.ChoiceFilter(choices=BloodType.choices)
    status = filters.ChoiceFilter(choices=PatientStatus.choices)
    age_min = filters.NumberFilter(method='filter_age_min')
    age_max = filters.NumberFilter(method='filter_age_max')
    search = filters.CharFilter(method='filter_search')

    class Meta:
        model = Patient
        fields = ['gender', 'blood_type', 'status']

    def filter_age_min(self, queryset, name, value):
        from django.utils import timezone
        from datetime import date, timedelta
        if value:
            cutoff_date = timezone.now().date() - timedelta(days=value * 365)
            return queryset.filter(date_of_birth__lte=cutoff_date)
        return queryset

    def filter_age_max(self, queryset, name, value):
        from datetime import date, timedelta
        from django.utils import timezone
        if value:
            cutoff_date = timezone.now().date() - timedelta(days=value * 365)
            return queryset.filter(date_of_birth__gte=cutoff_date)
        return queryset

    def filter_search(self, queryset, name, value):
        return queryset.filter(
            Q(first_name__icontains=value) |
            Q(last_name__icontains=value) |
            Q(patient_number__icontains=value) |
            Q(phone__icontains=value) |
            Q(email__icontains=value)
        )


class PatientListCreateAPIView(generics.ListCreateAPIView):
    queryset = Patient.objects.all()
    filter_backends = [DjangoFilterBackend]
    filterset_class = PatientFilter
    search_fields = ['first_name', 'last_name', 'patient_number', 'phone']
    ordering_fields = ['first_name', 'last_name', 'date_of_birth', 'created_at']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return PatientSerializer
        return PatientListSerializer


class PatientDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Patient.objects.all()
    serializer_class = PatientSerializer

    def perform_destroy(self, instance):
        # Soft delete - set status to inactive
        instance.status = PatientStatus.INACTIVE
        instance.save()


@api_view(['POST'])
def patient_bulk_import(request):
    """
    POST /api/v1/patients/bulk-import/
    Accepts a JSON array of patient objects. Creates new or updates existing (by patient_number or first+last+dob).
    """
    data = request.data
    if not isinstance(data, list):
        return Response({'error': 'Expected a JSON array.'}, status=status.HTTP_400_BAD_REQUEST)

    created, updated, errors = [], [], []

    for i, row in enumerate(data):
        try:
            first_name = str(row.get('first_name', '') or row.get('firstName', '') or '').strip()
            last_name  = str(row.get('last_name',  '') or row.get('lastName',  '') or '').strip()
            dob        = str(row.get('date_of_birth', '') or row.get('dateOfBirth', '') or '').strip()

            if not first_name or not last_name:
                errors.append({'row': i + 1, 'error': 'first_name and last_name are required'})
                continue

            if not dob:
                dob = '1990-01-01'

            # Parse date
            from datetime import datetime as dt
            parsed_dob = None
            for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%d-%m-%Y'):
                try:
                    parsed_dob = dt.strptime(dob, fmt).date()
                    break
                except ValueError:
                    continue
            if not parsed_dob:
                parsed_dob = dt(1990, 1, 1).date()

            gender_raw = str(row.get('gender', 'other') or 'other').lower().strip()
            gender = gender_raw if gender_raw in ('male', 'female', 'other') else 'other'

            patient_data = {
                'first_name': first_name,
                'last_name': last_name,
                'middle_name': str(row.get('middle_name', '') or row.get('middleName', '') or '').strip(),
                'date_of_birth': parsed_dob,
                'gender': gender,
                'phone': (str(row.get('phone', '') or ''))[:20],
                'email': str(row.get('email', '') or '').strip(),
                'address': str(row.get('address', '') or '').strip(),
                'city': str(row.get('city', '') or '').strip(),
                'blood_type': str(row.get('blood_type', '') or row.get('bloodType', '') or '').upper()[:3],
                'allergies': row.get('allergies', []) if isinstance(row.get('allergies'), list) else [],
                'chronic_conditions': row.get('chronic_conditions', []) if isinstance(row.get('chronic_conditions'), list) else [],
                'emergency_contact_name': str(row.get('emergency_contact_name', '') or row.get('emergencyContactName', '') or '').strip(),
                'emergency_contact_phone': (str(row.get('emergency_contact_phone', '') or row.get('emergencyContactPhone', '') or ''))[:20],
                'insurance_provider': str(row.get('insurance_provider', '') or '').strip(),
                'insurance_number': str(row.get('insurance_number', '') or '').strip(),
                'notes': str(row.get('notes', '') or '').strip(),
            }

            # Try find existing by patient_number or name+dob
            patient_number = str(row.get('patient_number', '') or row.get('patientNumber', '') or '').strip()
            existing = None
            if patient_number:
                existing = Patient.objects.filter(patient_number=patient_number).first()
            if not existing:
                existing = Patient.objects.filter(
                    first_name__iexact=first_name,
                    last_name__iexact=last_name,
                    date_of_birth=parsed_dob
                ).first()

            if existing:
                for k, v in patient_data.items():
                    if v not in ('', [], {}):
                        setattr(existing, k, v)
                existing.save()
                updated.append({'id': str(existing.id), 'patient_number': existing.patient_number, 'name': existing.full_name})
            else:
                serializer = PatientSerializer(data={**patient_data})
                if serializer.is_valid():
                    patient = serializer.save()
                    created.append({'id': str(patient.id), 'patient_number': patient.patient_number, 'name': patient.full_name})
                else:
                    errors.append({'row': i + 1, 'error': str(serializer.errors)})
        except Exception as e:
            errors.append({'row': i + 1, 'error': str(e)})

    return Response({
        'total': len(data),
        'created': len(created),
        'updated': len(updated),
        'errors': len(errors),
        'created_patients': created,
        'updated_patients': updated,
        'error_details': errors[:20],
    }, status=status.HTTP_200_OK)