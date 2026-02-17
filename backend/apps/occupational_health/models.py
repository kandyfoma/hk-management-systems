"""
Occupational Health Models - Multi-Sector System (Médecine du Travail)

Comprehensive occupational health management system supporting 16 industry sectors 
with sector-specific risk profiles, examination requirements, and regulatory compliance.

Standards: ISO 45001:2018, ILO C155/C161/C187, ILO R194, WHO Healthy Workplaces
"""
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _
from decimal import Decimal

User = get_user_model()

# ==================== SECTOR DEFINITIONS ====================

INDUSTRY_SECTORS = [
    ('construction', _('🏗️ Construction (BTP)')),
    ('mining', _('⛏️ Mining')),  
    ('oil_gas', _('🛢️ Oil & Gas')),
    ('manufacturing', _('🏭 Manufacturing')),
    ('agriculture', _('🌾 Agriculture')),
    ('healthcare', _('🏥 Healthcare')),
    ('transport_logistics', _('🚛 Transport & Logistics')),
    ('energy_utilities', _('⚡ Energy & Utilities')),
    ('hospitality', _('🏨 Hospitality')),
    ('retail_commerce', _('🛒 Retail & Commerce')),
    ('telecom_it', _('📡 Telecom & IT')),
    ('banking_finance', _('🏦 Banking & Finance')),
    ('education', _('🎓 Education')),
    ('government_admin', _('🏛️ Government & Administration')),
    ('ngo_international', _('🤝 NGO & International Organizations')),
    ('other', _('📦 Other')),
]

SECTOR_RISK_LEVELS = {
    'construction': 'very_high',
    'mining': 'very_high',
    'oil_gas': 'very_high',
    'manufacturing': 'high',
    'agriculture': 'high',
    'healthcare': 'high',
    'transport_logistics': 'high',
    'energy_utilities': 'high',
    'hospitality': 'moderate',
    'retail_commerce': 'moderate',
    'ngo_international': 'moderate',
    'telecom_it': 'low_moderate',
    'banking_finance': 'low_moderate',
    'education': 'low_moderate',
    'government_admin': 'low',
    'other': 'moderate',
}

JOB_CATEGORIES = [
    # Construction
    ('construction_manager', _('Gestionnaire de Construction')),
    ('mason', _('Maçon')),
    ('carpenter', _('Charpentier')),
    ('electrician_construction', _('Électricien BTP')),
    ('heavy_equipment_operator', _('Opérateur Équipement Lourd')),
    
    # Mining
    ('mine_manager', _('Gestionnaire de Mine')),
    ('underground_miner', _('Mineur Souterrain')),
    ('surface_miner', _('Mineur Surface')),
    ('drill_operator', _('Opérateur Forage')),
    ('mine_safety_officer', _('Agent Sécurité Mine')),
    
    # Oil & Gas
    ('drilling_engineer', _('Ingénieur Forage')),
    ('rig_worker', _('Ouvrier Plateforme')),
    ('pipeline_technician', _('Technicien Pipeline')),
    ('refinery_operator', _('Opérateur Raffinerie')),
    
    # Manufacturing
    ('production_manager', _('Gestionnaire Production')),
    ('machine_operator', _('Opérateur Machine')),
    ('quality_inspector', _('Inspecteur Qualité')),
    ('maintenance_technician', _('Technicien Maintenance')),
    ('warehouse_worker', _('Ouvrier Entrepôt')),
    
    # Healthcare
    ('doctor', _('Médecin')),
    ('nurse', _('Infirmier/ère')),
    ('lab_technician', _('Technicien Laboratoire')),
    ('radiographer', _('Radiographe')),
    ('hospital_cleaner', _('Agent Nettoyage Hôpital')),
    
    # Banking & Finance
    ('bank_manager', _('Directeur Banque')),
    ('teller', _('Caissier')),
    ('financial_analyst', _('Analyste Financier')),
    ('security_guard', _('Agent Sécurité')),
    ('it_specialist', _('Spécialiste IT')),
    
    # Other sectors
    ('driver', _('Chauffeur')),
    ('teacher', _('Enseignant')),
    ('farmer', _('Agriculteur')),
    ('cook', _('Cuisinier')),
    ('office_worker', _('Employé Bureau')),
    ('sales_representative', _('Représentant Ventes')),
    ('other_job', _('Autre Emploi')),
]

EXPOSURE_RISKS = [
    # Physical hazards
    ('noise', _('Bruit')),
    ('vibration', _('Vibrations')),  
    ('radiation_ionizing', _('Rayonnements Ionisants')),
    ('radiation_non_ionizing', _('Rayonnements Non-Ionisants')),
    ('extreme_temperatures', _('Températures Extrêmes')),
    ('confined_spaces', _('Espaces Confinés')),
    ('heights', _('Travail en Hauteur')),
    ('compressed_air', _('Air Comprimé')),
    
    # Chemical hazards
    ('solvents', _('Solvants')),
    ('acids_bases', _('Acides/Bases')),
    ('heavy_metals', _('Métaux Lourds')),
    ('pesticides', _('Pesticides')),
    ('asbestos', _('Amiante')),
    ('silica_dust', _('Poussière Silice')),
    ('welding_fumes', _('Fumées Soudure')),
    ('chemical_vapors', _('Vapeurs Chimiques')),
    
    # Biological hazards
    ('biological_agents', _('Agents Biologiques')),
    ('bloodborne_pathogens', _('Pathogènes Sanguins')),
    ('respiratory_pathogens', _('Pathogènes Respiratoires')),
    ('animal_contact', _('Contact Animal')),
    
    # Ergonomic hazards
    ('manual_handling', _('Manutention Manuelle')),
    ('repetitive_motion', _('Mouvements Répétitifs')),
    ('awkward_postures', _('Postures Inconfortables')),
    ('prolonged_standing', _('Station Debout Prolongée')),
    ('prolonged_sitting', _('Station Assise Prolongée')),
    ('vdt_screen', _('Écrans VDT')),
    ('ergonomic', _('Risques Ergonomiques')),
    
    # Psychosocial hazards
    ('work_stress', _('Stress au Travail')),
    ('shift_work', _('Travail Posté')),
    ('night_work', _('Travail de Nuit')),
    ('isolation', _('Isolement')),
    ('violence_harassment', _('Violence/Harcèlement')),
    ('time_pressure', _('Pression Temporelle')),
    ('psychosocial', _('Risques Psychosociaux')),
    ('sedentary', _('Mode de Vie Sédentaire')),
    
    # Safety hazards
    ('machinery', _('Machines')),
    ('electrical', _('Électrique')),
    ('fire_explosion', _('Incendie/Explosion')),
    ('falls', _('Chutes')),
    ('none', _('Aucun Risque')),
]

PPE_TYPES = [
    ('hard_hat', _('Casque de Sécurité')),
    ('safety_glasses', _('Lunettes Sécurité')), 
    ('hearing_protection', _('Protection Auditive')),
    ('respirator', _('Appareil Respiratoire')),
    ('face_mask', _('Masque Facial')),
    ('gloves', _('Gants')),
    ('steel_toe_boots', _('Chaussures Sécurité')),
    ('harness', _('Harnais')),
    ('reflective_vest', _('Gilet Réfléchissant')),
    ('chemical_suit', _('Combinaison Chimique')),
    ('lab_coat', _('Blouse Laboratoire')),
    ('face_shield', _('Écran Facial')),
    ('radiation_badge', _('Badge Radiation')),
    ('ergonomic_chair', _('Chaise Ergonomique')),
    ('wrist_rest', _('Repose-Poignet')),
    ('sun_protection', _('Protection Solaire')),
    ('boots', _('Bottes')),
    ('none_required', _('Aucun PPE Requis')),
]

# ==================== CORE MODELS ====================

