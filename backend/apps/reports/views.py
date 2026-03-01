"""
Comprehensive Reporting System for HK Management Systems

Provides modern, data-rich reports across:
- Pharmacy Sales & Financial Performance
- Inventory Management & Stock Health
- Occupational Health Metrics
- Hospital Operations
- Compliance & Regulatory Reporting
"""

from rest_framework import viewsets, status
from rest_framework.decorators import api_view, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count, Avg, Q, F, ExpressionWrapper, DecimalField, Case, When
from django.utils import timezone
from datetime import timedelta, datetime
from django.db import models as django_models
import logging

logger = logging.getLogger(__name__)


# ==================== PHARMACY SALES REPORTS ====================

class SalesReportViewSet(viewsets.ViewSet):
    """
    Comprehensive sales reporting system
    """
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def daily_summary(self, request):
        """Daily sales summary with payment breakdown"""
        from apps.sales.models import Sale, SalePayment, PaymentMethod
        
        date = request.query_params.get('date', timezone.now().date())
        
        sales = Sale.objects.filter(
            created_at__date=date,
            organization=request.user.organization,
            status='COMPLETED'
        )
        
        payments = SalePayment.objects.filter(
            sale__organization=request.user.organization,
            processed_at__date=date
        )
        
        payment_breakdown = payments.values('payment_method').annotate(
            count=Count('id'),
            amount=Sum('amount')
        )
        
        data = {
            'date': date,
            'total_sales': sales.count(),
            'total_revenue': float(sales.aggregate(Sum('total_amount'))['total_amount__sum'] or 0),
            'total_items_sold': int(sales.aggregate(Sum('item_count'))['item_count__sum'] or 0),
            'total_quantity': int(sales.aggregate(Sum('total_quantity'))['total_quantity__sum'] or 0),
            'avg_transaction_value': float(sales.aggregate(Avg('total_amount'))['total_amount__avg'] or 0),
            'total_discount_given': float(sales.aggregate(Sum('discount_amount'))['discount_amount__sum'] or 0),
            'total_tax_collected': float(sales.aggregate(Sum('tax_amount'))['tax_amount__sum'] or 0),
            'payment_methods': list(payment_breakdown),
            'sale_count_by_type': list(sales.values('type').annotate(count=Count('id'))),
        }
        return Response(data)

    @action(detail=False, methods=['get'])
    def period_summary(self, request):
        """Sales summary for date range"""
        from apps.sales.models import Sale
        
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if not start_date or not end_date:
            return Response({'error': 'start_date and end_date required'}, status=status.HTTP_400_BAD_REQUEST)
        
        sales = Sale.objects.filter(
            created_at__date__gte=start_date,
            created_at__date__lte=end_date,
            organization=request.user.organization,
            status='COMPLETED'
        )
        
        daily_data = sales.extra(
            select={'date': 'DATE(created_at)'}
        ).values('date').annotate(
            revenue=Sum('total_amount'),
            transactions=Count('id'),
            avg_value=Avg('total_amount')
        ).order_by('date')
        
        data = {
            'period': f"{start_date} to {end_date}",
            'total_revenue': float(sales.aggregate(Sum('total_amount'))['total_amount__sum'] or 0),
            'total_transactions': sales.count(),
            'avg_daily_revenue': float(sales.aggregate(Avg('total_amount'))['total_amount__avg'] or 0),
            'daily_breakdown': list(daily_data),
        }
        return Response(data)

    @action(detail=False, methods=['get'])
    def top_products(self, request):
        """Top selling products by revenue and quantity"""
        from apps.sales.models import SaleItem
        
        limit = int(request.query_params.get('limit', 10))
        period_days = int(request.query_params.get('period_days', 30))
        
        start_date = timezone.now() - timedelta(days=period_days)
        
        top_by_revenue = SaleItem.objects.filter(
            sale__created_at__gte=start_date,
            sale__organization=request.user.organization,
            sale__status='COMPLETED'
        ).values('product__name', 'product__id').annotate(
            total_revenue=Sum('total_price'),
            quantity_sold=Sum('quantity'),
            transactions=Count('sale_id', distinct=True),
            avg_price=Avg('unit_price')
        ).order_by('-total_revenue')[:limit]
        
        data = {
            'period_days': period_days,
            'top_products': list(top_by_revenue),
        }
        return Response(data)

    @action(detail=False, methods=['get'])
    def payment_analysis(self, request):
        """Payment method performance analysis"""
        from apps.sales.models import SalePayment
        
        period_days = int(request.query_params.get('period_days', 30))
        start_date = timezone.now() - timedelta(days=period_days)
        
        payments = SalePayment.objects.filter(
            processed_at__gte=start_date,
            sale__organization=request.user.organization
        )
        
        by_method = payments.values('payment_method').annotate(
            count=Count('id'),
            total_amount=Sum('amount'),
            avg_amount=Avg('amount'),
            success_rate=ExpressionWrapper(
                Count(Case(When(status='SUCCESS'), output_field=django_models.IntegerField())) * 100.0 / Count('id'),
                output_field=DecimalField()
            )
        )
        
        data = {
            'period_days': period_days,
            'total_transactions': payments.count(),
            'total_value': float(payments.aggregate(Sum('amount'))['amount__sum'] or 0),
            'by_method': list(by_method),
        }
        return Response(data)


