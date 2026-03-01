"""
Reporting System Models
"""

from django.db import models
import uuid


class SavedReport(models.Model):
    """Saved report configurations for recurring reports"""
    REPORT_TYPES = [
        ('sales_daily', 'Daily Sales Summary'),
        ('sales_period', 'Period Sales Analysis'),
        ('inventory_health', 'Inventory Health'),
        ('expiring_products', 'Products Expiring Soon'),
        ('occupational_exams', 'Medical Examinations'),
        ('incidents', 'Workplace Incidents'),
        ('compliance_cnss', 'CNSS Compliance'),
        ('patient_stats', 'Patient Statistics'),
        ('audit_trail', 'Audit Summary'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='saved_reports'
    )
    name = models.CharField(max_length=200, help_text='Report name')
    report_type = models.CharField(max_length=50, choices=REPORT_TYPES)
    frequency = models.CharField(
        max_length=20,
        choices=[
            ('once', 'Once'),
            ('daily', 'Daily'),
            ('weekly', 'Weekly'),
            ('monthly', 'Monthly'),
            ('quarterly', 'Quarterly'),
        ],
        default='once'
    )
    filters = models.JSONField(default=dict, help_text='Report filter parameters')
    recipients = models.JSONField(default=list, help_text='Email recipients')
    is_active = models.BooleanField(default=True)
    
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_reports'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Saved Report"
        verbose_name_plural = "Saved Reports"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} ({self.report_type})"


class ReportExport(models.Model):
    """Track exported reports"""
    EXPORT_FORMATS = [
        ('pdf', 'PDF'),
        ('excel', 'Excel (.xlsx)'),
        ('csv', 'CSV'),
        ('json', 'JSON'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    report = models.ForeignKey(SavedReport, on_delete=models.CASCADE, related_name='exports')
    export_format = models.CharField(max_length=20, choices=EXPORT_FORMATS)
    file_path = models.CharField(max_length=500, help_text='Path to exported file')
    generated_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True
    )
    generated_at = models.DateTimeField(auto_now_add=True)
    download_count = models.PositiveIntegerField(default=0)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        verbose_name = "Report Export"
        verbose_name_plural = "Report Exports"
        ordering = ['-generated_at']
    
    def __str__(self):
        return f"{self.report.name} - {self.export_format} ({self.generated_at.date()})"