class Enterprise(models.Model):
    """Enterprise (Employer) with sector-specific configuration"""
    
    name = models.CharField(_("Nom Entreprise"), max_length=200)
    sector = models.CharField(_("Secteur d'Activité"), max_length=50, choices=INDUSTRY_SECTORS)
    rccm = models.CharField(_("RCCM"), max_length=50, unique=True)
    nif = models.CharField(_("NIF"), max_length=20, unique=True)
    address = models.TextField(_("Adresse"))
    contact_person = models.CharField(_("Personne Contact"), max_length=100)
    phone = models.CharField(_("Téléphone"), max_length=15)
    email = models.EmailField(_("Email"))
    
    # Contract & Health Service Info
    contract_start_date = models.DateField(_("Début Contrat"))
    contract_end_date = models.DateField(_("Fin Contrat"), null=True, blank=True)
    is_active = models.BooleanField(_("Actif"), default=True)
    
    # Audit fields
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='enterprises_created')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Entreprise")
        verbose_name_plural = _("Entreprises")
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.get_sector_display()})"
    
    @property
    def risk_level(self):
        """Get sector risk level"""
        return SECTOR_RISK_LEVELS.get(self.sector, 'moderate')
    
    @property
    def exam_frequency_months(self):
        """Required medical examination frequency based on sector"""
        risk_frequencies = {
            'very_high': 12,  # Mining, Construction, Oil & Gas
            'high': 12,       # Manufacturing, Agriculture, Healthcare, Transport   
            'moderate': 24,   # Hospitality, Retail, NGO
            'low_moderate': 24,  # Telecom/IT, Banking, Education
            'low': 36         # Government
        }
        return risk_frequencies.get(self.risk_level, 24)

class WorkSite(models.Model):
    """Work site within an enterprise"""
    
    enterprise = models.ForeignKey(Enterprise, on_delete=models.CASCADE, related_name='work_sites')
    name = models.CharField(_("Nom Site"), max_length=200)
    address = models.TextField(_("Adresse Site"))
    site_manager = models.CharField(_("Responsable Site"), max_length=100)
    phone = models.CharField(_("Téléphone Site"), max_length=15)
    
    # Site characteristics
    worker_count = models.PositiveIntegerField(_("Nombre Travailleurs"), default=0)
    is_remote_site = models.BooleanField(_("Site Éloigné"), default=False)
    has_medical_facility = models.BooleanField(_("Dispensaire sur Site"), default=False)
    
    # Audit fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Site de Travail")
        verbose_name_plural = _("Sites de Travail")
        ordering = ['enterprise__name', 'name']
    
    def __str__(self):
        return f"{self.enterprise.name} - {self.name}"

class Worker(models.Model):
    """Worker with comprehensive occupational health profile"""
    
    # Personal Information
    employee_id = models.CharField(_("ID Employé"), max_length=50, unique=True)
    first_name = models.CharField(_("Prénom"), max_length=100)
    last_name = models.CharField(_("Nom"), max_length=100)
    date_of_birth = models.DateField(_("Date Naissance"))
    gender = models.CharField(_("Sexe"), max_length=10, choices=[
        ('male', _('Masculin')), ('female', _('Féminin')), ('other', _('Autre'))
    ])
    
    # Employment Information
    enterprise = models.ForeignKey(Enterprise, on_delete=models.CASCADE, related_name='workers')
    work_site = models.ForeignKey(WorkSite, on_delete=models.SET_NULL, null=True, blank=True)
    job_category = models.CharField(_("Catégorie Emploi"), max_length=50, choices=JOB_CATEGORIES)
    job_title = models.CharField(_("Titre Emploi"), max_length=100)
    hire_date = models.DateField(_("Date Embauche"))
    employment_status = models.CharField(_("Statut Emploi"), max_length=20, choices=[
        ('active', _('Actif')),
        ('on_leave', _('En Congé')),
        ('suspended', _('Suspendu')),
        ('terminated', _('Terminé'))
    ], default='active')
    
    # Contact Information  
    phone = models.CharField(_("Téléphone"), max_length=15)
    email = models.EmailField(_("Email"), blank=True)
    address = models.TextField(_("Adresse"))
    emergency_contact_name = models.CharField(_("Contact Urgence Nom"), max_length=100)
    emergency_contact_phone = models.CharField(_("Contact Urgence Tél"), max_length=15)
    
    # Occupational Health Information
    exposure_risks = models.JSONField(_("Risques Exposition"), default=list, help_text=_("Liste des risques d'exposition"))
    ppe_required = models.JSONField(_("PPE Requis"), default=list, help_text=_("Liste des PPE requis"))
    ppe_provided = models.JSONField(_("PPE Fourni"), default=list, help_text=_("Liste des PPE fournis"))
    
    # Medical History
    allergies = models.TextField(_("Allergies"), blank=True)
    chronic_conditions = models.TextField(_("Conditions Chroniques"), blank=True)
    medications = models.TextField(_("Médicaments"), blank=True)
    prior_occupational_exposure = models.TextField(_("Exposition Professionnelle Antérieure"), blank=True)
    
    # Current Health Status
    current_fitness_status = models.CharField(_("Statut Aptitude Actuel"), max_length=30, choices=[
        ('fit', _('Apte')),
        ('fit_with_restrictions', _('Apte avec Restrictions')),
        ('temporarily_unfit', _('Inapte Temporaire')),
        ('permanently_unfit', _('Inapte Définitif')),
        ('pending_evaluation', _('En Attente Évaluation'))
    ], default='pending_evaluation')
    
    fitness_restrictions = models.TextField(_("Restrictions Aptitude"), blank=True)
    next_exam_due = models.DateField(_("Prochain Examen Dû"), null=True, blank=True)
    
    # Audit fields
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='workers_created')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Travailleur")
        verbose_name_plural = _("Travailleurs")
        ordering = ['last_name', 'first_name']
        unique_together = ['enterprise', 'employee_id']
    
    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.employee_id})"
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"
    
    @property
    def age(self):
        from django.utils import timezone
        today = timezone.now().date()
        return today.year - self.date_of_birth.year - ((today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day))
    
    @property
    def sector_risk_level(self):
        return self.enterprise.risk_level
    
    def get_required_ppe_for_job(self):
        """Get required PPE based on sector and job category"""
        sector_ppe_mapping = {
            'mining': ['hard_hat', 'safety_glasses', 'respirator', 'steel_toe_boots', 'gloves', 'hearing_protection', 'harness', 'reflective_vest', 'radiation_badge'],
            'construction': ['hard_hat', 'safety_glasses', 'harness', 'steel_toe_boots', 'gloves', 'hearing_protection', 'reflective_vest'],
            'manufacturing': ['safety_glasses', 'hearing_protection', 'gloves', 'steel_toe_boots'],
            'healthcare': ['lab_coat', 'gloves', 'face_mask', 'face_shield', 'safety_glasses'],
            'agriculture': ['gloves', 'respirator', 'sun_protection', 'boots'],
            'banking_finance': ['ergonomic_chair', 'wrist_rest'],
            'telecom_it': ['ergonomic_chair', 'wrist_rest'],
            'transport_logistics': ['reflective_vest', 'steel_toe_boots', 'gloves'],
        }
        return sector_ppe_mapping.get(self.enterprise.sector, ['none_required'])

# ==================== MEDICAL EXAMINATION MODELS ====================

