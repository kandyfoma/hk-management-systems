from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.utils import timezone
from .models import VitalSigns, HospitalEncounter, HospitalBed


# ═══════════════════════════════════════════════════════════════
#  VITAL SIGNS SIGNALS
# ═══════════════════════════════════════════════════════════════

@receiver(post_save, sender=VitalSigns)
def vital_signs_post_save(sender, instance, created, **kwargs):
    """Handle vital signs creation/update"""
    if created:
        # Log vital signs creation to audit system
        try:
            from apps.audit.models import HospitalAuditLog
            HospitalAuditLog.objects.create(
                user=instance.created_by,
                action='vital_signs_created',
                description=f'Signes vitaux créés pour {instance.patient.full_name}',
                patient=instance.patient,
                encounter=instance.encounter,
                vital_signs=instance,
                ip_address='127.0.0.1',  # This should be updated with actual IP
                timestamp=timezone.now()
            )
        except ImportError:
            # Audit app might not be available yet
            pass
    
    # Update encounter status if related to an encounter
    if instance.encounter and instance.encounter.status == 'checked_in':
        instance.encounter.status = 'in_progress'
        instance.encounter.save(update_fields=['status'])


# ═══════════════════════════════════════════════════════════════
#  HOSPITAL ENCOUNTER SIGNALS
# ═══════════════════════════════════════════════════════════════

@receiver(post_save, sender=HospitalEncounter)
def encounter_post_save(sender, instance, created, **kwargs):
    """Handle encounter creation/update"""
    if created:
        # Log encounter creation
        try:
            from apps.audit.models import HospitalAuditLog
            HospitalAuditLog.objects.create(
                user=instance.created_by,
                action='encounter_created',
                description=f'Consultation créée: {instance.encounter_number} - {instance.patient.full_name}',
                patient=instance.patient,
                encounter=instance,
                ip_address='127.0.0.1',  # This should be updated with actual IP
                timestamp=timezone.now()
            )
        except ImportError:
            pass
    
    # Handle bed assignment when encounter status changes to inpatient
    if (instance.encounter_type in ['inpatient', 'icu', 'surgery'] and 
        instance.status == 'in_progress' and 
        instance.room_number and instance.bed_number):
        
        try:
            # Find the bed and update its status
            bed = HospitalBed.objects.get(
                room_number=instance.room_number,
                bed_number=instance.bed_number
            )
            if bed.status == 'available':
                bed.status = 'occupied'
                bed.current_patient = instance.patient
                bed.current_encounter = instance
                bed.save()
        except HospitalBed.DoesNotExist:
            pass


@receiver(post_delete, sender=HospitalEncounter)
def encounter_post_delete(sender, instance, **kwargs):
    """Handle encounter deletion"""
    # Release any assigned bed
    if instance.room_number and instance.bed_number:
        try:
            bed = HospitalBed.objects.get(
                room_number=instance.room_number,
                bed_number=instance.bed_number,
                current_encounter=instance
            )
            bed.status = 'cleaning'
            bed.current_patient = None
            bed.current_encounter = None
            bed.last_cleaned = timezone.now()
            bed.save()
        except HospitalBed.DoesNotExist:
            pass


# ═══════════════════════════════════════════════════════════════
#  HOSPITAL BED SIGNALS
# ═══════════════════════════════════════════════════════════════

@receiver(post_save, sender=HospitalBed)
def bed_post_save(sender, instance, created, **kwargs):
    """Handle bed status changes"""
    if not created:
        # Log bed assignment/release
        try:
            from apps.audit.models import HospitalAuditLog
            
            if instance.current_patient:
                # Bed assigned
                HospitalAuditLog.objects.create(
                    user=instance.current_encounter.created_by if instance.current_encounter else None,
                    action='bed_assigned',
                    description=f'Lit assigné: {instance} à {instance.current_patient.full_name}',
                    patient=instance.current_patient,
                    encounter=instance.current_encounter,
                    bed=instance,
                    ip_address='127.0.0.1',
                    timestamp=timezone.now()
                )
            else:
                # Bed released
                HospitalAuditLog.objects.create(
                    user=None,  # System action
                    action='bed_released',
                    description=f'Lit libéré: {instance}',
                    bed=instance,
                    ip_address='127.0.0.1',
                    timestamp=timezone.now()
                )
        except ImportError:
            pass
    
    # Auto-transition from cleaning to available after some time
    # This could be enhanced with a celery task for automated cleanup
    if instance.status == 'cleaning' and instance.last_cleaned:
        # For now, we'll just log this - in production you'd want a scheduled task
        pass