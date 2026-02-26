"""
Médecine du Travail Models - Multi-Sector System

Comprehensive occupational medicine management system supporting 16 industry sectors 
with sector-specific risk profiles, examination requirements, and regulatory compliance.

Standards: ISO 45001:2018, ILO C155/C161/C187, ILO R194, WHO Healthy Workplaces
"""
from django.db import models, IntegrityError
from django.core.validators import MinValueValidator, MaxValueValidator
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from decimal import Decimal
import uuid

User = get_user_model()

# ==================== PROTOCOL / SECTOR HIERARCHY MODELS ====================
# These models store the Sector → Department → Position → Protocol tree in the DB,
# making it fully editable by the doctor / admin without touching code.

EXAM_CATEGORY_CHOICES = [
    ('clinique',        'Clinique'),
    ('biologique',      'Biologique'),
    ('imagerie',        'Imagerie'),
    ('fonctionnel',     'Fonctionnel'),
    ('cardiologique',   'Cardiologique'),
    ('ophtalmologie',   'Ophtalmologie'),
    ('neurologique',    'Neurologique'),
    ('toxicologie',     'Toxicologie'),
    ('psychotechnique', 'Psychotechnique'),
    ('psychosocial',    'Psychosocial'),
    ('aptitude',        'Aptitude'),
]

VISIT_TYPE_CHOICES = [
    ('pre_employment',  "Visite d'Embauche"),
    ('periodic',        'Visite Périodique'),
    ('return_to_work',  'Visite de Reprise'),
    ('post_incident',   'Visite Post-Accident'),
    ('fitness_for_duty','Aptitude Spécifique'),
    ('exit_medical',    'Visite de Sortie'),
    ('special_request', 'Demande Spéciale'),
    ('pregnancy_related','Suivi Grossesse'),
    ('night_work',      'Aptitude Travail de Nuit'),
]


class MedicalExamCatalog(models.Model):
    """
    Central catalog of all medical exam types that can appear in protocols.
    Examples: RADIO_THORAX, AUDIOGRAMME, PLOMBEMIE, ECG_REPOS, ...

    The doctor can add new exams here and reference them from any protocol.
    """
    code = models.CharField(
        _("Code Examen"), max_length=60, unique=True,
        help_text=_("Identifiant unique en MAJUSCULES_UNDERSCORE, ex: RADIO_THORAX")
    )
    label = models.CharField(_("Libellé"), max_length=200)
    category = models.CharField(
        _("Catégorie"), max_length=30, choices=EXAM_CATEGORY_CHOICES, default='clinique'
    )
    description = models.TextField(_("Description"), blank=True)
    requires_specialist = models.BooleanField(
        _("Spécialiste Requis"), default=False,
        help_text=_("Cocher si cet examen nécessite une référence vers un spécialiste")
    )
    is_active = models.BooleanField(_("Actif"), default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Catalogue — Examen Médical")
        verbose_name_plural = _("Catalogue — Examens Médicaux")
        ordering = ['category', 'label']

    def __str__(self):
        return f"[{self.category}] {self.label} ({self.code})"


class OccSector(models.Model):
    """
    Top-level sector (e.g. Minier, Télécommunications, Banque).
    Maps to an industry sector key for UI profile lookups (color, icon, risk level).
    """
    code = models.CharField(
        _("Code Secteur"), max_length=20, unique=True,
        help_text=_("Court code MAJUSCULE, ex: MIN, TEL, BAN")
    )
    name = models.CharField(_("Nom"), max_length=100)
    industry_sector_key = models.CharField(
        _("Clé Secteur Industrie"), max_length=50, blank=True,
        help_text=_("Correspond au type IndustrySector du frontend (mining, telecom_it, banking_finance…)")
    )
    is_active = models.BooleanField(_("Actif"), default=True)

    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='sectors_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Secteur")
        verbose_name_plural = _("Secteurs")
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.code})"


