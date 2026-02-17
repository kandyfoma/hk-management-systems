"""
Occupational Health Signals - Automated Business Logic

Django signals for automated processing of occupational health data
including audit logging, exam scheduling, and business rule enforcement.
"""
from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from django.utils import timezone
from datetime import timedelta

from .models import (
    Worker, MedicalExamination, VitalSigns, FitnessCertificate,
    WorkplaceIncident, OccupationalDisease
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