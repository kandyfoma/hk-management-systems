from django.db import models
from django.core.validators import RegexValidator
import uuid


class LicenseType(models.TextChoices):
    PROFESSIONAL_MEDICAL = 'professional_medical', 'Licence Médicale Professionnelle'
    PROFESSIONAL_PHARMACY = 'professional_pharmacy', 'Licence Pharmacie Professionnelle'
    PROFESSIONAL_NURSING = 'professional_nursing', 'Licence Infirmier Professionnelle'
    PROFESSIONAL_LAB_TECH = 'professional_lab_tech', 'Licence Technicien Laboratoire'
    ORGANIZATION_HOSPITAL = 'organization_hospital', 'Licence Exploitation Hôpital'
    ORGANIZATION_PHARMACY = 'organization_pharmacy', 'Licence Exploitation Pharmacie'
    ORGANIZATION_CLINIC = 'organization_clinic', 'Licence Exploitation Clinique'
    SOFTWARE = 'software', 'Licence Logiciel'
    EQUIPMENT_MEDICAL = 'equipment_medical', 'Licence Équipement Médical'
    CONTROLLED_SUBSTANCES = 'controlled_substances', 'Licence Substances Contrôlées'


class LicenseStatus(models.TextChoices):
    ACTIVE = 'active', 'Actif'
    EXPIRED = 'expired', 'Expiré'
    SUSPENDED = 'suspended', 'Suspendu'
    REVOKED = 'revoked', 'Révoqué'
    PENDING = 'pending', 'En Attente d\'Approbation'
    RENEWAL_REQUIRED = 'renewal_required', 'Renouvellement Requis'


class License(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    license_number = models.CharField(
        max_length=100,
        unique=True,
        help_text='Unique license number'
    )
    type = models.CharField(
        max_length=50,
        choices=LicenseType.choices,
        help_text='Type of license'
    )
    status = models.CharField(
        max_length=50,
        choices=LicenseStatus.choices,
        default=LicenseStatus.ACTIVE,
        help_text='Current license status'
    )
    
    # License holder (either user or organization)
    holder_user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='licenses',
        help_text='User holding this license (for professional licenses)'
    )
    holder_organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='licenses',
        help_text='Organization holding this license'
    )
    
    # License details
    issuing_authority = models.CharField(
        max_length=200,
        help_text='Authority that issued the license'
    )
    issued_date = models.DateField(help_text='Date license was issued')
    expiry_date = models.DateField(help_text='Date license expires')
    renewal_date = models.DateField(
        null=True,
        blank=True,
        help_text='Next renewal date (if different from expiry)'
    )
    
    # License content
    title = models.CharField(max_length=200, help_text='License title/name')
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
        null=True,
        blank=True,
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
        ]

    def __str__(self):
        holder = self.holder_user or self.holder_organization
        return f"{self.license_number} - {self.get_type_display()} ({holder})"

    def clean(self):
        from django.core.exceptions import ValidationError
        # Ensure either user or organization is specified, not both
        if self.holder_user and self.holder_organization:
            raise ValidationError("License cannot be held by both user and organization")
        if not self.holder_user and not self.holder_organization:
            raise ValidationError("License must be held by either a user or organization")

    @property
    def holder(self):
        """Return the license holder (user or organization)"""
        return self.holder_user or self.holder_organization

    @property
    def is_expired(self):
        """Check if license is expired"""
        from django.utils import timezone
        return self.expiry_date < timezone.now().date()

    @property
    def is_expiring_soon(self, days=30):
        """Check if license is expiring within specified days"""
        from django.utils import timezone
        from datetime import timedelta
        warning_date = timezone.now().date() + timedelta(days=days)
        return self.expiry_date <= warning_date

    @property
    def days_until_expiry(self):
        """Number of days until license expires"""
        from django.utils import timezone
        delta = self.expiry_date - timezone.now().date()
        return delta.days


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