class OccDepartment(models.Model):
    """
    Department / work area within a sector.
    E.g. under Minier: "Mine Souterraine", "Conduite Engins Lourds".
    """
    sector = models.ForeignKey(
        OccSector, on_delete=models.CASCADE, related_name='departments',
        verbose_name=_("Secteur")
    )
    code = models.CharField(
        _("Code Département"), max_length=30, unique=True,
        help_text=_("Ex: MIN_UNDER, MIN_ENGINS, TEL_PYLONE")
    )
    name = models.CharField(_("Nom"), max_length=150)
    is_active = models.BooleanField(_("Actif"), default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Département")
        verbose_name_plural = _("Départements")
        ordering = ['sector__name', 'name']

    def __str__(self):
        return f"{self.sector.name} → {self.name} ({self.code})"


class OccPosition(models.Model):
    """
    Job position within a department.
    E.g. under "Mine Souterraine": "Foreur / Dynamiteur", "Mineur Souterrain".
    The doctor can add/edit/delete positions.
    """
    department = models.ForeignKey(
        OccDepartment, on_delete=models.CASCADE, related_name='positions',
        verbose_name=_("Département")
    )
    code = models.CharField(
        _("Code Poste"), max_length=40, unique=True,
        help_text=_("Ex: FOREUR, CHAUFFEUR_MINE, TECH_HAUTEUR")
    )
    name = models.CharField(_("Intitulé du Poste"), max_length=200)
    typical_exposures = models.JSONField(
        _("Expositions Typiques"), default=list, blank=True,
        help_text=_("Liste de codes ExposureRisk, ex: [\"silica_dust\", \"noise\"]")
    )
    recommended_ppe = models.JSONField(
        _("EPI Recommandés"), default=list, blank=True,
        help_text=_("Liste de codes PPEType, ex: [\"hard_hat\", \"ear_plugs\"]")
    )
    is_active = models.BooleanField(_("Actif"), default=True)

    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='positions_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Poste")
        verbose_name_plural = _("Postes")
        ordering = ['department__sector__name', 'department__name', 'name']

    def __str__(self):
        return f"{self.department.sector.name} → {self.department.name} → {self.name}"

    @property
    def breadcrumb(self):
        return f"{self.department.sector.name} → {self.department.name} → {self.name}"


class ExamVisitProtocol(models.Model):
    """
    Protocol binding a Position + visit type to a set of required/recommended exams.

    For each position the doctor can define:
      - Which visit types are applicable (embauche, périodique, reprise…)
      - Which exams are REQUIRED (must be done before fitness decision)
      - Which exams are RECOMMENDED (suggested but not blocking)
      - The certificate validity period in months
      - Regulatory references

    The doctor can create, edit, copy and delete protocols from the Django admin
    or from a dedicated frontend screen (ProtocolManagerScreen).
    """
    position = models.ForeignKey(
        OccPosition, on_delete=models.CASCADE, related_name='protocols',
        verbose_name=_("Poste")
    )
    visit_type = models.CharField(
        _("Type de Visite"), max_length=30, choices=VISIT_TYPE_CHOICES
    )
    visit_type_label_override = models.CharField(
        _("Libellé Personnalisé"), max_length=100, blank=True,
        help_text=_("Laisser vide pour utiliser le libellé par défaut du type de visite")
    )

    # Required and recommended exams (M2M through junction table for ordering)
    required_exams = models.ManyToManyField(
        MedicalExamCatalog,
        through='ProtocolRequiredExam',
        related_name='required_in_protocols',
        verbose_name=_("Examens Obligatoires"),
        blank=True,
    )
    recommended_exams = models.ManyToManyField(
        MedicalExamCatalog,
        related_name='recommended_in_protocols',
        verbose_name=_("Examens Recommandés"),
        blank=True,
    )

    validity_months = models.PositiveSmallIntegerField(
        _("Validité (mois)"), default=12,
        help_text=_("Durée de validité du certificat en mois (0 = examen unique non périodique)")
    )
    regulatory_note = models.TextField(
        _("Référence Réglementaire"), blank=True,
        help_text=_("Ex: Code Minier RDC · ILO C176 · Décret N°18/025")
    )
    is_active = models.BooleanField(_("Actif"), default=True)

    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='protocols_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Protocole d'Examen")
        verbose_name_plural = _("Protocoles d'Examens")
        unique_together = [('position', 'visit_type')]
        ordering = ['position__name', 'visit_type']

    def __str__(self):
        return f"{self.position.name} — {self.get_visit_type_display()}"

    @property
    def visit_type_display(self):
        return self.visit_type_label_override or self.get_visit_type_display()

    def get_required_exam_codes(self):
        """Returns ordered list of required exam codes."""
        return list(
            self.protocolrequiredexam_set
                .select_related('exam')
                .order_by('order')
                .values_list('exam__code', flat=True)
        )

    def get_recommended_exam_codes(self):
        """Returns list of recommended exam codes."""
        return list(self.recommended_exams.values_list('code', flat=True))


class ProtocolRequiredExam(models.Model):
    """
    Junction table between ExamVisitProtocol and MedicalExamCatalog for required exams.
    Stores the display order of exams within a protocol.
    """
    protocol = models.ForeignKey(ExamVisitProtocol, on_delete=models.CASCADE)
    exam = models.ForeignKey(
        MedicalExamCatalog, on_delete=models.CASCADE, verbose_name=_("Examen")
    )
    order = models.PositiveSmallIntegerField(_("Ordre"), default=0)
    is_blocking = models.BooleanField(
        _("Bloquant"), default=True,
        help_text=_("Si coché, la décision d'aptitude ne peut être prise sans ce résultat")
    )

    class Meta:
        verbose_name = _("Examen Requis du Protocole")
        verbose_name_plural = _("Examens Requis des Protocoles")
        unique_together = [('protocol', 'exam')]
        ordering = ['order']

    def __str__(self):
        return f"{self.protocol} → {self.exam.code} (#{self.order})"


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
    phone = models.CharField(_("Téléphone"), max_length=20)
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
    phone = models.CharField(_("Téléphone Site"), max_length=20)
    
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
    """Worker with comprehensive Médecine du Travail profile"""
    
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
    work_site = models.ForeignKey(WorkSite, on_delete=models.SET_NULL, null=True, blank=True, related_name='workers')
    job_category = models.CharField(_("Catégorie Emploi"), max_length=50, choices=JOB_CATEGORIES)
    job_title = models.CharField(_("Titre Emploi"), max_length=100)
    hire_date = models.DateField(_("Date Embauche"))
    employment_status = models.CharField(_("Statut Emploi"), max_length=20, choices=[
        ('active', _('Actif')),
        ('on_leave', _('En Congé')),
        ('suspended', _('Suspendu')),
        ('terminated', _('Terminé'))
    ], default='active')

    # ── Protocol references (linked to the Sector/Department/Position hierarchy) ──
    occ_sector = models.ForeignKey(
        'OccSector', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='workers', verbose_name=_("Secteur (Protocoles)"),
        help_text=_("Secteur structuré pour l'auto-sélection des protocoles d'examen")
    )
    occ_department = models.ForeignKey(
        'OccDepartment', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='workers', verbose_name=_("Département (Protocoles)")
    )
    occ_position = models.ForeignKey(
        'OccPosition', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='workers', verbose_name=_("Poste (Protocoles)"),
        help_text=_("Lie ce travailleur aux protocoles d'examens de ce poste")
    )
    
    # Contact Information  
    phone = models.CharField(_("Téléphone"), max_length=20)
    email = models.EmailField(_("Email"), blank=True)
    address = models.TextField(_("Adresse"))
    emergency_contact_name = models.CharField(_("Contact Urgence Nom"), max_length=100)
    emergency_contact_phone = models.CharField(_("Contact Urgence Tél"), max_length=20)
    
    # Médecine du Travail Information
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

    def _build_exam_number(self) -> str:
        worker_code = ''.join(ch for ch in (self.worker.employee_id or '') if ch.isalnum()).upper()[:12]
        if not worker_code:
            worker_code = f"W{self.worker_id}"

        now = timezone.now()
        random_suffix = uuid.uuid4().hex[:4].upper()
        return f"EX{now.strftime('%Y%m%d')}{worker_code}{random_suffix}"
    
    def save(self, *args, **kwargs):
        if self.exam_number:
            return super().save(*args, **kwargs)

        for _ in range(8):
            self.exam_number = self._build_exam_number()
            try:
                return super().save(*args, **kwargs)
            except IntegrityError as error:
                # Retry only on exam_number collisions
                if 'exam_number' not in str(error):
                    raise

        raise IntegrityError('Unable to generate a unique exam_number after multiple attempts.')

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


# ==================== EXTENDED OCCUPATIONAL HEALTH MODELS ====================

class WorkerRiskProfile(models.Model):
    """Comprehensive risk profile for each worker"""
    
    RISK_LEVEL_CHOICES = [
        ('low', _('Faible')),
        ('moderate', _('Modéré')),
        ('high', _('Élevé')),
        ('critical', _('Critique')),
    ]
    
    worker = models.OneToOneField(Worker, on_delete=models.CASCADE, related_name='risk_profile')
    health_risk_score = models.PositiveIntegerField(default=0)  # 0-100
    exposure_risk_score = models.PositiveIntegerField(default=0)  # 0-100
    compliance_risk_score = models.PositiveIntegerField(default=0)  # 0-100
    overall_risk_score = models.PositiveIntegerField(default=0)  # 0-100
    risk_level = models.CharField(max_length=20, choices=RISK_LEVEL_CHOICES, default='low')
    age_risk_factor = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('1.0'))
    exposure_years_factor = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('1.0'))
    medical_history_factor = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('1.0'))
    fitness_status_factor = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('1.0'))
    ppe_compliance_factor = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('1.0'))
    exams_overdue = models.BooleanField(default=False)
    days_overdue = models.PositiveIntegerField(default=0)
    abnormal_findings_count = models.PositiveIntegerField(default=0)
    incidents_last_12months = models.PositiveIntegerField(default=0)
    near_misses_last_12months = models.PositiveIntegerField(default=0)
    intervention_recommended = models.BooleanField(default=False)
    intervention_type = models.CharField(max_length=200, blank=True)
    priority_actions = models.TextField(blank=True)
    last_calculated = models.DateTimeField(auto_now=True)
    calculated_by_system = models.BooleanField(default=True)
    manual_notes = models.TextField(blank=True)
    
    class Meta:
        verbose_name = 'Worker Risk Profile'
        verbose_name_plural = 'Worker Risk Profiles'
    
    def __str__(self):
        return f"Risk Profile - {self.worker.full_name} ({self.risk_level})"
    
    def calculate_overall_risk(self):
        weighted_health = self.health_risk_score * 0.3
        weighted_exposure = self.exposure_risk_score * 0.35
        weighted_compliance = self.compliance_risk_score * 0.35
        self.overall_risk_score = int(weighted_health + weighted_exposure + weighted_compliance)
        if self.overall_risk_score < 25:
            self.risk_level = 'low'
        elif self.overall_risk_score < 50:
            self.risk_level = 'moderate'
        elif self.overall_risk_score < 75:
            self.risk_level = 'high'
        else:
            self.risk_level = 'critical'
        self.save()
        return self.overall_risk_score


