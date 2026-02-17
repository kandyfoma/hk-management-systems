from django.db import models
from django.core.validators import RegexValidator
from django.utils import timezone
import uuid


class LicenseType(models.TextChoices):
    PHARMACY = 'PHARMACY', 'Pharmacie'
    HOSPITAL = 'HOSPITAL', 'Hôpital'
    OCCUPATIONAL_HEALTH = 'OCCUPATIONAL_HEALTH', 'Santé au Travail'
    PHARMACY_HOSPITAL = 'PHARMACY_HOSPITAL', 'Pharmacie + Hôpital'
    HOSPITAL_OCCUPATIONAL_HEALTH = 'HOSPITAL_OCCUPATIONAL_HEALTH', 'Hôpital + Santé au Travail'
    COMBINED = 'COMBINED', 'Combinée (Tous Modules)'


class LicenseStatus(models.TextChoices):
    ACTIVE = 'active', 'Actif'
    EXPIRED = 'expired', 'Expiré'
    SUSPENDED = 'suspended', 'Suspendu'
    REVOKED = 'revoked', 'Révoqué'
    PENDING = 'pending', 'En Attente d\'Approbation'
    RENEWAL_REQUIRED = 'renewal_required', 'Renouvellement Requis'


def generate_license_number(license_type):
    """Generate a unique license number based on type and current year"""
    from datetime import datetime
    
    # License type prefixes
    type_prefixes = {
        'PHARMACY': 'PH',
        'HOSPITAL': 'HP',
        'OCCUPATIONAL_HEALTH': 'OH',
        'PHARMACY_HOSPITAL': 'PH-HP',
        'HOSPITAL_OCCUPATIONAL_HEALTH': 'HP-OH',
        'COMBINED': 'ALL',
    }
    
    year = datetime.now().year
    prefix = type_prefixes.get(license_type, 'LIC')
    
    # Find the next sequential number
    from .models import License
    existing_licenses = License.objects.filter(
        license_number__startswith=f"{prefix}-{year}-"
    ).order_by('license_number')
    
    if existing_licenses.exists():
        last_license = existing_licenses.last()
        try:
            last_number = int(last_license.license_number.split('-')[-1])
            next_number = last_number + 1
        except (IndexError, ValueError):
            next_number = 1
    else:
        next_number = 1
    
    return f"{prefix}-{year}-{next_number:04d}"


