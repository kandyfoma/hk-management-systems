import uuid
from decimal import Decimal
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.contrib.auth import get_user_model

User = get_user_model()


# ═══════════════════════════════════════════════════════════════
#  HOSPITAL ENCOUNTER MODELS
# ═══════════════════════════════════════════════════════════════

class EncounterType(models.TextChoices):
    """Types of hospital encounters"""
    OUTPATIENT = 'outpatient', 'Consultation externe'
    INPATIENT = 'inpatient', 'Hospitalisation'  
    EMERGENCY = 'emergency', 'Urgence'
    ICU = 'icu', 'Soins intensifs'
    SURGERY = 'surgery', 'Chirurgie'
    DIALYSIS = 'dialysis', 'Dialyse'
    REHABILITATION = 'rehabilitation', 'Rééducation'
    MATERNITY = 'maternity', 'Maternité'


class EncounterStatus(models.TextChoices):
    """Status of hospital encounters"""
    SCHEDULED = 'scheduled', 'Programmé'
    CHECKED_IN = 'checked_in', 'Enregistré'
    IN_PROGRESS = 'in_progress', 'En cours'
    COMPLETED = 'completed', 'Terminé'
    CANCELLED = 'cancelled', 'Annulé'
    NO_SHOW = 'no_show', 'Absent'