class OverexposureAlert(models.Model):
    """Real-time alerts for worker overexposure to hazards"""
    
    SEVERITY_CHOICES = [('warning', 'Warning'), ('critical', 'Critical'), ('emergency', 'Emergency')]
    STATUS_CHOICES = [('active', 'Active'), ('acknowledged', 'Acknowledged'), ('resolved', 'Resolved')]
    
    worker = models.ForeignKey(Worker, on_delete=models.CASCADE, related_name='overexposure_alerts')
    exposure_type = models.CharField(max_length=100, default='unknown')
    exposure_level = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    exposure_threshold = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    unit_measurement = models.CharField(max_length=50, default='unknown')
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='warning')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    detected_date = models.DateTimeField(auto_now_add=True)
    acknowledged_date = models.DateTimeField(null=True, blank=True)
    resolved_date = models.DateTimeField(null=True, blank=True)
    recommended_action = models.TextField(default='')
    action_taken = models.TextField(blank=True)
    acknowledged_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='alerts_acknowledged')
    medical_followup_required = models.BooleanField(default=False)
    medical_followup_date = models.DateField(null=True, blank=True)
    
    class Meta:
        verbose_name = 'Overexposure Alert'
        verbose_name_plural = 'Overexposure Alerts'
        ordering = ['-detected_date']
    
    def __str__(self):
        return f"{self.worker.full_name} - {self.exposure_type} ({self.severity})"
    
    def mark_acknowledged(self, user):
        self.status = 'acknowledged'
        self.acknowledged_date = timezone.now()
        self.acknowledged_by = user
        self.save()
    
    def mark_resolved(self):
        self.status = 'resolved'
        self.resolved_date = timezone.now()
        self.save()


class ExitExamination(models.Model):
    """Exit examination workflow for departing workers"""
    
    REASON_CHOICES = [('retirement', 'Retirement'), ('resignation', 'Resignation'), ('termination', 'Termination'), ('contract_end', 'Contract End'), ('transfer', 'Transfer'), ('other', 'Other')]
    
    worker = models.OneToOneField(Worker, on_delete=models.CASCADE, related_name='exit_examination')
    exit_date = models.DateField()
    reason_for_exit = models.CharField(max_length=50, choices=REASON_CHOICES)
    last_work_date = models.DateField(null=True, blank=True)
    exam_completed = models.BooleanField(default=False)
    examiner = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='exit_exams_conducted')
    exam_date = models.DateField(null=True, blank=True)
    health_status_summary = models.TextField(blank=True)
    occupational_disease_present = models.BooleanField(default=False)
    disease_notes = models.TextField(blank=True)
    post_employment_medical_followup = models.BooleanField(default=False)
    followup_frequency_months = models.PositiveIntegerField(null=True, blank=True)
    followup_recommendations = models.TextField(blank=True)
    exit_certificate_issued = models.BooleanField(default=False)
    exit_certificate_date = models.DateField(null=True, blank=True)
    reported_to_cnss = models.BooleanField(default=False)
    cnss_report_date = models.DateField(null=True, blank=True)
    compensation_claim_filed = models.BooleanField(default=False)
    records_provided_to_worker = models.BooleanField(default=False)
    records_provided_date = models.DateField(null=True, blank=True)
    
    class Meta:
        verbose_name = 'Exit Examination'
        verbose_name_plural = 'Exit Examinations'
    
    def __str__(self):
        return f"Exit Exam - {self.worker.full_name} ({self.exit_date})"
    
    @property
    def days_until_exit(self):
        delta = self.exit_date - timezone.now().date()
        return delta.days if delta.days >= 0 else 0


