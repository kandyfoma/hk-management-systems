"""
Occupational Health Signals - Automated Business Logic

Django signals for automated processing of occupational health data
including audit logging, exam scheduling, and business rule enforcement.
"""
from decimal import Decimal
import logging

from django.db.models.signals import post_save, post_delete, pre_save, m2m_changed
from django.dispatch import receiver
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger(__name__)

from .models import (
    Worker, MedicalExamination, VitalSigns, FitnessCertificate,
    WorkplaceIncident, OccupationalDisease,
    WorkerRiskProfile, HazardIdentification, ExposureReading, OverexposureAlert,
    RiskProfileAuditLog,
)

# ==================== WORKER SIGNALS ====================

@receiver(post_save, sender=Worker)
def update_worker_profile_on_save(sender, instance, created, **kwargs):
    """Update worker profile and schedule initial examination"""
    
    if created:
        # Set initial examination due date based on sector risk
        initial_exam_days = {
            'very_high': 30,    # Mining, Construction, Oil & Gas
            'high': 60,         # Manufacturing, Agriculture, Healthcare
            'moderate': 90,     # Hospitality, Retail 
            'low_moderate': 120, # Banking, IT, Education
            'low': 180          # Government
        }
        
        days = initial_exam_days.get(instance.sector_risk_level, 90)
        instance.next_exam_due = timezone.now().date() + timedelta(days=days)
        
        # Auto-assign PPE requirements based on sector and job
        instance.ppe_required = instance.get_required_ppe_for_job()
        
        # Save updates without triggering signal recursion
        Worker.objects.filter(id=instance.id).update(
            next_exam_due=instance.next_exam_due,
            ppe_required=instance.ppe_required
        )

# ==================== MEDICAL EXAMINATION SIGNALS ====================

@receiver(post_save, sender=MedicalExamination)
def process_completed_examination(sender, instance, created, **kwargs):
    """Process completed medical examinations"""
    
    if instance.examination_completed and not created:
        # Update worker's next exam due date
        if instance.exam_type == 'periodic':
            frequency_months = instance.worker.enterprise.exam_frequency_months
            next_exam_date = instance.exam_date + timedelta(days=frequency_months * 30)
            
            Worker.objects.filter(id=instance.worker.id).update(
                next_exam_due=next_exam_date
            )

@receiver(post_save, sender=VitalSigns)
def process_vital_signs_alerts(sender, instance, created, **kwargs):
    """Generate alerts for abnormal vital signs"""
    
    if created and instance.has_abnormal_vitals:
        # Log abnormal vitals for follow-up
        
        alerts = []
        
        # Blood pressure alerts
        if instance.systolic_bp >= 180 or instance.diastolic_bp >= 120:
            alerts.append("URGENT: Hypertensive crisis - immediate medical attention required")
        elif instance.systolic_bp >= 160 or instance.diastolic_bp >= 100:
            alerts.append("WARNING: Stage 2 hypertension detected")
        
        # Heart rate alerts
        if instance.heart_rate < 50:
            alerts.append("WARNING: Bradycardia detected")
        elif instance.heart_rate > 120:
            alerts.append("WARNING: Tachycardia detected")
        
        # BMI alerts
        bmi = instance.bmi
        if bmi and bmi >= 35:
            alerts.append("WARNING: Class II obesity - occupational impact assessment needed")
        elif bmi and bmi < 16:
            alerts.append("WARNING: Severe underweight - nutritional assessment needed")
        
        # High pain levels
        if instance.pain_scale >= 7:
            alerts.append("WARNING: Severe pain reported - work capacity assessment needed")
        
        # Store alerts in examination notes (simplified approach)
        if alerts:
            exam = instance.examination
            alert_text = "🚨 ALERTES SIGNES VITAUX:\n" + "\n".join(f"• {alert}" for alert in alerts)
            
            if exam.results_summary:
                exam.results_summary += f"\n\n{alert_text}"
            else:
                exam.results_summary = alert_text
                
            exam.save()

@receiver(post_save, sender=FitnessCertificate)
def update_worker_fitness_status(sender, instance, created, **kwargs):
    """Update worker's fitness status when certificate is issued"""
    
    if created or instance.is_active:
        # Update worker's current fitness status
        Worker.objects.filter(id=instance.examination.worker.id).update(
            current_fitness_status=instance.fitness_decision,
            fitness_restrictions=instance.restrictions
        )

