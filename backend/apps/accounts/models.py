from django.contrib.auth.models import AbstractUser
from django.db import models
from phonenumber_field.modelfields import PhoneNumberField
import uuid


class UserRole(models.TextChoices):
    ADMIN = 'admin', 'Super Administrateur'
    HOSPITAL_ADMIN = 'hospital_admin', 'Administrateur Hospitalier'  
    PHARMACY_ADMIN = 'pharmacy_admin', 'Administrateur Pharmacie'
    DOCTOR = 'doctor', 'Médecin'
    NURSE = 'nurse', 'Infirmier/ière'
    PHARMACIST = 'pharmacist', 'Pharmacien'
    PHARMACY_TECH = 'pharmacy_tech', 'Technicien Pharmacie'
    RECEPTIONIST = 'receptionist', 'Réceptionniste'
    LAB_TECHNICIAN = 'lab_technician', 'Technicien Laboratoire'
    CASHIER = 'cashier', 'Caissier/ière'
    INVENTORY_MANAGER = 'inventory_manager', 'Gestionnaire Inventaire'


class Permission(models.TextChoices):
    MANAGE_USERS = 'manage_users', 'Gérer les Utilisateurs'
    VIEW_PATIENTS = 'view_patients', 'Voir les Patients'
    MANAGE_PATIENTS = 'manage_patients', 'Gérer les Patients'
    PRESCRIBE_MEDICATION = 'prescribe_medication', 'Prescrire des Médicaments'
    DISPENSE_MEDICATION = 'dispense_medication', 'Dispenser des Médicaments'
    MANAGE_INVENTORY = 'manage_inventory', 'Gérer l\'Inventaire'
    VIEW_REPORTS = 'view_reports', 'Voir les Rapports'
    MANAGE_BILLING = 'manage_billing', 'Gérer la Facturation'
    MANAGE_APPOINTMENTS = 'manage_appointments', 'Gérer les Rendez-vous'
    ACCESS_LAB_RESULTS = 'access_lab_results', 'Accéder aux Résultats Lab'
    MANAGE_SYSTEM_SETTINGS = 'manage_system_settings', 'Gérer Paramètres Système'
    MANAGE_LICENSES = 'manage_licenses', 'Gérer les Licences'
    VIEW_ANALYTICS = 'view_analytics', 'Voir les Analyses'
    MANAGE_SUPPLIERS = 'manage_suppliers', 'Gérer les Fournisseurs'
    ACCESS_POS = 'access_pos', 'Accéder au POS'
    MANAGE_PRESCRIPTIONS = 'manage_prescriptions', 'Gérer les Prescriptions'
    ACCESS_MEDICAL_RECORDS = 'access_medical_records', 'Accéder Dossiers Médicaux'
    MANAGE_WARDS = 'manage_wards', 'Gérer les Services'
    VIEW_FINANCIAL_REPORTS = 'view_financial_reports', 'Voir Rapports Financiers'


class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = None  # Remove username field
    email = models.EmailField(unique=True, null=True, blank=True)
    phone = PhoneNumberField(unique=True, help_text='Numéro de téléphone (identifiant de connexion)')
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    primary_role = models.CharField(
        max_length=50, 
        choices=UserRole.choices,
        help_text='Rôle du personnel'
    )
    department = models.CharField(max_length=100, blank=True, help_text='Affectation du département')
    employee_id = models.CharField(max_length=50, blank=True, help_text='Numéro d\'employé interne')
    professional_license = models.CharField(
        max_length=100, 
        blank=True, 
        help_text='Numéro de licence médicale/pharmaceutique'
    )
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='users'
    )
    last_login = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True, help_text='Indicateur de compte actif')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    metadata = models.JSONField(default=dict, blank=True, help_text='Métadonnées JSON extensibles')

    USERNAME_FIELD = 'phone'
    REQUIRED_FIELDS = ['first_name', 'last_name', 'primary_role']

    class Meta:
        db_table = 'users'
        verbose_name = 'Utilisateur'
        verbose_name_plural = 'Utilisateurs'

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.phone})"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    def get_role_display_name(self):
        return dict(UserRole.choices).get(self.primary_role, self.primary_role)

    def get_default_permissions(self):
        """Get default permissions based on user role"""
        permission_map = {
            UserRole.ADMIN: [p[0] for p in Permission.choices],  # All permissions
            UserRole.HOSPITAL_ADMIN: [
                Permission.MANAGE_USERS, Permission.VIEW_PATIENTS, Permission.MANAGE_PATIENTS,
                Permission.MANAGE_APPOINTMENTS, Permission.VIEW_REPORTS, Permission.MANAGE_SYSTEM_SETTINGS,
                Permission.MANAGE_LICENSES, Permission.VIEW_ANALYTICS, Permission.MANAGE_WARDS,
                Permission.VIEW_FINANCIAL_REPORTS
            ],
            UserRole.PHARMACY_ADMIN: [
                Permission.MANAGE_USERS, Permission.DISPENSE_MEDICATION, Permission.MANAGE_INVENTORY,
                Permission.MANAGE_SUPPLIERS, Permission.ACCESS_POS, Permission.MANAGE_PRESCRIPTIONS,
                Permission.VIEW_REPORTS, Permission.VIEW_ANALYTICS
            ],
            UserRole.DOCTOR: [
                Permission.VIEW_PATIENTS, Permission.MANAGE_PATIENTS, Permission.PRESCRIBE_MEDICATION,
                Permission.ACCESS_LAB_RESULTS, Permission.ACCESS_MEDICAL_RECORDS, Permission.MANAGE_APPOINTMENTS
            ],
            UserRole.NURSE: [
                Permission.VIEW_PATIENTS, Permission.MANAGE_PATIENTS, Permission.ACCESS_LAB_RESULTS,
                Permission.ACCESS_MEDICAL_RECORDS
            ],
            UserRole.PHARMACIST: [
                Permission.DISPENSE_MEDICATION, Permission.MANAGE_INVENTORY, Permission.MANAGE_PRESCRIPTIONS,
                Permission.ACCESS_POS
            ],
            UserRole.PHARMACY_TECH: [
                Permission.DISPENSE_MEDICATION, Permission.MANAGE_INVENTORY, Permission.ACCESS_POS
            ],
            UserRole.RECEPTIONIST: [
                Permission.VIEW_PATIENTS, Permission.MANAGE_APPOINTMENTS, Permission.MANAGE_BILLING
            ],
            UserRole.LAB_TECHNICIAN: [
                Permission.ACCESS_LAB_RESULTS, Permission.VIEW_PATIENTS
            ],
            UserRole.CASHIER: [
                Permission.ACCESS_POS, Permission.MANAGE_BILLING
            ],
            UserRole.INVENTORY_MANAGER: [
                Permission.MANAGE_INVENTORY, Permission.MANAGE_SUPPLIERS, Permission.VIEW_REPORTS
            ],
        }
        return permission_map.get(self.primary_role, [])


class UserPermission(models.Model):
    """Many-to-many through model for user permissions"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='user_permissions')
    permission = models.CharField(max_length=50, choices=Permission.choices)
    granted_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='granted_permissions')
    granted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'permission')
        db_table = 'user_permissions'
        verbose_name = 'Permission Utilisateur'
        verbose_name_plural = 'Permissions Utilisateur'

    def __str__(self):
        return f"{self.user.full_name} - {self.get_permission_display()}"