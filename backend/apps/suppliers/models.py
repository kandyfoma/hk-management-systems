from django.db import models
from phonenumber_field.modelfields import PhoneNumberField
import uuid


class PaymentTerms(models.TextChoices):
    CASH_ON_DELIVERY = 'CASH_ON_DELIVERY', 'Paiement à la livraison'
    NET_7 = 'NET_7', 'Net 7 jours'
    NET_15 = 'NET_15', 'Net 15 jours'
    NET_30 = 'NET_30', 'Net 30 jours'
    NET_60 = 'NET_60', 'Net 60 jours'
    NET_90 = 'NET_90', 'Net 90 jours'
    PREPAID = 'PREPAID', 'Prépayé'
    CREDIT = 'CREDIT', 'Crédit'


class Supplier(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='suppliers'
    )
    
    # Basic Information
    name = models.CharField(max_length=200, help_text='Nom du fournisseur')
    code = models.CharField(max_length=50, help_text='Code interne du fournisseur')
    contact_person = models.CharField(max_length=200, help_text='Personne de contact')
    
    # Contact Information
    phone = PhoneNumberField(help_text='Numéro de téléphone principal')
    alt_phone = PhoneNumberField(blank=True, help_text='Numéro de téléphone alternatif')
    email = models.EmailField(blank=True, help_text='Adresse e-mail')
    website = models.URLField(blank=True, help_text='Site web')
    
    # Address
    address = models.TextField(help_text='Adresse complète')
    city = models.CharField(max_length=100)
    country = models.CharField(max_length=100, default='Congo (RDC)')
    
    # Legal Information
    tax_id = models.CharField(max_length=100, blank=True, help_text='Numéro d\'identification fiscale')
    license_number = models.CharField(
        max_length=100, 
        blank=True, 
        help_text='Numéro de licence de distribution pharmaceutique'
    )
    
    # Financial Terms
    payment_terms = models.CharField(
        max_length=50,
        choices=PaymentTerms.choices,
        default=PaymentTerms.NET_30,
        help_text='Conditions de paiement'
    )
    credit_limit = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Limite de crédit'
    )
    current_balance = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text='Solde actuel avec le fournisseur'
    )
    currency = models.CharField(max_length=3, default='CDF', help_text='Devise')
    
    # Banking Information
    bank_name = models.CharField(max_length=200, blank=True)
    bank_account_number = models.CharField(max_length=100, blank=True)
    
    # Performance Metrics
    rating = models.PositiveIntegerField(
        default=5,
        help_text='Note qualité du fournisseur (1-5)'
    )
    lead_time_days = models.PositiveIntegerField(
        default=7,
        help_text='Délai de livraison moyen en jours'
    )
    
    # Status
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True, help_text='Notes additionnelles')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'suppliers'
        verbose_name = 'Fournisseur'
        verbose_name_plural = 'Fournisseurs'
        unique_together = ('organization', 'code')
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.code})"

    @property
    def total_orders(self):
        return self.purchase_orders.count()
    
    @property
    def pending_orders_count(self):
        return self.purchase_orders.filter(status='PENDING').count()
    
    @property
    def products_supplied_count(self):
        return self.products.filter(is_active=True).count()


class SupplierContact(models.Model):
    """Additional contacts for suppliers"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name='contacts')
    
    name = models.CharField(max_length=200)
    title = models.CharField(max_length=100, blank=True)
    department = models.CharField(max_length=100, blank=True)
    phone = PhoneNumberField(blank=True)
    email = models.EmailField(blank=True)
    is_primary = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'supplier_contacts'
        verbose_name = 'Contact Fournisseur'
        verbose_name_plural = 'Contacts Fournisseur'
        
    def __str__(self):
        return f"{self.name} - {self.supplier.name}"