import threading
from django.utils.deprecation import MiddlewareMixin
from django.contrib.auth import get_user_model
from .models import AuditLog, AuditActionType, AuditSeverity

User = get_user_model()

# Thread-local storage for request context
_thread_local = threading.local()


def get_client_ip(request):
    """Get client IP address from request"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def set_request_in_thread(request):
    """Store request in thread-local storage"""
    _thread_local.request = request


def get_request_from_thread():
    """Retrieve request from thread-local storage"""
    return getattr(_thread_local, 'request', None)


def clear_request_from_thread():
    """Clear request from thread-local storage"""
    if hasattr(_thread_local, 'request'):
        delattr(_thread_local, 'request')


class AuditMiddleware(MiddlewareMixin):
    """Middleware to capture request context for audit logging"""
    
    def process_request(self, request):
        """Store request in thread-local storage"""
        set_request_in_thread(request)
        
        # Add request start time for duration calculation
        import time
        request._audit_start_time = time.time()
        
        return None
    
    def process_response(self, request, response):
        """Clean up thread-local storage and log request if needed"""
        # Calculate request duration
        if hasattr(request, '_audit_start_time'):
            import time
            duration_ms = int((time.time() - request._audit_start_time) * 1000)
            request._audit_duration = duration_ms
        
        # Log certain types of requests
        if self.should_log_request(request, response):
            self.log_request(request, response)
        
        clear_request_from_thread()
        return response
    
    def process_exception(self, request, exception):
        """Log exceptions"""
        if hasattr(request, 'user') and request.user.is_authenticated:
            AuditLog.objects.create(
                user=request.user,
                action=AuditActionType.VIEW,  # or specific action based on request
                severity=AuditSeverity.HIGH,
                description=f"Exception lors de {request.method} {request.path}: {str(exception)}",
                request_method=request.method,
                request_path=request.path,
                ip_address=get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
                success=False,
                error_message=str(exception),
                organization=getattr(request.user, 'organization', None)
            )
        
        clear_request_from_thread()
        return None
    
    def should_log_request(self, request, response):
        """Determine if request should be logged"""
        # Skip static files and admin media
        if request.path.startswith('/static/') or request.path.startswith('/media/'):
            return False
        
        # Skip health checks
        if request.path in ['/health/', '/ping/']:
            return False
        
        # Log API requests
        if request.path.startswith('/api/'):
            return True
        
        # Log pharmacy-specific pages
        pharmacy_paths = ['/pharmacy/', '/prescriptions/', '/sales/', '/inventory/', '/suppliers/']
        if any(request.path.startswith(path) for path in pharmacy_paths):
            return True
        
        # Log authentication requests
        if request.path.startswith('/auth/') or 'login' in request.path or 'logout' in request.path:
            return True
        
        # Log failed requests (4xx, 5xx)
        if response.status_code >= 400:
            return True
        
        return False
    
    def log_request(self, request, response):
        """Log request details"""
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            return
        
        # Determine action type based on HTTP method
        action_map = {
            'GET': AuditActionType.VIEW,
            'POST': AuditActionType.CREATE,
            'PUT': AuditActionType.UPDATE,
            'PATCH': AuditActionType.UPDATE,
            'DELETE': AuditActionType.DELETE,
        }
        
        action = action_map.get(request.method, AuditActionType.VIEW)
        
        # Determine severity based on response status
        if response.status_code >= 500:
            severity = AuditSeverity.CRITICAL
        elif response.status_code >= 400:
            severity = AuditSeverity.HIGH
        else:
            severity = AuditSeverity.LOW
        
        success = response.status_code < 400
        
        description = f"{request.method} {request.path} - Status: {response.status_code}"
        
        AuditLog.objects.create(
            user=request.user,
            action=action,
            severity=severity,
            description=description,
            request_method=request.method,
            request_path=request.path,
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
            success=success,
            duration_ms=getattr(request, '_audit_duration', None),
            organization=getattr(request.user, 'organization', None),
            additional_data={
                'status_code': response.status_code,
                'content_type': response.get('Content-Type', ''),
            }
        )


def log_pharmacy_action(user, action, description, **kwargs):
    """Convenience function to log pharmacy-specific actions"""
    from .models import PharmacyAuditLog
    
    # Determine severity based on action type
    severity_map = {
        AuditActionType.DISPENSE: AuditSeverity.HIGH,
        AuditActionType.SALE: AuditSeverity.MEDIUM,
        AuditActionType.REFUND: AuditSeverity.HIGH,
        AuditActionType.VOID: AuditSeverity.HIGH,
        AuditActionType.STOCK_ADJUSTMENT: AuditSeverity.MEDIUM,
        AuditActionType.INVENTORY_COUNT: AuditSeverity.MEDIUM,
        AuditActionType.PRICE_CHANGE: AuditSeverity.MEDIUM,
        AuditActionType.PRESCRIPTION_RECEIVE: AuditSeverity.HIGH,
        AuditActionType.PRESCRIPTION_VALIDATE: AuditSeverity.HIGH,
        AuditActionType.PRESCRIPTION_REJECT: AuditSeverity.HIGH,
    }
    
    severity = kwargs.pop('severity', severity_map.get(action, AuditSeverity.MEDIUM))
    
    # Create main audit log
    audit_log = AuditLog.objects.create(
        user=user,
        action=action,
        severity=severity,
        description=description,
        organization=getattr(user, 'organization', None),
        **kwargs
    )
    
    # Create pharmacy-specific audit log
    pharmacy_data = {
        'prescription_number': kwargs.get('prescription_number', ''),
        'product_sku': kwargs.get('product_sku', ''),
        'product_name': kwargs.get('product_name', ''),
        'batch_number': kwargs.get('batch_number', ''),
        'quantity': kwargs.get('quantity'),
        'amount': kwargs.get('amount'),
        'patient_id': kwargs.get('patient_id', ''),
        'doctor_name': kwargs.get('doctor_name', ''),
        'sale_number': kwargs.get('sale_number', ''),
        'supplier_name': kwargs.get('supplier_name', ''),
    }
    
    # Remove None values
    pharmacy_data = {k: v for k, v in pharmacy_data.items() if v is not None and v != ''}
    
    if pharmacy_data:  # Only create if there's pharmacy-specific data
        PharmacyAuditLog.objects.create(
            audit_log=audit_log,
            **pharmacy_data
        )
    
    return audit_log