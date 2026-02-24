"""
ISO 27001 Information Security Management Models

Comprehensive information security models for ISO 27001 compliance.
"""
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
import json
from datetime import timedelta

User = get_user_model()


class AuditLog(models.Model):
    """Complete audit trail of all system activities for ISO 27001 compliance"""
    
    ACTION_CHOICES = [
        ('login', 'User Login'),
        ('logout', 'User Logout'),
        ('data_view', 'Data View'),
        ('data_create', 'Data Create'),
        ('data_update', 'Data Update'),
        ('data_delete', 'Data Delete'),
        ('data_export', 'Data Export'),
        ('user_create', 'User Created'),
        ('user_update', 'User Updated'),
        ('user_delete', 'User Deleted'),
        ('permission_change', 'Permission Changed'),
        ('config_change', 'Configuration Changed'),
        ('api_access', 'API Access'),
        ('report_generated', 'Report Generated'),
        ('backup_created', 'Backup Created'),
        ('security_event', 'Security Event'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_logs')
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    resource_type = models.CharField(max_length=100)  # e.g., 'WorkerRiskProfile', 'MedicalExamination'
    resource_id = models.IntegerField(null=True, blank=True)
    resource_name = models.CharField(max_length=200, blank=True)
    description = models.TextField()
    old_values = models.JSONField(null=True, blank=True, help_text='Previous values for updates')
    new_values = models.JSONField(null=True, blank=True, help_text='New values for updates')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    status = models.CharField(
        max_length=20,
        choices=[('success', 'Success'), ('failure', 'Failure'), ('warning', 'Warning')],
        default='success'
    )
    error_message = models.TextField(blank=True)
    
    class Meta:
        verbose_name = 'Audit Log'
        verbose_name_plural = 'Audit Logs'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['action', '-timestamp']),
            models.Index(fields=['resource_type', '-timestamp']),
        ]
    
    def __str__(self):
        return f"{self.action} - {self.resource_type} by {self.user} at {self.timestamp}"


class AccessControl(models.Model):
    """Role-based access control with field-level restrictions"""
    
    PERMISSION_TYPES = [
        ('view', 'View Only'),
        ('create', 'Create'),
        ('edit', 'Edit'),
        ('delete', 'Delete'),
        ('export', 'Export'),
        ('admin', 'Administrative'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='access_controls')
    resource_type = models.CharField(max_length=100)  # e.g., 'WorkerRiskProfile', 'MedicalExamination'
    permission_type = models.CharField(max_length=20, choices=PERMISSION_TYPES)
    enterprise = models.ForeignKey(
        'occupational_health.Enterprise',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        help_text='Specific enterprise; leave blank for all'
    )
    work_site = models.ForeignKey(
        'occupational_health.WorkSite',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        help_text='Specific site; leave blank for all'
    )
    field_restrictions = models.JSONField(
        default=list,
        help_text='List of fields user cannot access (e.g., ["ssn", "medical_notes"])'
    )
    granted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='access_grants')
    granted_date = models.DateTimeField(auto_now_add=True)
    expires_date = models.DateField(
        null=True,
        blank=True,
        help_text='Access auto-revoked after this date'
    )
    active = models.BooleanField(default=True)
    reason = models.TextField(blank=True)
    
    class Meta:
        verbose_name = 'Access Control'
        verbose_name_plural = 'Access Controls'
        unique_together = ('user', 'resource_type', 'permission_type', 'enterprise', 'work_site')
    
    def is_expired(self):
        return self.expires_date and timezone.now().date() > self.expires_date
    
    def __str__(self):
        return f"{self.user} - {self.permission_type} on {self.resource_type}"