@receiver(pre_save, sender=FitnessCertificate)
def validate_certificate_business_rules(sender, instance, **kwargs):
    """Validate fitness certificate business rules"""
    
    # Set validity period based on sector risk level
    if not instance.valid_until:
        worker = instance.examination.worker
        validity_months = worker.enterprise.exam_frequency_months
        instance.valid_until = instance.issue_date + timedelta(days=validity_months * 30)
    
    # Auto-deactivate other active certificates for same worker
    if instance.is_active:
        FitnessCertificate.objects.filter(
            examination__worker=instance.examination.worker,
            is_active=True
        ).exclude(id=instance.id).update(is_active=False)

# ==================== INCIDENT SIGNALS ====================

@receiver(post_save, sender=WorkplaceIncident) 
def process_incident_reporting(sender, instance, created, **kwargs):
    """Process incident for regulatory reporting requirements"""
    
    if created:
        # Determine if incident requires regulatory reporting
        reportable_categories = [
            'fatality', 'lost_time_injury', 'dangerous_occurrence', 
            'explosion', 'fire', 'chemical_spill'
        ]
        
        high_severity_reportable = instance.severity >= 4
        category_reportable = instance.category in reportable_categories
        
        if category_reportable or high_severity_reportable:
            WorkplaceIncident.objects.filter(id=instance.id).update(
                reportable_to_authorities=True
            )
    
    # Update worker fitness status if injured
    if instance.injured_workers.exists() and instance.work_days_lost > 0:
        # For significant injuries, may need fitness reassessment
        if instance.work_days_lost > 7:
            for worker in instance.injured_workers.all():
                # Schedule return-to-work examination
                if instance.return_to_work_date:
                    Worker.objects.filter(id=worker.id).update(
                        next_exam_due=instance.return_to_work_date,
                        current_fitness_status='pending_evaluation'
                    )

# ==================== OCCUPATIONAL DISEASE SIGNALS ====================

@receiver(post_save, sender=OccupationalDisease)
def process_occupational_disease(sender, instance, created, **kwargs):
    """Process occupational disease for reporting and worker status"""
    
    if created:
        # Update worker fitness status based on disease severity
        fitness_impact = {
            'mild': 'fit_with_restrictions',
            'moderate': 'fit_with_restrictions', 
            'severe': 'temporarily_unfit',
            'critical': 'permanently_unfit'
        }
        
        new_fitness = fitness_impact.get(instance.severity_level, 'fit_with_restrictions')
        
        Worker.objects.filter(id=instance.worker.id).update(
            current_fitness_status=new_fitness
        )
        
        # Flag for CNSS reporting if causal link established
        if instance.causal_determination in ['definite', 'probable']:
            OccupationalDisease.objects.filter(id=instance.id).update(
                reported_to_cnss=True,
                cnss_report_date=timezone.now().date()
            )

# ==================== AUDIT LOGGING SIGNALS ====================

@receiver(post_save, sender=Worker)
@receiver(post_save, sender=MedicalExamination)
@receiver(post_save, sender=WorkplaceIncident)
@receiver(post_save, sender=OccupationalDisease)
def log_occupational_health_changes(sender, instance, created, **kwargs):
    """Log significant changes for audit trail"""
    
    # This could integrate with a more comprehensive audit system
    # For now, it's a placeholder for audit logging functionality
    
    action = "created" if created else "updated"
    model_name = sender.__name__
    
    # Could log to external audit system, database table, or file
    # Example: AuditLog.objects.create(
    #     model=model_name,
    #     object_id=instance.id,
    #     action=action,
    #     user=getattr(instance, 'created_by', None),
    #     timestamp=timezone.now()
    # )
    
    pass  # Placeholder for actual audit implementation

# ==================== PERIODIC TASK SIGNALS ====================
# These would typically be handled by Celery tasks, but included here for completeness

def check_overdue_examinations():
    """Check for overdue medical examinations (would be a periodic task)"""
    
    overdue_workers = Worker.objects.filter(
        employment_status='active',
        next_exam_due__lt=timezone.now().date()
    )
    
    # Could send notifications, create tasks, etc.
    for worker in overdue_workers:
        # Placeholder for notification logic
        pass

def check_expiring_certificates():
    """Check for expiring fitness certificates (would be a periodic task)"""
    
    thirty_days = timezone.now().date() + timedelta(days=30)
    expiring_certs = FitnessCertificate.objects.filter(
        valid_until__lte=thirty_days,
        is_active=True
    )
    
    # Could send notifications to enterprises
    for cert in expiring_certs:
        # Placeholder for expiry notification logic
        pass

