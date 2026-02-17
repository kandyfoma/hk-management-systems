from django.db import models
from django.core.validators import MinValueValidator
import uuid


class ProductCategory(models.TextChoices):
    MEDICATION = 'MEDICATION', 'Médicament'
    OTC = 'OTC', 'Sans ordonnance (OTC)'
    SUPPLEMENT = 'SUPPLEMENT', 'Complément alimentaire'
    CONSUMABLE = 'CONSUMABLE', 'Consommable médical'
    MEDICAL_DEVICE = 'MEDICAL_DEVICE', 'Dispositif médical'
    SURGICAL_SUPPLY = 'SURGICAL_SUPPLY', 'Matériel chirurgical'
    COSMETIC = 'COSMETIC', 'Cosmétique'
    BABY_CARE = 'BABY_CARE', 'Soins bébé'
    PERSONAL_HYGIENE = 'PERSONAL_HYGIENE', 'Hygiène personnelle'
    LAB_REAGENT = 'LAB_REAGENT', 'Réactif de laboratoire'
    OTHER = 'OTHER', 'Autre'


class DosageForm(models.TextChoices):
    TABLET = 'TABLET', 'Comprimé'
    CAPSULE = 'CAPSULE', 'Gélule'
    SYRUP = 'SYRUP', 'Sirop'
    SUSPENSION = 'SUSPENSION', 'Suspension'
    INJECTION = 'INJECTION', 'Injectable'
    CREAM = 'CREAM', 'Crème'
    OINTMENT = 'OINTMENT', 'Pommade'
    GEL = 'GEL', 'Gel'
    DROPS = 'DROPS', 'Gouttes'
    INHALER = 'INHALER', 'Inhalateur'
    SUPPOSITORY = 'SUPPOSITORY', 'Suppositoire'
    POWDER = 'POWDER', 'Poudre'
    SOLUTION = 'SOLUTION', 'Solution'
    SPRAY = 'SPRAY', 'Spray'
    INFUSION = 'INFUSION', 'Perfusion'
    DEVICE = 'DEVICE', 'Dispositif'
    OTHER = 'OTHER', 'Autre'


class UnitOfMeasure(models.TextChoices):
    UNIT = 'UNIT', 'Unité'
    TABLET = 'TABLET', 'Comprimé'
    CAPSULE = 'CAPSULE', 'Gélule'
    ML = 'ML', 'ml'
    MG = 'MG', 'mg'
    G = 'G', 'g'
    VIAL = 'VIAL', 'Flacon'
    AMPOULE = 'AMPOULE', 'Ampoule'
    BOTTLE = 'BOTTLE', 'Bouteille'
    BOX = 'BOX', 'Boîte'
    PACK = 'PACK', 'Pack'


class ScheduledDrugClass(models.TextChoices):
    SCHEDULE_I = 'SCHEDULE_I', 'Classe I'
    SCHEDULE_II = 'SCHEDULE_II', 'Classe II'
    SCHEDULE_III = 'SCHEDULE_III', 'Classe III'
    SCHEDULE_IV = 'SCHEDULE_IV', 'Classe IV'
    SCHEDULE_V = 'SCHEDULE_V', 'Classe V'


class StorageCondition(models.TextChoices):
    ROOM_TEMPERATURE = 'ROOM_TEMPERATURE', 'Température ambiante'
    REFRIGERATED = 'REFRIGERATED', 'Réfrigéré (2-8°C)'
    FROZEN = 'FROZEN', 'Congelé (-18°C)'
    CONTROLLED_ROOM = 'CONTROLLED_ROOM', 'Température contrôlée (15-25°C)'
    COOL_DRY = 'COOL_DRY', 'Endroit frais et sec'
    PROTECTED_FROM_LIGHT = 'PROTECTED_FROM_LIGHT', 'Protégé de la lumière'