class RegulatoryCNSSReport(models.Model):
    """CNSS (National Social Security) regulatory report"""
    
    STATUS_CHOICES = [('draft', 'Draft'), ('ready_for_submission', 'Ready'), ('submitted', 'Submitted'), ('acknowledged', 'Acknowledged'), ('rejected', 'Rejected'), ('approved', 'Approved')]
    REPORT_TYPE_CHOICES = [('incident', 'Incident'), ('occupational_disease', 'Disease'), ('fatality', 'Fatality'), ('monthly_stats', 'Monthly Stats')]
    
    enterprise = models.ForeignKey(Enterprise, on_delete=models.CASCADE, related_name='cnss_reports')
    report_type = models.CharField(max_length=50, choices=REPORT_TYPE_CHOICES)
    reference_number = models.CharField(max_length=100, unique=True)
    report_period_start = models.DateField()
    report_period_end = models.DateField()
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='draft')
    content_json = models.JSONField(default=dict)
    related_incident = models.ForeignKey(WorkplaceIncident, on_delete=models.SET_NULL, null=True, blank=True, related_name='cnss_reports')
    related_disease = models.ForeignKey(OccupationalDisease, on_delete=models.SET_NULL, null=True, blank=True, related_name='cnss_reports')
    prepared_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='cnss_reports_prepared')
    prepared_date = models.DateTimeField(auto_now_add=True)
    submitted_date = models.DateTimeField(null=True, blank=True)
    submission_method = models.CharField(max_length=50, blank=True)
    cnss_acknowledgment_number = models.CharField(max_length=100, blank=True)
    cnss_acknowledgment_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'CNSS Report'
        verbose_name_plural = 'CNSS Reports'
        ordering = ['-prepared_date']
    
    def __str__(self):
        return f"{self.reference_number} - {self.get_report_type_display()}"


class DRCRegulatoryReport(models.Model):
    """DRC (Democratic Republic of Congo) labor regulatory report"""
    
    STATUS_CHOICES = [('draft', 'Draft'), ('submitted', 'Submitted'), ('approved', 'Approved'), ('rejected', 'Rejected')]
    REPORT_TYPE_CHOICES = [('monthly_incident', 'Monthly Incidents'), ('quarterly_health', 'Quarterly Health'), ('annual_compliance', 'Annual Compliance'), ('fatal_incident', 'Fatal Incident'), ('severe_incident', 'Severe Incident'), ('occupational_disease_notice', 'Disease Notice')]
    
    enterprise = models.ForeignKey(Enterprise, on_delete=models.CASCADE, related_name='drc_reports')
    report_type = models.CharField(max_length=100, choices=REPORT_TYPE_CHOICES)
    reference_number = models.CharField(max_length=100, unique=True)
    report_period_start = models.DateField()
    report_period_end = models.DateField()
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='draft')
    content_json = models.JSONField(default=dict)
    related_incidents = models.ManyToManyField(WorkplaceIncident, blank=True, related_name='drc_reports')
    related_diseases = models.ManyToManyField(OccupationalDisease, blank=True, related_name='drc_reports')
    submitted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='drc_reports_submitted')
    submitted_date = models.DateTimeField(null=True, blank=True)
    submission_method = models.CharField(max_length=50, blank=True)
    submission_recipient = models.CharField(max_length=100, blank=True)
    authority_response = models.TextField(blank=True)
    authority_response_date = models.DateField(null=True, blank=True)
    required_actions = models.TextField(blank=True)
    
    class Meta:
        verbose_name = 'DRC Report'
        verbose_name_plural = 'DRC Reports'
        ordering = ['-submitted_date']
    
    def __str__(self):
        return f"{self.reference_number} - {self.enterprise.name}"


class PPEComplianceRecord(models.Model):
    """PPE compliance tracking and audit records"""
    
    STATUS_CHOICES = [('in_use', 'In Use'), ('expired', 'Expired'), ('damaged', 'Damaged'), ('lost', 'Lost'), ('replaced', 'Replaced'), ('compliant', 'Compliant'), ('non_compliant', 'Non-Compliant')]
    
    ppe_item = models.ForeignKey(PPEItem, on_delete=models.CASCADE, related_name='compliance_records')
    check_date = models.DateField()
    check_type = models.CharField(max_length=50, choices=[('routine', 'Routine'), ('pre_use', 'Pre-Use'), ('post_incident', 'Post-Incident'), ('inventory', 'Inventory'), ('expiry', 'Expiry'), ('damage', 'Damage')])
    status = models.CharField(max_length=50, choices=STATUS_CHOICES)
    condition_notes = models.TextField(blank=True)
    is_compliant = models.BooleanField(default=True)
    non_compliance_reason = models.TextField(blank=True)
    corrective_action_required = models.BooleanField(default=False)
    corrective_action = models.TextField(blank=True)
    checked_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='ppe_compliance_checks')
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='ppe_compliance_approvals')
    approval_date = models.DateField(null=True, blank=True)
    
    class Meta:
        verbose_name = 'PPE Compliance Record'
        verbose_name_plural = 'PPE Compliance Records'
        ordering = ['-check_date']
    
    def __str__(self):
        return f"PPE Check - {self.ppe_item.worker.full_name} ({self.check_date})"


# ==================== MEDICAL EXAMINATION EXTENDED MODELS ====================