def generate_monthly_metrics():
    """Generate monthly health metrics (would be a periodic task)"""
    
    current_date = timezone.now().date()
    current_month_start = current_date.replace(day=1)
    
    # Auto-generate metrics for all active enterprises
    from .models import Enterprise, SiteHealthMetrics
    
    for enterprise in Enterprise.objects.filter(is_active=True):
        # Check if metrics already exist for current month
        if not SiteHealthMetrics.objects.filter(
            enterprise=enterprise,
            year=current_date.year,
            month=current_date.month
        ).exists():
            # Create placeholder metrics record
            # Actual calculation would be more comprehensive
            SiteHealthMetrics.objects.create(
                enterprise=enterprise,
                year=current_date.year,
                month=current_date.month,
                total_workers=enterprise.workers.filter(employment_status='active').count()
            )


# =============================================================================
# RISK PROFILE INTEGRATION — Three live integration links
#
# These signals connect HazardIdentification and ExposureReading to
# WorkerRiskProfile, making it a living, auto-updated document per ISO 45001.
#
# Architecture:
#   Link 1:  HazardIdentification (post_save / post_delete / m2m_changed)
#            → recalculate worker exposure_risk_score from approved hazards
#
#   Link 2:  ExposureReading (post_save / post_delete)
#            → recalculate worker exposure_risk_score from 12-month readings
#
#   Link 3:  WorkerRiskProfile score threshold
#            → auto-create / auto-resolve OverexposureAlert
#
# The core engine is _rebuild_exposure_score(worker) which:
#   - Pulls ALL approved hazards (direct + site-wide)
#   - Pulls ALL valid readings (personal + area) in a 12-month window
#   - Combines them into exposure_risk_score (capped at 100)
#   - Updates overall_risk_score and risk_level atomically via .update()
#     to prevent recursive signal loops
#   - Calls _check_risk_threshold_alert() to manage alerts
# =============================================================================

# ── Score contribution per hazard risk level ──────────────────────────────────
# Direct assignment (worker in workers_exposed)
_HAZARD_RISK_POINTS = {
    'critical': 25,
    'high':     15,
    'medium':    8,
    'low':       3,
}

# ── Score contribution per reading status (per reading, rolling 12 months) ───
_READING_STATUS_POINTS = {
    'exceeded': 10,
    'critical':  7,
    'warning':   3,
    'safe':      0,
}

# ── Risk level ordering for escalation comparison ────────────────────────────
_RISK_LEVEL_ORDER = ['low', 'moderate', 'high', 'critical']


# ─────────────────────────────────────────────────────────────────────────────
# Core Engine
# ─────────────────────────────────────────────────────────────────────────────