class MedicalExamination(models.Model):
    """Medical examination record with sector-specific requirements"""
    
    EXAM_TYPES = [
        ('pre_employment', _('Pré-Embauche')),
        ('periodic', _('Périodique')),
        ('return_to_work', _('Reprise Travail')),
        ('special', _('Spécial')),
        ('exit', _('Fin de Service')),
        ('night_work', _('Travail de Nuit')),
        ('pregnancy_related', _('Grossesse')),
        ('post_incident', _('Post-Incident')),
    ]
    
    worker = models.ForeignKey(Worker, on_delete=models.CASCADE, related_name='medical_examinations')
    exam_number = models.CharField(_("Numéro Examen"), max_length=50, unique=True)
    exam_type = models.CharField(_("Type Examen"), max_length=20, choices=EXAM_TYPES)
    exam_date = models.DateField(_("Date Examen"))
    examining_doctor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='examinations_performed')
    
    # Examination details
    chief_complaint = models.TextField(_("Motif Principal"), blank=True)
    medical_history_review = models.TextField(_("Révision Antécédents"), blank=True)
    
    # Examination results summary
    examination_completed = models.BooleanField(_("Examen Terminé"), default=False)
    results_summary = models.TextField(_("Résumé Résultats"), blank=True)
    recommendations = models.TextField(_("Recommandations"), blank=True)
    
    # Next steps
    follow_up_required = models.BooleanField(_("Suivi Requis"), default=False)
    follow_up_date = models.DateField(_("Date Suivi"), null=True, blank=True)
    next_periodic_exam = models.DateField(_("Prochain Examen Périodique"), null=True, blank=True)
    
    # Audit fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Examen Médical")
        verbose_name_plural = _("Examens Médicaux")
        ordering = ['-exam_date']
    
    def __str__(self):
        return f"{self.exam_number} - {self.worker.full_name} ({self.get_exam_type_display()})"
    
    def save(self, *args, **kwargs):
        if not self.exam_number:
            # Generate unique exam number
            from django.utils import timezone
            today = timezone.now()
            self.exam_number = f"EX{today.strftime('%Y%m%d')}{self.worker.employee_id}{str(self.pk or '').zfill(3)}"
        super().save(*args, **kwargs)

class VitalSigns(models.Model):
    """Vital signs measurement"""
    
    examination = models.OneToOneField(MedicalExamination, on_delete=models.CASCADE, related_name='vital_signs')
    
    # Basic vitals
    systolic_bp = models.PositiveIntegerField(_("PA Systolique (mmHg)"))
    diastolic_bp = models.PositiveIntegerField(_("PA Diastolique (mmHg)"))
    heart_rate = models.PositiveIntegerField(_("Fréquence Cardiaque (bpm)"))
    respiratory_rate = models.PositiveIntegerField(_("Fréquence Respiratoire"), null=True, blank=True)
    temperature = models.DecimalField(_("Température (°C)"), max_digits=4, decimal_places=1, null=True, blank=True)
    
    # Anthropometric measurements  
    height = models.DecimalField(_("Taille (cm)"), max_digits=5, decimal_places=1)
    weight = models.DecimalField(_("Poids (kg)"), max_digits=5, decimal_places=1)
    waist_circumference = models.DecimalField(_("Tour Taille (cm)"), max_digits=5, decimal_places=1, null=True, blank=True)
    
    # Pain assessment (0-10 scale)
    pain_scale = models.PositiveIntegerField(
        _("Échelle Douleur (0-10)"), 
        validators=[MinValueValidator(0), MaxValueValidator(10)],
        default=0
    )
    pain_location = models.CharField(_("Localisation Douleur"), max_length=100, blank=True)
    
    # Calculated fields will be properties
    
    # Audit fields
    recorded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='vital_signs_recorded')
    recorded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = _("Signes Vitaux")
        verbose_name_plural = _("Signes Vitaux")
    
    def __str__(self):
        return f"Signes Vitaux - {self.examination.worker.full_name}"
    
    @property
    def bmi(self):
        """Calculate BMI"""
        if self.height and self.weight:
            height_m = float(self.height) / 100
            return round(float(self.weight) / (height_m ** 2), 1)
        return None
    
    @property
    def bmi_category(self):
        """BMI category according to WHO standards"""
        bmi = self.bmi
        if not bmi:
            return None
        
        if bmi < 18.5:
            return _("Insuffisance pondérale")
        elif bmi < 25:
            return _("Normal")  
        elif bmi < 30:
            return _("Surpoids")
        else:
            return _("Obésité")
    
    @property
    def bp_category(self):
        """Blood pressure category (AHA guidelines)"""
        systolic, diastolic = self.systolic_bp, self.diastolic_bp
        
        if systolic < 120 and diastolic < 80:
            return _("Normal")
        elif systolic < 130 and diastolic < 80:
            return _("Élevé")
        elif systolic < 140 or diastolic < 90:
            return _("Hypertension Stade 1")
        elif systolic < 180 or diastolic < 120:
            return _("Hypertension Stade 2")  
        else:
            return _("Crise Hypertensive")
    
    @property
    def has_abnormal_vitals(self):
        """Check if any vital signs are abnormal"""
        # Blood pressure
        if self.systolic_bp >= 140 or self.diastolic_bp >= 90:
            return True
        
        # Heart rate (normal: 60-100 bpm)
        if self.heart_rate < 60 or self.heart_rate > 100:
            return True
        
        # BMI
        bmi = self.bmi
        if bmi and (bmi < 18.5 or bmi >= 30):
            return True
        
        # Pain
        if self.pain_scale >= 4:
            return True
            
        return False

class PhysicalExamination(models.Model):
    """Physical examination findings by system"""
    
    examination = models.OneToOneField(MedicalExamination, on_delete=models.CASCADE, related_name='physical_exam')
    
    # System examinations (normal/abnormal with findings)
    general_appearance = models.TextField(_("Aspect Général"), blank=True)
    head_neck = models.TextField(_("Tête et Cou"), blank=True)
    cardiovascular = models.TextField(_("Cardiovasculaire"), blank=True)
    respiratory = models.TextField(_("Respiratoire"), blank=True)
    abdominal = models.TextField(_("Abdominal"), blank=True)
    musculoskeletal = models.TextField(_("Musculo-squelettique"), blank=True)
    neurological = models.TextField(_("Neurologique"), blank=True)
    skin = models.TextField(_("Peau"), blank=True)
    ent = models.TextField(_("ORL"), blank=True)
    
    # Overall assessment
    physical_exam_normal = models.BooleanField(_("Examen Physique Normal"), default=True)
    abnormal_findings_summary = models.TextField(_("Résumé Anomalies"), blank=True)
    
    # Audit fields
    performed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    performed_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = _("Examen Physique")
        verbose_name_plural = _("Examens Physiques")
    
    def __str__(self):
        return f"Examen Physique - {self.examination.worker.full_name}"

# ==================== SECTOR-SPECIFIC TEST RESULTS ====================

