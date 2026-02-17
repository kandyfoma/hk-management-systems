from django.contrib import admin
from .models import Supplier, SupplierContact, PaymentTerms


class SupplierContactInline(admin.TabularInline):
    model = SupplierContact
    extra = 0
    fields = ['contact_type', 'first_name', 'last_name', 'email', 'phone', 'position', 'is_primary']


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ['name', 'supplier_code', 'supplier_type', 'status', 'rating', 'is_active']
    list_filter = ['supplier_type', 'status', 'rating', 'is_active', 'country']
    search_fields = ['name', 'supplier_code', 'tax_id', 'email']
    readonly_fields = ['supplier_code', 'rating', 'created_at', 'updated_at']
    inlines = [SupplierContactInline]
    
    fieldsets = (
        ('Informations de base', {
            'fields': ('name', 'supplier_code', 'supplier_type', 'status', 'rating')
        }),
        ('Contact', {
            'fields': ('email', 'phone', 'website')
        }),
        ('Adresse', {
            'fields': ('address_line_1', 'address_line_2', 'city', 'state_province', 'postal_code', 'country')
        }),
        ('Informations légales', {
            'fields': ('tax_id', 'registration_number', 'license_number')
        }),
        ('Conditions commerciales', {
            'fields': ('credit_limit', 'currency', 'minimum_order_amount')
        }),
        ('Délais', {
            'fields': ('lead_time_days', 'delivery_terms')
        }),
        ('Statut', {
            'fields': ('is_active', 'is_preferred')
        }),
        ('Notes', {
            'fields': ('notes',)
        }),
        ('Métadonnées', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    actions = ['mark_active', 'mark_inactive', 'mark_preferred']
    
    def mark_active(self, request, queryset):
        queryset.update(is_active=True)
    mark_active.short_description = "Marquer comme actif"
    
    def mark_inactive(self, request, queryset):
        queryset.update(is_active=False)
    mark_inactive.short_description = "Marquer comme inactif"
    
    def mark_preferred(self, request, queryset):
        queryset.update(is_preferred=True)
    mark_preferred.short_description = "Marquer comme préféré"


@admin.register(SupplierContact)
class SupplierContactAdmin(admin.ModelAdmin):
    list_display = ['supplier', 'first_name', 'last_name', 'contact_type', 'email', 'phone', 'is_primary']
    list_filter = ['contact_type', 'is_primary']
    search_fields = ['first_name', 'last_name', 'email', 'supplier__name']
    
    fieldsets = (
        ('Contact', {
            'fields': ('supplier', 'contact_type', 'first_name', 'last_name', 'position')
        }),
        ('Informations de contact', {
            'fields': ('email', 'phone', 'mobile')
        }),
        ('Statut', {
            'fields': ('is_primary', 'is_active')
        }),
        ('Notes', {
            'fields': ('notes',)
        })
    )


@admin.register(PaymentTerms)
class PaymentTermsAdmin(admin.ModelAdmin):
    list_display = ['supplier', 'payment_method', 'payment_days', 'discount_percentage', 'discount_days']
    list_filter = ['payment_method', 'is_active']
    search_fields = ['supplier__name', 'description']
    
    fieldsets = (
        ('Fournisseur', {
            'fields': ('supplier',)
        }),
        ('Conditions de paiement', {
            'fields': ('payment_method', 'payment_days', 'description')
        }),
        ('Remise', {
            'fields': ('discount_percentage', 'discount_days')
        }),
        ('Pénalités', {
            'fields': ('late_fee_percentage', 'grace_period_days')
        }),
        ('Statut', {
            'fields': ('is_active',)
        })
    )