def _rebuild_exposure_score(worker):
    """
    Full recalculation of a single worker's exposure_risk_score from scratch.
    Called by hazard and exposure reading signals.

    Score = hazard_score (max 60) + reading_score (max 40) → cap 100

    Hazard score sources (Link 1):
      a) HazardIdentification where worker is in workers_exposed M2M
         — full weight
      b) HazardIdentification on the worker's work_site (area hazards)
         — 50% weight to avoid inflating personal vs shared risk
      Only status='approved' or 'implemented' hazards count.

    Reading score sources (Link 2):
      a) ExposureReading.worker = this worker (personal readings)
         — full weight
      b) ExposureReading.worker IS NULL & sampling_location contains
         worker's work_site name (area/environmental readings)
         — 40% weight (shared exposure)
      Only is_valid_measurement=True, rolling 12-month window.

    Edge cases:
      - Worker has no work_site → skip site-based lookups
      - WorkerRiskProfile doesn't exist → get_or_create
      - No hazards or readings → score = 0 (safe)
      - Deleted hazard/reading → rebuilds from remaining records only
      - Uses .update() (not .save()) to avoid recursive post_save loop
      - Gracefully swallowed exceptions so signal never breaks the request
    """
    # ── 1. Hazard-derived score ───────────────────────────────────────────────
    hazard_score = 0

    # 1a. Directly assigned hazards (full weight)
    direct_qry = HazardIdentification.objects.filter(
        workers_exposed=worker,
        status__in=('approved', 'implemented'),
    ).values_list('risk_level', flat=True)
    for risk_level in direct_qry:
        hazard_score += _HAZARD_RISK_POINTS.get(risk_level, 0)

    # 1b. Site-wide hazards (50% weight, not double-counted)
    if worker.work_site_id:
        site_qry = HazardIdentification.objects.filter(
            work_site=worker.work_site,
            status__in=('approved', 'implemented'),
        ).exclude(
            workers_exposed=worker,   # exclude already-counted direct ones
        ).values_list('risk_level', flat=True)
        for risk_level in site_qry:
            hazard_score += int(_HAZARD_RISK_POINTS.get(risk_level, 0) * 0.50)

    hazard_score = min(hazard_score, 60)  # cap at 60

    # ── 2. Exposure reading score (rolling 12 months) ─────────────────────────
    twelve_months_ago = timezone.now().date() - timedelta(days=365)
    reading_score = 0

    # 2a. Personal readings (full weight)
    personal_qry = ExposureReading.objects.filter(
        worker=worker,
        is_valid_measurement=True,
        measurement_date__gte=twelve_months_ago,
    ).values_list('status', flat=True)
    for status in personal_qry:
        reading_score += _READING_STATUS_POINTS.get(status, 0)

    # 2b. Area readings at worker's site (40% weight)
    if worker.work_site_id:
        site_name = worker.work_site.name.lower()
        area_qry = ExposureReading.objects.filter(
            worker__isnull=True,
            enterprise=worker.enterprise,
            is_valid_measurement=True,
            measurement_date__gte=twelve_months_ago,
        ).values_list('sampling_location', 'status')
        for loc, status in area_qry:
            if loc and site_name in loc.lower():
                reading_score += int(_READING_STATUS_POINTS.get(status, 0) * 0.40)

    reading_score = min(reading_score, 40)  # cap at 40

    # ── 3. Combined exposure score ────────────────────────────────────────────
    new_exposure_score = min(hazard_score + reading_score, 100)

    # ── 4. Get-or-create profile and update atomically ───────────────────────
    profile, created_now = WorkerRiskProfile.objects.get_or_create(
        worker=worker,
        defaults={
            'health_risk_score': 0,
            'exposure_risk_score': new_exposure_score,
            'compliance_risk_score': 0,
            'overall_risk_score': 0,
            'risk_level': 'low',
        },
    )

    if created_now:
        # Profile was just created — overall score not set yet, compute it
        new_overall = int(
            0 * 0.30              # health_risk_score = 0 on creation
            + new_exposure_score * 0.40
            + 0 * 0.30            # compliance_risk_score = 0 on creation
        )
    else:
        new_overall = int(
            profile.health_risk_score * 0.30
            + new_exposure_score * 0.40
            + profile.compliance_risk_score * 0.30
        )

    if new_overall < 25:
        new_risk_level = 'low'
    elif new_overall < 50:
        new_risk_level = 'moderate'
    elif new_overall < 75:
        new_risk_level = 'high'
    else:
        new_risk_level = 'critical'

    old_risk_level = profile.risk_level

    # Use .update() — NOT .save() — to avoid triggering post_save recursion
    WorkerRiskProfile.objects.filter(pk=profile.pk).update(
        exposure_risk_score=new_exposure_score,
        overall_risk_score=new_overall,
        risk_level=new_risk_level,
        last_calculated=timezone.now(),
    )
    profile.exposure_risk_score = new_exposure_score
    profile.overall_risk_score = new_overall
    profile.risk_level = new_risk_level

    # ── 5. Check if an alert should be created or resolved (Link 3) ───────────
    _check_risk_threshold_alert(profile, old_risk_level)


