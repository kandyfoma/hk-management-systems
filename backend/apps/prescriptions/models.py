from django.db import models
from django.core.validators import MinValueValidator
import uuid


class PrescriptionStatus(models.TextChoices):
    PENDING = 'pending', 'En attente'
    PARTIALLY_DISPENSED = 'partially_dispensed', 'Partiellement dispensé'
    FULLY_DISPENSED = 'fully_dispensed', 'Complètement dispensé'
    CANCELLED = 'cancelled', 'Annulé'
    EXPIRED = 'expired', 'Expiré'


class PrescriptionItemStatus(models.TextChoices):
    PENDING = 'pending', 'En attente'
    PARTIALLY_DISPENSED = 'partially_dispensed', 'Partiellement dispensé'
    FULLY_DISPENSED = 'fully_dispensed', 'Dispensé'
    OUT_OF_STOCK = 'out_of_stock', 'Rupture de stock'
    DISCONTINUED = 'discontinued', 'Discontinué'
    CANCELLED = 'cancelled', 'Annulé'
    SUBSTITUTED = 'substituted', 'Substitué'


class MedicationRoute(models.TextChoices):
    ORAL = 'oral', 'Oral (PO)'
    SUBLINGUAL = 'sublingual', 'Sublingual (SL)'
    TOPICAL = 'topical', 'Topique'
    TRANSDERMAL = 'transdermal', 'Transdermique'
    RECTAL = 'rectal', 'Rectal'
    VAGINAL = 'vaginal', 'Vaginal'
    NASAL = 'nasal', 'Nasal'
    INHALATION = 'inhalation', 'Inhalation'
    INTRAMUSCULAR = 'intramuscular', 'Intramusculaire (IM)'
    INTRAVENOUS = 'intravenous', 'Intraveineux (IV)'
    SUBCUTANEOUS = 'subcutaneous', 'Sous-cutané (SC)'
    INTRADERMAL = 'intradermal', 'Intradermique'
    OPHTHALMIC = 'ophthalmic', 'Ophtalmique'
    OTIC = 'otic', 'Auriculaire'
    OTHER = 'other', 'Autre'


class DosageForm(models.TextChoices):
    TABLET = 'tablet', 'Comprimé'
    CAPSULE = 'capsule', 'Gélule'
    SYRUP = 'syrup', 'Sirop'
    SUSPENSION = 'suspension', 'Suspension'
    INJECTION = 'injection', 'Injectable'
    CREAM = 'cream', 'Crème'
    OINTMENT = 'ointment', 'Pommade'
    GEL = 'gel', 'Gel'
    DROPS = 'drops', 'Gouttes'
    INHALER = 'inhaler', 'Inhalateur'
    SUPPOSITORY = 'suppository', 'Suppositoire'
    POWDER = 'powder', 'Poudre'
    SOLUTION = 'solution', 'Solution'
    SPRAY = 'spray', 'Spray'
    PATCH = 'patch', 'Timbre'
    LOZENGE = 'lozenge', 'Pastille'
    OTHER = 'other', 'Autre'


# Medication frequencies constants for choices
MEDICATION_FREQUENCIES = {
    'STAT': 'STAT (immédiatement)',
    'OD': 'Une fois par jour',
    'BD': 'Deux fois par jour',
    'TDS': 'Trois fois par jour',
    'QDS': 'Quatre fois par jour',
    'Q4H': 'Toutes les 4 heures',
    'Q6H': 'Toutes les 6 heures',
    'Q8H': 'Toutes les 8 heures',
    'Q12H': 'Toutes les 12 heures',
    'PRN': 'Au besoin (PRN)',
    'QAM': 'Le matin',
    'QPM': 'Le soir',
    'QHS': 'Au coucher',
    'AC': 'Avant les repas',
    'PC': 'Après les repas',
    'WITH_MEALS': 'Avec les repas',
    'BETWEEN_MEALS': 'Entre les repas',
    'WEEKLY': 'Hebdomadaire',
    'MONTHLY': 'Mensuel',
    'OTHER': 'Autre',
}