class SecurityIncident(models.Model):
    """Security incident reporting and tracking"""
    
    SEVERITY_CHOICES = [
        ('low', 'Low - No data exposed'),
        ('medium', 'Medium - Minimal data exposure'),
        ('high', 'High - Significant data exposure'),
        ('critical', 'Critical - Large-scale data breach'),
    ]
    
    STATUS_CHOICES = [
        ('reported', 'Reported'),
        ('investigating', 'Investigating'),
        ('contained', 'Contained'),
        ('resolved', 'Resolved'),
        ('closed', 'Closed'),
    ]
    
    incident_id = models.CharField(max_length=50, unique=True)
    title = models.CharField(max_length=200)
    description = models.TextField()
    reported_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='security_incidents_reported')
    discovery_date = models.DateTimeField()
    report_date = models.DateTimeField(auto_now_add=True)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='reported')
    affected_systems = models.JSONField(default=list)  # List of affected components
    affected_users_count = models.PositiveIntegerField(default=0)
    affected_data_types = models.JSONField(default=list)  # e.g., [medical_records, personal_info]
    root_cause = models.TextField(blank=True)
    contained_date = models.DateTimeField(null=True, blank=True)
    resolution_date = models.DateTimeField(null=True, blank=True)
    corrective_actions = models.TextField(blank=True)
    preventive_actions = models.TextField(blank=True)
    external_reporting = models.BooleanField(default=False, help_text='Reported to authorities')
    external_report_date = models.DateField(null=True, blank=True)
    external_report_details = models.TextField(blank=True)
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='security_incidents_assigned')
    
    class Meta:
        verbose_name = 'Security Incident'
        verbose_name_plural = 'Security Incidents'
        ordering = ['-report_date']
    
    def __str__(self):
        return f"{self.incident_id} - {self.title}"


class VulnerabilityRecord(models.Model):
    """Vulnerability tracking and remediation"""
    
    SEVERITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    
    STATUS_CHOICES = [
        ('identified', 'Identified'),
        ('verified', 'Verified'),
        ('scheduled', 'Patch Scheduled'),
        ('patched', 'Patched'),
        ('verified_fixed', 'Verified Fixed'),
        ('accepted_risk', 'Risk Accepted'),
        ('closed', 'Closed'),
    ]
    
    vulnerability_id = models.CharField(max_length=50, unique=True)  # CVE ID
    title = models.CharField(max_length=200)
    description = models.TextField()
    affected_component = models.CharField(max_length=200)  # e.g., 'django', 'postgresql'
    current_version = models.CharField(max_length=50)
    vulnerable_versions = models.CharField(max_length=200)
    patched_version = models.CharField(max_length=50, blank=True)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES)
    published_date = models.DateField()
    discovered_date = models.DateField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='identified')
    remediation_plan = models.TextField()
    patch_date = models.DateField(null=True, blank=True)
    verification_date = models.DateField(null=True, blank=True)
    risk_acceptance_date = models.DateField(null=True, blank=True)
    risk_acceptance_reason = models.TextField(blank=True)
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    external_reference = models.URLField(blank=True)  # Link to NIST/CVE database
    
    class Meta:
        verbose_name = 'Vulnerability Record'
        verbose_name_plural = 'Vulnerability Records'
        ordering = ['-severity', '-published_date']
    
    def __str__(self):
        return f"{self.vulnerability_id} - {self.affected_component}"


class AccessRequest(models.Model):
    """Formal access request workflow for new or modified permissions"""
    
    STATUS_CHOICES = [
        ('pending', 'Pending Approval'),
        ('approved', 'Approved'),
        ('denied', 'Denied'),
        ('revoked', 'Revoked'),
    ]
    
    request_id = models.CharField(max_length=50, unique=True)
    requester = models.ForeignKey(User, on_delete=models.CASCADE, related_name='access_requests')
    request_date = models.DateTimeField(auto_now_add=True)
    requested_resource_type = models.CharField(max_length=100)
    requested_permission = models.CharField(max_length=20, choices=AccessControl.PERMISSION_TYPES)
    requested_enterprise = models.ForeignKey(
        'occupational_health.Enterprise',
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )
    business_justification = models.TextField()
    required_until = models.DateField(null=True, blank=True, help_text='Time-limited access')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    approver = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='access_approvals')
    approval_date = models.DateTimeField(null=True, blank=True)
    approval_notes = models.TextField(blank=True)
    
    class Meta:
        verbose_name = 'Access Request'
        verbose_name_plural = 'Access Requests'
        ordering = ['-request_date']
    
    def __str__(self):
        return f"{self.request_id} - {self.requester}"