class AudiometryResult(models.Model):
    """Audiometry test results for noise-exposed workers"""
    
    examination = models.OneToOneField(MedicalExamination, on_delete=models.CASCADE, related_name='audiometry')
    
    # Right ear thresholds (dB HL) at standard frequencies
    right_ear_500hz = models.PositiveIntegerField(_("OD 500 Hz (dB HL)"), null=True, blank=True)
    right_ear_1000hz = models.PositiveIntegerField(_("OD 1000 Hz (dB HL)"), null=True, blank=True)
    right_ear_2000hz = models.PositiveIntegerField(_("OD 2000 Hz (dB HL)"), null=True, blank=True)
    right_ear_3000hz = models.PositiveIntegerField(_("OD 3000 Hz (dB HL)"), null=True, blank=True)
    right_ear_4000hz = models.PositiveIntegerField(_("OD 4000 Hz (dB HL)"), null=True, blank=True)
    right_ear_6000hz = models.PositiveIntegerField(_("OD 6000 Hz (dB HL)"), null=True, blank=True)
    right_ear_8000hz = models.PositiveIntegerField(_("OD 8000 Hz (dB HL)"), null=True, blank=True)
    
    # Left ear thresholds (dB HL)
    left_ear_500hz = models.PositiveIntegerField(_("OG 500 Hz (dB HL)"), null=True, blank=True)
    left_ear_1000hz = models.PositiveIntegerField(_("OG 1000 Hz (dB HL)"), null=True, blank=True)
    left_ear_2000hz = models.PositiveIntegerField(_("OG 2000 Hz (dB HL)"), null=True, blank=True)
    left_ear_3000hz = models.PositiveIntegerField(_("OG 3000 Hz (dB HL)"), null=True, blank=True)
    left_ear_4000hz = models.PositiveIntegerField(_("OG 4000 Hz (dB HL)"), null=True, blank=True)
    left_ear_6000hz = models.PositiveIntegerField(_("OG 6000 Hz (dB HL)"), null=True, blank=True)
    left_ear_8000hz = models.PositiveIntegerField(_("OG 8000 Hz (dB HL)"), null=True, blank=True)
    
    # Test conditions and interpretation
    test_conditions = models.TextField(_("Conditions Test"), blank=True)
    hearing_loss_classification = models.CharField(_("Classification"), max_length=50, choices=[
        ('normal', _('Normal (≤25 dB HL)')),
        ('mild', _('Légère (26-40 dB HL)')),
        ('moderate', _('Modérée (41-60 dB HL)')),
        ('severe', _('Sévère (61-80 dB HL)')),
        ('profound', _('Profonde (>80 dB HL)'))
    ], blank=True)
    
    noise_induced_probable = models.BooleanField(_("NIHL Probable"), default=False)
    recommendations = models.TextField(_("Recommandations"), blank=True)
    
    # Audit fields
    tested_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    test_date = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = _("Audiométrie")
        verbose_name_plural = _("Audiométries")
    
    def __str__(self):
        return f"Audiométrie - {self.examination.worker.full_name}"

class SpirometryResult(models.Model):
    """Spirometry (lung function) test results"""
    
    examination = models.OneToOneField(MedicalExamination, on_delete=models.CASCADE, related_name='spirometry')
    
    # Pre-bronchodilator values
    fvc_pre = models.DecimalField(_("CVF Pré (L)"), max_digits=5, decimal_places=2, null=True, blank=True)
    fev1_pre = models.DecimalField(_("VEMS Pré (L)"), max_digits=5, decimal_places=2, null=True, blank=True)
    fev1_fvc_ratio_pre = models.DecimalField(_("VEMS/CVF Pré (%)"), max_digits=5, decimal_places=1, null=True, blank=True)
    pef_pre = models.PositiveIntegerField(_("DEP Pré (L/min)"), null=True, blank=True)
    
    # Post-bronchodilator values (if performed)
    fvc_post = models.DecimalField(_("CVF Post (L)"), max_digits=5, decimal_places=2, null=True, blank=True) 
    fev1_post = models.DecimalField(_("VEMS Post (L)"), max_digits=5, decimal_places=2, null=True, blank=True)
    fev1_fvc_ratio_post = models.DecimalField(_("VEMS/CVF Post (%)"), max_digits=5, decimal_places=1, null=True, blank=True)
    
    # Interpretation
    spirometry_interpretation = models.CharField(_("Interprétation"), max_length=50, choices=[
        ('normal', _('Normal')),
        ('restrictive', _('Syndrome Restrictif')),
        ('obstructive', _('Syndrome Obstructif')),
        ('mixed', _('Mixte')),
        ('small_airways', _('Petites Voies Aériennes'))
    ], blank=True)
    
    occupational_lung_disease_suspected = models.BooleanField(_("Pneumopathie Professionnelle Suspectée"), default=False)
    recommendations = models.TextField(_("Recommandations"), blank=True)
    
    # Audit fields
    tested_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    test_date = models.DateTimeField(auto_now_add=True)
    
    class Meta:  
        verbose_name = _("Spirométrie")
        verbose_name_plural = _("Spirométries")
    
    def __str__(self):
        return f"Spirométrie - {self.examination.worker.full_name}"

class VisionTestResult(models.Model):
    """Vision test results (especially important for VDT workers)"""
    
    examination = models.OneToOneField(MedicalExamination, on_delete=models.CASCADE, related_name='vision_test')
    
    # Visual acuity
    right_eye_uncorrected = models.CharField(_("OD Non Corrigé"), max_length=10, blank=True)
    right_eye_corrected = models.CharField(_("OD Corrigé"), max_length=10, blank=True)
    left_eye_uncorrected = models.CharField(_("OG Non Corrigé"), max_length=10, blank=True)  
    left_eye_corrected = models.CharField(_("OG Corrigé"), max_length=10, blank=True)
    both_eyes = models.CharField(_("Binoculaire"), max_length=10, blank=True)
    
    # Color vision
    color_vision_test = models.CharField(_("Vision Couleurs"), max_length=20, choices=[
        ('normal', _('Normal')),
        ('deficient', _('Déficient')),
        ('not_tested', _('Non Testé'))
    ], default='not_tested')
    
    # Near vision (important for VDT workers)
    near_vision_test = models.CharField(_("Vision Près"), max_length=10, blank=True)
    
    # Specific findings
    requires_correction = models.BooleanField(_("Correction Requise"), default=False)
    computer_vision_syndrome = models.BooleanField(_("Syndrome Vision Ordinateur"), default=False)
    recommendations = models.TextField(_("Recommandations"), blank=True)
    
    # Audit fields
    tested_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    test_date = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = _("Test Vision")
        verbose_name_plural = _("Tests Vision")
    
    def __str__(self):
        return f"Test Vision - {self.examination.worker.full_name}"

# ==================== SPECIALIZED ASSESSMENTS ====================

class MentalHealthScreening(models.Model):
    """Mental health and psychosocial risk screening"""
    
    examination = models.OneToOneField(MedicalExamination, on_delete=models.CASCADE, related_name='mental_health_screening')
    
    # GHQ-12 General Health Questionnaire (standard screening tool)
    ghq12_score = models.PositiveIntegerField(_("Score GHQ-12"), null=True, blank=True, 
                                             validators=[MinValueValidator(0), MaxValueValidator(36)])
    
    # Burnout risk assessment (Maslach Burnout Inventory concepts)
    burnout_risk = models.CharField(_("Risque Burnout"), max_length=20, choices=[
        ('low', _('Faible')),
        ('moderate', _('Modéré')),
        ('high', _('Élevé')),
        ('critical', _('Critique')),
        ('not_assessed', _('Non Évalué'))
    ], default='not_assessed')
    
    # Key psychosocial stressors
    work_overload = models.BooleanField(_("Surcharge Travail"), default=False)
    lack_control = models.BooleanField(_("Manque Contrôle"), default=False)
    poor_social_support = models.BooleanField(_("Faible Soutien Social"), default=False)
    work_life_imbalance = models.BooleanField(_("Déséquilibre Vie Pro-Perso"), default=False)
    job_insecurity = models.BooleanField(_("Insécurité Emploi"), default=False)
    workplace_harassment = models.BooleanField(_("Harcèlement"), default=False)
    
    # Sleep and fatigue
    sleep_quality = models.CharField(_("Qualité Sommeil"), max_length=20, choices=[
        ('excellent', _('Excellente')),
        ('good', _('Bonne')),
        ('fair', _('Correcte')), 
        ('poor', _('Mauvaise')),
        ('very_poor', _('Très Mauvaise'))
    ], blank=True)
    
    chronic_fatigue = models.BooleanField(_("Fatigue Chronique"), default=False)
    
    # Substance use screening
    alcohol_risk = models.CharField(_("Risque Alcool"), max_length=20, choices=[
        ('none', _('Aucun')),
        ('low', _('Faible')),
        ('moderate', _('Modéré')),
        ('high', _('Élevé'))
    ], default='none')
    
    substance_concern = models.BooleanField(_("Préoccupation Substances"), default=False)
    
    # Overall assessment
    psychological_support_recommended = models.BooleanField(_("Soutien Psychologique Recommandé"), default=False)
    fitness_impact = models.TextField(_("Impact sur Aptitude"), blank=True)
    recommendations = models.TextField(_("Recommandations"), blank=True) 
    
    # Referrals
    referred_to_psychologist = models.BooleanField(_("Référé Psychologue"), default=False)
    referred_to_psychiatrist = models.BooleanField(_("Référé Psychiatre"), default=False)
    referred_to_eap = models.BooleanField(_("Référé Programme Aide"), default=False)
    
    # Audit fields
    assessed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    assessment_date = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = _("Dépistage Santé Mentale")
        verbose_name_plural = _("Dépistages Santé Mentale")
    
    def __str__(self):
        return f"Santé Mentale - {self.examination.worker.full_name}"

