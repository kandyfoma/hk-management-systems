"""
Surveillance Programs Models - Multi-sector Compliance Monitoring

Models for continuous medical surveillance programs with threshold monitoring
and compliance tracking for occupational health management.

Standards: ISO 45001:2018, ILO C155/C161/C187, ILO R194
"""

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from decimal import Decimal

User = get_user_model()


class SurveillanceProgram(models.Model):
    """
    Surveillance Program Definition
    
    Defines a specific ongoing medical surveillance program for workers
    in particular sectors/diseases with defined screening intervals and
    threshold action levels.
    """
    
    PROGRAM_STATUS_CHOICES = [
        ('draft', _('Brouillon')),
        ('active', _('Actif')),
        ('paused', _('Suspendu')),
        ('archived', _('Archivé')),
    ]
    
    SECTOR_CHOICES = [
        ('mining', _('Minier')),
        ('construction', _('Construction')),
        ('manufacturing', _('Fabrication')),
        ('healthcare', _('Santé')),
        ('agriculture', _('Agriculture')),
        ('oil_gas', _('Pétrole & Gaz')),
        ('transport', _('Transport')),
        ('other', _('Autre')),
    ]
    
    RISK_GROUP_CHOICES = [
        ('respiratory_exposed', _('Exposition Respiratoire')),
        ('noise_exposed', _('Exposition Bruit')),
        ('chemical_exposed', _('Exposition Chimique')),
        ('heavy_metals', _('Métaux Lourds')),
        ('night_workers', _('Travail de Nuit')),
        ('all_workers', _('Tous les Travailleurs')),
        ('high_risk', _('Risque Élevé')),
    ]
    
    # Basic Info
    id = models.AutoField(primary_key=True)
    name = models.CharField(
        _("Nom Programme"), max_length=200, unique=True,
        help_text=_("Ex: Surveillance Respiratoire - Miniers")
    )
    code = models.CharField(
        _("Code"), max_length=50, unique=True,
        help_text=_("Code unique, ex: SURV_RESP_MIN")
    )
    description = models.TextField(_("Description"), blank=True)
    
    # Program Scope
    enterprise = models.ForeignKey(
        'occupational_health.Enterprise',
        on_delete=models.CASCADE,
        related_name='surveillance_programs'
    )
    sector = models.CharField(_("Secteur"), max_length=50, choices=SECTOR_CHOICES)
    target_risk_group = models.CharField(
        _("Groupe Risque Cible"), max_length=50, choices=RISK_GROUP_CHOICES
    )
    
    # Screening Details
    required_screenings = models.JSONField(
        _("Examens Requis"), default=list,
        help_text=_("Liste des types examen: ex: ['spirometry', 'audiometry']")
    )
    screening_interval_months = models.PositiveIntegerField(
        _("Intervalle Dépistage (mois)"), default=12,
        validators=[MinValueValidator(1), MaxValueValidator(60)]
    )
    
    # Action Levels / Thresholds
    action_levels = models.JSONField(
        _("Niveaux d'Action"), default=dict,
        help_text=_("Dictionnaire des seuils: {parameter: {warning: X, action: Y, critical: Z}}")
    )
    
    # Status & Dates
    is_active = models.BooleanField(_("Actif"), default=True)
    status = models.CharField(
        _("Statut"), max_length=20, choices=PROGRAM_STATUS_CHOICES, default='active'
    )
    start_date = models.DateField(_("Date Début"), auto_now_add=True)
    end_date = models.DateField(_("Date Fin"), null=True, blank=True)
    
    # Regulatory
    regulatory_reference = models.CharField(
        _("Référence Réglementaire"), max_length=200, blank=True,
        help_text=_("Ex: Code Minier RDC Art. 123")
    )
    compliance_standard = models.CharField(
        _("Standard Conformité"), max_length=100, blank=True,
        help_text=_("Ex: ISO 45001:2018, ILO C155")
    )
    
    # Audit
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True,
        related_name='surveillance_programs_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Programme Surveillance")
        verbose_name_plural = _("Programmes Surveillance")
        ordering = ['enterprise', 'sector']
    
    def __str__(self):
        return f"{self.name} ({self.enterprise.name})"
    
    @property
    def enrolled_workers_count(self):
        """Get count of enrolled workers"""
        return self.enrollments.filter(is_active=True).count()
    
    @property
    def overdue_screenings_count(self):
        """Get count of workers with overdue screenings"""
        from django.utils import timezone
        today = timezone.now().date()
        return self.enrollments.filter(
            is_active=True,
            next_screening_due__lt=today
        ).count()


