# Reports System - Quick Start Guide

## ⚡ 5-Minute Setup

### 1. Create Migration
```bash
python manage.py makemigrations reports
```

### 2. Apply Migration
```bash
python manage.py migrate reports
```

### 3. Test the API
```bash
# Get daily sales report
curl http://localhost:8000/api/v1/reports/sales/daily_summary/

# Get inventory health
curl http://localhost:8000/api/v1/reports/inventory/stock_health/
```

---

## 📊 Available Reports

### Sales (5 reports)
- `GET /api/v1/reports/sales/daily_summary/` - Today's sales
- `GET /api/v1/reports/sales/period_summary/` - Date range analysis
- `GET /api/v1/reports/sales/top_products/` - Best sellers
- `GET /api/v1/reports/sales/payment_analysis/` - Payment methods

### Inventory (3 reports)
- `GET /api/v1/reports/inventory/stock_health/` - Stock status
- `GET /api/v1/reports/inventory/products_expiring_soon/` - Expiring items
- `GET /api/v1/reports/inventory/warehouse_valuation/` - Total value

### Occupational Health (3 reports)
- `GET /api/v1/reports/occupational-health/examination_summary/` - Exams
- `GET /api/v1/reports/occupational-health/incident_report/` - Incidents
- `GET /api/v1/reports/occupational-health/regulatory_compliance/` - CNSS/DRC

### Hospital (1 report)
- `GET /api/v1/reports/hospital/patient_statistics/` - Patient data

### Compliance (1 report)
- `GET /api/v1/reports/compliance/audit_summary/` - Audit log summary

---

## 🎯 Most Used Endpoints

### Daily Sales (Most Important)
```bash
curl "http://localhost:8000/api/v1/reports/sales/daily_summary/?date=2026-02-27"
```
Returns: Total revenue, item count, payment breakdown

### Inventory Health
```bash
curl "http://localhost:8000/api/v1/reports/inventory/stock_health/"
```
Returns: Critical items count, low stock count, optimal, overstock

### Expiring Products
```bash
curl "http://localhost:8000/api/v1/reports/inventory/products_expiring_soon/?days=90"
```
Returns: Products expiring within 90 days

---

## 🖥️ Frontend Usage

### React Hook
```jsx
import { useState, useEffect } from 'react';
import axios from 'axios';

function SalesReport() {
  const [data, setData] = useState(null);

  useEffect(() => {
    axios.get('/api/v1/reports/sales/daily_summary/')
      .then(res => setData(res.data));
  }, []);

  return (
    <div>
      {data && (
        <>
          <h2>Daily Sales: ${data.total_revenue}</h2>
          <p>Transactions: {data.total_sales}</p>
        </>
      )}
    </div>
  );
}
```

### Use React Components
```jsx
import { DailySalesReport } from './ReportsDashboard';

export function Dashboard() {
  return <DailySalesReport date={new Date()} />;
}
```

---

## 🔒 Authentication

Add auth header:
```bash
curl -H "Authorization: Token YOUR_TOKEN" \
  http://localhost:8000/api/v1/reports/sales/daily_summary/
```

---

## ✅ What's Included

✅ 13 Report endpoints  
✅ Organization isolation  
✅ Real-time data aggregation  
✅ Modern React components  
✅ Full test suite  
✅ Django admin interface  
✅ Production-ready queries  

---

## 🚀 Next: Export & Scheduling (Optional)

Add to `requirements.txt`:
```
reportlab==4.0.4  # PDF exports
openpyxl==3.10.0  # Excel exports
celery==5.3.0     # Task scheduling
```

---

## 📞 Support

- Check `/api/v1/reports/` documentation
- Review tests in `apps/reports/tests.py`
- Admin interface: `/admin`
