from django.urls import path
from . import views

app_name = 'audit'

urlpatterns = [
    # Audit logs
    path('logs/', views.AuditLogListAPIView.as_view(), name='audit-log-list'),
    path('logs/<int:pk>/', views.AuditLogDetailAPIView.as_view(), name='audit-log-detail'),
    path('logs/search/', views.search_audit_logs, name='audit-log-search'),
    path('logs/my/', views.my_audit_logs, name='my-audit-logs'),
    path('logs/export/', views.export_audit_logs, name='audit-log-export'),
    
    # Pharmacy audit logs
    path('pharmacy/', views.PharmacyAuditLogListAPIView.as_view(), name='pharmacy-audit-list'),
    path('pharmacy/verify/', views.verify_pharmacy_audits, name='pharmacy-audit-verify'),
    
    # Summaries
    path('summaries/', views.AuditLogSummaryListAPIView.as_view(), name='audit-summary-list'),
    
    # Analytics
    path('analytics/', views.audit_analytics, name='audit-analytics'),
    path('analytics/pharmacy/', views.pharmacy_audit_analytics, name='pharmacy-audit-analytics'),
]