class XrayImagingResult(models.Model):
    """X-ray imaging results with ILO pneumoconiosis classification"""
    
    ILO_CLASSIFICATION_CHOICES = [('0/0', '0/0'), ('0/1', '0/1'), ('1/0', '1/0'), ('1/1', '1/1'), ('1/2', '1/2'), ('2/1', '2/1'), ('2/2', '2/2'), ('2/3', '2/3'), ('3/2', '3/2'), ('3/3', '3/3')]
    PROFUSION_CHOICES = [('absent', 'Absent'), ('minimal', 'Minimal'), ('mild', 'Mild'), ('moderate', 'Moderate'), ('severe', 'Severe')]
    IMAGING_TYPE_CHOICES = [('chest_xray', 'Chest X-Ray'), ('hrct', 'HRCT'), ('plain_film', 'Plain Film')]
    
    examination = models.OneToOneField(MedicalExamination, on_delete=models.CASCADE, related_name='xray_result')
    imaging_type = models.CharField(max_length=20, choices=IMAGING_TYPE_CHOICES, default='chest_xray')
    imaging_date = models.DateField()
    imaging_facility = models.CharField(max_length=200, blank=True)
    radiologist = models.CharField(max_length=200, blank=True)
    ilo_classification = models.CharField(max_length=10, choices=ILO_CLASSIFICATION_CHOICES, default='0/0')
    profusion = models.CharField(max_length=20, choices=PROFUSION_CHOICES, default='absent')
    small_opacities = models.BooleanField(default=False)
    large_opacities = models.BooleanField(default=False)
    pleural_thickening = models.BooleanField(default=False)
    pleural_effusion = models.BooleanField(default=False)
    costophrenic_angle_obliteration = models.BooleanField(default=False)
    cardiac_enlargement = models.BooleanField(default=False)
    other_findings = models.TextField(blank=True)
    pneumoconiosis_detected = models.BooleanField(default=False)
    pneumoconiosis_type = models.CharField(max_length=100, blank=True)
    severity = models.CharField(max_length=20, choices=[('mild', 'Mild'), ('moderate', 'Moderate'), ('severe', 'Severe'), ('advanced', 'Advanced')], blank=True)
    follow_up_required = models.BooleanField(default=False)
    follow_up_interval_months = models.IntegerField(null=True, blank=True)
    clinical_notes = models.TextField(blank=True)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'X-Ray Imaging Result'
        verbose_name_plural = 'X-Ray Imaging Results'
    
    def __str__(self):
        return f"X-Ray {self.get_imaging_type_display()}"
    
    @property
    def worker(self):
        return self.examination.worker


class HeavyMetalsTest(models.Model):
    """Heavy metals blood/urine testing results"""
    
    METAL_CHOICES = [('lead', 'Lead'), ('mercury', 'Mercury'), ('cadmium', 'Cadmium'), ('cobalt', 'Cobalt'), ('chromium', 'Chromium'), ('nickel', 'Nickel'), ('manganese', 'Manganese'), ('arsenic', 'Arsenic'), ('beryllium', 'Beryllium'), ('aluminum', 'Aluminum')]
    SPECIMEN_TYPE_CHOICES = [('blood', 'Blood'), ('urine', 'Urine'), ('hair', 'Hair')]
    STATUS_CHOICES = [('normal', 'Normal'), ('elevated', 'Elevated'), ('high', 'High'), ('critical', 'Critical')]
    
    examination = models.ForeignKey(MedicalExamination, on_delete=models.CASCADE, related_name='heavy_metals_tests')
    heavy_metal = models.CharField(max_length=20, choices=METAL_CHOICES)
    specimen_type = models.CharField(max_length=10, choices=SPECIMEN_TYPE_CHOICES)
    test_date = models.DateField()
    level_value = models.DecimalField(max_digits=10, decimal_places=4)
    unit = models.CharField(max_length=20)
    reference_lower = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    reference_upper = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='normal')
    osha_action_level = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    exceeds_osha_limit = models.BooleanField(default=False)
    clinical_significance = models.CharField(max_length=200, blank=True)
    occupational_exposure = models.BooleanField(default=True)
    follow_up_required = models.BooleanField(default=False)
    follow_up_recommendation = models.TextField(blank=True)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Heavy Metals Test'
        verbose_name_plural = 'Heavy Metals Tests'
        ordering = ['-test_date']
    
    def __str__(self):
        return f"{self.get_heavy_metal_display()} test"
    
    def save(self, *args, **kwargs):
        if self.reference_upper and self.level_value:
            if self.level_value > self.reference_upper * Decimal('1.5'):
                self.status = 'critical'
            elif self.level_value > self.reference_upper:
                self.status = 'high'
            elif self.level_value > self.reference_upper * Decimal('0.8'):
                self.status = 'elevated'
            else:
                self.status = 'normal'
        if self.osha_action_level and self.level_value and self.level_value > self.osha_action_level:
            self.exceeds_osha_limit = True
        super().save(*args, **kwargs)


class DrugAlcoholScreening(models.Model):
    """Drug and alcohol screening test results"""
    
    TEST_TYPE_CHOICES = [('urine', 'Urine'), ('breath', 'Breath'), ('blood', 'Blood'), ('oral_fluid', 'Oral Fluid')]
    RESULT_CHOICES = [('negative', 'Negative'), ('positive', 'Positive'), ('presumptive', 'Presumptive'), ('invalid', 'Invalid')]
    
    examination = models.OneToOneField(MedicalExamination, on_delete=models.CASCADE, related_name='drug_alcohol_screening')
    test_type = models.CharField(max_length=20, choices=TEST_TYPE_CHOICES)
    test_date = models.DateField()
    testing_facility = models.CharField(max_length=200, blank=True)
    collector = models.CharField(max_length=200, blank=True)
    alcohol_tested = models.BooleanField(default=True)
    alcohol_result = models.CharField(max_length=20, choices=RESULT_CHOICES, default='negative')
    alcohol_level = models.DecimalField(max_digits=5, decimal_places=3, null=True, blank=True)
    drug_tested = models.BooleanField(default=True)
    drug_result = models.CharField(max_length=20, choices=RESULT_CHOICES, default='negative')
    substances_tested = models.CharField(max_length=200, blank=True)
    specific_substances_detected = models.CharField(max_length=200, blank=True)
    confirmation_required = models.BooleanField(default=False)
    confirmation_date = models.DateField(null=True, blank=True)
    confirmation_result = models.CharField(max_length=20, choices=RESULT_CHOICES, null=True, blank=True)
    mro_reviewed = models.BooleanField(default=False)
    mro_name = models.CharField(max_length=200, blank=True)
    mro_comments = models.TextField(blank=True)
    fit_for_duty = models.BooleanField(default=True)
    restrictions = models.TextField(blank=True)
    chain_of_custody_verified = models.BooleanField(default=True)
    specimen_id = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Drug & Alcohol Screening'
        verbose_name_plural = 'Drug & Alcohol Screenings'
    
    def __str__(self):
        return f"Drug/Alcohol Screen"
    
    @property
    def overall_result(self):
        if self.alcohol_result == 'positive' or self.drug_result == 'positive':
            return 'positive'
        elif self.alcohol_result == 'presumptive' or self.drug_result == 'presumptive':
            return 'presumptive'
        return 'negative'