# ==================== INVENTORY REPORTS ====================

class InventoryReportViewSet(viewsets.ViewSet):
    """
    Comprehensive inventory management reports
    """
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def stock_health(self, request):
        """Overall inventory health: overstocked, understocked, critical"""
        from apps.inventory.models import Product, StockLevel
        
        organization = request.user.organization
        stock_levels = StockLevel.objects.filter(
            product__organization=organization
        ).select_related('product')
        
        critical = stock_levels.filter(quantity__lte=F('minimum_stock')).count()
        low = stock_levels.filter(
            quantity__gt=F('minimum_stock'),
            quantity__lte=F('minimum_stock') * 2
        ).count()
        optimal = stock_levels.filter(
            quantity__gt=F('minimum_stock') * 2,
            quantity__lte=F('maximum_stock')
        ).count()
        overstock = stock_levels.filter(quantity__gt=F('maximum_stock')).count()
        
        data = {
            'critical_count': critical,
            'low_count': low,
            'optimal_count': optimal,
            'overstock_count': overstock,
            'total_items': stock_levels.count(),
            'critical_percentage': round(critical / max(stock_levels.count(), 1) * 100, 2),
        }
        return Response(data)

    @action(detail=False, methods=['get'])
    def products_expiring_soon(self, request):
        """Products expiring within specified days"""
        from apps.inventory.models import StockMovement
        
        days_threshold = int(request.query_params.get('days', 90))
        cutoff_date = timezone.now() + timedelta(days=days_threshold)
        
        expiring = StockMovement.objects.filter(
            product__organization=request.user.organization,
            expiration_date__lte=cutoff_date,
            expiration_date__gte=timezone.now(),
            quantity__gt=0
        ).values('product__name', 'batch_number', 'expiration_date').annotate(
            quantity=Sum('quantity'),
            days_until_expiry=ExpressionWrapper(
                F('expiration_date') - timezone.now(),
                output_field=django_models.DurationField()
            )
        ).order_by('expiration_date')
        
        data = {
            'threshold_days': days_threshold,
            'expiring_soon': list(expiring),
        }
        return Response(data)

    @action(detail=False, methods=['get'])
    def warehouse_valuation(self, request):
        """Total inventory value by category/location"""
        from apps.inventory.models import StockLevel
        
        by_category = StockLevel.objects.filter(
            product__organization=request.user.organization
        ).values('product__category').annotate(
            total_value=Sum(F('quantity') * F('product__cost_price'), output_field=DecimalField()),
            item_count=Count('product_id', distinct=True),
            stock_quantity=Sum('quantity')
        )
        
        total_value = sum(item['total_value'] or 0 for item in by_category)
        
        data = {
            'total_inventory_value': float(total_value),
            'by_category': list(by_category),
        }
        return Response(data)


# ==================== OCCUPATIONAL HEALTH REPORTS ====================

