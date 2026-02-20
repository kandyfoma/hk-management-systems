from django.db import models
from django.core.validators import MinValueValidator
import uuid


class SaleType(models.TextChoices):
    COUNTER = 'COUNTER', 'Vente au comptoir'
    PRESCRIPTION = 'PRESCRIPTION', 'Vente sur ordonnance'
    INSURANCE = 'INSURANCE', 'Vente assurance'
    WHOLESALE = 'WHOLESALE', 'Vente en gros'
    RETURN = 'RETURN', 'Retour/Remboursement'


class SaleStatus(models.TextChoices):
    COMPLETED = 'COMPLETED', 'Terminée'
    VOIDED = 'VOIDED', 'Annulée'
    REFUNDED = 'REFUNDED', 'Remboursée'
    PARTIAL_REFUND = 'PARTIAL_REFUND', 'Partiellement remboursée'
    ON_HOLD = 'ON_HOLD', 'En attente'


class SalePaymentStatus(models.TextChoices):
    PAID = 'PAID', 'Payée'
    PARTIAL = 'PARTIAL', 'Partiellement payée'
    UNPAID = 'UNPAID', 'Impayée'
    REFUNDED = 'REFUNDED', 'Remboursée'


class PaymentMethod(models.TextChoices):
    CASH = 'CASH', 'Espèces'
    CARD = 'CARD', 'Carte bancaire'
    MOBILE_MONEY = 'MOBILE_MONEY', 'Mobile Money'
    BANK_TRANSFER = 'BANK_TRANSFER', 'Virement bancaire'
    CHEQUE = 'CHEQUE', 'Chèque'
    INSURANCE = 'INSURANCE', 'Assurance'
    CREDIT = 'CREDIT', 'À crédit'
    VOUCHER = 'VOUCHER', 'Bon d\'achat'


