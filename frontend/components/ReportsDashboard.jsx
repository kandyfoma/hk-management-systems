/**
 * Modern Reports Dashboard Component
 * 
 * Comprehensive reporting UI with charts, metrics, and data export
 * Compatible with your HK Management System backend
 */

import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import axios from 'axios';

const API_BASE = '/api/v1/reports';

// ==================== METRIC CARD COMPONENT ====================

const MetricCard = ({ 
  title, 
  value, 
  format = 'number',
  trend = null,
  icon = null 
}) => {
  const style = {
    container: {
      backgroundColor: '#fff',
      borderRadius: '8px',
      padding: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      minWidth: '200px',
    },
    title: {
      fontSize: '12px',
      fontWeight: '500',
      color: '#666',
      textTransform: 'uppercase',
      marginBottom: '10px',
    },
    value: {
      fontSize: '28px',
      fontWeight: '700',
      color: '#333',
    },
    trend: {
      fontSize: '12px',
      marginTop: '10px',
      color: trend?.positive ? '#10b981' : '#ef4444',
    }
  };

  const formatValue = (val) => {
    if (format === 'currency') return `$${Number(val).toLocaleString()}`;
    if (format === 'percent') return `${Number(val).toFixed(1)}%`;
    return Number(val).toLocaleString();
  };

  return (
    <div style={style.container}>
      <div style={style.title}>
        {icon && <span style={{ marginRight: '8px' }}>{icon}</span>}
        {title}
      </div>
      <div style={style.value}>{formatValue(value)}</div>
      {trend && <div style={style.trend}>
        {trend.positive ? '↑' : '↓'} {trend.text}
      </div>}
    </div>
  );
};

// ==================== DAILY SALES REPORT ====================

export const DailySalesReport = ({ date = new Date() }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const dateStr = date.toISOString().split('T')[0];
        const response = await axios.get(`${API_BASE}/sales/daily_summary/`, {
          params: { date: dateStr }
        });
        setData(response.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [date]);

  if (loading) return <div style={{ padding: '20px' }}>Loading...</div>;
  if (error) return <div style={{ padding: '20px', color: 'red' }}>Error: {error}</div>;
  if (!data) return null;

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div style={{ padding: '20px' }}>
      <h2>Daily Sales Report - {data.date}</h2>
      
      {/* Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        <MetricCard title="Total Sales" value={data.total_sales} icon="🛒" />
        <MetricCard title="Revenue" value={data.total_revenue} format="currency" icon="💰" />
        <MetricCard title="Items Sold" value={data.total_items_sold} icon="📦" />
        <MetricCard title="Avg Transaction" value={data.avg_transaction_value} format="currency" icon="📊" />
        <MetricCard title="Discounts Given" value={data.total_discount_given} format="currency" icon="🏷️" />
        <MetricCard title="Tax Collected" value={data.total_tax_collected} format="currency" icon="🧾" />
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '30px' }}>
        
        {/* Payment Methods */}
        <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h3>Payment Methods</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.payment_methods}
                dataKey="amount"
                nameKey="payment_method"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                {data.payment_methods.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Sales by Type */}
        <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h3>Sales by Type</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.sale_count_by_type}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="type" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// ==================== PERIOD SALES REPORT ====================

