from functools import wraps
from django.utils import timezone
from .models import AuditActionType, AuditSeverity
from .utils import log_pharmacy_action, get_client_ip, get_request_from_thread
import time


def audit_action(action_type, description=None, severity=None, **audit_kwargs):
    """Decorator to audit specific actions"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            request = None
            user = None
            
            # Try to extract request and user from args
            for arg in args:
                if hasattr(arg, 'user') and hasattr(arg, 'method'):  # Django request object
                    request = arg
                    user = getattr(request, 'user', None) if hasattr(request, 'user') else None
                    break
                elif hasattr(arg, 'request'):  # DRF view object
                    request = arg.request
                    user = getattr(request, 'user', None) if hasattr(request, 'user') else None
                    break
            
            # If no request found, try to get from thread
            if not request:
                request = get_request_from_thread()
                user = getattr(request, 'user', None) if request and hasattr(request, 'user') else None
            
            start_time = time.time()
            error_message = None
            success = True
            result = None
            
            try:
                result = func(*args, **kwargs)
                return result
            except Exception as e:
                success = False
                error_message = str(e)
                raise
            finally:
                # Calculate duration
                duration_ms = int((time.time() - start_time) * 1000)
                
                # Create audit log
                if user and user.is_authenticated:
                    audit_description = description or f"Exécution de {func.__name__}"
                    
                    log_pharmacy_action(
                        user=user,
                        action=action_type,
                        description=audit_description,
                        severity=severity or AuditSeverity.MEDIUM,
                        success=success,
                        error_message=error_message,
                        duration_ms=duration_ms,
                        ip_address=get_client_ip(request) if request else None,
                        user_agent=request.META.get('HTTP_USER_AGENT', '')[:500] if request else '',
                        request_method=getattr(request, 'method', '') if request else '',
                        request_path=getattr(request, 'path', '') if request else '',
                        view_name=f"{func.__module__}.{func.__name__}",
                        **audit_kwargs
                    )
        
        return wrapper
    return decorator


def audit_dispense(description=None):
    """Decorator specifically for prescription dispensing actions"""
    return audit_action(
        action_type=AuditActionType.DISPENSE,
        description=description or "Dispensation d'ordonnance",
        severity=AuditSeverity.HIGH
    )


def audit_sale(description=None):
    """Decorator specifically for sales actions"""
    return audit_action(
        action_type=AuditActionType.SALE,
        description=description or "Transaction de vente",
        severity=AuditSeverity.MEDIUM
    )


def audit_inventory_change(description=None):
    """Decorator specifically for inventory changes"""
    return audit_action(
        action_type=AuditActionType.STOCK_ADJUSTMENT,
        description=description or "Modification d'inventaire",
        severity=AuditSeverity.MEDIUM
    )


def audit_prescription_action(action_type, description=None):
    """Decorator for prescription-related actions"""
    return audit_action(
        action_type=action_type,
        description=description or f"Action sur ordonnance: {action_type}",
        severity=AuditSeverity.HIGH
    )


def audit_critical_action(description=None):
    """Decorator for critical actions requiring special attention"""
    return audit_action(
        action_type=AuditActionType.UPDATE,  # Can be overridden
        description=description or "Action critique",
        severity=AuditSeverity.CRITICAL
    )


def audit_view_access(description=None):
    """Decorator for tracking sensitive data access"""
    return audit_action(
        action_type=AuditActionType.VIEW,
        description=description or "Accès à des données sensibles",
        severity=AuditSeverity.LOW
    )


def audit_report_generation(description=None):
    """Decorator for report generation and exports"""
    return audit_action(
        action_type=AuditActionType.EXPORT,
        description=description or "Génération de rapport",
        severity=AuditSeverity.MEDIUM
    )


class AuditContextManager:
    """Context manager for complex operations requiring detailed audit logging"""
    
    def __init__(self, user, action_type, description, **kwargs):
        self.user = user
        self.action_type = action_type
        self.description = description
        self.kwargs = kwargs
        self.start_time = None
        self.success = True
        self.error_message = None
    
    def __enter__(self):
        self.start_time = time.time()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            self.success = False
            self.error_message = str(exc_val)
        
        duration_ms = int((time.time() - self.start_time) * 1000)
        
        log_pharmacy_action(
            user=self.user,
            action=self.action_type,
            description=self.description,
            success=self.success,
            error_message=self.error_message,
            duration_ms=duration_ms,
            **self.kwargs
        )
    
    def add_context(self, **kwargs):
        """Add additional context during the operation"""
        self.kwargs.update(kwargs)


def audit_bulk_operation(action_type, description_template="Opération en lot: {count} éléments"):
    """Decorator for bulk operations"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            request = None
            user = None
            
            # Extract request and user
            for arg in args:
                if hasattr(arg, 'user') and hasattr(arg, 'method'):
                    request = arg
                    user = getattr(request, 'user', None)
                    break
                elif hasattr(arg, 'request'):
                    request = arg.request
                    user = getattr(request, 'user', None)
                    break
            
            if not request:
                request = get_request_from_thread()
                user = getattr(request, 'user', None) if request else None
            
            start_time = time.time()
            result = None
            success = True
            error_message = None
            
            try:
                result = func(*args, **kwargs)
                
                # Try to determine count of affected items
                count = 0
                if isinstance(result, (list, tuple, set)):
                    count = len(result)
                elif hasattr(result, 'count'):
                    count = result.count()
                elif isinstance(result, dict) and 'count' in result:
                    count = result['count']
                
                return result
                
            except Exception as e:
                success = False
                error_message = str(e)
                raise
            finally:
                if user and user.is_authenticated:
                    duration_ms = int((time.time() - start_time) * 1000)
                    description = description_template.format(count=count)
                    
                    log_pharmacy_action(
                        user=user,
                        action=action_type,
                        description=description,
                        severity=AuditSeverity.MEDIUM,
                        success=success,
                        error_message=error_message,
                        duration_ms=duration_ms,
                        request_method=getattr(request, 'method', '') if request else '',
                        request_path=getattr(request, 'path', '') if request else '',
                        additional_data={'affected_count': count} if 'count' in locals() else None
                    )
        
        return wrapper
    return decorator