class Product(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='products'
    )
    
    # Identification
    name = models.CharField(max_length=200, help_text='Nom commercial')
    generic_name = models.CharField(max_length=200, blank=True, help_text='Nom générique (DCI)')
    brand_name = models.CharField(max_length=200, blank=True, help_text='Nom de marque')
    sku = models.CharField(max_length=100, help_text='Code article (SKU)')
    barcode = models.CharField(max_length=50, blank=True, help_text='Code-barres')
    internal_code = models.CharField(max_length=50, blank=True, help_text='Code interne pharmacie')
    
    # Classification
    category = models.CharField(
        max_length=50,
        choices=ProductCategory.choices,
        help_text='Catégorie de produit'
    )
    sub_category = models.CharField(max_length=100, blank=True)
    therapeutic_class = models.CharField(max_length=100, blank=True, help_text='Classification ATC')
    controlled_substance = models.BooleanField(default=False, help_text='Substance contrôlée')
    requires_prescription = models.BooleanField(default=False, help_text='Nécessite une ordonnance')
    scheduled_drug = models.CharField(
        max_length=50,
        choices=ScheduledDrugClass.choices,
        blank=True,
        help_text='Classification stupéfiants'
    )
    
    # Formulation
    dosage_form = models.CharField(
        max_length=50,
        choices=DosageForm.choices,
        help_text='Forme galénique'
    )
    strength = models.CharField(max_length=100, blank=True, help_text='Dosage (ex: 500mg)')
    unit_of_measure = models.CharField(
        max_length=50,
        choices=UnitOfMeasure.choices,
        help_text='Unité de mesure'
    )
    pack_size = models.PositiveIntegerField(default=1, help_text='Nombre d\'unités par paquet')
    pack_type = models.CharField(max_length=50, blank=True, help_text='Type d\'emballage')
    
    # Manufacturer & Supplier
    manufacturer = models.CharField(max_length=200, blank=True)
    manufacturer_country = models.CharField(max_length=100, blank=True)
    primary_supplier = models.ForeignKey(
        'suppliers.Supplier',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='primary_products'
    )
    suppliers = models.ManyToManyField(
        'suppliers.Supplier',
        through='ProductSupplier',
        related_name='products',
        blank=True
    )
    
    # Storage & Handling
    storage_condition = models.CharField(
        max_length=50,
        choices=StorageCondition.choices,
        default=StorageCondition.ROOM_TEMPERATURE
    )
    storage_temperature_min = models.IntegerField(null=True, blank=True)
    storage_temperature_max = models.IntegerField(null=True, blank=True)
    storage_humidity_max = models.IntegerField(null=True, blank=True)
    
    # Business Rules
    track_expiry = models.BooleanField(default=True, help_text='Suivre les dates d\'expiration')
    track_batches = models.BooleanField(default=True, help_text='Suivre les lots')
    is_serialized = models.BooleanField(default=False, help_text='Suivi par numéro de série')
    allow_negative_stock = models.BooleanField(default=False, help_text='Autoriser stock négatif')
    
    # Pricing
    cost_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Prix d\'achat'
    )
    selling_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Prix de vente'
    )
    markup_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Marge en pourcentage'
    )
    currency = models.CharField(max_length=3, default='CDF')
    
    # Inventory Parameters
    reorder_level = models.PositiveIntegerField(default=0, help_text='Seuil de réapprovisionnement')
    reorder_quantity = models.PositiveIntegerField(default=0, help_text='Quantité de réapprovisionnement')
    max_stock_level = models.PositiveIntegerField(null=True, blank=True)
    min_stock_level = models.PositiveIntegerField(default=0)
    
    # Clinical Information (for medications)
    indication = models.TextField(blank=True, help_text='Indications thérapeutiques')
    contraindications = models.TextField(blank=True, help_text='Contre-indications')
    side_effects = models.TextField(blank=True, help_text='Effets secondaires')
    drug_interactions = models.TextField(blank=True, help_text='Interactions médicamenteuses')
    dosage_instructions = models.TextField(blank=True, help_text='Instructions de dosage')
    
    # Regulatory
    registration_number = models.CharField(max_length=100, blank=True, help_text='Numéro d\'enregistrement')
    approval_date = models.DateField(null=True, blank=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    is_discontinued = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'products'
        verbose_name = 'Produit'
        verbose_name_plural = 'Produits'
        unique_together = ('organization', 'sku')
        ordering = ['name']
        indexes = [
            models.Index(fields=['sku']),
            models.Index(fields=['barcode']),
            models.Index(fields=['category']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.name} ({self.sku})"


class ProductSupplier(models.Model):
    """Through model for Product-Supplier many-to-many relationship"""
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    supplier = models.ForeignKey('suppliers.Supplier', on_delete=models.CASCADE)
    supplier_product_code = models.CharField(max_length=100, blank=True)
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    minimum_order_quantity = models.PositiveIntegerField(default=1)
    lead_time_days = models.PositiveIntegerField(default=7)
    is_preferred = models.BooleanField(default=False)
    last_ordered = models.DateField(null=True, blank=True)
    
    class Meta:
        unique_together = ('product', 'supplier')


class InventoryItem(models.Model):
    """Stock levels per product per facility/location"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='inventory_items')
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='inventory_items'
    )
    facility_id = models.CharField(max_length=100, help_text='Identifiant de l\'établissement')
    location = models.CharField(max_length=100, blank=True, help_text='Emplacement (étagère, tiroir)')
    
    # Stock Levels
    quantity_on_hand = models.IntegerField(default=0, help_text='Quantité en stock')
    quantity_reserved = models.IntegerField(default=0, help_text='Quantité réservée')
    quantity_available = models.IntegerField(default=0, help_text='Quantité disponible')
    quantity_on_order = models.IntegerField(default=0, help_text='Quantité commandée')
    
    # Calculated Stock Status
    stock_status = models.CharField(
        max_length=50,
        choices=[
            ('IN_STOCK', 'En stock'),
            ('LOW_STOCK', 'Stock bas'),
            ('OUT_OF_STOCK', 'Rupture'),
            ('OVER_STOCK', 'Sur-stock'),
            ('DISCONTINUED', 'Arrêté'),
            ('QUARANTINED', 'Quarantaine'),
        ],
        default='IN_STOCK'
    )
    
    # Valuation
    average_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text='Coût moyen pondéré'
    )
    total_value = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text='Valeur totale du stock'
    )
    
    # Last Activity
    last_counted = models.DateTimeField(null=True, blank=True)
    last_movement = models.DateTimeField(null=True, blank=True)
    last_received = models.DateTimeField(null=True, blank=True)
    last_sold = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'inventory_items'
        verbose_name = 'Article Inventaire'
        verbose_name_plural = 'Articles Inventaire'
        unique_together = ('product', 'organization', 'facility_id')
    
    def __str__(self):
        return f"{self.product.name} - {self.quantity_on_hand} {self.product.unit_of_measure}"


class InventoryBatch(models.Model):
    """Batch/lot tracking for products with expiry dates"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    inventory_item = models.ForeignKey(
        InventoryItem, 
        on_delete=models.CASCADE, 
        related_name='batches'
    )
    
    # Batch Information
    batch_number = models.CharField(max_length=100, help_text='Numéro de lot')
    serial_number = models.CharField(max_length=100, blank=True, help_text='Numéro de série')
    
    # Dates
    manufacture_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    received_date = models.DateField(help_text='Date de réception')
    
    # Quantities
    initial_quantity = models.PositiveIntegerField(help_text='Quantité initiale')
    current_quantity = models.PositiveIntegerField(help_text='Quantité actuelle')
    reserved_quantity = models.PositiveIntegerField(default=0)
    
    # Cost
    unit_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text='Coût unitaire de ce lot'
    )
    
    # Status
    status = models.CharField(
        max_length=50,
        choices=[
            ('AVAILABLE', 'Disponible'),
            ('EXPIRED', 'Expiré'),
            ('DAMAGED', 'Endommagé'),
            ('RECALLED', 'Rappelé'),
            ('QUARANTINED', 'Quarantaine'),
            ('DEPLETED', 'Épuisé'),
        ],
        default='AVAILABLE'
    )
    
    # Supplier Information
    supplier = models.ForeignKey(
        'suppliers.Supplier',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    purchase_order_id = models.CharField(max_length=100, blank=True)
    
    # Quality Control
    quality_checked = models.BooleanField(default=False)
    quality_notes = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'inventory_batches'
        verbose_name = 'Lot Inventaire'
        verbose_name_plural = 'Lots Inventaire'
        ordering = ['expiry_date']
        indexes = [
            models.Index(fields=['batch_number']),
            models.Index(fields=['expiry_date']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"{self.inventory_item.product.name} - Lot {self.batch_number}"


class StockMovementType(models.TextChoices):
    PURCHASE_RECEIPT = 'PURCHASE_RECEIPT', 'Réception achat'
    SALE = 'SALE', 'Vente'
    PRESCRIPTION = 'PRESCRIPTION', 'Ordonnance'
    TRANSFER_IN = 'TRANSFER_IN', 'Transfert entrant'
    TRANSFER_OUT = 'TRANSFER_OUT', 'Transfert sortant'
    RETURN_TO_SUPPLIER = 'RETURN_TO_SUPPLIER', 'Retour fournisseur'
    CUSTOMER_RETURN = 'CUSTOMER_RETURN', 'Retour client'
    ADJUSTMENT_IN = 'ADJUSTMENT_IN', 'Ajustement +'
    ADJUSTMENT_OUT = 'ADJUSTMENT_OUT', 'Ajustement -'
    DAMAGED = 'DAMAGED', 'Endommagé'
    EXPIRED = 'EXPIRED', 'Expiré'
    DISPOSAL = 'DISPOSAL', 'Élimination'
    DONATION = 'DONATION', 'Don'
    INITIAL_STOCK = 'INITIAL_STOCK', 'Stock initial'
    SAMPLE = 'SAMPLE', 'Échantillon'
    RECALL = 'RECALL', 'Rappel'


class StockMovement(models.Model):
    """All stock movements (in/out) for audit trail"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    inventory_item = models.ForeignKey(
        InventoryItem,
        on_delete=models.CASCADE,
        related_name='movements'
    )
    batch = models.ForeignKey(
        InventoryBatch,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='movements'
    )
    
    # Movement Details
    movement_type = models.CharField(
        max_length=50,
        choices=StockMovementType.choices,
        help_text='Type de mouvement'
    )
    direction = models.CharField(
        max_length=3,
        choices=[('IN', 'Entrée'), ('OUT', 'Sortie')],
        help_text='Direction du mouvement'
    )
    quantity = models.IntegerField(help_text='Quantité (positive pour IN, negative pour OUT)')
    unit_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )
    total_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True
    )
    
    # Reference Information
    reference_number = models.CharField(max_length=100, blank=True, help_text='Numéro de référence')
    sale_id = models.CharField(max_length=100, blank=True)
    purchase_order_id = models.CharField(max_length=100, blank=True)
    transfer_id = models.CharField(max_length=100, blank=True)
    
    # User & Timestamp
    performed_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='stock_movements'
    )
    reason = models.CharField(max_length=200, blank=True, help_text='Raison du mouvement')
    notes = models.TextField(blank=True)
    movement_date = models.DateTimeField(help_text='Date du mouvement')
    
    # Balances After Movement
    balance_before = models.IntegerField(help_text='Solde avant mouvement')
    balance_after = models.IntegerField(help_text='Solde après mouvement')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'stock_movements'
        verbose_name = 'Mouvement Stock'
        verbose_name_plural = 'Mouvements Stock'
        ordering = ['-movement_date']
        indexes = [
            models.Index(fields=['movement_type']),
            models.Index(fields=['movement_date']),
            models.Index(fields=['reference_number']),
        ]
    
    def __str__(self):
        direction_symbol = '+' if self.direction == 'IN' else '-'
        return f"{self.inventory_item.product.name} {direction_symbol}{abs(self.quantity)}"


class InventoryAlert(models.Model):
    """Automated alerts for inventory management"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='alerts')
    inventory_item = models.ForeignKey(
        InventoryItem,
        on_delete=models.CASCADE,
        related_name='alerts',
        null=True,
        blank=True
    )
    batch = models.ForeignKey(
        InventoryBatch,
        on_delete=models.CASCADE,
        related_name='alerts',
        null=True,
        blank=True
    )
    
    alert_type = models.CharField(
        max_length=50,
        choices=[
            ('LOW_STOCK', 'Stock bas'),
            ('OUT_OF_STOCK', 'Rupture de stock'),
            ('EXPIRING_SOON', 'Expire bientôt'),
            ('EXPIRED', 'Expiré'),
            ('OVERSTOCK', 'Surstock'),
            ('REORDER', 'À réapprovisionner'),
            ('QUALITY_ISSUE', 'Problème qualité'),
            ('RECALL', 'Rappel produit'),
        ]
    )
    
    severity = models.CharField(
        max_length=20,
        choices=[
            ('LOW', 'Faible'),
            ('MEDIUM', 'Moyen'),
            ('HIGH', 'Élevé'),
            ('CRITICAL', 'Critique'),
        ],
        default='MEDIUM'
    )
    
    title = models.CharField(max_length=200)
    message = models.TextField()
    
    # Status
    is_active = models.BooleanField(default=True)
    acknowledged_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='resolved_alerts'
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'inventory_alerts'
        verbose_name = 'Alerte Inventaire'
        verbose_name_plural = 'Alertes Inventaire'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['alert_type', 'is_active']),
            models.Index(fields=['severity']),
        ]
    
    def __str__(self):
        return f"{self.get_alert_type_display()}: {self.product.name}"


class StockCount(models.Model):
    """Physical stock count records"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='stock_counts'
    )
    
    count_number = models.CharField(max_length=100, unique=True)
    count_date = models.DateField()
    count_type = models.CharField(
        max_length=20,
        choices=[
            ('FULL', 'Inventaire complet'),
            ('PARTIAL', 'Inventaire partiel'),
            ('CYCLE', 'Inventaire cyclique'),
            ('SPOT', 'Vérification ponctuelle'),
        ]
    )
    
    status = models.CharField(
        max_length=20,
        choices=[
            ('PLANNED', 'Planifié'),
            ('IN_PROGRESS', 'En cours'),
            ('COMPLETED', 'Terminé'),
            ('CANCELLED', 'Annulé'),
        ],
        default='PLANNED'
    )
    
    performed_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True
    )
    
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'stock_counts'
        verbose_name = 'Comptage Stock'
        verbose_name_plural = 'Comptages Stock'
        ordering = ['-count_date']
    
    def __str__(self):
        return f"Comptage {self.count_number} - {self.count_date}"


class StockCountItem(models.Model):
    """Individual items in a stock count"""
    stock_count = models.ForeignKey(StockCount, on_delete=models.CASCADE, related_name='items')
    inventory_item = models.ForeignKey(InventoryItem, on_delete=models.CASCADE)
    batch = models.ForeignKey(InventoryBatch, on_delete=models.CASCADE, null=True, blank=True)
    
    system_quantity = models.IntegerField(help_text='Quantité système')
    counted_quantity = models.IntegerField(help_text='Quantité comptée')
    variance = models.IntegerField(help_text='Écart (compté - système)')
    
    notes = models.TextField(blank=True)
    counted_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True
    )
    counted_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'stock_count_items'
        unique_together = ('stock_count', 'inventory_item', 'batch')
    
    def __str__(self):
        return f"{self.inventory_item.product.name} - Écart: {self.variance}"