def _check_risk_threshold_alert(profile, old_level):
    """
    Auto-create or auto-resolve an OverexposureAlert based on the
    worker's aggregated risk profile score.

    Rules:
      • Score ≥ 75 → severity='critical'  alert (if none active)
      • Score ≥ 50 → severity='warning'   alert (if none active)
      • Score < 50 → resolve all active 'risk_profile_aggregated' alerts

    Escalation guard:
      Alert is only created when risk_level has actually INCREASED.
      Prevents spamming alerts when score fluctuates at the same level.

    Deduplication:
      Checks for existing active alert of type 'risk_profile_aggregated'
      before creating a new one.

    Resolution:
      When score drops below threshold, outstanding alerts are auto-resolved
      with an explanatory action_taken note.

    Never fires when score == 0 (initial/empty profile).
    """
    if profile.overall_risk_score == 0:
        return

    # Determine required alert severity for current score
    required_severity = None
    if profile.overall_risk_score >= 75:
        required_severity = 'critical'
    elif profile.overall_risk_score >= 50:
        required_severity = 'warning'

    if required_severity:
        # Only escalate — don't re-alert at same or lower level
        old_idx = _RISK_LEVEL_ORDER.index(old_level) if old_level in _RISK_LEVEL_ORDER else 0
        new_idx = _RISK_LEVEL_ORDER.index(profile.risk_level) if profile.risk_level in _RISK_LEVEL_ORDER else 0
        if new_idx <= old_idx:
            return  # no escalation — skip

        # Deduplication: do not create if an active risk-profile alert already exists
        already_active = OverexposureAlert.objects.filter(
            worker=profile.worker,
            exposure_type='risk_profile_aggregated',
            status='active',
        ).exists()

        if not already_active:
            OverexposureAlert.objects.create(
                worker=profile.worker,
                exposure_type='risk_profile_aggregated',
                exposure_level=Decimal(str(profile.overall_risk_score)),
                exposure_threshold=Decimal('50'),
                unit_measurement='score/100',
                severity=required_severity,
                status='active',
                medical_followup_required=(required_severity == 'critical'),
                medical_followup_date=(
                    timezone.now().date() + timedelta(days=7)
                    if required_severity == 'critical'
                    else timezone.now().date() + timedelta(days=30)
                ),
                recommended_action=(
                    f"Profil de risque global = {profile.overall_risk_score}/100 "
                    f"({profile.risk_level.upper()}). "
                    "Révision médicale obligatoire. "
                    "Contrôler et renforcer les mesures d'exposition en place."
                ),
            )
    else:
        # Score dropped below 50 — auto-resolve outstanding profile alerts
        OverexposureAlert.objects.filter(
            worker=profile.worker,
            exposure_type='risk_profile_aggregated',
            status='active',
        ).update(
            status='resolved',
            resolved_date=timezone.now(),
            action_taken=(
                f"Score de risque réduit à {profile.overall_risk_score}/100 — "
                "en dessous du seuil d'alerte (50). Résolution automatique."
            ),
        )


# ─────────────────────────────────────────────────────────────────────────────
# Link 1a — HazardIdentification post_save
# Fires when a hazard record is created or updated (e.g. status promoted to
# 'approved', probability changed, or workers_exposed cleared via form).
# ─────────────────────────────────────────────────────────────────────────────

@receiver(post_save, sender=HazardIdentification)
def on_hazard_saved(sender, instance, created, **kwargs):
    """
    Rebuild risk profiles for all workers linked to this hazard.

    Edge cases:
      • Only acts on approved/implemented status — drafts don't affect workers.
      • workers_exposed M2M is NOT populated yet on a brand-new record;
        actual worker assignments will come via m2m_changed (on_hazard_workers_changed).
        So on 'created', only work_site-based workers are updated here.
      • Status demotion (approved → draft) must also recalculate so workers
        lose the contribution. We always rebuild regardless of direction.
    """
    try:
        affected = []

        # Direct workers (M2M already set on updates)
        if not created:
            affected = list(instance.workers_exposed.all())

        # Site-wide workers (not already in direct list)
        if instance.work_site_id:
            direct_ids = {w.id for w in affected}
            site_workers = Worker.objects.filter(
                work_site=instance.work_site,
                employment_status='active',
            ).exclude(id__in=direct_ids)
            affected.extend(site_workers)

        for worker in affected:
            _rebuild_exposure_score(worker)
    except Exception:
        pass  # Never let a signal crash the main request


@receiver(post_delete, sender=HazardIdentification)
def on_hazard_deleted(sender, instance, **kwargs):
    """
    Recalculate when a hazard is deleted.
    Workers lose its contribution so scores should drop.

    Edge case: M2M through-table rows are deleted before post_delete fires,
    so workers_exposed queryset may be empty here.
    We rely on work_site to find affected workers.
    """
    try:
        if instance.work_site_id:
            for worker in Worker.objects.filter(
                work_site=instance.work_site,
                employment_status='active',
            ):
                _rebuild_exposure_score(worker)
    except Exception:
        pass


# ─────────────────────────────────────────────────────────────────────────────
# Link 1b — HazardIdentification.workers_exposed M2M
# Fires when workers are explicitly added to or removed from a hazard.
# This is the primary path for direct worker-hazard assignment.
# ─────────────────────────────────────────────────────────────────────────────

