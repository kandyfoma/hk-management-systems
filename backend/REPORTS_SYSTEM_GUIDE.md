"""
Modern Reporting System - Frontend Integration Guide

The new comprehensive reporting system provides enterprise-grade analytics 
and reporting capabilities across all modules.
"""

# ==================== API ENDPOINTS ====================

"""
## Sales Reports
GET /api/v1/reports/sales/daily_summary/
    Query Parameters:
    - date: YYYY-MM-DD (default: today)
    
    Returns:
    {
        "date": "2026-02-27",
        "total_sales": 45,
        "total_revenue": 15423.50,
        "total_items_sold": 523,
        "total_quantity": 1240,
        "avg_transaction_value": 342.75,
        "total_discount_given": 1250.00,
        "total_tax_collected": 2103.45,
        "payment_methods": [
            {"payment_method": "CASH", "count": 30, "amount": "9000.00"},
            {"payment_method": "CARD", "count": 15, "amount": "6423.50"}
        ],
        "sale_count_by_type": [
            {"type": "COUNTER", "count": 40},
            {"type": "PRESCRIPTION", "count": 5}
        ]
    }

GET /api/v1/reports/sales/period_summary/
    Query Parameters:
    - start_date: YYYY-MM-DD (required)
    - end_date: YYYY-MM-DD (required)
    
    Returns:
    {
        "period": "2026-02-01 to 2026-02-27",
        "total_revenue": 450000.00,
        "total_transactions": 1250,
        "avg_daily_revenue": 16964.29,
        "daily_breakdown": [
            {"date": "2026-02-01", "revenue": "15000.00", "transactions": 42, "avg_value": "357.14"},
            ...
        ]
    }

GET /api/v1/reports/sales/top_products/
    Query Parameters:
    - limit: 10 (default: 10)
    - period_days: 30 (default: 30)
    
    Returns:
    {
        "period_days": 30,
        "top_products": [
            {
                "product__name": "Paracetamol 500mg",
                "product__id": "uuid",
                "total_revenue": "5000.00",
                "quantity_sold": 500,
                "transactions": 125,
                "avg_price": "10.00"
            },
            ...
        ]
    }

GET /api/v1/reports/sales/payment_analysis/
    Query Parameters:
    - period_days: 30 (default: 30)
    
    Returns:
    {
        "period_days": 30,
        "total_transactions": 450,
        "total_value": "150000.00",
        "by_method": [
            {
                "payment_method": "CASH",
                "count": 300,
                "total_amount": "95000.00",
                "avg_amount": "316.67",
                "success_rate": 99.8
            },
            ...
        ]
    }

## Inventory Reports

GET /api/v1/reports/inventory/stock_health/
    Returns inventory status overview:
    {
        "critical_count": 15,
        "low_count": 45,
        "optimal_count": 250,
        "overstock_count": 20,
        "total_items": 330,
        "critical_percentage": 4.55
    }

GET /api/v1/reports/inventory/products_expiring_soon/
    Query Parameters:
    - days: 90 (threshold in days, default: 90)
    
    Returns:
    {
        "threshold_days": 90,
        "expiring_soon": [
            {
                "product__name": "Antibiotics Blend",
                "batch_number": "LOT2024001",
                "expiration_date": "2026-04-15",
                "quantity": 50,
                "days_until_expiry": "47 days"
            },
            ...
        ]
    }

GET /api/v1/reports/inventory/warehouse_valuation/
    Returns total inventory value by category:
    {
        "total_inventory_value": "285000.00",
        "by_category": [
            {
                "product__category": "MEDICATION",
                "total_value": "175000.00",
                "item_count": 456,
                "stock_quantity": 12500
            },
            ...
        ]
    }

## Occupational Health Reports

GET /api/v1/reports/occupational-health/examination_summary/
    Query Parameters:
    - period_days: 30 (default: 30)
    
    Returns:
    {
        "period_days": 30,
        "total_examinations": 125,
        "by_examination_type": [
            {"examination_type": "pre_employment", "count": 45},
            {"examination_type": "periodic", "count": 60},
            {"examination_type": "return_to_work", "count": 20}
        ],
        "fitness_certificates": 200,
        "fitness_breakdown": [
            {"recommendation": "FIT", "count": 180},
            {"recommendation": "CONDITIONAL", "count": 15},
            {"recommendation": "UNFIT", "count": 5}
        ]
    }

GET /api/v1/reports/occupational-health/incident_report/
    Query Parameters:
    - period_days: 90 (default: 90)
    
    Returns:
    {
        "period_days": 90,
        "total_incidents": 23,
        "by_type": [
            {"incident_type": "ACCIDENT", "count": 18},
            {"incident_type": "NEAR_MISS", "count": 5}
        ],
        "by_severity": [
            {"severity": "MINOR", "count": 15, "injuries": 8},
            {"severity": "SERIOUS", "count": 7, "injuries": 15},
            {"severity": "FATAL", "count": 1, "injuries": 1}
        ],
        "total_injuries": 24
    }

GET /api/v1/reports/occupational-health/regulatory_compliance/
    Returns:
    {
        "cnss_reports": [
            {"reporting_month": "2026-02", "submitted": 1, "pending": 0},
            {"reporting_month": "2026-01", "submitted": 1, "pending": 0}
        ],
        "drc_reports": [
            {"year": 2026, "count": 1, "compliance_rate": 98.5},
            {"year": 2025, "count": 3, "compliance_rate": 97.2}
        ]
    }

## Hospital Operations Reports

GET /api/v1/reports/hospital/patient_statistics/
    Query Parameters:
    - period_days: 30 (default: 30)
    
    Returns:
    {
        "period_days": 30,
        "new_patients": 156,
        "total_prescriptions": 342,
        "avg_medications_per_prescription": 2.5
    }

## Compliance Reports

GET /api/v1/reports/compliance/audit_summary/
    Query Parameters:
    - period_days: 30 (default: 30)
    
    Returns:
    {
        "period_days": 30,
        "total_actions": 8450,
        "failed_actions": 12,
        "by_action_type": [
            {"action": "CREATE_SALE", "count": 3200},
            {"action": "UPDATE_STOCK", "count": 2100},
            ...
        ],
        "top_users": [
            {"user__full_name": "Dr. Jean Dupont", "count": 1250},
            ...
        ]
    }
"""

