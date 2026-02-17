from django.contrib import admin
from .models import Supplier, SupplierContact


class SupplierContactInline(admin.TabularInline):
    model = SupplierContact
    extra = 0
    fields = ['name', 'title', 'department', 'email', 'phone', 'is_primary']


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'rating', 'is_active']
    list_filter = ['rating', 'is_active', 'country']
    search_fields = ['name', 'code', 'tax_id', 'email']
    readonly_fields = ['code', 'rating', 'created_at', 'updated_at']
    inlines = [SupplierContactInline]
    
    fieldsets = (
        ('Informations de base', {
            'fields': ('name', 'code', 'rating')
        }),
        ('Contact', {
            'fields': ('contact_person', 'email', 'phone', 'alt_phone', 'website')
        }),
        ('Adresse', {
            'fields': ('address', 'city', 'country')
        }),
        ('Informations légales', {
            'fields': ('tax_id', 'license_number')
        }),
        ('Conditions commerciales', {
            'fields': ('credit_limit', 'current_balance', 'currency', 'payment_terms')
        }),
        ('Informations bancaires', {
            'fields': ('bank_name', 'bank_account_number')
        }),
        ('Délais et performance', {
            'fields': ('lead_time_days',)
        }),
        ('Statut', {
            'fields': ('is_active',)
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
        # This action is not available since is_preferred field doesn't exist
        pass
    mark_preferred.short_description = "Action non disponible"


@admin.register(SupplierContact)
class SupplierContactAdmin(admin.ModelAdmin):
    list_display = ['supplier', 'name', 'title', 'email', 'phone', 'is_primary']
    list_filter = ['is_primary', 'department']
    search_fields = ['name', 'title', 'email', 'supplier__name']
    autocomplete_fields = ['supplier']
    
    fieldsets = (
        ('Contact', {
            'fields': ('supplier', 'name', 'title', 'department')
        }),
        ('Informations de contact', {
            'fields': ('email', 'phone')
        }),
        ('Statut', {
            'fields': ('is_primary',)
        }),
        ('Notes', {
            'fields': ('notes',)
        })
    )