@receiver(m2m_changed, sender=HazardIdentification.workers_exposed.through)
def on_hazard_workers_changed(sender, instance, action, pk_set, model, **kwargs):
    """
    Fired when HazardIdentification.workers_exposed is modified.

    Actions handled:
      post_add    — workers newly assigned → rebuild their profiles
      post_remove — workers removed from this hazard → rebuild (score may drop)
      post_clear  — all workers removed → rebuild site-based workers

    Edge cases:
      • instance is always a HazardIdentification here (sender is the through model).
      • pk_set is None on post_clear.
      • Workers may be inactive (terminated) — still rebuild so score is accurate.
      • Hazard may be in 'draft' status — _rebuild_exposure_score ignores drafts
        when re-querying, so score correctly won't include it.
    """
    if action not in ('post_add', 'post_remove', 'post_clear'):
        return
    try:
        if action == 'post_clear':
            # All workers removed; update site-based workers so they still reflect
            # other hazards correctly (their score from this hazard is now gone)
            if instance.work_site_id:
                for worker in Worker.objects.filter(
                    work_site=instance.work_site,
                    employment_status='active',
                ):
                    _rebuild_exposure_score(worker)
        elif pk_set:
            for worker in Worker.objects.filter(pk__in=pk_set):
                _rebuild_exposure_score(worker)
    except Exception:
        pass


# ─────────────────────────────────────────────────────────────────────────────
# Link 2 — ExposureReading post_save and post_delete
# Fires when a measurement is recorded, updated, or deleted.
# ─────────────────────────────────────────────────────────────────────────────

@receiver(post_save, sender=ExposureReading)
def on_exposure_reading_saved(sender, instance, **kwargs):
    """
    Recalculate worker's exposure risk score after a reading is saved.

    Edge cases:
      • is_valid_measurement=False → skip entirely (equipment fault, invalid run)
      • worker is null → area reading → find all workers whose work_site name
        appears in sampling_location for this enterprise
      • Reading status changed (e.g. exceeded → safe after correction) → full
        rebuild from scratch, not incremental delta
      • Circular save guard: ExposureReading.save() may call
        _create_overexposure_alert() which calls ExposureReading.objects.filter(...)
        .update(...). That update does NOT retrigger post_save, so no loop.
      • Bulk creates via loaddata/fixtures fire post_save per-row — handled fine.
    """
    if not instance.is_valid_measurement:
        return
    try:
        if instance.worker_id:
            _rebuild_exposure_score(instance.worker)
        elif instance.enterprise_id:
            # Area reading — rebuild workers whose site matches sampling_location
            loc_lower = (instance.sampling_location or '').lower()
            for worker in Worker.objects.filter(
                enterprise=instance.enterprise,
                employment_status='active',
                work_site__isnull=False,
            ).select_related('work_site'):
                if worker.work_site.name.lower() in loc_lower:
                    _rebuild_exposure_score(worker)
    except Exception:
        pass


@receiver(post_delete, sender=ExposureReading)
def on_exposure_reading_deleted(sender, instance, **kwargs):
    """
    Recalculate when a reading is deleted.
    A deleted exceeded/critical reading should cause the score to drop.

    Edge case: worker FK may already be null if the Worker was deleted first
    (CASCADE). Guard with worker_id check.
    """
    try:
        if instance.worker_id:
            # Fetch fresh worker object (might be partially detached post-delete)
            try:
                worker = Worker.objects.get(pk=instance.worker_id)
                _rebuild_exposure_score(worker)
            except Worker.DoesNotExist:
                pass  # Worker was also deleted — nothing to update
    except Exception:
        pass


# ==================== RISK PROFILE AUTO-RECALCULATION SIGNALS ====================
# These signals automatically trigger health & compliance score recalculation
# when relevant events occur (exams, fitness certs, incidents, diseases)