class Prescription(models.Model):
    """Prescription written by a doctor to be dispensed by pharmacist"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # References
    encounter = models.ForeignKey(
        'hospital.HospitalEncounter',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='prescriptions',
        help_text='Consultation associée'
    )
    patient = models.ForeignKey(
        'patients.Patient',
        on_delete=models.CASCADE,
        related_name='prescriptions'
    )
    doctor = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='written_prescriptions',
        help_text='Médecin prescripteur'
    )
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='prescriptions'
    )
    facility_id = models.CharField(max_length=100, help_text='Établissement prescripteur')
    
    # Prescription Details
    prescription_number = models.CharField(
        max_length=50,
        unique=True,
        help_text='Numéro d\'ordonnance auto-généré'
    )
    date = models.DateField(help_text='Date de prescription')
    status = models.CharField(
        max_length=50,
        choices=PrescriptionStatus.choices,
        default=PrescriptionStatus.PENDING
    )
    
    # Clinical Information
    diagnosis = models.TextField(blank=True, help_text='Diagnostic associé')
    instructions = models.TextField(blank=True, help_text='Instructions générales')
    valid_until = models.DateField(null=True, blank=True, help_text='Date d\'expiration')
    
    # Dispensing Tracking
    total_items = models.PositiveIntegerField(default=0, help_text='Nombre total de médicaments')
    items_dispensed = models.PositiveIntegerField(default=0, help_text='Articles complètement dispensés')
    is_complete = models.BooleanField(default=False, help_text='Tous les articles dispensés')
    
    # Clinical Safety Checks
    allergies_checked = models.BooleanField(default=False, help_text='Allergies vérifiées')
    interactions_checked = models.BooleanField(default=False, help_text='Interactions médicamenteuses vérifiées')
    clinical_notes = models.TextField(blank=True, help_text='Notes cliniques spéciales')
    
    # Metadata
    metadata = models.JSONField(default=dict, blank=True, help_text='Données extensibles')
    
    # Audit Trail
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_prescriptions'
    )
    updated_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='updated_prescriptions'
    )
    last_accessed_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='accessed_prescriptions'
    )
    last_accessed_at = models.DateTimeField(null=True, blank=True)
    access_count = models.PositiveIntegerField(default=0)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'prescriptions'
        verbose_name = 'Ordonnance'
        verbose_name_plural = 'Ordonnances'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['prescription_number']),
            models.Index(fields=['patient', 'created_at']),
            models.Index(fields=['doctor', 'created_at']),
            models.Index(fields=['status']),
            models.Index(fields=['date']),
        ]

    def __str__(self):
        return f"Ordonnance {self.prescription_number} - {self.patient.full_name}"

    def save(self, *args, **kwargs):
        # Auto-generate prescription number if not provided
        if not self.prescription_number:
            from django.utils import timezone
            today = timezone.now().date()
            count = Prescription.objects.filter(created_at__date=today).count() + 1
            self.prescription_number = f"RX{today.strftime('%y%m%d')}{count:03d}"
        
        super().save(*args, **kwargs)

    @property
    def days_valid(self):
        """Days remaining until prescription expires"""
        if not self.valid_until:
            return None
        from django.utils import timezone
        delta = self.valid_until - timezone.now().date()
        return delta.days

    @property
    def is_expired(self):
        """Check if prescription has expired"""
        if not self.valid_until:
            return False
        from django.utils import timezone
        return self.valid_until < timezone.now().date()


class PrescriptionItem(models.Model):
    """Individual medication item within a prescription"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    prescription = models.ForeignKey(
        Prescription,
        on_delete=models.CASCADE,
        related_name='items'
    )
    
    # Medication Details (Doctor's Order)
    medication_name = models.CharField(max_length=200, help_text='Nom du médicament (texte libre)')
    generic_name = models.CharField(max_length=200, blank=True, help_text='Nom générique DCI')
    dosage = models.CharField(max_length=100, help_text='Dosage (ex: 500mg)')
    strength = models.CharField(max_length=100, blank=True, help_text='Concentration (ex: 500mg/comprimé)')
    dosage_form = models.CharField(
        max_length=50,
        choices=DosageForm.choices,
        blank=True,
        help_text='Forme galénique'
    )
    
    # Administration Instructions
    frequency = models.CharField(
        max_length=50,
        help_text='Fréquence (TDS, BD, PRN, etc.)'
    )
    duration = models.CharField(max_length=100, help_text='Durée (7 jours, 2 semaines, 1 mois)')
    quantity = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        help_text='Quantité totale à dispenser'
    )
    route = models.CharField(
        max_length=50,
        choices=MedicationRoute.choices,
        help_text='Voie d\'administration'
    )
    instructions = models.TextField(
        blank=True,
        help_text='Instructions spéciales (prendre après repas, appliquer sur zone affectée)'
    )
    
    # Dispensing Details (Pharmacist's Work)
    product = models.ForeignKey(
        'inventory.Product',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='prescription_items',
        help_text='Produit correspondant trouvé lors de la dispensation'
    )
    quantity_dispensed = models.PositiveIntegerField(
        default=0,
        help_text='Quantité réellement dispensée'
    )
    quantity_remaining = models.PositiveIntegerField(
        default=0,
        help_text='Quantité restante à dispenser'
    )
    batches_used = models.JSONField(
        default=list,
        blank=True,
        help_text='IDs des lots utilisés pour la dispensation'
    )
    
    # Pricing (at time of dispensing)
    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Prix unitaire lors de la dispensation'
    )
    total_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Coût total pour cet article'
    )
    currency = models.CharField(max_length=3, default='CDF')
    
    # Dispensing Information
    dispensed_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='dispensed_prescription_items',
        help_text='Pharmacien qui a dispensé'
    )
    dispensed_date = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Date et heure de dispensation'
    )
    status = models.CharField(
        max_length=50,
        choices=PrescriptionItemStatus.choices,
        default=PrescriptionItemStatus.PENDING
    )
    
    # Clinical Flags
    is_substitution_allowed = models.BooleanField(
        default=True,
        help_text='Substitution générique autorisée'
    )
    is_controlled = models.BooleanField(
        default=False,
        help_text='Substance contrôlée'
    )
    requires_counseling = models.BooleanField(
        default=False,
        help_text='Conseil pharmaceutique spécial requis'
    )
    
    # Pharmacy Notes
    pharmacist_notes = models.TextField(
        blank=True,
        help_text='Notes de dispensation du pharmacien'
    )
    patient_counseling = models.TextField(
        blank=True,
        help_text='Informations données au patient'
    )
    substitution_reason = models.TextField(
        blank=True,
        help_text='Raison de la substitution si applicable'
    )
    
    # Audit Trail
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_prescription_items'
    )
    updated_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='updated_prescription_items'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'prescription_items'
        verbose_name = 'Article Ordonnance'
        verbose_name_plural = 'Articles Ordonnance'
        ordering = ['id']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['medication_name']),
        ]

    def __str__(self):
        return f"{self.medication_name} - {self.quantity}"

    def save(self, *args, **kwargs):
        # Calculate remaining quantity
        self.quantity_remaining = self.quantity - self.quantity_dispensed
        
        # Update status based on dispensing
        if self.quantity_dispensed == 0:
            self.status = PrescriptionItemStatus.PENDING
        elif self.quantity_dispensed < self.quantity:
            self.status = PrescriptionItemStatus.PARTIALLY_DISPENSED
        elif self.quantity_dispensed >= self.quantity:
            self.status = PrescriptionItemStatus.FULLY_DISPENSED
        
        super().save(*args, **kwargs)

    @property
    def is_fully_dispensed(self):
        return self.quantity_dispensed >= self.quantity

    @property
    def is_partially_dispensed(self):
        return 0 < self.quantity_dispensed < self.quantity

    @property
    def dispensing_percentage(self):
        if self.quantity == 0:
            return 0
        return (self.quantity_dispensed / self.quantity) * 100


