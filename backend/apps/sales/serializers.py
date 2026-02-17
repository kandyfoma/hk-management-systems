from rest_framework import serializers
from django.db import transaction
from decimal import Decimal
from .models import Sale, SaleItem, SalePayment, Cart, CartItem
from apps.inventory.models import Product, InventoryItem


class SaleItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    line_total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    
    class Meta:
        model = SaleItem
        fields = [
            'id', 'sale', 'product', 'product_name', 'product_sku', 'product_code',
            'product_description', 'quantity', 'unit_price', 'discount_percentage',
            'discount_amount', 'line_total', 'tax_rate', 'tax_amount', 'batch_number',
            'expiry_date', 'notes'
        ]
        read_only_fields = ['id', 'line_total']


class SalePaymentSerializer(serializers.ModelSerializer):
    processed_by_name = serializers.CharField(source='processed_by.full_name', read_only=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = SalePayment
        fields = [
            'id', 'sale', 'payment_method', 'payment_method_display', 'amount',
            'currency', 'status', 'status_display', 'reference_number',
            'card_last_four', 'processed_at', 'processed_by', 'processed_by_name',
            'notes'
        ]
        read_only_fields = ['id', 'processed_at', 'processed_by']


class SaleListSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(read_only=True)
    cashier_name = serializers.CharField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    payment_status_display = serializers.CharField(source='get_payment_status_display', read_only=True)
    
    class Meta:
        model = Sale
        fields = [
            'id', 'sale_number', 'receipt_number', 'status', 'status_display',
            'type', 'type_display', 'customer', 'customer_name', 'cashier',
            'cashier_name', 'total_amount', 'payment_status', 'payment_status_display',
            'item_count', 'created_at'
        ]


class SaleDetailSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(read_only=True)
    cashier_name = serializers.CharField(read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    payment_status_display = serializers.CharField(source='get_payment_status_display', read_only=True)
    items = SaleItemSerializer(many=True, read_only=True)
    payments = SalePaymentSerializer(many=True, read_only=True)
    
    class Meta:
        model = Sale
        fields = [
            'id', 'organization', 'organization_name', 'sale_number', 'receipt_number',
            'status', 'status_display', 'type', 'type_display', 'customer',
            'customer_name', 'customer_phone', 'cashier', 'cashier_name',
            'subtotal', 'tax_amount', 'discount_amount', 'total_amount',
            'payment_status', 'payment_status_display', 'item_count',
            'prescription', 'insurance_claim_number', 'void_reason',
            'voided_by', 'voided_at', 'notes', 'created_at', 'updated_at',
            'items', 'payments'
        ]


class SaleCreateSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True)
    payments = SalePaymentSerializer(many=True, required=False)
    
    class Meta:
        model = Sale
        fields = [
            'customer', 'customer_name', 'customer_phone', 'type', 'prescription',
            'insurance_claim_number', 'notes', 'items', 'payments'
        ]
    
    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop('items')
        payments_data = validated_data.pop('payments', [])
        
        # Calculate totals
        subtotal = Decimal('0.00')
        tax_amount = Decimal('0.00')
        
        for item_data in items_data:
            quantity = item_data['quantity']
            unit_price = item_data['unit_price']
            discount = item_data.get('discount_amount', Decimal('0.00'))
            tax_rate = item_data.get('tax_rate', Decimal('0.00'))
            
            line_total = (quantity * unit_price) - discount
            line_tax = line_total * (tax_rate / 100)
            
            subtotal += line_total
            tax_amount += line_tax
        
        total_amount = subtotal + tax_amount
        
        sale = Sale.objects.create(
            subtotal=subtotal,
            tax_amount=tax_amount,
            total_amount=total_amount,
            item_count=len(items_data),
            **validated_data
        )
        
        # Create sale items
        for item_data in items_data:
            SaleItem.objects.create(sale=sale, **item_data)
        
        # Create payments if provided
        for payment_data in payments_data:
            SalePayment.objects.create(sale=sale, **payment_data)
        
        return sale


class CartItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    product_price = serializers.DecimalField(source='product.selling_price', max_digits=10, decimal_places=2, read_only=True)
    line_total = serializers.SerializerMethodField()
    
    class Meta:
        model = CartItem
        fields = [
            'id', 'cart', 'product', 'product_name', 'product_sku', 'product_price',
            'quantity', 'unit_price', 'discount_amount', 'line_total', 'notes',
            'added_at'
        ]
        read_only_fields = ['id', 'cart', 'added_at']
    
    def get_line_total(self, obj):
        return (obj.quantity * obj.unit_price) - obj.discount_amount


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    item_count = serializers.SerializerMethodField()
    cart_total = serializers.SerializerMethodField()
    
    class Meta:
        model = Cart
        fields = [
            'id', 'user', 'organization', 'cart_name', 'is_active',
            'customer_name', 'customer_phone', 'created_at', 'updated_at',
            'items', 'item_count', 'cart_total'
        ]
        read_only_fields = ['id', 'user', 'organization', 'created_at', 'updated_at']
    
    def get_item_count(self, obj):
        return obj.items.count()
    
    def get_cart_total(self, obj):
        return sum(
            (item.quantity * item.unit_price) - item.discount_amount 
            for item in obj.items.all()
        )


class QuickSaleSerializer(serializers.Serializer):
    """Serializer for quick sales without saving to cart"""
    customer_name = serializers.CharField(max_length=255, required=False)
    customer_phone = serializers.CharField(max_length=20, required=False)
    items = serializers.ListField(
        child=serializers.DictField(),
        min_length=1
    )
    payment_method = serializers.CharField(max_length=20)
    amount_paid = serializers.DecimalField(max_digits=10, decimal_places=2)
    
    def validate_items(self, value):
        for item in value:
            if 'product_id' not in item or 'quantity' not in item:
                raise serializers.ValidationError(
                    "Each item must have product_id and quantity"
                )
            
            # Check if product exists and is active
            try:
                product = Product.objects.get(id=item['product_id'], is_active=True)
                item['unit_price'] = float(product.selling_price)
            except Product.DoesNotExist:
                raise serializers.ValidationError(
                    f"Product with id {item['product_id']} not found or inactive"
                )
        
        return value
    
    @transaction.atomic
    def create(self, validated_data):
        # Implementation would create sale directly
        return validated_data


class ReturnSaleSerializer(serializers.Serializer):
    """Serializer for sale returns"""
    sale_id = serializers.IntegerField()
    items_to_return = serializers.ListField(
        child=serializers.DictField(),
        min_length=1
    )
    return_reason = serializers.CharField(max_length=500)
    refund_method = serializers.CharField(max_length=20)
    
    def validate_sale_id(self, value):
        try:
            Sale.objects.get(id=value, status='COMPLETED')
        except Sale.DoesNotExist:
            raise serializers.ValidationError("Sale not found or not completed")
        return value