class HospitalEncounter(models.Model):
    """Hospital encounter/visit record"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    encounter_number = models.CharField(max_length=50, unique=True, verbose_name='Numéro de consultation')
    
    # Patient and Organization
    patient = models.ForeignKey(
        'patients.Patient',
        on_delete=models.PROTECT,
        related_name='hospital_encounters',
        verbose_name='Patient'
    )
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.PROTECT,
        related_name='hospital_encounters',
        verbose_name='Établissement'
    )
    
    # Encounter Details
    encounter_type = models.CharField(
        max_length=20,
        choices=EncounterType.choices,
        default=EncounterType.OUTPATIENT,
        verbose_name='Type de consultation'
    )
    status = models.CharField(
        max_length=20,
        choices=EncounterStatus.choices,
        default=EncounterStatus.SCHEDULED,
        verbose_name='Statut'
    )
    
    # Clinical Information
    chief_complaint = models.TextField(blank=True, verbose_name='Motif de consultation')
    history_of_present_illness = models.TextField(blank=True, verbose_name='Histoire de la maladie')
    
    # Medical Staff
    attending_physician = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='attended_encounters',
        verbose_name='Médecin traitant',
        limit_choices_to={'user_type': 'doctor'}
    )
    nursing_staff = models.ManyToManyField(
        User,
        blank=True,
        related_name='nursing_encounters',
        verbose_name='Personnel soignant',
        limit_choices_to={'user_type__in': ['nurse', 'nursing_aide']}
    )
    
    # Department and Location
    department = models.CharField(max_length=100, blank=True, verbose_name='Service')
    room_number = models.CharField(max_length=20, blank=True, verbose_name='Numéro de chambre')
    bed_number = models.CharField(max_length=20, blank=True, verbose_name='Numéro de lit')
    
    # Referral Information
    referred_by = models.CharField(max_length=200, blank=True, verbose_name='Référé par')
    referred_to = models.CharField(max_length=200, blank=True, verbose_name='Référé vers')
    
    # Administrative
    admission_date = models.DateTimeField(null=True, blank=True, verbose_name='Date d\'admission')
    discharge_date = models.DateTimeField(null=True, blank=True, verbose_name='Date de sortie')
    
    # Billing
    estimated_cost = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        null=True, 
        blank=True,
        verbose_name='Coût estimé'
    )
    final_cost = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        null=True, 
        blank=True,
        verbose_name='Coût final'
    )
    
    # Audit Fields
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_hospital_encounters',
        verbose_name='Créé par'
    )
    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='updated_hospital_encounters',
        verbose_name='Modifié par'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Créé le')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Modifié le')
    
    class Meta:
        db_table = 'hospital_encounters'
        verbose_name = 'Consultation hospitalière'
        verbose_name_plural = 'Consultations hospitalières'
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.encounter_number} - {self.patient.full_name}"
    
    def save(self, *args, **kwargs):
        if not self.encounter_number:
            # Generate encounter number: HE-YYYY-XXXXXX
            from django.utils import timezone
            year = timezone.now().year
            count = HospitalEncounter.objects.filter(created_at__year=year).count() + 1
            self.encounter_number = f"HE-{year}-{count:06d}"
        super().save(*args, **kwargs)


# ═══════════════════════════════════════════════════════════════
#  VITAL SIGNS MODELS
# ═══════════════════════════════════════════════════════════════

class VitalSigns(models.Model):
    """Patient vital signs record"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Patient and Encounter
    patient = models.ForeignKey(
        'patients.Patient',
        on_delete=models.PROTECT,
        related_name='vital_signs',
        verbose_name='Patient'
    )
    encounter = models.ForeignKey(
        HospitalEncounter,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='vital_signs',
        verbose_name='Consultation'
    )
    
    # Vital Signs Measurements
    temperature = models.DecimalField(
        max_digits=4, 
        decimal_places=1, 
        null=True, 
        blank=True,
        validators=[MinValueValidator(30.0), MaxValueValidator(50.0)],
        verbose_name='Température (°C)',
        help_text='En degrés Celsius (30.0 - 50.0)'
    )
    
    blood_pressure_systolic = models.PositiveSmallIntegerField(
        null=True, 
        blank=True,
        validators=[MinValueValidator(50), MaxValueValidator(300)],
        verbose_name='Tension systolique (mmHg)',
        help_text='Pression artérielle systolique (50-300 mmHg)'
    )
    
    blood_pressure_diastolic = models.PositiveSmallIntegerField(
        null=True, 
        blank=True,
        validators=[MinValueValidator(30), MaxValueValidator(200)],
        verbose_name='Tension diastolique (mmHg)',
        help_text='Pression artérielle diastolique (30-200 mmHg)'
    )
    
    heart_rate = models.PositiveSmallIntegerField(
        null=True, 
        blank=True,
        validators=[MinValueValidator(30), MaxValueValidator(250)],
        verbose_name='Fréquence cardiaque (bpm)',
        help_text='Battements par minute (30-250 bpm)'
    )
    
    respiratory_rate = models.PositiveSmallIntegerField(
        null=True, 
        blank=True,
        validators=[MinValueValidator(5), MaxValueValidator(60)],
        verbose_name='Fréquence respiratoire (/min)',
        help_text='Respirations par minute (5-60 /min)'
    )
    
    oxygen_saturation = models.PositiveSmallIntegerField(
        null=True, 
        blank=True,
        validators=[MinValueValidator(50), MaxValueValidator(100)],
        verbose_name='Saturation O₂ (%)',
        help_text='Saturation en oxygène (50-100%)'
    )
    
    weight = models.DecimalField(
        max_digits=5, 
        decimal_places=1, 
        null=True, 
        blank=True,
        validators=[MinValueValidator(Decimal('0.5')), MaxValueValidator(Decimal('500.0'))],
        verbose_name='Poids (kg)',
        help_text='En kilogrammes (0.5-500.0 kg)'
    )
    
    height = models.PositiveSmallIntegerField(
        null=True, 
        blank=True,
        validators=[MinValueValidator(30), MaxValueValidator(250)],
        verbose_name='Taille (cm)',
        help_text='En centimètres (30-250 cm)'
    )
    
    pain_level = models.PositiveSmallIntegerField(
        null=True, 
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(10)],
        verbose_name='Niveau de douleur (0-10)',
        help_text='Échelle de douleur de 0 (aucune) à 10 (intense)'
    )
    
    blood_glucose = models.PositiveSmallIntegerField(
        null=True, 
        blank=True,
        validators=[MinValueValidator(20), MaxValueValidator(800)],
        verbose_name='Glycémie (mg/dL)',
        help_text='En mg/dL (20-800)'
    )
    
    # Additional Measurements
    body_mass_index = models.DecimalField(
        max_digits=4, 
        decimal_places=1, 
        null=True, 
        blank=True,
        verbose_name='IMC calculé',
        help_text='Calculé automatiquement à partir du poids et de la taille'
    )
    
    # Clinical Context
    measurement_location = models.CharField(
        max_length=100, 
        blank=True,
        verbose_name='Lieu de mesure',
        help_text='Service, chambre, ou lieu où les signes vitaux ont été pris'
    )
    
    measurement_method = models.CharField(
        max_length=100, 
        blank=True,
        verbose_name='Méthode de mesure',
        help_text='Équipement ou méthode utilisée'
    )
    
    clinical_notes = models.TextField(
        blank=True,
        verbose_name='Notes cliniques',
        help_text='Observations ou remarques sur les signes vitaux'
    )
    
    # Staff
    measured_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='measured_vital_signs',
        verbose_name='Mesuré par',
        limit_choices_to={'user_type__in': ['doctor', 'nurse', 'nursing_aide']}
    )
    
    verified_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_vital_signs',
        verbose_name='Vérifié par',
        limit_choices_to={'user_type__in': ['doctor', 'nurse']}
    )
    
    # Audit Fields
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_vital_signs',
        verbose_name='Créé par'
    )
    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='updated_vital_signs',
        verbose_name='Modifié par'
    )
    
    # Timestamps
    measured_at = models.DateTimeField(auto_now_add=True, verbose_name='Mesuré le')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Créé le')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Modifié le')
    
    class Meta:
        db_table = 'vital_signs'
        verbose_name = 'Signes vitaux'
        verbose_name_plural = 'Signes vitaux'
        ordering = ['-measured_at']
        
    def __str__(self):
        return f"Signes vitaux - {self.patient.full_name} - {self.measured_at.strftime('%d/%m/%Y %H:%M')}"
    
    def save(self, *args, **kwargs):
        # Calculate BMI if weight and height are provided
        if self.weight and self.height:
            height_m = float(self.height) / 100
            self.body_mass_index = round(float(self.weight) / (height_m ** 2), 1)
        else:
            self.body_mass_index = None
        super().save(*args, **kwargs)
    
    @property
    def bmi_category(self):
        """Get BMI category in French"""
        if not self.body_mass_index:
            return ''
        bmi = float(self.body_mass_index)
        if bmi < 18.5:
            return 'Insuffisance pondérale'
        elif bmi < 25:
            return 'Normal'
        elif bmi < 30:
            return 'Surpoids'
        else:
            return 'Obésité'
    
    @property
    def blood_pressure_reading(self):
        """Get formatted blood pressure reading"""
        if self.blood_pressure_systolic and self.blood_pressure_diastolic:
            return f"{self.blood_pressure_systolic}/{self.blood_pressure_diastolic}"
        return ""
    
    @property
    def is_abnormal(self):
        """Check if any vital signs are outside normal ranges"""
        abnormal = []
        
        if self.temperature:
            if self.temperature < 36.1 or self.temperature > 37.2:
                abnormal.append('temperature')
        
        if self.blood_pressure_systolic and self.blood_pressure_diastolic:
            if (self.blood_pressure_systolic < 90 or self.blood_pressure_systolic > 140 or
                self.blood_pressure_diastolic < 60 or self.blood_pressure_diastolic > 90):
                abnormal.append('blood_pressure')
        
        if self.heart_rate:
            if self.heart_rate < 60 or self.heart_rate > 100:
                abnormal.append('heart_rate')
        
        if self.respiratory_rate:
            if self.respiratory_rate < 12 or self.respiratory_rate > 20:
                abnormal.append('respiratory_rate')
        
        if self.oxygen_saturation:
            if self.oxygen_saturation < 95:
                abnormal.append('oxygen_saturation')
                
        return len(abnormal) > 0


