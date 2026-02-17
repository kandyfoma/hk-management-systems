from django.db import models
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey
from django.utils import timezone
import json

User = get_user_model()


class AuditActionType(models.TextChoices):
    CREATE = 'CREATE', 'Création'
    UPDATE = 'UPDATE', 'Modification'
    DELETE = 'DELETE', 'Suppression'
    LOGIN = 'LOGIN', 'Connexion'
    LOGOUT = 'LOGOUT', 'Déconnexion'
    LOGIN_FAILED = 'LOGIN_FAILED', 'Échec de connexion'
    VIEW = 'VIEW', 'Consultation'
    DOWNLOAD = 'DOWNLOAD', 'Téléchargement'
    UPLOAD = 'UPLOAD', 'Téléversement'
    PRINT = 'PRINT', 'Impression'
    EXPORT = 'EXPORT', 'Exportation'
    IMPORT = 'IMPORT', 'Importation'
    DISPENSE = 'DISPENSE', 'Dispensation'
    SALE = 'SALE', 'Vente'
    REFUND = 'REFUND', 'Remboursement'
    VOID = 'VOID', 'Annulation'
    STOCK_ADJUSTMENT = 'STOCK_ADJUSTMENT', 'Ajustement de stock'
    INVENTORY_COUNT = 'INVENTORY_COUNT', 'Comptage inventaire'
    PRICE_CHANGE = 'PRICE_CHANGE', 'Changement de prix'
    PERMISSION_CHANGE = 'PERMISSION_CHANGE', 'Changement de permission'
    PRESCRIPTION_RECEIVE = 'PRESCRIPTION_RECEIVE', 'Réception ordonnance'
    PRESCRIPTION_VALIDATE = 'PRESCRIPTION_VALIDATE', 'Validation ordonnance'
    PRESCRIPTION_REJECT = 'PRESCRIPTION_REJECT', 'Rejet ordonnance'
    SUPPLIER_ORDER = 'SUPPLIER_ORDER', 'Commande fournisseur'
    INVENTORY_RECEIVE = 'INVENTORY_RECEIVE', 'Réception marchandise'
    BATCH_EXPIRE = 'BATCH_EXPIRE', 'Expiration lot'


class AuditSeverity(models.TextChoices):
    LOW = 'LOW', 'Faible'
    MEDIUM = 'MEDIUM', 'Moyen'
    HIGH = 'HIGH', 'Élevé'
    CRITICAL = 'CRITICAL', 'Critique'


class AuditLog(models.Model):
    """Comprehensive audit logging for all user activities"""
    
    # User information
    user = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        verbose_name="Utilisateur"
    )
    username = models.CharField(
        max_length=150, 
        blank=True,
        verbose_name="Nom d'utilisateur",
        help_text="Nom d'utilisateur au moment de l'action"
    )
    user_email = models.EmailField(
        blank=True,
        verbose_name="Email utilisateur"
    )
    
    # Session information
    session_key = models.CharField(
        max_length=40, 
        blank=True,
        verbose_name="Clé de session"
    )
    ip_address = models.GenericIPAddressField(
        null=True, 
        blank=True,
        verbose_name="Adresse IP"
    )
    user_agent = models.TextField(
        blank=True,
        verbose_name="Agent utilisateur"
    )
    
    # Action details
    action = models.CharField(
        max_length=50, 
        choices=AuditActionType.choices,
        verbose_name="Action"
    )
    severity = models.CharField(
        max_length=20,
        choices=AuditSeverity.choices,
        default=AuditSeverity.MEDIUM,
        verbose_name="Sévérité"
    )
    description = models.TextField(
        verbose_name="Description",
        help_text="Description détaillée de l'action"
    )
    
    # Target object (generic foreign key)
    content_type = models.ForeignKey(
        ContentType, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        verbose_name="Type d'objet"
    )
    object_id = models.PositiveIntegerField(
        null=True, 
        blank=True,
        verbose_name="ID objet"
    )
    content_object = GenericForeignKey('content_type', 'object_id')
    object_repr = models.CharField(
        max_length=255, 
        blank=True,
        verbose_name="Représentation objet",
        help_text="Représentation textuelle de l'objet au moment de l'action"
    )
    
    # Change tracking
    old_values = models.JSONField(
        null=True, 
        blank=True,
        verbose_name="Anciennes valeurs",
        help_text="Valeurs avant modification (JSON)"
    )
    new_values = models.JSONField(
        null=True, 
        blank=True,
        verbose_name="Nouvelles valeurs",
        help_text="Valeurs après modification (JSON)"
    )
    
    # Context information
    module = models.CharField(
        max_length=100, 
        blank=True,
        verbose_name="Module",
        help_text="Module/app où l'action a eu lieu"
    )
    view_name = models.CharField(
        max_length=100, 
        blank=True,
        verbose_name="Nom de la vue"
    )
    request_method = models.CharField(
        max_length=10, 
        blank=True,
        verbose_name="Méthode HTTP"
    )
    request_path = models.CharField(
        max_length=500, 
        blank=True,
        verbose_name="Chemin de la requête"
    )
    
    # Additional context
    additional_data = models.JSONField(
        null=True, 
        blank=True,
        verbose_name="Données supplémentaires",
        help_text="Informations contextuelles supplémentaires (JSON)"
    )
    
    # Success/failure tracking
    success = models.BooleanField(
        default=True,
        verbose_name="Succès"
    )
    error_message = models.TextField(
        blank=True,
        verbose_name="Message d'erreur"
    )
    
    # Timing
    timestamp = models.DateTimeField(
        default=timezone.now,
        verbose_name="Horodatage",
        db_index=True
    )
    duration_ms = models.PositiveIntegerField(
        null=True, 
        blank=True,
        verbose_name="Durée (ms)",
        help_text="Durée de l'opération en millisecondes"
    )
    
    # Organization context (for multi-tenant)
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Organisation"
    )
    
    class Meta:
        db_table = 'audit_log'
        verbose_name = 'Journal d\'audit'
        verbose_name_plural = 'Journaux d\'audit'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['action', 'timestamp']),
            models.Index(fields=['content_type', 'object_id']),
            models.Index(fields=['organization', 'timestamp']),
            models.Index(fields=['severity', 'timestamp']),
            models.Index(fields=['success', 'timestamp']),
        ]
    
    def __str__(self):
        return f"{self.get_action_display()} by {self.username or 'Anonymous'} at {self.timestamp}"
    
    def save(self, *args, **kwargs):
        # Auto-populate username and email from user if not set
        if self.user and not self.username:
            self.username = self.user.get_username()
        if self.user and not self.user_email:
            self.user_email = self.user.email
        
        # Auto-populate object representation
        if self.content_object and not self.object_repr:
            self.object_repr = str(self.content_object)[:255]
            
        super().save(*args, **kwargs)
    
    @classmethod
    def log_action(cls, user, action, description, **kwargs):
        """Convenience method to log an action"""
        log_entry = cls(
            user=user,
            action=action,
            description=description,
            **kwargs
        )
        log_entry.save()
        return log_entry