class ErgonomicAssessment(models.Model):
    """Ergonomic assessment for workstation and task analysis"""
    
    examination = models.OneToOneField(MedicalExamination, on_delete=models.CASCADE, related_name='ergonomic_assessment')
    
    # Workstation type
    workstation_type = models.CharField(_("Type Poste"), max_length=30, choices=[
        ('computer_desk', _('Bureau Informatique')),
        ('production_line', _('Ligne Production')),
        ('standing_work', _('Travail Debout')),
        ('driving', _('Conduite')),
        ('manual_handling', _('Manutention')),
        ('mixed', _('Mixte')),
        ('other', _('Autre'))
    ])
    
    # Computer workstation assessment (Banking, IT, Education)
    screen_distance = models.PositiveIntegerField(_("Distance Écran (cm)"), null=True, blank=True)
    screen_height_appropriate = models.BooleanField(_("Hauteur Écran Appropriée"), default=False)
    keyboard_position = models.CharField(_("Position Clavier"), max_length=20, choices=[
        ('appropriate', _('Appropriée')),
        ('too_high', _('Trop Haut')),
        ('too_low', _('Trop Bas')),
        ('not_applicable', _('N/A'))
    ], default='not_applicable')
    chair_adjustable = models.BooleanField(_("Chaise Ajustable"), default=False)
    lumbar_support = models.BooleanField(_("Support Lombaire"), default=False)
    
    # Physical demands
    prolonged_sitting = models.BooleanField(_("Station Assise Prolongée"), default=False)
    prolonged_standing = models.BooleanField(_("Station Debout Prolongée"), default=False)
    repetitive_tasks = models.BooleanField(_("Tâches Répétitives"), default=False)
    awkward_postures = models.BooleanField(_("Postures Inconfortables"), default=False) 
    manual_lifting = models.BooleanField(_("Soulèvement Manuel"), default=False)
    vibration_exposure = models.BooleanField(_("Exposition Vibrations"), default=False)
    
    # Risk scoring (RULA - Rapid Upper Limb Assessment)  
    rula_score = models.PositiveIntegerField(_("Score RULA"), null=True, blank=True,
                                           validators=[MinValueValidator(1), MaxValueValidator(7)])
    
    # Musculoskeletal symptoms
    neck_pain = models.BooleanField(_("Douleur Cou"), default=False)
    shoulder_pain = models.BooleanField(_("Douleur Épaule"), default=False)
    back_pain = models.BooleanField(_("Douleur Dos"), default=False)
    wrist_pain = models.BooleanField(_("Douleur Poignet"), default=False)
    leg_pain = models.BooleanField(_("Douleur Jambes"), default=False)
    
    # Overall risk level
    ergonomic_risk_level = models.CharField(_("Niveau Risque Ergonomique"), max_length=20, choices=[
        ('low', _('Faible')),
        ('moderate', _('Modéré')),
        ('high', _('Élevé')),
        ('very_high', _('Très Élevé'))
    ])
    
    # Recommendations
    workstation_modifications_needed = models.BooleanField(_("Modifications Poste Requises"), default=False)
    equipment_recommendations = models.TextField(_("Recommandations Équipement"), blank=True)
    task_modifications = models.TextField(_("Modifications Tâches"), blank=True)
    training_recommended = models.TextField(_("Formation Recommandée"), blank=True)
    
    # Audit fields
    assessed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    assessment_date = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = _("Évaluation Ergonomique")
        verbose_name_plural = _("Évaluations Ergonomiques")
    
    def __str__(self):
        return f"Ergonomie - {self.examination.worker.full_name}"

# ==================== FITNESS CERTIFICATION ====================

class FitnessCertificate(models.Model):
    """Fitness for duty certification"""
    
    FITNESS_DECISIONS = [
        ('fit', _('Apte')),
        ('fit_with_restrictions', _('Apte avec Restrictions')), 
        ('temporarily_unfit', _('Inapte Temporaire')),
        ('permanently_unfit', _('Inapte Définitif'))
    ]
    
    examination = models.OneToOneField(MedicalExamination, on_delete=models.CASCADE, related_name='fitness_certificate')
    certificate_number = models.CharField(_("Numéro Certificat"), max_length=50, unique=True)
    
    # Fitness decision
    fitness_decision = models.CharField(_("Décision Aptitude"), max_length=30, choices=FITNESS_DECISIONS)
    decision_rationale = models.TextField(_("Justification Décision"))
    
    # Restrictions (if fit with restrictions)
    restrictions = models.TextField(_("Restrictions"), blank=True, help_text=_("Ex: pas de travail en hauteur, poste adapté"))
    work_limitations = models.TextField(_("Limitations Travail"), blank=True)
    
    # Validity period
    issue_date = models.DateField(_("Date Émission"))
    valid_until = models.DateField(_("Valide Jusqu'à"))
    
    # Follow-up requirements
    requires_follow_up = models.BooleanField(_("Suivi Requis"), default=False)
    follow_up_frequency_months = models.PositiveIntegerField(_("Fréquence Suivi (mois)"), null=True, blank=True)
    follow_up_instructions = models.TextField(_("Instructions Suivi"), blank=True)
    
    # Certificate status
    is_active = models.BooleanField(_("Actif"), default=True)
    revoked_date = models.DateField(_("Date Révocation"), null=True, blank=True)
    revocation_reason = models.TextField(_("Raison Révocation"), blank=True)
    
    # Digital signature
    digital_signature = models.TextField(_("Signature Numérique"), blank=True)
    
    # Audit fields
    issued_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='certificates_issued')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Certificat Aptitude")
        verbose_name_plural = _("Certificats Aptitude") 
        ordering = ['-issue_date']
    
    def __str__(self):
        return f"{self.certificate_number} - {self.examination.worker.full_name} ({self.get_fitness_decision_display()})"
    
    def save(self, *args, **kwargs):
        if not self.certificate_number:
            from django.utils import timezone
            today = timezone.now().date()
            self.certificate_number = f"CERT{today.strftime('%Y%m%d')}{self.examination.worker.employee_id}"
        super().save(*args, **kwargs)
    
    @property
    def is_expired(self):
        from django.utils import timezone
        return timezone.now().date() > self.valid_until
    
    @property
    def days_until_expiry(self):
        from django.utils import timezone
        delta = self.valid_until - timezone.now().date()
        return delta.days if delta.days >= 0 else 0

# ==================== OCCUPATIONAL DISEASE MODELS ====================