class PrescriptionNote(models.Model):
    """Additional notes and communications about prescriptions"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    prescription = models.ForeignKey(
        Prescription,
        on_delete=models.CASCADE,
        related_name='notes'
    )
    
    note_type = models.CharField(
        max_length=50,
        choices=[
            ('CLINICAL', 'Note clinique'),
            ('DISPENSING', 'Note de dispensation'),
            ('COMMUNICATION', 'Communication'),
            ('QUALITY', 'Contrôle qualité'),
            ('INSURANCE', 'Assurance'),
            ('COMPLIANCE', 'Conformité'),
            ('OTHER', 'Autre'),
        ]
    )
    
    title = models.CharField(max_length=200)
    content = models.TextField()
    
    # Visibility
    is_visible_to_patient = models.BooleanField(default=False)
    is_visible_to_doctor = models.BooleanField(default=True)
    is_visible_to_pharmacist = models.BooleanField(default=True)
    
    # Priority
    priority = models.CharField(
        max_length=20,
        choices=[
            ('LOW', 'Faible'),
            ('NORMAL', 'Normal'),
            ('HIGH', 'Élevée'),
            ('URGENT', 'Urgent'),
        ],
        default='NORMAL'
    )
    
    # Author
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='prescription_notes'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'prescription_notes'
        verbose_name = 'Note Ordonnance'
        verbose_name_plural = 'Notes Ordonnance'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {self.prescription.prescription_number}"


class PrescriptionImage(models.Model):
    """Images/documents attached to prescriptions"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    prescription = models.ForeignKey(
        Prescription,
        on_delete=models.CASCADE,
        related_name='images'
    )
    
    image = models.ImageField(upload_to='prescriptions/', help_text='Image de l\'ordonnance')
    title = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)
    
    # Image metadata
    file_size = models.PositiveIntegerField(null=True, blank=True, help_text='Taille en octets')
    image_width = models.PositiveIntegerField(null=True, blank=True)
    image_height = models.PositiveIntegerField(null=True, blank=True)
    
    # Processing status
    is_processed = models.BooleanField(default=False)
    ocr_text = models.TextField(blank=True, help_text='Texte extrait par OCR')
    
    uploaded_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'prescription_images'
        verbose_name = 'Image Ordonnance'
        verbose_name_plural = 'Images Ordonnance'
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"Image {self.prescription.prescription_number}"