class FitnessCertificationDecision(models.Model):
    """Final fitness-for-duty certification decision"""
    
    FITNESS_STATUS_CHOICES = [('fit', 'Fit'), ('fit_with_restrictions', 'Fit with Restrictions'), ('temporarily_unfit', 'Temporarily Unfit'), ('permanently_unfit', 'Permanently Unfit')]
    DECISION_BASIS_CHOICES = [('medical_exam', 'Medical Exam'), ('test_results', 'Test Results'), ('xray', 'X-Ray'), ('drug_alcohol', 'Drug/Alcohol'), ('heavy_metals', 'Heavy Metals'), ('mental_health', 'Mental Health'), ('ergonomic', 'Ergonomic'), ('combination', 'Combination')]
    
    examinations = models.ForeignKey(MedicalExamination, on_delete=models.CASCADE, related_name='fitness_decisions')
    decision_date = models.DateField(auto_now_add=True)
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='fitness_decisions_reviewed')
    fitness_status = models.CharField(max_length=25, choices=FITNESS_STATUS_CHOICES)
    decision_basis = models.CharField(max_length=20, choices=DECISION_BASIS_CHOICES)
    key_findings = models.TextField()
    risk_factors = models.TextField(blank=True)
    work_restrictions = models.TextField(blank=True)
    required_accommodations = models.TextField(blank=True)
    recommended_interventions = models.TextField(blank=True)
    follow_up_required = models.BooleanField(default=False)
    follow_up_interval_months = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(36)])
    follow_up_justification = models.TextField(blank=True)
    certification_date = models.DateField()
    certification_valid_until = models.DateField()
    medical_fit = models.BooleanField(default=True)
    psychological_fit = models.BooleanField(default=True)
    safety_sensitive = models.BooleanField(default=False)
    subject_to_appeal = models.BooleanField(default=False)
    appeal_deadline = models.DateField(null=True, blank=True)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Fitness Certification Decision'
        verbose_name_plural = 'Fitness Certification Decisions'
        ordering = ['-certification_date']
    
    def __str__(self):
        return f"Fitness Decision"
    
    @property
    def is_valid(self):
        from datetime import date
        return date.today() <= self.certification_valid_until
    
    @property
    def days_until_expiry(self):
        from datetime import date
        if self.is_valid:
            return (self.certification_valid_until - date.today()).days
        return 0


class HealthScreening(models.Model):
    """Generic health screening for versatile occupational health assessments (ergonomic, mental, cardio, musculoskeletal)"""
    
    SCREENING_TYPE_CHOICES = [
        ('ergonomic', 'Ergonomic Assessment'),
        ('mental', 'Mental Health Screening'),
        ('cardio', 'Cardiovascular Risk Assessment'),
        ('msk', 'Musculoskeletal Screening'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('reviewed', 'Reviewed'),
        ('archived', 'Archived'),
    ]
    
    worker = models.ForeignKey(Worker, on_delete=models.CASCADE, related_name='health_screenings')
    screening_type = models.CharField(max_length=20, choices=SCREENING_TYPE_CHOICES)
    responses = models.JSONField(
        default=dict,
        help_text="Flexible JSON storage for screening responses"
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='completed')
    notes = models.TextField(blank=True)
    conducted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='health_screenings_conducted')
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='health_screenings_reviewed')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Health Screening'
        verbose_name_plural = 'Health Screenings'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['worker', 'screening_type']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.worker.first_name} - {self.get_screening_type_display()}"


# ==================== RISK ASSESSMENT EXTENDED MODELS ====================

class HierarchyOfControls(models.Model):
    """Hierarchy of Controls (HOC) recommendation engine for risk mitigation"""
    
    CONTROL_LEVEL_CHOICES = [(1, 'Elimination'), (2, 'Substitution'), (3, 'Engineering'), (4, 'Administrative'), (5, 'PPE')]
    STATUS_CHOICES = [('draft', 'Draft'), ('recommended', 'Recommended'), ('approved', 'Approved'), ('implemented', 'Implemented'), ('effective', 'Effective'), ('ineffective', 'Ineffective'), ('archived', 'Archived')]
    EFFECTIVENESS_CHOICES = [('excellent', 'Excellent'), ('good', 'Good'), ('fair', 'Fair'), ('poor', 'Poor'), ('unknown', 'Unknown')]
    
    hazard = models.ForeignKey(HazardIdentification, on_delete=models.CASCADE, related_name='hoc_recommendations')
    enterprise = models.ForeignKey(Enterprise, on_delete=models.CASCADE, related_name='hoc_recommendations')
    control_level = models.IntegerField(choices=CONTROL_LEVEL_CHOICES)
    control_name = models.CharField(max_length=200)
    description = models.TextField()
    implementation_requirements = models.TextField(blank=True)
    estimated_cost = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    estimated_timeline = models.CharField(max_length=100, blank=True)
    responsible_person = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='hoc_responsibilities')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='recommended')
    implementation_date = models.DateField(blank=True, null=True)
    effectiveness_rating = models.CharField(max_length=20, choices=EFFECTIVENESS_CHOICES, blank=True)
    effectiveness_notes = models.TextField(blank=True)
    risk_reduction_percentage = models.IntegerField(blank=True, null=True, validators=[MinValueValidator(0), MaxValueValidator(100)])
    residual_risk_score = models.IntegerField(blank=True, null=True, validators=[MinValueValidator(1), MaxValueValidator(100)])
    dependant_controls = models.ManyToManyField('self', symmetrical=False, blank=True, related_name='dependent_on')
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='hoc_created')
    
    class Meta:
        verbose_name = 'Hierarchy of Controls'
        verbose_name_plural = 'Hierarchy of Controls'
        ordering = ['control_level', '-created']
    
    def __str__(self):
        return f"{self.get_control_level_display()} - {self.control_name}"
    
    def is_effective(self):
        if self.status != 'implemented':
            return False
        return self.effectiveness_rating in ['excellent', 'good']


