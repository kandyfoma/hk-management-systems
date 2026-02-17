from django.db import models
from phonenumber_field.modelfields import PhoneNumberField
import uuid


class OrganizationType(models.TextChoices):
    HOSPITAL = 'hospital', 'Hôpital'
    PHARMACY = 'pharmacy', 'Pharmacie'  
    CLINIC = 'clinic', 'Clinique'
    LABORATORY = 'laboratory', 'Laboratoire'
    HEALTH_CENTER = 'health_center', 'Centre de Santé'


class Organization(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, help_text='Nom de l\'organisation')
    type = models.CharField(
        max_length=50,
        choices=OrganizationType.choices,
        help_text='Type d\'organisation'
    )
    registration_number = models.CharField(
        max_length=100,
        unique=True,
        help_text='Numéro d\'enregistrement gouvernemental'
    )
    license_number = models.CharField(
        max_length=100,
        blank=True,
        help_text='Numéro de licence d\'exploitation'
    )
    address = models.TextField(help_text='Adresse complète')
    city = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=20, blank=True)
    country = models.CharField(max_length=100, default='Hong Kong')
    phone = PhoneNumberField(help_text='Numéro de téléphone principal')
    email = models.EmailField(help_text='Adresse e-mail principale')
    website = models.URLField(blank=True, help_text='Site web de l\'organisation')
    
    # Administrative details
    director_name = models.CharField(max_length=200, help_text='Nom du directeur/administrateur')
    director_license = models.CharField(
        max_length=100,
        blank=True,
        help_text='Licence professionnelle du directeur'
    )
    
    # Status and dates
    is_active = models.BooleanField(default=True)
    established_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    metadata = models.JSONField(default=dict, blank=True, help_text='Additional organization data')

    class Meta:
        db_table = 'organizations'
        verbose_name = 'Organisation'
        verbose_name_plural = 'Organisations'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.get_type_display()})"

    @property
    def active_users_count(self):
        return self.users.filter(is_active=True).count()

    @property
    def total_users_count(self):
        return self.users.count()