# ═══════════════════════════════════════════════════════════════
#  HOSPITAL DEPARTMENTS
# ═══════════════════════════════════════════════════════════════

class HospitalDepartment(models.Model):
    """Hospital departments/services"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.PROTECT,
        related_name='hospital_departments',
        verbose_name='Établissement'
    )
    
    name = models.CharField(max_length=200, verbose_name='Nom du service')
    code = models.CharField(max_length=20, verbose_name='Code')
    description = models.TextField(blank=True, verbose_name='Description')
    
    # Department Head
    department_head = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='headed_departments',
        verbose_name='Chef de service',
        limit_choices_to={'user_type': 'doctor'}
    )
    
    # Contact Information
    phone = models.CharField(max_length=20, blank=True, verbose_name='Téléphone')
    extension = models.CharField(max_length=10, blank=True, verbose_name='Poste')
    location = models.CharField(max_length=200, blank=True, verbose_name='Localisation')
    floor = models.CharField(max_length=20, blank=True, verbose_name='Étage')
    
    # Capacity
    bed_capacity = models.PositiveIntegerField(
        default=0,
        verbose_name='Capacité en lits',
        help_text='Nombre total de lits disponibles'
    )
    
    # Status
    is_active = models.BooleanField(default=True, verbose_name='Actif')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Créé le')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Modifié le')
    
    class Meta:
        db_table = 'hospital_departments'
        verbose_name = 'Service hospitalier'
        verbose_name_plural = 'Services hospitaliers'
        unique_together = ('organization', 'code')
        ordering = ['name']
        
    def __str__(self):
        return f"{self.name} ({self.code})"


# ═══════════════════════════════════════════════════════════════
#  HOSPITAL BEDS
# ═══════════════════════════════════════════════════════════════

class BedStatus(models.TextChoices):
    """Hospital bed status options"""
    AVAILABLE = 'available', 'Disponible'
    OCCUPIED = 'occupied', 'Occupé'
    RESERVED = 'reserved', 'Réservé'
    OUT_OF_ORDER = 'out_of_order', 'Hors service'
    CLEANING = 'cleaning', 'En nettoyage'


class HospitalBed(models.Model):
    """Hospital bed management"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    department = models.ForeignKey(
        HospitalDepartment,
        on_delete=models.PROTECT,
        related_name='beds',
        verbose_name='Service'
    )
    
    bed_number = models.CharField(max_length=20, verbose_name='Numéro de lit')
    room_number = models.CharField(max_length=20, verbose_name='Numéro de chambre')
    
    status = models.CharField(
        max_length=20,
        choices=BedStatus.choices,
        default=BedStatus.AVAILABLE,
        verbose_name='Statut'
    )
    
    # Current Patient
    current_patient = models.ForeignKey(
        'patients.Patient',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='current_bed',
        verbose_name='Patient actuel'
    )
    
    current_encounter = models.ForeignKey(
        HospitalEncounter,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_bed',
        verbose_name='Consultation actuelle'
    )
    
    # Bed Type and Features
    bed_type = models.CharField(
        max_length=50,
        blank=True,
        verbose_name='Type de lit',
        help_text='Standard, ICU, Maternity, etc.'
    )
    
    has_cardiac_monitor = models.BooleanField(default=False, verbose_name='Moniteur cardiaque')
    has_oxygen_supply = models.BooleanField(default=False, verbose_name='Oxygène')
    has_suction = models.BooleanField(default=False, verbose_name='Aspiration')
    
    # Maintenance
    last_cleaned = models.DateTimeField(null=True, blank=True, verbose_name='Dernière désinfection')
    last_maintenance = models.DateTimeField(null=True, blank=True, verbose_name='Dernière maintenance')
    
    notes = models.TextField(blank=True, verbose_name='Notes')
    
    # Status
    is_active = models.BooleanField(default=True, verbose_name='Actif')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Créé le')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Modifié le')
    
    class Meta:
        db_table = 'hospital_beds'
        verbose_name = 'Lit d\'hôpital'
        verbose_name_plural = 'Lits d\'hôpital'
        unique_together = ('department', 'bed_number')
        ordering = ['department', 'room_number', 'bed_number']
        
    def __str__(self):
        return f"{self.department.name} - Chambre {self.room_number} - Lit {self.bed_number}"