class SurveillanceEnrollment(models.Model):
    """
    Worker Enrollment in Surveillance Program
    
    Tracks individual worker enrollment in a specific surveillance program
    with their screening history and compliance status.
    """
    
    COMPLIANCE_STATUS_CHOICES = [
        ('compliant', _('Conforme')),
        ('overdue', _('En Retard')),
        ('non_compliant', _('Non-Conforme')),
        ('pending', _('En Attente')),
    ]
    
    # Relationships
    program = models.ForeignKey(
        SurveillanceProgram,
        on_delete=models.CASCADE,
        related_name='enrollments'
    )
    worker = models.ForeignKey(
        'occupational_health.Worker',
        on_delete=models.CASCADE,
        related_name='surveillance_enrollments'
    )
    
    # Enrollment Details
    enrollment_date = models.DateField(_("Date Inscription"), auto_now_add=True)
    reason_for_enrollment = models.CharField(
        _("Raison Inscription"), max_length=200, blank=True,
        help_text=_("Ex: Nouvelle affectation, exposition détectée")
    )
    
    # Screening Schedule
    first_screening_date = models.DateField(
        _("Date Premier Dépistage"), null=True, blank=True
    )
    last_screening_date = models.DateField(
        _("Dernier Dépistage"), null=True, blank=True
    )
    next_screening_due = models.DateField(
        _("Prochain Dépistage Dû"), null=True, blank=True
    )
    
    # Compliance
    compliance_status = models.CharField(
        _("Statut Conformité"), max_length=20,
        choices=COMPLIANCE_STATUS_CHOICES, default='pending'
    )
    screenings_completed = models.PositiveIntegerField(
        _("Dépistages Complétés"), default=0
    )
    screenings_missed = models.PositiveIntegerField(
        _("Dépistages Manqués"), default=0
    )
    compliance_rate = models.DecimalField(
        _("Taux Conformité (%)"), max_digits=5, decimal_places=2,
        default=0, validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    
    # Status
    is_active = models.BooleanField(_("Actif"), default=True)
    unenrollment_date = models.DateField(_("Date Désinscription"), null=True, blank=True)
    unenrollment_reason = models.CharField(
        _("Raison Désinscription"), max_length=200, blank=True
    )
    
    # Notes
    clinical_notes = models.TextField(_("Notes Cliniques"), blank=True)
    action_taken = models.TextField(_("Action Prise"), blank=True)
    
    # Audit
    enrolled_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='worker_enrollments'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Inscription Surveillance")
        verbose_name_plural = _("Inscriptions Surveillance")
        unique_together = ['program', 'worker']
        ordering = ['-enrollment_date']
    
    def __str__(self):
        return f"{self.worker.full_name} - {self.program.name}"
    
    @property
    def is_overdue(self):
        """Check if screening is overdue"""
        if not self.next_screening_due:
            return False
        return timezone.now().date() > self.next_screening_due
    
    @property
    def days_overdue(self):
        """Get days overdue"""
        if not self.is_overdue:
            return 0
        delta = timezone.now().date() - self.next_screening_due
        return delta.days
    
    def mark_screening_completed(self):
        """Record completed screening"""
        self.screenings_completed += 1
        self.last_screening_date = timezone.now().date()
        self.next_screening_due = (
            timezone.now() + timezone.timedelta(days=30 * self.program.screening_interval_months)
        ).date()
        self.compliance_status = 'compliant'
        self.update_compliance_rate()
        self.save()
    
    def update_compliance_rate(self):
        """Update compliance percentage"""
        total = self.screenings_completed + self.screenings_missed
        if total == 0:
            self.compliance_rate = 0
        else:
            self.compliance_rate = Decimal(self.screenings_completed) / Decimal(total) * 100


class ThresholdViolation(models.Model):
    """
    Threshold Violation Record
    
    Automatically created when exam results violate program thresholds.
    Tracks violations across all workers and programs for compliance
    monitoring and alert management.
    """
    
    SEVERITY_CHOICES = [
        ('warning', _('Avertissement')),
        ('action', _('Action Requise')),
        ('critical', _('Critique')),
    ]
    
    STATUS_CHOICES = [
        ('open', _('Ouvert')),
        ('acknowledged', _('Reconnu')),
        ('in_progress', _('En Cours')),
        ('resolved', _('Résolu')),
        ('invalid', _('Non Valide')),
    ]
    
    # Related Objects
    enrollment = models.ForeignKey(
        SurveillanceEnrollment,
        on_delete=models.CASCADE,
        related_name='violations'
    )
    program = models.ForeignKey(
        SurveillanceProgram,
        on_delete=models.CASCADE,
        related_name='violations'
    )
    worker = models.ForeignKey(
        'occupational_health.Worker',
        on_delete=models.CASCADE,
        related_name='threshold_violations'
    )
    related_exam = models.ForeignKey(
        'occupational_health.MedicalExamination',
        on_delete=models.SET_NULL, null=True, blank=True,
        related_name='threshold_violations'
    )
    
    # Violation Details
    violation_date = models.DateTimeField(_("Date Violation"), auto_now_add=True)
    parameter_tested = models.CharField(
        _("Paramètre"), max_length=200,
        help_text=_("Ex: FEV1 (Spirometry), Lead (Blood)")
    )
    measured_value = models.DecimalField(
        _("Valeur Mesurée"), max_digits=10, decimal_places=4
    )
    unit_of_measurement = models.CharField(_("Unité"), max_length=50)
    threshold_value = models.DecimalField(
        _("Seuil"), max_digits=10, decimal_places=4
    )
    threshold_type = models.CharField(
        _("Type Seuil"), max_length=50,
        choices=[('warning', 'Warning'), ('action', 'Action'), ('critical', 'Critical')]
    )
    percentage_above_threshold = models.DecimalField(
        _("% Au-dessus des Seuils"), max_digits=5, decimal_places=2, default=0
    )
    
    # Severity & Status
    severity = models.CharField(
        _("Sévérité"), max_length=20, choices=SEVERITY_CHOICES, default='warning'
    )
    status = models.CharField(
        _("Statut"), max_length=20, choices=STATUS_CHOICES, default='open'
    )
    
    # Actions Required
    action_required = models.TextField(
        _("Action Requise"), blank=True,
        help_text=_("Recommandation d'action: ex: Référer à spécialiste")
    )
    recommended_followup = models.CharField(
        _("Suivi Recommandé"), max_length=200, blank=True,
        help_text=_("Ex: Suivi à 1 mois, Restriction travail")
    )
    
    # Resolution
    resolution_date = models.DateTimeField(_("Date Résolution"), null=True, blank=True)
    resolution_notes = models.TextField(_("Notes de Résolution"), blank=True)
    resolved_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='violations_resolved'
    )
    
    # Acknowledgement
    acknowledged_date = models.DateTimeField(_("Date Reconnaissance"), null=True, blank=True)
    acknowledged_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='violations_acknowledged'
    )
    
    # Compliance
    regulatory_filing_required = models.BooleanField(
        _("Déclaration Réglementaire Requise"), default=False
    )
    filed_to_authorities = models.BooleanField(
        _("Déclaré aux Autorités"), default=False
    )
    filing_date = models.DateField(_("Date Déclaration"), null=True, blank=True)
    
    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Violation Seuil")
        verbose_name_plural = _("Violations Seuil")
        ordering = ['-violation_date']
        indexes = [
            models.Index(fields=['worker', '-violation_date']),
            models.Index(fields=['program', 'status']),
            models.Index(fields=['severity']),
        ]
    
    def __str__(self):
        return f"{self.worker.full_name} - {self.parameter_tested} ({self.severity})"
    
    @property
    def is_open(self):
        """Check if violation is still open"""
        return self.status in ['open', 'acknowledged', 'in_progress']
    
    @property
    def days_open(self):
        """Get days violation has been open"""
        resolution_dt = self.resolution_date or timezone.now()
        delta = resolution_dt - self.violation_date
        return delta.days
    
    def acknowledge(self, user):
        """Mark violation as acknowledged"""
        self.status = 'acknowledged'
        self.acknowledged_date = timezone.now()
        self.acknowledged_by = user
        self.save()
    
    def resolve(self, user, notes=''):
        """Mark violation as resolved"""
        self.status = 'resolved'
        self.resolution_date = timezone.now()
        self.resolved_by = user
        self.resolution_notes = notes
        self.save()
    
    def calculate_percentage_above_threshold(self):
        """Calculate how much measured value exceeds threshold"""
        if self.measured_value > self.threshold_value:
            diff = self.measured_value - self.threshold_value
            percentage = (diff / self.threshold_value) * 100
            self.percentage_above_threshold = Decimal(str(percentage))
            return percentage
        return 0