# ==================== FRONTEND USAGE EXAMPLES ====================

# React Hook Example - Fetch Daily Sales
"""
import { useState, useEffect } from 'react';
import axios from 'axios';

export function DailySalesReport() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const response = await axios.get('/api/v1/reports/sales/daily_summary/', {
          params: { date: '2026-02-27' }
        });
        setData(response.data);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="report-container">
      <h2>Daily Sales Report - {data.date}</h2>
      <div className="metrics-grid">
        <MetricCard label="Total Sales" value={data.total_sales} />
        <MetricCard label="Revenue" value={`$${data.total_revenue}`} />
        <MetricCard label="Items Sold" value={data.total_items_sold} />
        <MetricCard label="Avg Transaction" value={`$${data.avg_transaction_value}`} />
      </div>
      
      <PaymentMethodChart data={data.payment_methods} />
      <SalesTypeChart data={data.sale_count_by_type} />
    </div>
  );
}
"""

# ==================== FEATURES ====================

"""
1. Real-time Analytics
   - Automatically aggregated from source data
   - No manual data entry
   - Always reflects current state

2. Flexible Date Ranges
   - Single day reports
   - Period analysis
   - Configurable look-back periods

3. Export Capability
   - Export to PDF, Excel, CSV
   - Scheduled report generation
   - Email delivery

4. User Interaction Tracking
   - Who generated the report
   - When it was generated
   - Download tracking

5. Organization Isolation
   - Each organization sees only their data
   - Multi-tenant safe
"""

# ==================== MIGRATION COMMANDS ====================

"""
1. Create the reports app migration:
   python manage.py makemigrations reports

2. Apply the migration:
   python manage.py migrate reports

3. Verify the setup:
   python manage.py check

4. Access the reports admin interface:
   - Go to http://localhost:8000/admin
   - Navigate to "Reports & Analytics"
"""
