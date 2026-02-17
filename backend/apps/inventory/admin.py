from django.contrib import admin
from .models import (
    Product, InventoryItem, InventoryBatch, StockMovement, InventoryAlert
)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'sku', 'category', 'selling_price', 'minimum_stock_level', 'is_active']
    list_filter = ['category', 'is_active', 'requires_prescription', 'dosage_form']
    search_fields = ['name', 'sku', 'barcode', 'generic_name']
    readonly_fields = ['profit_margin', 'created_at', 'updated_at']
    fieldsets = (
        ('Informations de base', {
            'fields': ('name', 'generic_name', 'sku', 'barcode', 'description', 'image')
        }),
        ('Classification', {
            'fields': ('category', 'dosage_form', 'strength', 'unit', 'manufacturer')
        }),
        ('Réglementation', {
            'fields': ('requires_prescription', 'is_controlled_substance', 'controlled_class')
        }),
        ('Prix et stock', {
            'fields': ('cost_price', 'selling_price', 'profit_margin', 'minimum_stock_level', 'maximum_stock_level', 'reorder_quantity')
        }),
        ('Stockage', {
            'fields': ('storage_conditions', 'primary_supplier')
        }),
        ('Statut', {
            'fields': ('is_active',)
        }),
        ('Métadonnées', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )


@admin.register(InventoryItem)
class InventoryItemAdmin(admin.ModelAdmin):
    list_display = ['product', 'current_quantity', 'stock_status', 'unit_cost', 'total_value', 'last_movement']
    list_filter = ['stock_status', 'is_active', 'last_restock']
    search_fields = ['product__name', 'product__sku', 'location']
    readonly_fields = ['available_quantity', 'stock_status', 'total_value', 'last_restock', 'last_movement']


@admin.register(InventoryBatch)
class InventoryBatchAdmin(admin.ModelAdmin):
    list_display = ['batch_number', 'inventory_item', 'current_quantity', 'expiry_date', 'status']
    list_filter = ['status', 'manufacture_date', 'expiry_date']
    search_fields = ['batch_number', 'lot_number', 'inventory_item__product__name']
    readonly_fields = ['is_expired', 'days_to_expiry']


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ['inventory_item', 'movement_type', 'direction', 'quantity', 'movement_date', 'performed_by']
    list_filter = ['movement_type', 'direction', 'movement_date']
    search_fields = ['inventory_item__product__name', 'reference_number', 'reason']
    readonly_fields = ['total_value']
    date_hierarchy = 'movement_date'


@admin.register(InventoryAlert)
class InventoryAlertAdmin(admin.ModelAdmin):
    list_display = ['product', 'alert_type', 'severity', 'is_active', 'acknowledged', 'created_at']
    list_filter = ['alert_type', 'severity', 'is_active', 'acknowledged']
    search_fields = ['product__name', 'message']
    actions = ['mark_acknowledged', 'mark_active']
    
    def mark_acknowledged(self, request, queryset):
        queryset.update(acknowledged=True, acknowledged_by=request.user, acknowledged_at=timezone.now())
    mark_acknowledged.short_description = "Marquer comme accusé de réception"
    
    def mark_active(self, request, queryset):
        queryset.update(is_active=True)
    mark_active.short_description = "Marquer comme actif"