def _log_risk_profile_change(profile, action, trigger_type, trigger_id, 
                             before_scores, after_scores, actor=None,
                             reason='', notes='', ip_address=None):
    """
    Log a risk profile change to audit trail
    
    before_scores & after_scores are dicts with keys:
      'health_risk_score', 'exposure_risk_score', 'compliance_risk_score',
      'overall_risk_score', 'risk_level'
    """
    try:
        RiskProfileAuditLog.objects.create(
            worker_risk_profile=profile,
            worker=profile.worker,
            action=action,
            trigger_type=trigger_type,
            trigger_id=trigger_id,
            health_risk_before=before_scores.get('health_risk_score', 0),
            health_risk_after=after_scores.get('health_risk_score', 0),
            exposure_risk_before=before_scores.get('exposure_risk_score', 0),
            exposure_risk_after=after_scores.get('exposure_risk_score', 0),
            compliance_risk_before=before_scores.get('compliance_risk_score', 0),
            compliance_risk_after=after_scores.get('compliance_risk_score', 0),
            overall_risk_before=before_scores.get('overall_risk_score', 0),
            overall_risk_after=after_scores.get('overall_risk_score', 0),
            risk_level_before=before_scores.get('risk_level', ''),
            risk_level_after=after_scores.get('risk_level', ''),
            actor=actor,
            actor_name=actor.get_full_name() if actor else 'System',
            reason_for_change=reason,
            notes=notes,
            ip_address=ip_address,
            is_automatic=True,
        )
    except Exception as e:
        pass  # Don't break request if audit logging fails


def _recalculate_health_risk(worker):
    """Recalculate health risk score based on worker health data"""
    from datetime import date as date_type
    
    score = 0
    
    # Age factor
    if worker.age < 25:
        score += 10
    elif worker.age < 35:
        score += 15
    elif worker.age < 45:
        score += 20
    elif worker.age < 55:
        score += 30
    else:
        score += 40
    
    # Fitness status
    if worker.current_fitness_status == 'permanently_unfit':
        score += 35
    elif worker.current_fitness_status == 'temporarily_unfit':
        score += 25
    elif worker.current_fitness_status == 'fit_with_restrictions':
        score += 15
    
    # Medical conditions
    if worker.chronic_conditions:
        score += 15
    
    # Allergies
    if worker.allergies and worker.allergies.upper() != 'NONE':
        score += 5
    
    return min(score, 100)


def _recalculate_compliance_risk(worker):
    """Recalculate compliance risk score based on incidents, exams, diseases"""
    from datetime import date as date_type, timedelta
    
    score = 0
    
    # Overdue examinations
    if worker.next_exam_due and worker.next_exam_due < date_type.today():
        days_overdue = (date_type.today() - worker.next_exam_due).days
        score += min(days_overdue, 30)
    
    # Incident history (last 12 months)
    twelve_months_ago = date_type.today() - timedelta(days=365)
    try:
        incidents_12m = WorkplaceIncident.objects.filter(
            injured_workers=worker,
            incident_date__gte=twelve_months_ago
        ).count()
        score += min(incidents_12m * 10, 30)
    except:
        pass
    
    # Occupational diseases (active or chronic)
    try:
        diseases = OccupationalDisease.objects.filter(
            worker=worker,
            case_status__in=['active', 'chronic']
        ).count()
        score += min(diseases * 15, 25)
    except:
        pass
    
    return min(score, 100)


def _update_risk_profile_and_log(worker, trigger_type, trigger_id, reason=''):
    """
    Update health and compliance scores for a worker, and log the change
    """
    try:
        profile, created = WorkerRiskProfile.objects.get_or_create(worker=worker)
        
        # Snapshot before
        before = {
            'health_risk_score': profile.health_risk_score,
            'exposure_risk_score': profile.exposure_risk_score,
            'compliance_risk_score': profile.compliance_risk_score,
            'overall_risk_score': profile.overall_risk_score,
            'risk_level': profile.risk_level,
        }
        
        # Recalculate health and compliance
        health_score = _recalculate_health_risk(worker)
        compliance_score = _recalculate_compliance_risk(worker)
        
        # Update profile
        profile.health_risk_score = health_score
        profile.compliance_risk_score = compliance_score
        
        # Recalculate overall risk (keep exposure score)
        profile.calculate_overall_risk()
        
        # Snapshot after
        after = {
            'health_risk_score': profile.health_risk_score,
            'exposure_risk_score': profile.exposure_risk_score,
            'compliance_risk_score': profile.compliance_risk_score,
            'overall_risk_score': profile.overall_risk_score,
            'risk_level': profile.risk_level,
        }
        
        # Log the change
        action = 'calculated' if created else 'recalculated'
        _log_risk_profile_change(
            profile, 
            action=action,
            trigger_type=trigger_type,
            trigger_id=trigger_id,
            before_scores=before,
            after_scores=after,
            reason=reason,
        )
        
    except Exception:
        pass  # Silently continue if audit logging fails