class ComplianceMetrics(models.Model):
    """
    Compliance Metrics Summary
    
    Aggregated metrics for surveillance program compliance across
    enterprise/sector for dashboard and reporting.
    """
    
    program = models.ForeignKey(
        SurveillanceProgram,
        on_delete=models.CASCADE,
        related_name='metrics'
    )
    
    # Metrics Date
    metrics_date = models.DateField(_("Date Métrique"), auto_now_add=True)
    period = models.CharField(_("Période"), max_length=50)  # e.g., "Feb 2026", "Q1 2026"
    
    # Enrollment Metrics
    total_workers_enrolled = models.PositiveIntegerField(
        _("Total Travailleurs Inscrits"), default=0
    )
    active_enrollments = models.PositiveIntegerField(
        _("Inscriptions Actives"), default=0
    )
    inactive_enrollments = models.PositiveIntegerField(
        _("Inscriptions Inactives"), default=0
    )
    
    # Screening Metrics
    screenings_due = models.PositiveIntegerField(
        _("Dépistages Dus"), default=0
    )
    screenings_completed = models.PositiveIntegerField(
        _("Dépistages Complétés"), default=0
    )
    screenings_pending = models.PositiveIntegerField(
        _("Dépistages En Attente"), default=0
    )
    screenings_overdue = models.PositiveIntegerField(
        _("Dépistages En Retard"), default=0
    )
    
    # Compliance Rate
    overall_compliance_rate = models.DecimalField(
        _("Taux Conformité Global (%)"), max_digits=5, decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    
    # Violations
    total_violations = models.PositiveIntegerField(
        _("Total Violations"), default=0
    )
    open_violations = models.PositiveIntegerField(
        _("Violations Ouvertes"), default=0
    )
    resolved_violations = models.PositiveIntegerField(
        _("Violations Résolues"), default=0
    )
    
    # Severity Breakdown
    warning_level_violations = models.PositiveIntegerField(
        _("Violations - Avertissement"), default=0
    )
    action_level_violations = models.PositiveIntegerField(
        _("Violations - Action"), default=0
    )
    critical_level_violations = models.PositiveIntegerField(
        _("Violations - Critique"), default=0
    )
    
    # Status Distribution
    compliant_workers = models.PositiveIntegerField(
        _("Travailleurs Conformes"), default=0
    )
    overdue_workers = models.PositiveIntegerField(
        _("Travailleurs En Retard"), default=0
    )
    non_compliant_workers = models.PositiveIntegerField(
        _("Travailleurs Non-Conformes"), default=0
    )
    pending_workers = models.PositiveIntegerField(
        _("Travailleurs En Attente"), default=0
    )
    
    # Trend Data
    compliance_rate_previous_period = models.DecimalField(
        _("Taux Conformité Période Précédente (%)"), max_digits=5, decimal_places=2,
        null=True, blank=True
    )
    compliance_trend = models.CharField(
        _("Tendance"), max_length=20,
        choices=[('improving', 'Improving'), ('stable', 'Stable'), ('declining', 'Declining')],
        blank=True
    )
    
    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Métrique de Conformité")
        verbose_name_plural = _("Métriques de Conformité")
        unique_together = ['program', 'metrics_date']
        ordering = ['-metrics_date']
    
    def __str__(self):
        return f"{self.program.name} - {self.period}"
    
    def calculate_compliance_trend(self):
        """Calculate trend from previous period"""
        if not self.compliance_rate_previous_period:
            return None
        
        diff = self.overall_compliance_rate - self.compliance_rate_previous_period
        if diff > 2:
            self.compliance_trend = 'improving'
        elif diff < -2:
            self.compliance_trend = 'declining'
        else:
            self.compliance_trend = 'stable'
        return self.compliance_trend