class License(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    license_number = models.CharField(
        max_length=100,
        unique=True,
        blank=True,
        help_text='Auto-generated unique license number'
    )
    type = models.CharField(
        max_length=50,
        choices=LicenseType.choices,
        help_text='Type of license'
    )
    status = models.CharField(
        max_length=50,
        choices=LicenseStatus.choices,
        default=LicenseStatus.PENDING,
        help_text='Current license status'
    )
    
    # License holder (organization only)
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='licenses',
        help_text='Organization holding this license'
    )
    
    # License details
    issuing_authority = models.CharField(
        max_length=200,
        default='Ministère de la Santé Publique - RD Congo',
        help_text='Authority that issued the license'
    )
    issued_date = models.DateField(
        default=timezone.now,
        help_text='Date license was issued'
    )
    expiry_date = models.DateField(help_text='Date license expires')
    renewal_date = models.DateField(
        null=True,
        blank=True,
        help_text='Next renewal date (if different from expiry)'
    )
    
    # License content
    title = models.CharField(
        max_length=200, 
        blank=True,
        help_text='License title/name (auto-generated if empty)'
    )
    description = models.TextField(blank=True, help_text='License description')
    scope_of_practice = models.TextField(
        blank=True,
        help_text='Scope of practice or permitted activities'
    )
    conditions = models.TextField(
        blank=True,
        help_text='Special conditions or restrictions'
    )
    
    # Renewal and compliance
    renewal_required = models.BooleanField(
        default=True,
        help_text='Whether license requires periodic renewal'
    )
    renewal_period_months = models.PositiveIntegerField(
        default=12,
        help_text='Renewal period in months'
    )
    ceu_required = models.BooleanField(
        default=False,
        help_text='Continuing Education Units required for renewal'
    )
    ceu_hours_required = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='CEU hours required for renewal'
    )
    
    # Audit trail
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_licenses'
    )
    
    metadata = models.JSONField(default=dict, blank=True, help_text='Additional license data')

    class Meta:
        db_table = 'licenses'
        verbose_name = 'Licence'
        verbose_name_plural = 'Licences'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['license_number']),
            models.Index(fields=['type', 'status']),
            models.Index(fields=['expiry_date']),
            models.Index(fields=['organization']),
        ]

    def save(self, *args, **kwargs):
        # Auto-generate license number if not provided
        if not self.license_number:
            self.license_number = generate_license_number(self.type)
        
        # Auto-generate title if not provided
        if not self.title:
            self.title = f"Licence {self.get_type_display()} - {self.organization.name}"
        
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.license_number} - {self.get_type_display()} ({self.organization.name})"

    def clean(self):
        from django.core.exceptions import ValidationError
        from datetime import timedelta
        
        # Ensure expiry date is in the future for new licenses
        if not self.pk and self.expiry_date and self.expiry_date <= timezone.now().date():
            raise ValidationError("Expiry date must be in the future")
        
        # Set default expiry date if not provided (1 year from issued date)
        if not self.expiry_date:
            self.expiry_date = self.issued_date + timedelta(days=365)

    @property
    def holder(self):
        """Return the license holder (organization)"""
        return self.organization

    @property
    def is_expired(self):
        """Check if license is expired"""
        return self.expiry_date < timezone.now().date()

    @property
    def is_expiring_soon(self, days=30):
        """Check if license is expiring within specified days"""
        from datetime import timedelta
        warning_date = timezone.now().date() + timedelta(days=days)
        return self.expiry_date <= warning_date and not self.is_expired

    @property
    def days_until_expiry(self):
        """Number of days until license expires"""
        delta = self.expiry_date - timezone.now().date()
        return delta.days
    
    @property
    def license_modules(self):
        """Return list of modules covered by this license"""
        modules = []
        if self.type in ['PHARMACY', 'PHARMACY_HOSPITAL', 'COMBINED']:
            modules.append('Pharmacie')
        if self.type in ['HOSPITAL', 'PHARMACY_HOSPITAL', 'HOSPITAL_OCCUPATIONAL_HEALTH', 'COMBINED']:
            modules.append('Hôpital')
        if self.type in ['OCCUPATIONAL_HEALTH', 'HOSPITAL_OCCUPATIONAL_HEALTH', 'COMBINED']:
            modules.append('Santé au Travail')
        return modules

    def get_license_fee(self):
        """Calculate license fee based on type"""
        base_fees = {
            'PHARMACY': 500.00,
            'HOSPITAL': 1000.00,
            'OCCUPATIONAL_HEALTH': 750.00,
            'PHARMACY_HOSPITAL': 1200.00,
            'HOSPITAL_OCCUPATIONAL_HEALTH': 1500.00,
            'COMBINED': 2000.00,
        }
        return base_fees.get(self.type, 500.00)


class LicenseDocument(models.Model):
    """Documents associated with licenses (certificates, renewals, etc.)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    license = models.ForeignKey(
        License,
        on_delete=models.CASCADE,
        related_name='documents'
    )
    document_type = models.CharField(
        max_length=50,
        choices=[
            ('certificate', 'Certificat'),
            ('renewal', 'Document de Renouvellement'),
            ('amendment', 'Amendement'),
            ('correspondence', 'Correspondance Officielle'),
            ('inspection_report', 'Rapport d\'Inspection'),
        ]
    )
    title = models.CharField(max_length=200)
    file = models.FileField(upload_to='license_documents/')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    uploaded_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True
    )

    class Meta:
        db_table = 'license_documents'
        verbose_name = 'Document de Licence'
        verbose_name_plural = 'Documents de Licence'

    def __str__(self):
        return f"{self.title} ({self.license.license_number})"


class LicenseRenewal(models.Model):
    """Track license renewal history"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    license = models.ForeignKey(
        License,
        on_delete=models.CASCADE,
        related_name='renewals'
    )
    renewal_date = models.DateField()
    new_expiry_date = models.DateField()
    renewal_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )
    ceu_hours_completed = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='CEU hours completed for this renewal'
    )
    notes = models.TextField(blank=True)
    processed_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True
    )
    processed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'license_renewals'
        verbose_name = 'Renouvellement de Licence'
        verbose_name_plural = 'Renouvellements de Licence'
        ordering = ['-renewal_date']

    def __str__(self):
        return f"{self.license.license_number} - Renewed {self.renewal_date}"