class DataRetentionPolicy(models.Model):
    """Data retention and automatic purge policies"""
    
    data_category = models.CharField(max_length=100, unique=True)  # e.g., 'audit_logs', 'medical_records'
    retention_days = models.PositiveIntegerField()
    description = models.TextField()
    archive_before_delete = models.BooleanField(default=True)
    archive_location = models.CharField(max_length=200, blank=True)
    notify_before_delete_days = models.PositiveIntegerField(default=30)
    enabled = models.BooleanField(default=True)
    created_date = models.DateField(auto_now_add=True)
    last_executed = models.DateTimeField(null=True, blank=True)
    records_purged = models.PositiveIntegerField(default=0)
    
    class Meta:
        verbose_name = 'Data Retention Policy'
        verbose_name_plural = 'Data Retention Policies'
    
    def __str__(self):
        return f"{self.data_category} - {self.retention_days} days"


class EncryptionKeyRecord(models.Model):
    """Track encryption keys and rotation"""
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('rotated', 'Rotated'),
        ('revoked', 'Revoked'),
        ('archived', 'Archived'),
    ]
    
    key_id = models.CharField(max_length=50, unique=True)
    purpose = models.CharField(max_length=100)  # e.g., 'field_encryption', 'backup_encryption'
    algorithm = models.CharField(max_length=50)  # e.g., 'AES-256'
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    created_date = models.DateTimeField(auto_now_add=True)
    rotation_date = models.DateTimeField(null=True, blank=True)
    next_rotation_date = models.DateTimeField()
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='encryption_keys_created')
    rotation_count = models.PositiveIntegerField(default=0)
    
    class Meta:
        verbose_name = 'Encryption Key Record'
        verbose_name_plural = 'Encryption Key Records'
        ordering = ['-created_date']
    
    def __str__(self):
        return f"{self.key_id} - {self.purpose}"


class ComplianceDashboard(models.Model):
    """Real-time ISO 27001 compliance status tracking"""
    
    last_updated = models.DateTimeField(auto_now=True)
    
    # Audit logging compliance
    audit_logs_created_last_30_days = models.PositiveIntegerField(default=0)
    audit_log_completeness_percentage = models.PositiveIntegerField(default=0)
    
    # Access control compliance
    active_users = models.PositiveIntegerField(default=0)
    users_with_expired_access = models.PositiveIntegerField(default=0)
    access_reviews_due = models.PositiveIntegerField(default=0)
    access_reviews_completed = models.PositiveIntegerField(default=0)
    
    # Security incident compliance
    open_security_incidents = models.PositiveIntegerField(default=0)
    security_incidents_last_30_days = models.PositiveIntegerField(default=0)
    avg_incident_resolution_days = models.PositiveIntegerField(default=0)
    
    # Vulnerability management
    known_vulnerabilities = models.PositiveIntegerField(default=0)
    critical_vulnerabilities = models.PositiveIntegerField(default=0)
    vulnerabilities_without_patch = models.PositiveIntegerField(default=0)
    
    # Data protection
    encrypted_fields_count = models.PositiveIntegerField(default=0)
    unencrypted_sensitive_fields = models.PositiveIntegerField(default=0)
    
    # Policy compliance
    security_policies_up_to_date = models.BooleanField(default=False)
    staff_security_training_completion = models.PositiveIntegerField(default=0)  # Percentage
    incident_response_tests_completed = models.PositiveIntegerField(default=0)
    
    overall_compliance_percentage = models.PositiveIntegerField(default=0)
    compliance_status = models.CharField(
        max_length=20,
        choices=[
            ('compliant', 'Compliant'),
            ('mostly_compliant', 'Mostly Compliant'),
            ('partially_compliant', 'Partially Compliant'),
            ('non_compliant', 'Non-Compliant'),
        ],
        default='partially_compliant'
    )
    
    class Meta:
        verbose_name = 'Compliance Dashboard'
        verbose_name_plural = 'Compliance Dashboards'
    
    def __str__(self):
        return f"ISO 27001 Compliance - {self.overall_compliance_percentage}%"