class OccupationalDiseaseType(models.Model):
    """ILO R194 Classification of Occupational Diseases"""
    
    DISEASE_CATEGORIES = [
        ('respiratory', _('Maladies Respiratoires')),
        ('musculoskeletal', _('Troubles Musculo-squelettiques')),
        ('skin', _('Maladies Peau')),
        ('hearing', _('Troubles Auditifs')),
        ('mental', _('Troubles Mentaux')),
        ('cancer', _('Cancers Professionnels')),
        ('cardiovascular', _('Maladies Cardiovasculaires')),
        ('neurological', _('Troubles Neurologiques')),
        ('infectious', _('Maladies Infectieuses')),
        ('vision', _('Troubles Visuels')),
        ('voice', _('Troubles Vocaux')),
        ('reproductive', _('Troubles Reproductifs')),
    ]
    
    name = models.CharField(_("Nom Maladie"), max_length=200)
    category = models.CharField(_("Catégorie"), max_length=30, choices=DISEASE_CATEGORIES)
    ilo_code = models.CharField(_("Code ILO"), max_length=20, blank=True)
    description = models.TextField(_("Description"))
    
    # Associated sectors and exposures
    primary_sectors = models.JSONField(_("Secteurs Primaires"), default=list)
    associated_exposures = models.JSONField(_("Expositions Associées"), default=list)
    
    # Clinical criteria
    diagnostic_criteria = models.TextField(_("Critères Diagnostiques"), blank=True)
    latency_period = models.CharField(_("Période Latence"), max_length=100, blank=True)
    
    class Meta:
        verbose_name = _("Type Maladie Professionnelle")
        verbose_name_plural = _("Types Maladies Professionnelles")
        ordering = ['category', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.get_category_display()})"

class OccupationalDisease(models.Model):
    """Occupational disease case record"""
    
    CAUSAL_DETERMINATIONS = [
        ('definite', _('Certain')),
        ('probable', _('Probable')),
        ('possible', _('Possible')),  
        ('unlikely', _('Peu Probable')),
        ('not_related', _('Non Lié'))
    ]
    
    worker = models.ForeignKey(Worker, on_delete=models.CASCADE, related_name='occupational_diseases')
    disease_type = models.ForeignKey(OccupationalDiseaseType, on_delete=models.CASCADE)
    
    # Case identification
    case_number = models.CharField(_("Numéro Cas"), max_length=50, unique=True)
    diagnosis_date = models.DateField(_("Date Diagnostic"))
    diagnosing_physician = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='diseases_diagnosed')
    
    # Exposure assessment
    exposure_start_date = models.DateField(_("Début Exposition"), null=True, blank=True)
    exposure_end_date = models.DateField(_("Fin Exposition"), null=True, blank=True)
    exposure_duration_years = models.DecimalField(_("Durée Exposition (années)"), max_digits=5, decimal_places=1, null=True, blank=True)
    exposure_description = models.TextField(_("Description Exposition"))
    
    # Causal assessment
    causal_determination = models.CharField(_("Détermination Causale"), max_length=20, choices=CAUSAL_DETERMINATIONS)
    causal_assessment_notes = models.TextField(_("Notes Évaluation Causale"))
    
    # Clinical information
    symptoms = models.TextField(_("Symptômes"))
    clinical_findings = models.TextField(_("Résultats Cliniques"))
    diagnostic_tests = models.TextField(_("Tests Diagnostiques"), blank=True)
    
    # Disease severity and prognosis
    severity_level = models.CharField(_("Niveau Sévérité"), max_length=20, choices=[
        ('mild', _('Léger')),
        ('moderate', _('Modéré')),
        ('severe', _('Sévère')),
        ('critical', _('Critique'))
    ])
    
    functional_impairment = models.TextField(_("Déficience Fonctionnelle"), blank=True)
    prognosis = models.TextField(_("Pronostic"), blank=True)
    
    # Administrative and legal
    reported_to_cnss = models.BooleanField(_("Déclaré CNSS"), default=False)
    cnss_report_date = models.DateField(_("Date Déclaration CNSS"), null=True, blank=True)
    compensation_awarded = models.BooleanField(_("Indemnisation Accordée"), default=False)
    compensation_amount = models.DecimalField(_("Montant Indemnisation"), max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Treatment and follow-up
    treatment_plan = models.TextField(_("Plan Traitement"), blank=True)
    work_ability_impact = models.TextField(_("Impact Capacité Travail"))
    return_to_work_possible = models.BooleanField(_("Retour Travail Possible"), default=True)
    work_restrictions_needed = models.TextField(_("Restrictions Travail"), blank=True)
    
    # Case status
    case_status = models.CharField(_("Statut Cas"), max_length=20, choices=[
        ('active', _('Actif')),
        ('resolved', _('Résolu')),
        ('chronic', _('Chronique')),
        ('fatal', _('Fatal'))
    ], default='active')
    
    # Audit fields
    reported_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='diseases_reported')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Maladie Professionnelle")  
        verbose_name_plural = _("Maladies Professionnelles")
        ordering = ['-diagnosis_date']
    
    def __str__(self):
        return f"{self.case_number} - {self.worker.full_name} ({self.disease_type.name})"
    
    def save(self, *args, **kwargs):
        if not self.case_number:
            from django.utils import timezone
            today = timezone.now()
            self.case_number = f"MD{today.strftime('%Y%m%d')}{self.worker.employee_id}{str(self.pk or '').zfill(3)}"
        super().save(*args, **kwargs)

# ==================== WORKPLACE INCIDENT MODELS ====================

