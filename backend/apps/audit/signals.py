from django.db.models.signals import post_save, post_delete, pre_save
from django.contrib.auth.signals import user_logged_in, user_logged_out, user_login_failed
from django.dispatch import receiver
from django.contrib.contenttypes.models import ContentType
from django.core.serializers.json import DjangoJSONEncoder
from django.utils import timezone
import json
import threading

from .models import AuditLog, AuditActionType, AuditSeverity, PharmacyAuditLog
from .utils import get_client_ip, get_request_from_thread

# Thread-local storage for request context
_thread_local = threading.local()


def get_model_changes(sender, instance, **kwargs):
    """Get changes between old and new model instances"""
    if not hasattr(instance, 'pk') or instance.pk is None:
        return None, None  # New instance
    
    try:
        old_instance = sender.objects.get(pk=instance.pk)
        old_values = {}
        new_values = {}
        
        for field in sender._meta.fields:
            field_name = field.name
            old_value = getattr(old_instance, field_name, None)
            new_value = getattr(instance, field_name, None)
            
            # Skip password fields and other sensitive data
            if 'password' in field_name.lower() or 'token' in field_name.lower():
                continue
            
            if old_value != new_value:
                # Convert to JSON-serializable format
                try:
                    old_values[field_name] = json.loads(json.dumps(old_value, cls=DjangoJSONEncoder))
                    new_values[field_name] = json.loads(json.dumps(new_value, cls=DjangoJSONEncoder))
                except (TypeError, ValueError):
                    old_values[field_name] = str(old_value)
                    new_values[field_name] = str(new_value)
        
        return old_values if old_values else None, new_values if new_values else None
        
    except sender.DoesNotExist:
        return None, None


def should_audit_model(sender):
    """Determine if a model should be audited"""
    # Skip audit models to avoid infinite recursion
    if sender._meta.app_label == 'audit':
        return False
    
    # Skip session and admin models
    skip_apps = ['sessions', 'admin', 'contenttypes', 'auth']
    if sender._meta.app_label in skip_apps:
        return False
    
    return True


def get_severity_for_model(sender):
    """Get audit severity based on model type"""
    app_label = sender._meta.app_label
    model_name = sender._meta.model_name.lower()
    
    # Critical operations
    if app_label == 'accounts' and 'user' in model_name:
        return AuditSeverity.CRITICAL
    
    # High-priority pharmacy operations
    if app_label in ['prescriptions', 'sales'] or 'prescription' in model_name or 'sale' in model_name:
        return AuditSeverity.HIGH
    
    # Medium priority for inventory and suppliers
    if app_label in ['inventory', 'suppliers']:
        return AuditSeverity.MEDIUM
    
    return AuditSeverity.LOW


@receiver(post_save)
def log_model_save(sender, instance, created, **kwargs):
    """Log model create/update operations"""
    if not should_audit_model(sender):
        return
    
    request = get_request_from_thread()
    if not request:
        return
    
    action = AuditActionType.CREATE if created else AuditActionType.UPDATE
    severity = get_severity_for_model(sender)
    
    description = f"{'Création' if created else 'Modification'} de {sender._meta.verbose_name}: {instance}"
    
    old_values = None
    new_values = None
    
    if not created:
        old_values, new_values = get_model_changes(sender, instance, **kwargs)
    
    # Create audit log entry
    audit_log = AuditLog.objects.create(
        user=getattr(request, 'user', None) if hasattr(request, 'user') and request.user.is_authenticated else None,
        action=action,
        severity=severity,
        description=description,
        content_type=ContentType.objects.get_for_model(sender),
        object_id=instance.pk,
        object_repr=str(instance)[:255],
        old_values=old_values,
        new_values=new_values,
        module=sender._meta.app_label,
        request_method=getattr(request, 'method', ''),
        request_path=getattr(request, 'path', ''),
        ip_address=get_client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', '')[:500] if hasattr(request, 'META') else '',
        organization=getattr(request.user, 'organization', None) if hasattr(request, 'user') and request.user.is_authenticated else None
    )
    
    # Create pharmacy-specific audit log if applicable
    if sender._meta.app_label in ['prescriptions', 'sales', 'inventory', 'suppliers']:
        create_pharmacy_audit_log(audit_log, sender, instance)


@receiver(post_delete)
def log_model_delete(sender, instance, **kwargs):
    """Log model deletion operations"""
    if not should_audit_model(sender):
        return
    
    request = get_request_from_thread()
    if not request:
        return
    
    severity = get_severity_for_model(sender)
    description = f"Suppression de {sender._meta.verbose_name}: {instance}"
    
    # Create audit log entry
    audit_log = AuditLog.objects.create(
        user=getattr(request, 'user', None) if hasattr(request, 'user') and request.user.is_authenticated else None,
        action=AuditActionType.DELETE,
        severity=severity,
        description=description,
        content_type=ContentType.objects.get_for_model(sender),
        object_repr=str(instance)[:255],
        module=sender._meta.app_label,
        request_method=getattr(request, 'method', ''),
        request_path=getattr(request, 'path', ''),
        ip_address=get_client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', '')[:500] if hasattr(request, 'META') else '',
        organization=getattr(request.user, 'organization', None) if hasattr(request, 'user') and request.user.is_authenticated else None
    )
    
    # Create pharmacy-specific audit log if applicable
    if sender._meta.app_label in ['prescriptions', 'sales', 'inventory', 'suppliers']:
        create_pharmacy_audit_log(audit_log, sender, instance)