class OccupationalHealthReportViewSet(viewsets.ViewSet):
    """
    Occupational health metrics and regulatory compliance reports
    """
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def examination_summary(self, request):
        """Medical examinations overview"""
        from apps.occupational_health.models import MedicalExamination, FitnessCertificate
        
        organization = request.user.organization
        period_days = int(request.query_params.get('period_days', 30))
        start_date = timezone.now() - timedelta(days=period_days)
        
        exams = MedicalExamination.objects.filter(
            worker__organization=organization,
            examination_date__gte=start_date
        )
        
        by_type = exams.values('examination_type').annotate(count=Count('id'))
        
        fitness_certs = FitnessCertificate.objects.filter(
            examination__worker__organization=organization,
            issued_date__gte=start_date
        )
        
        fitness_breakdown = fitness_certs.values('recommendation').annotate(count=Count('id'))
        
        data = {
            'period_days': period_days,
            'total_examinations': exams.count(),
            'by_examination_type': list(by_type),
            'fitness_certificates': fitness_certs.count(),
            'fitness_breakdown': list(fitness_breakdown),
        }
        return Response(data)

    @action(detail=False, methods=['get'])
    def incident_report(self, request):
        """Workplace incidents and injury trends"""
        from apps.occupational_health.models import WorkplaceIncident
        
        organization = request.user.organization
        period_days = int(request.query_params.get('period_days', 90))
        start_date = timezone.now() - timedelta(days=period_days)
        
        incidents = WorkplaceIncident.objects.filter(
            start__organization=organization,
            date_reported__gte=start_date
        )
        
        by_type = incidents.values('incident_type').annotate(count=Count('id'))
        by_severity = incidents.values('severity').annotate(
            count=Count('id'),
            injuries=Count('id', filter=Q(injuries__gt=0))
        )
        
        data = {
            'period_days': period_days,
            'total_incidents': incidents.count(),
            'by_type': list(by_type),
            'by_severity': list(by_severity),
            'total_injuries': sum(i.get('injuries', 0) for i in by_severity),
        }
        return Response(data)

    @action(detail=False, methods=['get'])
    def regulatory_compliance(self, request):
        """CNSS and regulatory reporting status"""
        from apps.occupational_health.models import RegulatoryCNSSReport, DRCRegulatoryReport
        
        organization = request.user.organization
        
        cnss_reports = RegulatoryCNSSReport.objects.filter(
            organization=organization
        ).values('reporting_month').annotate(
            submitted=Count('id', filter=Q(status='SUBMITTED')),
            pending=Count('id', filter=Q(status='PENDING'))
        ).order_by('-reporting_month')[:12]
        
        drc_reports = DRCRegulatoryReport.objects.filter(
            organization=organization
        ).values('year').annotate(
            count=Count('id'),
            compliance_rate=Avg('compliance_percentage')
        ).order_by('-year')
        
        data = {
            'cnss_reports': list(cnss_reports),
            'drc_reports': list(drc_reports),
        }
        return Response(data)


# ==================== HOSPITAL OPERATIONS REPORTS ====================

class HospitalOperationsReportViewSet(viewsets.ViewSet):
    """
    Hospital/clinic operational metrics
    """
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def patient_statistics(self, request):
        """Patient visit and service statistics"""
        from apps.patients.models import Patient
        from apps.prescriptions.models import Prescription
        
        organization = request.user.organization
        period_days = int(request.query_params.get('period_days', 30))
        start_date = timezone.now() - timedelta(days=period_days)
        
        patients = Patient.objects.filter(
            organization=organization,
            created_at__gte=start_date
        )
        
        prescriptions = Prescription.objects.filter(
            patient__organization=organization,
            created_at__gte=start_date
        )
        
        data = {
            'period_days': period_days,
            'new_patients': patients.count(),
            'total_prescriptions': prescriptions.count(),
            'avg_medications_per_prescription': float(prescriptions.aggregate(
                avg=Avg('prescriptionitem__count')
            )['avg'] or 0),
        }
        return Response(data)


# ==================== COMPLIANCE & AUDIT REPORTS ====================

class ComplianceReportViewSet(viewsets.ViewSet):
    """
    Regulatory compliance and audit trail reports
    """
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def audit_summary(self, request):
        """System audit log summary"""
        from apps.audit.models import AuditLog
        
        organization = request.user.organization
        period_days = int(request.query_params.get('period_days', 30))
        start_date = timezone.now() - timedelta(days=period_days)
        
        audit_logs = AuditLog.objects.filter(
            user__organization=organization,
            timestamp__gte=start_date
        )
        
        by_action = audit_logs.values('action').annotate(count=Count('id'))
        by_user = audit_logs.values('user__full_name').annotate(count=Count('id')).order_by('-count')[:10]
        
        failed_actions = audit_logs.filter(success=False).count()
        
        data = {
            'period_days': period_days,
            'total_actions': audit_logs.count(),
            'failed_actions': failed_actions,
            'by_action_type': list(by_action),
            'top_users': list(by_user),
        }
        return Response(data)
