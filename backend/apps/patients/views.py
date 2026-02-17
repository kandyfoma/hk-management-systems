from rest_framework import generics
from django_filters.rest_framework import DjangoFilterBackend
from django_filters import rest_framework as filters
from django.db.models import Q
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