class PharmacyAuditLog(models.Model):
    """Specialized audit log for pharmacy-specific operations"""
    
    audit_log = models.OneToOneField(
        AuditLog,
        on_delete=models.CASCADE,
        verbose_name="Journal d'audit"
    )
    
    # Pharmacy-specific fields
    prescription_number = models.CharField(
        max_length=50,
        blank=True,
        verbose_name="Numéro d'ordonnance"
    )
    product_sku = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="SKU produit"
    )
    product_name = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Nom produit"
    )
    batch_number = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Numéro de lot"
    )
    quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Quantité"
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Montant"
    )
    patient_id = models.CharField(
        max_length=50,
        blank=True,
        verbose_name="ID Patient",
        help_text="ID anonymisé du patient"
    )
    doctor_name = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Nom médecin"
    )
    sale_number = models.CharField(
        max_length=50,
        blank=True,
        verbose_name="Numéro de vente"
    )
    supplier_name = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Nom fournisseur"
    )
    
    # Compliance tracking
    requires_verification = models.BooleanField(
        default=False,
        verbose_name="Nécessite vérification"
    )
    verified_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_pharmacy_audits',
        verbose_name="Vérifié par"
    )
    verification_timestamp = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Horodatage vérification"
    )
    
    class Meta:
        db_table = 'pharmacy_audit_log'
        verbose_name = 'Journal d\'audit pharmacie'
        verbose_name_plural = 'Journaux d\'audit pharmacie'
        ordering = ['-audit_log__timestamp']
    
    def __str__(self):
        return f"Pharmacy audit: {self.audit_log}"


class AuditLogSummary(models.Model):
    """Daily summary of audit activities for reporting"""
    
    date = models.DateField(
        verbose_name="Date",
        db_index=True
    )
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        verbose_name="Organisation"
    )
    
    # Activity counts
    total_actions = models.PositiveIntegerField(
        default=0,
        verbose_name="Total actions"
    )
    login_count = models.PositiveIntegerField(
        default=0,
        verbose_name="Nombre de connexions"
    )
    failed_login_count = models.PositiveIntegerField(
        default=0,
        verbose_name="Échecs de connexion"
    )
    sales_count = models.PositiveIntegerField(
        default=0,
        verbose_name="Nombre de ventes"
    )
    prescriptions_dispensed = models.PositiveIntegerField(
        default=0,
        verbose_name="Ordonnances dispensées"
    )
    inventory_changes = models.PositiveIntegerField(
        default=0,
        verbose_name="Changements inventaire"
    )
    
    # Severity counts
    critical_actions = models.PositiveIntegerField(
        default=0,
        verbose_name="Actions critiques"
    )
    high_severity_actions = models.PositiveIntegerField(
        default=0,
        verbose_name="Actions haute sévérité"
    )
    failed_actions = models.PositiveIntegerField(
        default=0,
        verbose_name="Actions échouées"
    )
    
    # User activity
    active_users_count = models.PositiveIntegerField(
        default=0,
        verbose_name="Utilisateurs actifs"
    )
    unique_ips_count = models.PositiveIntegerField(
        default=0,
        verbose_name="IPs uniques"
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Créé le"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Mis à jour le"
    )
    
    class Meta:
        db_table = 'audit_log_summary'
        verbose_name = 'Résumé journal d\'audit'
        verbose_name_plural = 'Résumés journaux d\'audit'
        unique_together = ['date', 'organization']
        ordering = ['-date']
    
    def __str__(self):
        return f"Résumé audit {self.date} - {self.organization}"