class Sale(models.Model):
    """Completed pharmacy sales transaction"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='sales'
    )
    facility_id = models.CharField(max_length=100, help_text='Identifiant de l\'établissement')
    
    # Identification
    sale_number = models.CharField(max_length=50, unique=True, help_text='Numéro de vente')
    receipt_number = models.CharField(max_length=50, help_text='Numéro de reçu')
    type = models.CharField(
        max_length=50,
        choices=SaleType.choices,
        default=SaleType.COUNTER
    )
    
    # Customer Information
    customer = models.ForeignKey(
        'patients.Patient',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sales'
    )
    customer_name = models.CharField(max_length=200, blank=True, help_text='Nom client occasionnel')
    customer_phone = models.CharField(max_length=20, blank=True)
    customer_email = models.EmailField(blank=True)
    
    # Prescription Reference
    prescription = models.ForeignKey(
        'prescriptions.Prescription',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sales'
    )
    
    # Line Items Summary
    item_count = models.PositiveIntegerField(default=0, help_text='Nombre d\'articles')
    total_quantity = models.PositiveIntegerField(default=0, help_text='Quantité totale')
    
    # Financial Details
    subtotal = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        help_text='Sous-total avant remise/taxe'
    )
    discount_type = models.CharField(
        max_length=20,
        choices=[
            ('PERCENTAGE', 'Pourcentage'),
            ('FIXED', 'Montant fixe'),
            ('NONE', 'Aucune'),
        ],
        default='NONE'
    )
    discount_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text='Valeur de remise'
    )
    discount_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text='Montant de remise appliqué'
    )
    tax_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text='Montant des taxes'
    )
    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        help_text='Montant total'
    )
    currency = models.CharField(max_length=3, default='CDF')
    
    # Payment Status
    total_paid = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text='Montant total payé'
    )
    change_given = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text='Monnaie rendue'
    )
    payment_status = models.CharField(
        max_length=20,
        choices=SalePaymentStatus.choices,
        default=SalePaymentStatus.UNPAID
    )
    
    # Sale Status
    status = models.CharField(
        max_length=20,
        choices=SaleStatus.choices,
        default=SaleStatus.COMPLETED
    )
    void_reason = models.CharField(max_length=200, blank=True)
    voided_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='voided_sales'
    )
    voided_at = models.DateTimeField(null=True, blank=True)
    
    # Staff Information
    cashier = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='sales_as_cashier'
    )
    cashier_name = models.CharField(max_length=200, help_text='Nom du caissier')
    
    # System Information
    terminal_id = models.CharField(max_length=50, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    
    # Receipt Information
    receipt_printed = models.BooleanField(default=False)
    print_count = models.PositiveIntegerField(default=0)
    
    # Notes
    notes = models.TextField(blank=True)
    
    # Audit Trail
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_sales'
    )
    processed_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='processed_sales'
    )
    authorized_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='authorized_sales'
    )
    
    # Access Tracking
    last_accessed_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='accessed_sales'
    )
    last_accessed_at = models.DateTimeField(null=True, blank=True)
    access_count = models.PositiveIntegerField(default=0)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'sales'
        verbose_name = 'Vente'
        verbose_name_plural = 'Ventes'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['sale_number']),
            models.Index(fields=['receipt_number']),
            models.Index(fields=['status']),
            models.Index(fields=['created_at']),
            models.Index(fields=['cashier', 'created_at']),
        ]

    def __str__(self):
        return f"Vente {self.sale_number} - {self.total_amount} {self.currency}"

    @property
    def customer_display_name(self):
        """Return customer name for display"""
        if self.customer:
            return self.customer.full_name
        return self.customer_name or "Client anonyme"

    def save(self, *args, **kwargs):
        # Auto-generate sale number if not provided
        if not self.sale_number:
            from django.utils import timezone
            today = timezone.now().date()
            count = Sale.objects.filter(created_at__date=today).count() + 1
            self.sale_number = f"VNT-{today.strftime('%Y%m%d')}-{count:03d}"
            
        # Auto-generate receipt number
        if not self.receipt_number:
            self.receipt_number = f"REC-{self.sale_number.split('-', 1)[1]}"
            
        super().save(*args, **kwargs)


class SaleItem(models.Model):
    """Individual line items in a sale"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name='items')
    
    # Product Information
    product = models.ForeignKey(
        'inventory.Product',
        on_delete=models.CASCADE,
        related_name='sale_items'
    )
    inventory_batch = models.ForeignKey(
        'inventory.InventoryBatch',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sale_items'
    )
    
    # Item Details (captured at time of sale)
    product_name = models.CharField(max_length=200, help_text='Nom du produit au moment de la vente')
    product_sku = models.CharField(max_length=100)
    unit_of_measure = models.CharField(max_length=50)
    
    # Pricing & Quantities
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    unit_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Coût unitaire pour calcul de marge'
    )
    
    # Discounts
    discount_type = models.CharField(
        max_length=20,
        choices=[
            ('PERCENTAGE', 'Pourcentage'),
            ('FIXED', 'Montant fixe'),
            ('NONE', 'Aucune'),
        ],
        default='NONE'
    )
    discount_value = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Line Total
    line_total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text='Total ligne après remise'
    )
    
    # Prescription Reference
    prescription_item = models.ForeignKey(
        'prescriptions.PrescriptionItem',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sale_items'
    )
    
    # Dispensing Information (for prescription items)
    pharmacist_notes = models.TextField(blank=True)
    patient_counseling = models.TextField(blank=True)
    is_substitution = models.BooleanField(default=False, help_text='Substitution générique')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'sale_items'
        verbose_name = 'Article Vendu'
        verbose_name_plural = 'Articles Vendus'
        ordering = ['id']

    def __str__(self):
        return f"{self.product_name} x{self.quantity} - {self.line_total}"

    def save(self, *args, **kwargs):
        # Calculate line total
        subtotal = self.quantity * self.unit_price
        if self.discount_type == 'PERCENTAGE':
            self.discount_amount = subtotal * (self.discount_value / 100)
        elif self.discount_type == 'FIXED':
            self.discount_amount = self.discount_value
        else:
            self.discount_amount = 0
        
        self.line_total = subtotal - self.discount_amount
        super().save(*args, **kwargs)