# ═══════════════════════════════════════════════════════════════
#  TRIAGE MODELS
# ═══════════════════════════════════════════════════════════════

class TriageLevel(models.IntegerChoices):
    """Emergency triage priority levels"""
    RESUSCITATION = 1, 'Réanimation'
    EMERGENCY = 2, 'Urgence'
    URGENT = 3, 'Urgent'
    LESS_URGENT = 4, 'Moins urgent'
    NON_URGENT = 5, 'Non urgent'


class TriageStatus(models.TextChoices):
    """Status of triage assessment"""
    IN_PROGRESS = 'in_progress', 'En cours'
    COMPLETED = 'completed', 'En attente'
    IN_TREATMENT = 'in_treatment', 'En traitement'
    REASSESSMENT_NEEDED = 'reassessment_needed', 'Réévaluation'
    DISCHARGED = 'discharged', 'Sorti'
    ADMITTED = 'admitted', 'Hospitalisé'
    TRANSFERRED = 'transferred', 'Transféré'
    LEFT_BEFORE_SEEN = 'left_before_seen', 'Parti'
    LEFT_AGAINST_ADVICE = 'left_against_advice', 'Parti (AMA)'


class Triage(models.Model):
    """Emergency triage assessment"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    triage_number = models.CharField(max_length=50, unique=True, verbose_name='Numéro de triage')
    
    # Patient and Organization
    patient = models.ForeignKey(
        'patients.Patient',
        on_delete=models.PROTECT,
        related_name='triages',
        verbose_name='Patient'
    )
    encounter = models.ForeignKey(
        'HospitalEncounter',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='triages',
        verbose_name='Consultation'
    )
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.PROTECT,
        related_name='triages',
        verbose_name='Établissement'
    )
    
    # Triage Assessment
    triage_date = models.DateTimeField(auto_now_add=True, verbose_name='Date du triage')
    triage_level = models.IntegerField(
        choices=TriageLevel.choices,
        default=TriageLevel.URGENT,
        verbose_name='Niveau de triage'
    )
    triage_category = models.CharField(max_length=50, blank=True, verbose_name='Catégorie')
    
    # Chief Complaint
    chief_complaint = models.TextField(verbose_name='Plainte principale')
    symptom_onset = models.CharField(max_length=100, blank=True, verbose_name='Début des symptômes')
    acuity = models.CharField(max_length=50, blank=True, verbose_name='Acuité')
    
    # Vital Signs (stored as JSON for flexibility)
    vitals = models.JSONField(default=dict, blank=True, verbose_name='Signes vitaux')
    
    # Pain Level
    pain_level = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(10)],
        verbose_name='Niveau de douleur'
    )
    
    # Consciousness and Physical Assessment
    consciousness_level = models.CharField(max_length=50, blank=True, verbose_name='Niveau de conscience')
    airway_status = models.CharField(max_length=50, blank=True, verbose_name='Statut des voies aériennes')
    breathing_status = models.CharField(max_length=50, blank=True, verbose_name='Statut respiratoire')
    circulation_status = models.CharField(max_length=50, blank=True, verbose_name='Statut circulatoire')
    mobility_status = models.CharField(max_length=50, blank=True, verbose_name='Statut de mobilité')
    
    # Red Flags and Special Conditions
    red_flags = models.JSONField(default=list, blank=True, verbose_name='Signaux d\'alarme')
    has_red_flags = models.BooleanField(default=False, verbose_name='Présente des signaux d\'alarme')
    is_trauma = models.BooleanField(default=False, verbose_name='Traumatisme')
    fever_screening = models.BooleanField(default=False, verbose_name='Dépistage fièvre')
    respiratory_symptoms = models.BooleanField(default=False, verbose_name='Symptômes respiratoires')
    isolation_required = models.BooleanField(default=False, verbose_name='Isolement requis')
    
    # Allergies and Medical History
    allergies_verified = models.BooleanField(default=False, verbose_name='Allergies vérifiées')
    immunocompromised = models.BooleanField(default=False, verbose_name='Immunodéprimé')
    
    # Assignments
    assigned_area = models.CharField(max_length=200, blank=True, verbose_name='Zone assignée')
    assigned_doctor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='triaged_patients',
        verbose_name='Médecin assigné'
    )
    
    # Nursing staff who performed triage
    nurse = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='triages_performed',
        verbose_name='Infirmière'
    )
    
    # Status
    status = models.CharField(
        max_length=50,
        choices=TriageStatus.choices,
        default=TriageStatus.IN_PROGRESS,
        verbose_name='Statut'
    )
    
    # Times
    arrival_time = models.DateTimeField(null=True, blank=True, verbose_name='Heure d\'arrivée')
    triage_start_time = models.DateTimeField(null=True, blank=True, verbose_name='Début du triage')
    triage_end_time = models.DateTimeField(null=True, blank=True, verbose_name='Fin du triage')
    estimated_wait_time = models.IntegerField(null=True, blank=True, verbose_name='Temps d\'attente estimé (min)')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Créé le')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Modifié le')
    
    class Meta:
        db_table = 'hospital_triages'
        verbose_name = 'Triage'
        verbose_name_plural = 'Triages'
        ordering = ['-triage_date', 'triage_level']
        indexes = [
            models.Index(fields=['patient', '-triage_date']),
            models.Index(fields=['triage_level', '-triage_date']),
            models.Index(fields=['status', '-triage_date']),
        ]
    
    def __str__(self):
        return f"{self.triage_number} - {self.patient.full_name} (Niveau {self.triage_level})"