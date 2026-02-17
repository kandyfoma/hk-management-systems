from django.contrib import admin
from .models import (
    Product, InventoryItem, InventoryBatch, StockMovement, InventoryAlert
)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'sku', 'category', 'selling_price', 'min_stock_level', 'is_active']
    list_filter = ['category', 'is_active', 'requires_prescription', 'dosage_form']
    search_fields = ['name', 'sku', 'barcode', 'generic_name']
    readonly_fields = ['created_at', 'updated_at']
    autocomplete_fields = ['primary_supplier']
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
            'fields': ('cost_price', 'selling_price', 'min_stock_level', 'max_stock_level', 'reorder_quantity')
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
    list_display = ['product', 'quantity_on_hand', 'stock_status', 'average_cost', 'total_value', 'last_movement']
    list_filter = ['stock_status', 'last_counted']
    search_fields = ['product__name', 'product__sku', 'location']
    readonly_fields = ['quantity_available', 'total_value', 'last_movement', 'created_at', 'updated_at']
    autocomplete_fields = ['product']


@admin.register(InventoryBatch)
class InventoryBatchAdmin(admin.ModelAdmin):
    list_display = ['batch_number', 'inventory_item', 'current_quantity', 'expiry_date', 'status']
    list_filter = ['status', 'manufacture_date', 'expiry_date']
    search_fields = ['batch_number', 'serial_number', 'inventory_item__product__name']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ['inventory_item', 'movement_type', 'direction', 'quantity', 'movement_date', 'performed_by']
    list_filter = ['movement_type', 'direction', 'movement_date']
    search_fields = ['inventory_item__product__name', 'reference_number', 'reason']
    readonly_fields = ['total_cost', 'balance_before', 'balance_after', 'created_at']
    date_hierarchy = 'movement_date'
    autocomplete_fields = ['inventory_item', 'performed_by']


@admin.register(InventoryAlert)
class InventoryAlertAdmin(admin.ModelAdmin):
    list_display = ['product', 'alert_type', 'severity', 'is_active', 'acknowledged_at', 'created_at']
    list_filter = ['alert_type', 'severity', 'is_active']
    search_fields = ['product__name', 'message', 'title']
    readonly_fields = ['acknowledged_at', 'acknowledged_by', 'resolved_at', 'resolved_by', 'created_at']
    autocomplete_fields = ['product']
    actions = ['mark_acknowledged', 'mark_active']
    
    def mark_acknowledged(self, request, queryset):
        from django.utils import timezone
        queryset.update(acknowledged_by=request.user, acknowledged_at=timezone.now())
    mark_acknowledged.short_description = "Marquer comme accusé de réception"
    
    def mark_active(self, request, queryset):
        queryset.update(is_active=True)
    mark_active.short_description = "Marquer comme actif"