@receiver(user_logged_in)
def log_user_login(sender, request, user, **kwargs):
    """Log successful user login"""
    AuditLog.objects.create(
        user=user,
        action=AuditActionType.LOGIN,
        severity=AuditSeverity.MEDIUM,
        description=f"Connexion réussie pour {user.get_username()}",
        ip_address=get_client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
        session_key=request.session.session_key,
        organization=getattr(user, 'organization', None)
    )


@receiver(user_logged_out)
def log_user_logout(sender, request, user, **kwargs):
    """Log user logout"""
    AuditLog.objects.create(
        user=user,
        action=AuditActionType.LOGOUT,
        severity=AuditSeverity.LOW,
        description=f"Déconnexion pour {user.get_username() if user else 'utilisateur inconnu'}",
        ip_address=get_client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
        session_key=getattr(request.session, 'session_key', ''),
        organization=getattr(user, 'organization', None) if user else None
    )


@receiver(user_login_failed)
def log_failed_login(sender, credentials, request, **kwargs):
    """Log failed login attempts"""
    username = credentials.get('username', credentials.get('phone_number', 'Unknown'))
    
    AuditLog.objects.create(
        username=username,
        action=AuditActionType.LOGIN_FAILED,
        severity=AuditSeverity.HIGH,
        description=f"Échec de connexion pour {username}",
        ip_address=get_client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
        success=False,
        additional_data={'attempted_username': username}
    )


def create_pharmacy_audit_log(audit_log, model_class, instance):
    """Create pharmacy-specific audit log entry"""
    pharmacy_audit = PharmacyAuditLog(audit_log=audit_log)
    
    # Extract pharmacy-specific information based on model type
    if model_class._meta.model_name == 'prescription':
        pharmacy_audit.prescription_number = getattr(instance, 'prescription_number', '')
        pharmacy_audit.patient_id = f"patient_{getattr(instance, 'patient_id', '')}"  # Anonymized
        pharmacy_audit.doctor_name = getattr(instance.doctor, 'full_name', '') if hasattr(instance, 'doctor') and instance.doctor else ''
        
    elif model_class._meta.model_name == 'prescriptionitem':
        pharmacy_audit.prescription_number = getattr(instance.prescription, 'prescription_number', '') if instance.prescription else ''
        pharmacy_audit.product_name = getattr(instance, 'medication_name', '')
        pharmacy_audit.quantity = getattr(instance, 'quantity_prescribed', None)
        
    elif model_class._meta.model_name == 'sale':
        pharmacy_audit.sale_number = getattr(instance, 'sale_number', '')
        pharmacy_audit.amount = getattr(instance, 'total_amount', None)
        
    elif model_class._meta.model_name == 'saleitem':
        pharmacy_audit.product_name = getattr(instance.product, 'name', '') if instance.product else ''
        pharmacy_audit.product_sku = getattr(instance.product, 'sku', '') if instance.product else ''
        pharmacy_audit.quantity = getattr(instance, 'quantity', None)
        pharmacy_audit.amount = getattr(instance, 'line_total', None)
        
    elif model_class._meta.model_name == 'product':
        pharmacy_audit.product_name = getattr(instance, 'name', '')
        pharmacy_audit.product_sku = getattr(instance, 'sku', '')
        
    elif model_class._meta.model_name == 'inventorybatch':
        pharmacy_audit.batch_number = getattr(instance, 'batch_number', '')
        pharmacy_audit.product_name = getattr(instance.inventory_item.product, 'name', '') if instance.inventory_item and instance.inventory_item.product else ''
        pharmacy_audit.quantity = getattr(instance, 'current_quantity', None)
        
    elif model_class._meta.model_name == 'stockmovement':
        pharmacy_audit.product_name = getattr(instance.inventory_item.product, 'name', '') if instance.inventory_item and instance.inventory_item.product else ''
        pharmacy_audit.quantity = getattr(instance, 'quantity', None)
        pharmacy_audit.batch_number = getattr(instance.batch, 'batch_number', '') if instance.batch else ''
        
    elif model_class._meta.model_name == 'supplier':
        pharmacy_audit.supplier_name = getattr(instance, 'name', '')
    
    # Set verification requirement for critical operations
    if audit_log.severity in [AuditSeverity.HIGH, AuditSeverity.CRITICAL]:
        pharmacy_audit.requires_verification = True
    
    pharmacy_audit.save()