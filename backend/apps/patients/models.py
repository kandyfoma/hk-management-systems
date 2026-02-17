from django.db import models
import uuid


class Gender(models.TextChoices):
    MALE = 'male', 'Masculin'
    FEMALE = 'female', 'Féminin'
    OTHER = 'other', 'Autre'


class BloodType(models.TextChoices):
    A_POSITIVE = 'A+', 'A+'
    A_NEGATIVE = 'A-', 'A-'
    B_POSITIVE = 'B+', 'B+'
    B_NEGATIVE = 'B-', 'B-'
    AB_POSITIVE = 'AB+', 'AB+'
    AB_NEGATIVE = 'AB-', 'AB-'
    O_POSITIVE = 'O+', 'O+'
    O_NEGATIVE = 'O-', 'O-'


class PatientStatus(models.TextChoices):
    ACTIVE = 'active', 'Actif'
    INACTIVE = 'inactive', 'Inactif'
    DECEASED = 'deceased', 'Décédé'


class Patient(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    middle_name = models.CharField(max_length=150, blank=True)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=10, choices=Gender.choices)
    national_id = models.CharField(max_length=50, blank=True)
    passport_number = models.CharField(max_length=50, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, default='Hong Kong')
    
    # Emergency contact
    emergency_contact_name = models.CharField(max_length=200, blank=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True)
    emergency_contact_relation = models.CharField(max_length=100, blank=True)
    
    # Medical information
    blood_type = models.CharField(max_length=3, choices=BloodType.choices, blank=True)
    allergies = models.JSONField(default=list, help_text='Allergies connues')
    chronic_conditions = models.JSONField(default=list, help_text='Conditions chroniques')
    current_medications = models.JSONField(default=list, help_text='Médicaments actifs')
    
    # Insurance
    insurance_provider = models.CharField(max_length=200, blank=True)
    insurance_number = models.CharField(max_length=100, blank=True)
    
    # System fields
    patient_number = models.CharField(max_length=20, unique=True)
    registration_date = models.DateField(auto_now_add=True)
    last_visit = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=PatientStatus.choices, default=PatientStatus.ACTIVE)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'patients'
        verbose_name = 'Patient'
        verbose_name_plural = 'Patients'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.patient_number})"

    @property
    def full_name(self):
        middle = f" {self.middle_name}" if self.middle_name else ""
        return f"{self.first_name}{middle} {self.last_name}"

    @property
    def age(self):
        from django.utils import timezone
        today = timezone.now().date()
        return today.year - self.date_of_birth.year - (
            (today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day)
        )