class WorkplaceIncident(models.Model):
    """Workplace incident/accident reporting - multi-sector"""
    
    INCIDENT_CATEGORIES = [
        # Universal categories
        ('fatality', _('Décès')),
        ('lost_time_injury', _('Accident avec Arrêt')),
        ('medical_treatment', _('Soins Médicaux')),
        ('first_aid', _('Premiers Secours')),
        ('near_miss', _('Presque Accident')),
        ('dangerous_occurrence', _('Événement Dangereux')),
        ('occupational_disease_incident', _('Incident Maladie Professionnelle')),
        
        # Sector-specific incidents
        ('needle_stick', _('Piqûre Accidentelle')),  # Healthcare
        ('patient_violence', _('Violence Patient')),   # Healthcare  
        ('road_accident', _('Accident Circulation')), # Transport
        ('robbery_violence', _('Vol/Violence')),      # Banking, Retail
        ('chemical_spill', _('Déversement Chimique')), # Manufacturing, Mining
        ('fall_from_height', _('Chute Hauteur')),     # Construction, Mining
        ('machinery_accident', _('Accident Machine')), # Manufacturing
        ('explosion', _('Explosion')),                # Oil & Gas, Mining
        ('fire', _('Incendie')),                      # All sectors
        ('electrical_incident', _('Incident Électrique')), # Construction, Energy
        ('struck_by_object', _('Heurté par Objet')), # Construction, Manufacturing  
        ('repetitive_strain', _('Lésion Efforts Répétés')), # All office work
        ('stress_related', _('Lié au Stress')),       # All sectors
        ('other', _('Autre')),
    ]
    
    SEVERITY_LEVELS = [
        (1, _('Négligeable - Premiers secours seulement')),
        (2, _('Mineur - Soins médicaux mineurs')),
        (3, _('Modéré - Soins médicaux significatifs')),
        (4, _('Majeur - Hospitalisation, arrêt > 7 jours')),
        (5, _('Catastrophique - Handicap permanent ou décès')),
    ]
    
    # Basic incident information
    incident_number = models.CharField(_("Numéro Incident"), max_length=50, unique=True)
    enterprise = models.ForeignKey(Enterprise, on_delete=models.CASCADE, related_name='incidents')
    work_site = models.ForeignKey(WorkSite, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Incident classification
    category = models.CharField(_("Catégorie"), max_length=50, choices=INCIDENT_CATEGORIES)
    severity = models.PositiveIntegerField(_("Sévérité"), choices=SEVERITY_LEVELS)
    
    # When and where
    incident_date = models.DateField(_("Date Incident"))
    incident_time = models.TimeField(_("Heure Incident"))
    location_description = models.TextField(_("Description Lieu"))
    
    # Who was involved
    injured_workers = models.ManyToManyField(Worker, related_name='incidents_involved', blank=True)
    witnesses = models.ManyToManyField(Worker, related_name='incidents_witnessed', blank=True)
    
    # What happened
    description = models.TextField(_("Description Incident"))
    immediate_cause = models.TextField(_("Cause Immédiate"))
    equipment_involved = models.CharField(_("Équipement Impliqué"), max_length=200, blank=True)
    
    # Injury/damage details
    body_parts_affected = models.JSONField(_("Parties Corps Affectées"), default=list)
    injury_type = models.CharField(_("Type Blessure"), max_length=100, blank=True)
    property_damage = models.BooleanField(_("Dommages Matériels"), default=False)
    property_damage_cost = models.DecimalField(_("Coût Dommages ($)"), max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Medical response
    first_aid_given = models.BooleanField(_("Premiers Secours Donnés"), default=False)
    first_aid_by = models.CharField(_("Premiers Secours Par"), max_length=100, blank=True)
    medical_treatment_required = models.BooleanField(_("Soins Médicaux Requis"), default=False)
    hospital_name = models.CharField(_("Nom Hôpital"), max_length=200, blank=True)
    
    # Work impact
    work_days_lost = models.PositiveIntegerField(_("Jours Arrêt"), default=0)
    return_to_work_date = models.DateField(_("Date Retour Travail"), null=True, blank=True)
    restricted_work_days = models.PositiveIntegerField(_("Jours Travail Restreint"), default=0)
    
    # Investigation and follow-up
    investigated = models.BooleanField(_("Enquêté"), default=False)
    investigation_completed_date = models.DateField(_("Enquête Terminée le"), null=True, blank=True)
    root_cause_analysis = models.TextField(_("Analyse Cause Racine"), blank=True)
    
    # Corrective actions
    immediate_actions_taken = models.TextField(_("Actions Immédiates"))
    corrective_actions_planned = models.TextField(_("Actions Correctives Prévues"), blank=True)
    
    # Regulatory reporting
    reportable_to_authorities = models.BooleanField(_("Déclarable Autorités"), default=False)
    reported_to_cnss = models.BooleanField(_("Déclaré CNSS"), default=False)
    reported_to_labour_inspection = models.BooleanField(_("Déclaré Inspection Travail"), default=False)
    reporting_date = models.DateField(_("Date Déclaration"), null=True, blank=True)
    
    # Incident status
    status = models.CharField(_("Statut"), max_length=20, choices=[
        ('reported', _('Signalé')),
        ('investigating', _('En Enquête')),
        ('closed', _('Fermé')),
        ('follow_up', _('Suivi'))
    ], default='reported')
    
    # Audit fields
    reported_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='incidents_reported')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Incident Travail")
        verbose_name_plural = _("Incidents Travail")
        ordering = ['-incident_date']
    
    def __str__(self):
        return f"{self.incident_number} - {self.enterprise.name} ({self.get_category_display()})"
    
    def save(self, *args, **kwargs):
        if not self.incident_number:
            from django.utils import timezone
            today = timezone.now().date()
            self.incident_number = f"INC{today.strftime('%Y%m%d')}{self.enterprise.pk}{str(self.pk or '').zfill(4)}"
        super().save(*args, **kwargs)

# ==================== PPE MANAGEMENT MODELS ====================

class PPEItem(models.Model):
    """Personal Protective Equipment item tracking"""
    
    PPE_CONDITIONS = [
        ('new', _('Neuf')),
        ('good', _('Bon État')),
        ('worn', _('Usé')),
        ('damaged', _('Endommagé')),
        ('expired', _('Expiré')),
    ]
    
    worker = models.ForeignKey(Worker, on_delete=models.CASCADE, related_name='ppe_items')
    ppe_type = models.CharField(_("Type PPE"), max_length=50, choices=PPE_TYPES)
    
    # Item details
    brand_model = models.CharField(_("Marque/Modèle"), max_length=100, blank=True)
    serial_number = models.CharField(_("Numéro Série"), max_length=100, blank=True)
    size = models.CharField(_("Taille"), max_length=20, blank=True)
    
    # Dates
    issue_date = models.DateField(_("Date Attribution"))
    expiry_date = models.DateField(_("Date Expiration"), null=True, blank=True)
    last_inspection_date = models.DateField(_("Dernière Inspection"), null=True, blank=True)
    next_inspection_date = models.DateField(_("Prochaine Inspection"), null=True, blank=True)
    
    # Condition and compliance
    condition = models.CharField(_("État"), max_length=20, choices=PPE_CONDITIONS, default='new')
    training_provided = models.BooleanField(_("Formation Donnée"), default=False)
    training_date = models.DateField(_("Date Formation"), null=True, blank=True)
    
    # Usage compliance
    compliance_checked = models.BooleanField(_("Conformité Vérifiée"), default=False)
    last_compliance_check = models.DateField(_("Dernière Vérif Conformité"), null=True, blank=True)
    non_compliance_notes = models.TextField(_("Notes Non-Conformité"), blank=True)
    
    # Replacement tracking
    replaced = models.BooleanField(_("Remplacé"), default=False)
    replacement_date = models.DateField(_("Date Remplacement"), null=True, blank=True)
    replacement_reason = models.TextField(_("Raison Remplacement"), blank=True)
    
    # Audit fields
    assigned_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='ppe_assigned')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Équipement PPE")
        verbose_name_plural = _("Équipements PPE")
        ordering = ['worker', 'ppe_type']
    
    def __str__(self):
        return f"{self.worker.full_name} - {self.get_ppe_type_display()}"
    
    @property
    def is_expired(self):
        if not self.expiry_date:
            return False
        from django.utils import timezone
        return timezone.now().date() > self.expiry_date
    
    @property
    def needs_inspection(self):
        if not self.next_inspection_date:
            return False
        from django.utils import timezone
        return timezone.now().date() >= self.next_inspection_date

# ==================== RISK ASSESSMENT MODELS ====================