class RiskHeatmapData(models.Model):
    """Risk Heatmap visualization data - 5x5 probability/severity matrix"""
    
    PROBABILITY_LEVEL_CHOICES = [(1, 'Remote'), (2, 'Low'), (3, 'Medium'), (4, 'High'), (5, 'Very High')]
    SEVERITY_LEVEL_CHOICES = [(1, 'Negligible'), (2, 'Minor'), (3, 'Moderate'), (4, 'Severe'), (5, 'Catastrophic')]
    RISK_ZONE_CHOICES = [('green', 'Green'), ('yellow', 'Yellow'), ('orange', 'Orange'), ('red', 'Red')]
    TREND_CHOICES = [('improving', 'Improving'), ('stable', 'Stable'), ('worsening', 'Worsening')]
    PRIORITY_CHOICES = [('critical', 'Critical'), ('high', 'High'), ('medium', 'Medium'), ('low', 'Low')]
    
    enterprise = models.ForeignKey(Enterprise, on_delete=models.CASCADE, related_name='risk_heatmaps')
    heatmap_date = models.DateField(auto_now_add=True)
    period = models.CharField(max_length=50, blank=True)
    probability_level = models.IntegerField(choices=PROBABILITY_LEVEL_CHOICES)
    severity_level = models.IntegerField(choices=SEVERITY_LEVEL_CHOICES)
    risk_score = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(25)])
    risk_zone = models.CharField(max_length=20, choices=RISK_ZONE_CHOICES)
    hazards_count = models.IntegerField(default=0)
    related_hazards = models.ManyToManyField(HazardIdentification, related_name='heatmap_entries', blank=True)
    incidents_count = models.IntegerField(default=0)
    near_misses_count = models.IntegerField(default=0)
    workers_exposed = models.ManyToManyField(Worker, related_name='risk_heatmap_exposure', blank=True)
    workers_affected_count = models.IntegerField(default=0)
    controls_implemented = models.IntegerField(default=0)
    controls_effective_percentage = models.IntegerField(blank=True, null=True, validators=[MinValueValidator(0), MaxValueValidator(100)])
    previous_period_score = models.IntegerField(blank=True, null=True)
    trend = models.CharField(max_length=20, blank=True, choices=TREND_CHOICES)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    notes = models.TextField(blank=True)
    action_recommendations = models.TextField(blank=True)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='risk_heatmaps_created')
    
    class Meta:
        verbose_name = 'Risk Heatmap Data'
        verbose_name_plural = 'Risk Heatmap Data'
        ordering = ['-heatmap_date', '-risk_score']
    
    def __str__(self):
        return f"Risk {self.risk_score} ({self.risk_zone}) - {self.heatmap_date}"
    
    def save(self, *args, **kwargs):
        self.risk_score = self.probability_level * self.severity_level
        if self.risk_score <= 4:
            self.risk_zone = 'green'
            if not self.priority or self.priority == 'critical':
                self.priority = 'low'
        elif self.risk_score <= 10:
            self.risk_zone = 'yellow'
            if not self.priority or self.priority == 'critical':
                self.priority = 'medium'
        elif self.risk_score <= 20:
            self.risk_zone = 'orange'
            if not self.priority or self.priority == 'low':
                self.priority = 'high'
        else:
            self.risk_zone = 'red'
            self.priority = 'critical'
        super().save(*args, **kwargs)
    
    def get_trend_indicator(self):
        if not self.previous_period_score:
            return '—'
        if self.risk_score < self.previous_period_score:
            return '↓ Improving'
        elif self.risk_score > self.previous_period_score:
            return '↑ Worsening'
        else:
            return '→ Stable'


class RiskHeatmapReport(models.Model):
    """Aggregated risk heatmap report by enterprise and time period"""
    
    enterprise = models.ForeignKey(Enterprise, on_delete=models.CASCADE, related_name='risk_heatmap_reports')
    report_date = models.DateField(auto_now_add=True)
    period = models.CharField(max_length=50)
    total_heatmap_cells = models.IntegerField(default=25)
    critical_cells = models.IntegerField()
    high_risk_cells = models.IntegerField()
    medium_risk_cells = models.IntegerField()
    low_risk_cells = models.IntegerField()
    average_risk_score = models.DecimalField(max_digits=5, decimal_places=2)
    highest_risk_score = models.IntegerField()
    lowest_risk_score = models.IntegerField()
    total_workers_exposed = models.IntegerField()
    workers_in_critical_zones = models.IntegerField()
    incidents_this_period = models.IntegerField()
    incidents_last_period = models.IntegerField()
    incident_trend = models.CharField(max_length=20, choices=[('up', 'Up'), ('down', 'Down'), ('stable', 'Stable')])
    total_controls = models.IntegerField()
    effective_controls = models.IntegerField()
    ineffective_controls = models.IntegerField()
    control_effectiveness_percentage = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(100)])
    critical_actions_required = models.IntegerField()
    action_items = models.TextField(blank=True)
    created = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='risk_heatmap_reports_created')
    
    class Meta:
        verbose_name = 'Risk Heatmap Report'
        verbose_name_plural = 'Risk Heatmap Reports'
        ordering = ['-report_date']
    
    def __str__(self):
        return f"{self.enterprise.name} - {self.period}"
    
    @property
    def heatmap_html_matrix(self):
        matrix = []
        for severity in range(5, 0, -1):
            row = []
            for probability in range(1, 6):
                score = probability * severity
                row.append({'probability': probability, 'severity': severity, 'score': score})
            matrix.append(row)
        return matrix


# ==================== MEDICAL CONSULTATION MODELS ====================