# ==================== MEDICAL EXAMINATION AUTO-TRIGGER ====================

@receiver(post_save, sender=MedicalExamination)
def trigger_health_risk_on_exam(sender, instance, created, **kwargs):
    """
    Recalculate health risk score when a medical examination is created/updated.
    Medical exams can reveal new chronic conditions or fitness restrictions.
    """
    try:
        if instance.worker:
            reason = f"Medical examination #{instance.id} - {instance.examination_type}"
            _update_risk_profile_and_log(
                instance.worker,
                trigger_type='medical_examination',
                trigger_id=instance.id,
                reason=reason,
            )
    except Exception:
        pass


# ==================== FITNESS CERTIFICATE AUTO-TRIGGER ====================

@receiver(post_save, sender=FitnessCertificate)
def trigger_health_risk_on_fitness(sender, instance, created, **kwargs):
    """
    Recalculate health risk score when fitness certificate is created/updated.
    Fitness changes directly impact the health risk calculation.
    """
    try:
        if instance.worker:
            reason = f"Fitness certificate #{instance.id} - {instance.fitness_status}"
            _update_risk_profile_and_log(
                instance.worker,
                trigger_type='fitness_certificate',
                trigger_id=instance.id,
                reason=reason,
            )
    except Exception:
        pass


# ==================== WORKPLACE INCIDENT AUTO-TRIGGER ====================

@receiver(post_save, sender=WorkplaceIncident)
def trigger_compliance_risk_on_incident(sender, instance, created, **kwargs):
    """
    Recalculate compliance risk score when a workplace incident is recorded.
    Incidents directly impact compliance scoring (affects overall risk).
    """
    try:
        logger.info(f"Signal (post_save) fired: trigger_compliance_risk_on_incident for incident {instance.id}")
        # Trigger recalc for all injured workers
        injured_workers = list(instance.injured_workers.all())
        logger.info(f"Found {len(injured_workers)} injured workers")
        
        for worker in injured_workers:
            logger.info(f"Recalculating risk for worker {worker.id}")
            reason = f"Workplace incident #{instance.id} - {instance.category}"
            _update_risk_profile_and_log(
                worker,
                trigger_type='workplace_incident',
                trigger_id=instance.id,
                reason=reason,
            )
            logger.info(f"Completed risk recalculation for worker {worker.id}")
    except Exception as e:
        logger.error(f"Error in trigger_compliance_risk_on_incident: {str(e)}, Full traceback:", exc_info=True)


@receiver(m2m_changed, sender=WorkplaceIncident.injured_workers.through)
def trigger_compliance_risk_on_incident_workers_changed(sender, instance, action, **kwargs):
    """
    Recalculate compliance risk when workers are added/removed from an incident.
    This catches M2M relationship changes which happen after incident creation.
    """
    try:
        if action in ['post_add', 'post_remove']:
            logger.info(f"Signal (m2m_changed) fired: trigger_compliance_risk_on_incident_workers_changed for incident {instance.id}, action={action}")
            injured_workers = list(instance.injured_workers.all())
            logger.info(f"Found {len(injured_workers)} injured workers")
            
            for worker in injured_workers:
                logger.info(f"Recalculating risk for worker {worker.id} (M2M change)")
                reason = f"Workplace incident #{instance.id} - {instance.category} (workers updated)"
                _update_risk_profile_and_log(
                    worker,
                    trigger_type='workplace_incident',
                    trigger_id=instance.id,
                    reason=reason,
                )
                logger.info(f"Completed risk recalculation for worker {worker.id} (M2M change)")
    except Exception as e:
        logger.error(f"Error in trigger_compliance_risk_on_incident_workers_changed: {str(e)}, Full traceback:", exc_info=True)


# ==================== OCCUPATIONAL DISEASE AUTO-TRIGGER ====================

@receiver(post_save, sender=OccupationalDisease)
def trigger_compliance_risk_on_disease(sender, instance, created, **kwargs):
    """
    Recalculate compliance risk score when an occupational disease is recorded.
    Diseases (especially active/chronic) significantly increase compliance risk.
    """
    try:
        if instance.worker:
            reason = f"Occupational disease #{instance.id} - {instance.disease_name}"
            _update_risk_profile_and_log(
                instance.worker,
                trigger_type='occupational_disease',
                trigger_id=instance.id,
                reason=reason,
            )
    except Exception:
        pass