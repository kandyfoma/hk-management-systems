"""
Reports System Tests

Comprehensive test suite for the reporting system to verify:
- API endpoint functionality
- Data aggregation accuracy
- Permission checks
- Date filtering
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from django.utils import timezone
from datetime import timedelta

from apps.organizations.models import Organization
from apps.sales.models import Sale, SalePayment, SaleItem, PaymentMethod
from apps.inventory.models import Product, StockLevel, StockMovement

User = get_user_model()


class SalesReportTestCase(TestCase):
    """Test sales reporting endpoints"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.client = APIClient()
        
        # Create organization
        self.org = Organization.objects.create(
            name='Test Pharmacy',
            organization_type='PHARMACY'
        )
        
        # Create user
        self.user = User.objects.create_user(
            username='pharmacist',
            email='pharm@test.com',
            password='testpass123',
            organization=self.org,
            user_type='PHARMACIST'
        )
        
        self.client.force_authenticate(user=self.user)
    
    def test_daily_sales_summary(self):
        """Test daily sales summary report"""
        today = timezone.now().date()
        
        # Create test sale
        sale = Sale.objects.create(
            organization=self.org,
            sale_number='TEST001',
            receipt_number='RCP001',
            cashier=self.user,
            total_amount=100.00,
            item_count=2,
            total_quantity=5,
            status='COMPLETED'
        )
        
        response = self.client.get(
            '/api/v1/reports/sales/daily_summary/',
            {'date': today}
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_sales'], 1)
        self.assertEqual(float(response.data['total_revenue']), 100.00)
        self.assertEqual(response.data['total_items_sold'], 2)
    
    def test_period_sales_summary(self):
        """Test period sales summary report"""
        start_date = timezone.now().date() - timedelta(days=7)
        end_date = timezone.now().date()
        
        # Create multiple sales
        for i in range(3):
            Sale.objects.create(
                organization=self.org,
                sale_number=f'TEST{i:03d}',
                receipt_number=f'RCP{i:03d}',
                cashier=self.user,
                total_amount=50.00 * (i + 1),
                status='COMPLETED'
            )
        
        response = self.client.get(
            '/api/v1/reports/sales/period_summary/',
            {
                'start_date': start_date,
                'end_date': end_date
            }
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_transactions'], 3)
        self.assertEqual(float(response.data['total_revenue']), 300.00)
    
    def test_unauthorized_access(self):
        """Test that unauthenticated users cannot access reports"""
        self.client.force_authenticate(user=None)
        
        response = self.client.get('/api/v1/reports/sales/daily_summary/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_organization_isolation(self):
        """Test that users only see their organization's data"""
        # Create another organization
        other_org = Organization.objects.create(
            name='Other Pharmacy',
            organization_type='PHARMACY'
        )
        
        # Create sale in other org
        Sale.objects.create(
            organization=other_org,
            sale_number='OTHER001',
            receipt_number='RCP001',
            cashier=self.user,
            total_amount=1000.00,
            status='COMPLETED'
        )
        
        # Create sale in user's org
        Sale.objects.create(
            organization=self.org,
            sale_number='TEST001',
            receipt_number='RCP002',
            cashier=self.user,
            total_amount=100.00,
            status='COMPLETED'
        )
        
        response = self.client.get(
            '/api/v1/reports/sales/daily_summary/',
            {'date': timezone.now().date()}
        )
        
        # Should only see the 100.00 sale, not the 1000.00
        self.assertEqual(float(response.data['total_revenue']), 100.00)


class InventoryReportTestCase(TestCase):
    """Test inventory reporting endpoints"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.client = APIClient()
        
        self.org = Organization.objects.create(
            name='Test Pharmacy',
            organization_type='PHARMACY'
        )
        
        self.user = User.objects.create_user(
            username='pharmacist',
            email='pharm@test.com',
            password='testpass123',
            organization=self.org,
            user_type='PHARMACIST'
        )
        
        self.client.force_authenticate(user=self.user)
    
    def test_stock_health_report(self):
        """Test inventory health status report"""
        # Create products with different stock levels
        product = Product.objects.create(
            organization=self.org,
            name='Test Medicine',
            sku='TEST001',
            category='MEDICATION'
        )
        
        # Create stock level at critical
        StockLevel.objects.create(
            product=product,
            quantity=5,
            minimum_stock=10,
            maximum_stock=100,
            location='Main Warehouse'
        )
        
        response = self.client.get('/api/v1/reports/inventory/stock_health/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['critical_count'], 1)
        self.assertEqual(response.data['total_items'], 1)


if __name__ == '__main__':
    import unittest
    unittest.main()