class OccConsultation(models.Model):
    """
    Occupational health consultation model linking worker, doctor, and medical examination.
    Tracks the consultation lifecycle from intake to examination to fitness decision.
    """
    
    STATUS_CHOICES = [
        ('waiting', _('En Attente')),  # Patient is in waiting room, assigned to doctor
        ('in_consultation', _('En Consultation')),  # Doctor is currently consulting
        ('completed', _('Terminée')),  # Consultation finished
        ('archived', _('Archivée')),  # Old record
    ]
    
    FITNESS_CHOICES = [
        ('fit', _('Apte')),
        ('fit_with_restrictions', _('Apte avec Restrictions')),
        ('temporarily_unfit', _('Inapte Temporaire')),
        ('permanently_unfit', _('Inapte Définitif')),
        ('pending', _('En Attente d\'Évaluation')),
    ]
    
    # Identifiers
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    consultation_number = models.CharField(_("Numéro Consultation"), max_length=50, unique=True)
    
    # Core relationships
    worker = models.ForeignKey(
        Worker,
        on_delete=models.CASCADE,
        related_name='occupational_consultations',
        verbose_name=_("Travailleur")
    )
    doctor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='occupational_consultations',
        limit_choices_to={'groups__name': 'Doctors'},
        verbose_name=_("Médecin Assigné")
    )
    
    # Consultation details
    visit_type = models.CharField(
        _("Type de Visite"),
        max_length=30,
        choices=VISIT_TYPE_CHOICES,
        default='periodic'
    )
    exam_type = models.CharField(
        _("Type Examen"),
        max_length=50,
        blank=True,
        help_text=_("Ex: periodic, pre_employment, post_incident, etc.")
    )
    
    # Vitals captured at intake
    vitals = models.JSONField(
        _("Signes Vitaux"),
        default=dict,
        blank=True,
        help_text=_("Height, weight, BP, temperature, O2 sat, etc.")
    )
    
    # Consultation workflow
    status = models.CharField(
        _("Statut"),
        max_length=30,
        choices=STATUS_CHOICES,
        default='waiting'
    )
    
    # Medical notes and findings
    chief_complaint = models.TextField(_("Motif Principal"), blank=True)
    medical_history = models.TextField(_("Antécédents Médicaux"), blank=True)
    physical_examination_findings = models.TextField(_("Résultats Examen Physique"), blank=True)
    
    # Exams ordered
    exams_ordered = models.JSONField(
        _("Examens Commandés"),
        default=list,
        blank=True,
        help_text=_("List of exam codes ordered during consultation")
    )
    
    # Fitness decision
    fitness_status = models.CharField(
        _("Statut Aptitude"),
        max_length=30,
        choices=FITNESS_CHOICES,
        default='pending'
    )
    fitness_decision_notes = models.TextField(
        _("Notes Décision Aptitude"),
        blank=True,
        help_text=_("Reason for fitness decision, restrictions, recommendations")
    )
    
    # Restrictions if applicable
    restrictions = models.JSONField(
        _("Restrictions"),
        default=list,
        blank=True,
        help_text=_("List of job restrictions if fit_with_restrictions")
    )
    
    # Certificate validity
    certificate_valid_from = models.DateField(_("Certificat Valide À Partir De"), null=True, blank=True)
    certificate_valid_until = models.DateField(_("Certificat Valide Jusqu'au"), null=True, blank=True)
    certificate_issued = models.BooleanField(_("Certificat Émis"), default=False)
    
    # Follow-up
    followup_required = models.BooleanField(_("Suivi Requis"), default=False)
    followup_reason = models.TextField(_("Raison Suivi"), blank=True)
    followup_date = models.DateField(_("Date Suivi Prévue"), null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(_("Créé"), auto_now_add=True)
    started_at = models.DateTimeField(_("Démarré"), null=True, blank=True)
    completed_at = models.DateTimeField(_("Terminé"), null=True, blank=True)
    updated_at = models.DateTimeField(_("Mis à Jour"), auto_now=True)
    
    # Audit
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='consultations_created',
        verbose_name=_("Créé Par")
    )
    
    class Meta:
        verbose_name = _("Consultation Santé Travail")
        verbose_name_plural = _("Consultations Santé Travail")
        ordering = ['-created_at']
        index_together = [
            ['worker', 'status'],
            ['doctor', 'status'],
            ['created_at'],
        ]
    
    def __str__(self):
        return f"[{self.consultation_number}] {self.worker.full_name} - {self.get_status_display()}"
    
    def save(self, *args, **kwargs):
        """Auto-generate consultation number if not set"""
        if not self.consultation_number:
            # Format: CONS-YYYYMMDD-00001
            from django.utils import timezone
            date_str = timezone.now().strftime('%Y%m%d')
            count = OccConsultation.objects.filter(
                consultation_number__startswith=f'CONS-{date_str}'
            ).count() + 1
            self.consultation_number = f'CONS-{date_str}-{count:05d}'
        super().save(*args, **kwargs)
    
    @property
    def is_ongoing(self):
        """Check if consultation is currently active"""
        return self.status == 'in_consultation'
    
    @property
    def is_waiting(self):
        """Check if consultation is in waiting room"""
        return self.status == 'waiting'
    
    @property
    def is_completed(self):
        """Check if consultation is done"""
        return self.status == 'completed'
    
    def assign_to_doctor(self, doctor_user):
        """Assign this consultation to a doctor"""
        self.doctor = doctor_user
        self.status = 'waiting'
        self.save()
    
    def start_consultation(self):
        """Mark consultation as started"""
        from django.utils import timezone
        self.status = 'in_consultation'
        self.started_at = timezone.now()
        self.save()
    
    def complete_consultation(self, fitness_status, notes=''):
        """Mark consultation as completed"""
        from django.utils import timezone
        self.status = 'completed'
        self.completed_at = timezone.now()
        self.fitness_status = fitness_status
        if notes:
            self.fitness_decision_notes = notes
        self.save()


# ==================== ISO 27001 MODELS ====================
# Import ISO 27001 Information Security Management models
from .models_iso27001 import (
    AuditLog,
    AccessControl,
    SecurityIncident,
    VulnerabilityRecord,
    AccessRequest,
    DataRetentionPolicy,
    EncryptionKeyRecord,
    ComplianceDashboard,
)

# ==================== SURVEILLANCE PROGRAMS MODELS ====================
# Import Surveillance Programs models for medical surveillance and compliance monitoring
from .models_surveillance import (
    SurveillanceProgram,
    SurveillanceEnrollment,
    ThresholdViolation,
    ComplianceMetrics,
)

# ==================== ISO 27001 MODELS ====================
# Import ISO 27001 Information Security Management models
from .models_iso27001 import (
    AuditLog,
    AccessControl,
    SecurityIncident,
    VulnerabilityRecord,
    AccessRequest,
    DataRetentionPolicy,
    EncryptionKeyRecord,
    ComplianceDashboard,
)

# ==================== ISO 45001 MODELS ====================
# Import ISO 45001 Occupational Health & Safety Management models
from .models_iso45001 import (
    OHSPolicy,
    HazardRegister,
    IncidentInvestigation,
    SafetyTraining,
    TrainingCertification,
    EmergencyProcedure,
    EmergencyDrill,
    HealthSurveillance,
    PerformanceIndicator,
    ComplianceAudit,
    ContractorQualification,
    ManagementReview,
    WorkerFeedback,
)
