from django.contrib import admin
from django.utils import timezone
from .models import Sale, SaleItem, SalePayment, Cart, CartItem


class SaleItemInline(admin.TabularInline):
    model = SaleItem
    extra = 0
    readonly_fields = ['line_total']


class SalePaymentInline(admin.TabularInline):
    model = SalePayment
    extra = 0
    readonly_fields = ['processed_at']


@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = ['sale_number', 'customer_name', 'cashier_name', 'total_amount', 'status', 'created_at']
    list_filter = ['status', 'type', 'payment_status', 'created_at']
    search_fields = ['sale_number', 'receipt_number', 'customer_name']
    readonly_fields = ['sale_number', 'receipt_number', 'subtotal', 'tax_amount', 'discount_amount', 'total_amount', 'item_count']
    inlines = [SaleItemInline, SalePaymentInline]
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Informations de vente', {
            'fields': ('sale_number', 'receipt_number', 'status', 'type')
        }),
        ('Client', {
            'fields': ('customer', 'customer_name', 'customer_phone')
        }),
        ('Caissier', {
            'fields': ('cashier', 'cashier_name')
        }),
        ('Montants', {
            'fields': ('subtotal', 'tax_amount', 'discount_amount', 'total_amount', 'item_count')
        }),
        ('Statut de paiement', {
            'fields': ('payment_status',)
        }),
        ('Prescription', {
            'fields': ('prescription', 'insurance_claim_number')
        }),
        ('Notes', {
            'fields': ('notes',)
        }),
        ('Annulation', {
            'fields': ('void_reason', 'voided_by', 'voided_at'),
            'classes': ('collapse',)
        })
    )


@admin.register(SaleItem)
class SaleItemAdmin(admin.ModelAdmin):
    list_display = ['sale', 'product', 'quantity', 'unit_price', 'line_total']
    list_filter = ['sale__created_at', 'tax_rate']
    search_fields = ['product__name', 'product_code', 'sale__sale_number']
    readonly_fields = ['line_total']


@admin.register(SalePayment)
class SalePaymentAdmin(admin.ModelAdmin):
    list_display = ['sale', 'payment_method', 'amount', 'status', 'processed_at']
    list_filter = ['payment_method', 'status', 'processed_at']
    search_fields = ['sale__sale_number', 'reference_number']
    readonly_fields = ['processed_at']


class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ['cart_name', 'user', 'is_active', 'customer_name', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['cart_name', 'customer_name', 'user__email']
    inlines = [CartItemInline]


@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = ['cart', 'product', 'quantity', 'unit_price', 'discount_amount']
    list_filter = ['added_at']
    search_fields = ['product__name', 'cart__cart_name']