export const PeriodSalesReport = ({ startDate, endDate }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const response = await axios.get(`${API_BASE}/sales/period_summary/`, {
          params: {
            start_date: startDate,
            end_date: endDate
          }
        });
        setData(response.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [startDate, endDate]);

  if (loading) return <div style={{ padding: '20px' }}>Loading...</div>;
  if (!data) return null;

  return (
    <div style={{ padding: '20px' }}>
      <h2>Sales Analysis - {data.period}</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        <MetricCard title="Total Revenue" value={data.total_revenue} format="currency" icon="💰" />
        <MetricCard title="Total Transactions" value={data.total_transactions} icon="📊" />
        <MetricCard title="Avg Daily Revenue" value={data.avg_daily_revenue} format="currency" icon="📈" />
      </div>

      {/* Daily Trend */}
      <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h3>Daily Revenue Trend</h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={data.daily_breakdown}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
            <Legend />
            <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} />
            <Line type="monotone" dataKey="transactions" stroke="#10b981" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// ==================== TOP PRODUCTS REPORT ====================

export const TopProductsReport = ({ limit = 10, periodDays = 30 }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const response = await axios.get(`${API_BASE}/sales/top_products/`, {
          params: { limit, period_days: periodDays }
        });
        setData(response.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [limit, periodDays]);

  if (loading) return <div style={{ padding: '20px' }}>Loading...</div>;
  if (!data || !data.top_products.length) return <div style={{ padding: '20px' }}>No data</div>;

  return (
    <div style={{ padding: '20px' }}>
      <h2>Top Products (Last {data.period_days} Days)</h2>
      
      <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Product</th>
              <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>Revenue</th>
              <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>Quantity</th>
              <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>Transactions</th>
              <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>Avg Price</th>
            </tr>
          </thead>
          <tbody>
            {data.top_products.map((product, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0', backgroundColor: idx % 2 === 0 ? '#f9f9f9' : '#fff' }}>
                <td style={{ padding: '12px' }}>{product.product__name}</td>
                <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                  ${Number(product.total_revenue).toFixed(2)}
                </td>
                <td style={{ padding: '12px', textAlign: 'right' }}>{product.quantity_sold}</td>
                <td style={{ padding: '12px', textAlign: 'right' }}>{product.transactions}</td>
                <td style={{ padding: '12px', textAlign: 'right' }}>
                  ${Number(product.avg_price).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ==================== INVENTORY HEALTH REPORT ====================

export const InventoryHealthReport = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const response = await axios.get(`${API_BASE}/inventory/stock_health/`);
        setData(response.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, []);

  if (loading) return <div style={{ padding: '20px' }}>Loading...</div>;
  if (!data) return null;

  const chartData = [
    { name: 'Critical', value: data.critical_count, fill: '#ef4444' },
    { name: 'Low', value: data.low_count, fill: '#f59e0b' },
    { name: 'Optimal', value: data.optimal_count, fill: '#10b981' },
    { name: 'Overstock', value: data.overstock_count, fill: '#3b82f6' },
  ];

  return (
    <div style={{ padding: '20px' }}>
      <h2>Inventory Health Status</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        <MetricCard 
          title="Critical Items" 
          value={data.critical_count}
          trend={{ positive: false, text: `${data.critical_percentage}% of inventory` }}
          icon="⚠️"
        />
        <MetricCard title="Low Stock" value={data.low_count} icon="📉" />
        <MetricCard title="Optimal Stock" value={data.optimal_count} icon="✅" />
        <MetricCard title="Overstock" value={data.overstock_count} icon="📦" />
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h3>Stock Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// ==================== COMPREHENSIVE REPORTS DASHBOARD ====================

export const ReportsDashboard = () => {
  const [activeReport, setActiveReport] = useState('daily_sales');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
    end: new Date()
  });

  const reports = [
    { id: 'daily_sales', label: '📊 Daily Sales', icon: '💰' },
    { id: 'period_sales', label: '📈 Period Analysis', icon: '📈' },
    { id: 'top_products', label: '🏆 Top Products', icon: '🏆' },
    { id: 'inventory', label: '📦 Inventory Health', icon: '📦' },
  ];

  const reportComponents = {
    daily_sales: <DailySalesReport />,
    period_sales: (
      <PeriodSalesReport 
        startDate={dateRange.start.toISOString().split('T')[0]}
        endDate={dateRange.end.toISOString().split('T')[0]}
      />
    ),
    top_products: <TopProductsReport />,
    inventory: <InventoryHealthReport />,
  };

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Sidebar */}
      <div style={{ width: '250px', backgroundColor: '#1f2937', color: 'white', padding: '20px', overflowY: 'auto' }}>
        <h1 style={{ fontSize: '20px', marginBottom: '30px' }}>📊 Reports</h1>
        {reports.map(report => (
          <button
            key={report.id}
            onClick={() => setActiveReport(report.id)}
            style={{
              display: 'block',
              width: '100%',
              padding: '12px',
              marginBottom: '10px',
              backgroundColor: activeReport === report.id ? '#3b82f6' : 'transparent',
              border: 'none',
              color: 'white',
              borderRadius: '6px',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '14px',
            }}
          >
            {report.label}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {reportComponents[activeReport]}
      </div>
    </div>
  );
};

export default ReportsDashboard;