class HazardIdentification(models.Model):
    """Hazard identification and risk assessment (ISO 45001 §6.1)"""
    
    HAZARD_TYPES = [
        ('physical', _('Physique')),
        ('chemical', _('Chimique')),
        ('biological', _('Biologique')),
        ('psychosocial', _('Psychosocial')),
        ('ergonomic', _('Ergonomique')),
        ('safety', _('Sécurité')),
    ]
    
    PROBABILITY_LEVELS = [
        (1, _('Très Improbable')),
        (2, _('Improbable')),
        (3, _('Possible')),
        (4, _('Probable')),
        (5, _('Très Probable')),
    ]
    
    SEVERITY_LEVELS = [
        (1, _('Négligeable')),
        (2, _('Mineur')),
        (3, _('Modéré')),
        (4, _('Majeur')),
        (5, _('Catastrophique')),
    ]
    
    enterprise = models.ForeignKey(Enterprise, on_delete=models.CASCADE, related_name='hazard_identifications')
    work_site = models.ForeignKey(WorkSite, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Hazard details
    hazard_description = models.TextField(_("Description Danger"))
    hazard_type = models.CharField(_("Type Danger"), max_length=20, choices=HAZARD_TYPES)
    location = models.CharField(_("Lieu"), max_length=200)
    activities_affected = models.TextField(_("Activités Affectées"))
    workers_exposed = models.ManyToManyField(Worker, related_name='hazard_exposures', blank=True)
    
    # Risk assessment (Probability × Severity)
    probability = models.PositiveIntegerField(_("Probabilité"), choices=PROBABILITY_LEVELS)
    severity = models.PositiveIntegerField(_("Gravité"), choices=SEVERITY_LEVELS)  
    
    # Existing controls
    existing_controls = models.TextField(_("Contrôles Existants"))
    control_effectiveness = models.CharField(_("Efficacité Contrôles"), max_length=20, choices=[
        ('very_effective', _('Très Efficace')),
        ('effective', _('Efficace')),
        ('partially_effective', _('Partiellement Efficace')),
        ('ineffective', _('Inefficace'))
    ])
    
    # Residual risk after existing controls
    residual_probability = models.PositiveIntegerField(_("Probabilité Résiduelle"), choices=PROBABILITY_LEVELS)
    residual_severity = models.PositiveIntegerField(_("Gravité Résiduelle"), choices=SEVERITY_LEVELS)
    
    # Additional controls recommended (Hierarchy of Controls)
    elimination_possible = models.BooleanField(_("Élimination Possible"), default=False)
    substitution_recommendations = models.TextField(_("Recommandations Substitution"), blank=True)
    engineering_controls = models.TextField(_("Contrôles Ingénierie"), blank=True)
    administrative_controls = models.TextField(_("Contrôles Administratifs"), blank=True)
    ppe_recommendations = models.JSONField(_("Recommandations PPE"), default=list)
    
    # Risk assessment results
    risk_level = models.CharField(_("Niveau Risque"), max_length=20, choices=[
        ('low', _('Faible (1-4)')),
        ('medium', _('Moyen (5-9)')),
        ('high', _('Élevé (10-15)')),
        ('critical', _('Critique (16-25)'))
    ])
    
    action_required = models.BooleanField(_("Action Requise"), default=True)
    priority = models.CharField(_("Priorité"), max_length=20, choices=[
        ('low', _('Faible')),
        ('medium', _('Moyenne')),
        ('high', _('Élevée')),
        ('urgent', _('Urgente'))
    ])
    
    # Review and update
    assessment_date = models.DateField(_("Date Évaluation"))
    review_date = models.DateField(_("Date Révision"))
    next_review_date = models.DateField(_("Prochaine Révision"))
    
    # Status
    status = models.CharField(_("Statut"), max_length=20, choices=[
        ('draft', _('Brouillon')),
        ('approved', _('Approuvé')),
        ('implemented', _('Implémenté')),
        ('reviewed', _('Révisé'))
    ], default='draft')
    
    # Audit fields
    assessed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='hazards_assessed')
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='hazards_approved', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Identification Danger")
        verbose_name_plural = _("Identifications Dangers")
        ordering = ['-assessment_date']
    
    def __str__(self):
        return f"{self.hazard_description[:50]} - {self.enterprise.name}"
    
    @property
    def risk_score(self):
        """Calculate initial risk score (Probability × Severity)"""
        return self.probability * self.severity
    
    @property
    def residual_risk_score(self):
        """Calculate residual risk score after controls"""
        return self.residual_probability * self.residual_severity

# ==================== SITE HEALTH METRICS ====================

class SiteHealthMetrics(models.Model):
    """Site-level occupational health and safety metrics"""
    
    enterprise = models.ForeignKey(Enterprise, on_delete=models.CASCADE, related_name='health_metrics')
    work_site = models.ForeignKey(WorkSite, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Reporting period
    year = models.PositiveIntegerField(_("Année"))
    month = models.PositiveIntegerField(_("Mois"), validators=[MinValueValidator(1), MaxValueValidator(12)])
    
    # Workforce data
    total_workers = models.PositiveIntegerField(_("Nombre Total Travailleurs"))
    total_hours_worked = models.PositiveIntegerField(_("Heures Totales Travaillées"))
    
    # Incident statistics
    fatalities = models.PositiveIntegerField(_("Décès"), default=0)
    lost_time_injuries = models.PositiveIntegerField(_("Accidents avec Arrêt"), default=0)
    medical_treatment_cases = models.PositiveIntegerField(_("Cas Soins Médicaux"), default=0)
    first_aid_cases = models.PositiveIntegerField(_("Cas Premiers Secours"), default=0)
    near_misses = models.PositiveIntegerField(_("Presque Accidents"), default=0)
    total_lost_days = models.PositiveIntegerField(_("Total Jours Perdus"), default=0)
    
    # Occupational disease statistics
    new_occupational_diseases = models.PositiveIntegerField(_("Nouvelles Maladies Professionnelles"), default=0)
    total_active_diseases = models.PositiveIntegerField(_("Total Maladies Actives"), default=0)
    
    # Medical examination compliance
    examinations_due = models.PositiveIntegerField(_("Examens Dus"), default=0)
    examinations_completed = models.PositiveIntegerField(_("Examens Terminés"), default=0)
    overdue_examinations = models.PositiveIntegerField(_("Examens en Retard"), default=0)
    
    # Fitness certification status
    workers_fit = models.PositiveIntegerField(_("Travailleurs Aptes"), default=0)
    workers_fit_with_restrictions = models.PositiveIntegerField(_("Travailleurs Aptes avec Restrictions"), default=0)
    workers_temporarily_unfit = models.PositiveIntegerField(_("Travailleurs Inaptes Temporaires"), default=0)
    workers_permanently_unfit = models.PositiveIntegerField(_("Travailleurs Inaptes Définitifs"), default=0)
    
    # PPE compliance
    ppe_compliance_rate = models.DecimalField(_("Taux Conformité PPE (%)"), max_digits=5, decimal_places=2, default=0)
    
    # Training statistics
    safety_training_completed = models.PositiveIntegerField(_("Formations Sécurité Terminées"), default=0)
    health_awareness_sessions = models.PositiveIntegerField(_("Sessions Sensibilisation Santé"), default=0)
    
    # Absenteeism
    total_absence_days = models.PositiveIntegerField(_("Total Jours Absence"), default=0)
    sick_leave_days = models.PositiveIntegerField(_("Jours Congé Maladie"), default=0)
    
    # Audit fields
    compiled_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='metrics_compiled')  
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Métriques Santé Site")
        verbose_name_plural = _("Métriques Santé Sites")
        unique_together = ['enterprise', 'work_site', 'year', 'month']
        ordering = ['-year', '-month']
    
    def __str__(self):
        site_name = self.work_site.name if self.work_site else "Tous Sites"
        return f"{self.enterprise.name} - {site_name} ({self.year}-{self.month:02d})"
    
    @property
    def ltifr(self):
        """Lost Time Injury Frequency Rate (per 1,000,000 hours worked)"""
        if self.total_hours_worked == 0:
            return 0
        return round((self.lost_time_injuries * 1_000_000) / self.total_hours_worked, 2)
    
    @property  
    def trifr(self):
        """Total Recordable Injury Frequency Rate (per 1,000,000 hours worked)"""
        if self.total_hours_worked == 0:
            return 0
        total_recordable = self.lost_time_injuries + self.medical_treatment_cases
        return round((total_recordable * 1_000_000) / self.total_hours_worked, 2)
    
    @property
    def severity_rate(self):
        """Severity Rate (lost days per 1,000 hours worked)"""
        if self.total_hours_worked == 0:
            return 0
        return round((self.total_lost_days * 1_000) / self.total_hours_worked, 2)
    
    @property
    def absenteeism_rate(self):
        """Absenteeism Rate (%)"""
        if self.total_workers == 0:
            return 0
        working_days_per_month = 22  # Approximate
        potential_days = self.total_workers * working_days_per_month
        return round((self.total_absence_days / potential_days) * 100, 2)
    
    @property
    def exam_compliance_rate(self):
        """Medical examination compliance rate (%)"""
        if self.examinations_due == 0:
            return 100
        return round((self.examinations_completed / self.examinations_due) * 100, 2)
    
    @property
    def fitness_rate(self):
        """Overall fitness rate (%)"""
        if self.total_workers == 0:
            return 0
        fit_workers = self.workers_fit + self.workers_fit_with_restrictions
        return round((fit_workers / self.total_workers) * 100, 2)