class SalePayment(models.Model):
    """Payment methods used for a sale (supports split payments)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name='payments')
    
    payment_method = models.CharField(
        max_length=50,
        choices=PaymentMethod.choices,
        help_text='Méthode de paiement'
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0.01)],
        help_text='Montant payé avec cette méthode'
    )
    currency = models.CharField(max_length=3, default='CDF')
    
    # Payment Details
    reference_number = models.CharField(max_length=100, blank=True, help_text='Numéro de référence')
    card_last_four = models.CharField(max_length=4, blank=True, help_text='4 derniers chiffres carte')
    card_type = models.CharField(max_length=20, blank=True, help_text='Type de carte')
    mobile_money_number = models.CharField(max_length=20, blank=True)
    mobile_money_operator = models.CharField(max_length=50, blank=True)
    cheque_number = models.CharField(max_length=50, blank=True)
    bank_name = models.CharField(max_length=100, blank=True)
    
    # Insurance Details
    insurance_provider = models.CharField(max_length=200, blank=True)
    insurance_policy_number = models.CharField(max_length=100, blank=True)
    insurance_approval_code = models.CharField(max_length=100, blank=True)
    patient_copay = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Quote-part patient'
    )
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=[
            ('PENDING', 'En attente'),
            ('CONFIRMED', 'Confirmé'),
            ('FAILED', 'Échoué'),
            ('CANCELLED', 'Annulé'),
            ('REFUNDED', 'Remboursé'),
        ],
        default='CONFIRMED'
    )
    
    # Processing Information
    processed_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True
    )
    processed_at = models.DateTimeField(auto_now_add=True)
    
    # Notes
    notes = models.TextField(blank=True)
    
    class Meta:
        db_table = 'sale_payments'
        verbose_name = 'Paiement Vente'
        verbose_name_plural = 'Paiements Vente'
        ordering = ['-processed_at']

    def __str__(self):
        method = self.get_payment_method_display()
        return f"{method}: {self.amount} {self.currency}"


# Cart Models for POS interface
class Cart(models.Model):
    """Shopping cart for POS system"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='carts'
    )
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='carts'
    )
    
    # Cart Information
    cart_name = models.CharField(max_length=100, blank=True, help_text='Nom du panier')
    customer = models.ForeignKey(
        'patients.Patient',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    customer_name = models.CharField(max_length=200, blank=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    is_saved = models.BooleanField(default=False, help_text='Panier sauvegardé pour plus tard')
    
    # Totals (calculated)
    item_count = models.PositiveIntegerField(default=0)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_activity = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'carts'
        verbose_name = 'Panier'
        verbose_name_plural = 'Paniers'
        ordering = ['-last_activity']

    def __str__(self):
        return f"Panier {self.user.full_name} - {self.item_count} articles"


class CartItem(models.Model):
    """Items in a shopping cart"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    
    product = models.ForeignKey(
        'inventory.Product',
        on_delete=models.CASCADE,
        related_name='cart_items'
    )
    inventory_batch = models.ForeignKey(
        'inventory.InventoryBatch',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Discount
    discount_type = models.CharField(
        max_length=20,
        choices=[
            ('PERCENTAGE', 'Pourcentage'),
            ('FIXED', 'Montant fixe'),
            ('NONE', 'Aucune'),
        ],
        default='NONE'
    )
    discount_value = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    line_total = models.DecimalField(max_digits=12, decimal_places=2)
    
    # Prescription Reference
    prescription_item = models.ForeignKey(
        'prescriptions.PrescriptionItem',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    
    # Notes
    notes = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'cart_items'
        unique_together = ('cart', 'product', 'inventory_batch')
        verbose_name = 'Article Panier'
        verbose_name_plural = 'Articles Panier'

    def __str__(self):
        return f"{self.product.name} x{self.quantity}"

    def save(self, *args, **kwargs):
        # Calculate line total
        subtotal = self.quantity * self.unit_price
        if self.discount_type == 'PERCENTAGE':
            self.discount_amount = subtotal * (self.discount_value / 100)
        elif self.discount_type == 'FIXED':
            self.discount_amount = self.discount_value
        else:
            self.discount_amount = 0
        
        self.line_total = subtotal - self.discount_amount
        super().save(*args, **kwargs)