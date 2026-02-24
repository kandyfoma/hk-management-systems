"""
Surveillance Programs Serializers - DRF API

Django REST Framework serializers for surveillance program management,
enrollment tracking, and threshold violation handling.
"""

from rest_framework import serializers
from .models_surveillance import (
    SurveillanceProgram,
    SurveillanceEnrollment,
    ThresholdViolation,
    ComplianceMetrics,
)


# ==================== SURVEILLANCE PROGRAM SERIALIZERS ====================

class SurveillanceProgramSerializer(serializers.ModelSerializer):
    """Full surveillance program with all details"""
    
    enterprise_name = serializers.CharField(source='enterprise.name', read_only=True)
    sector_display = serializers.CharField(source='get_sector_display', read_only=True)
    enrolled_workers_count = serializers.IntegerField(read_only=True)
    overdue_screenings_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = SurveillanceProgram
        fields = [
            'id', 'name', 'code', 'description',
            'enterprise', 'enterprise_name',
            'sector', 'sector_display',
            'target_risk_group',
            'required_screenings', 'screening_interval_months',
            'action_levels',
            'is_active', 'status',
            'start_date', 'end_date',
            'regulatory_reference', 'compliance_standard',
            'enrolled_workers_count', 'overdue_screenings_count',
            'created_by', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at']


class SurveillanceProgramListSerializer(serializers.ModelSerializer):
    """Abbreviated surveillance program listing"""
    
    enterprise_name = serializers.CharField(source='enterprise.name', read_only=True)
    sector_display = serializers.CharField(source='get_sector_display', read_only=True)
    enrolled_workers_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = SurveillanceProgram
        fields = [
            'id', 'name', 'code',
            'enterprise_name', 'sector', 'sector_display',
            'is_active', 'status',
            'screening_interval_months',
            'enrolled_workers_count',
        ]


# ==================== ENROLLMENT SERIALIZERS ====================

class SurveillanceEnrollmentSerializer(serializers.ModelSerializer):
    """Full enrollment with worker and program details"""
    
    worker_name = serializers.CharField(source='worker.full_name', read_only=True)
    worker_employee_id = serializers.CharField(source='worker.employee_id', read_only=True)
    program_name = serializers.CharField(source='program.name', read_only=True)
    program_code = serializers.CharField(source='program.code', read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    days_overdue = serializers.IntegerField(read_only=True)
    compliance_status_display = serializers.CharField(source='get_compliance_status_display', read_only=True)
    
    class Meta:
        model = SurveillanceEnrollment
        fields = [
            'id',
            'program', 'program_name', 'program_code',
            'worker', 'worker_name', 'worker_employee_id',
            'enrollment_date',
            'reason_for_enrollment',
            'first_screening_date', 'last_screening_date', 'next_screening_due',
            'compliance_status', 'compliance_status_display',
            'screenings_completed', 'screenings_missed',
            'compliance_rate',
            'is_active', 'unenrollment_date', 'unenrollment_reason',
            'clinical_notes', 'action_taken',
            'is_overdue', 'days_overdue',
            'enrolled_by', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'enrollment_date', 'enrolled_by', 'created_at', 'updated_at',
            'is_overdue', 'days_overdue', 'compliance_rate'
        ]


class SurveillanceEnrollmentListSerializer(serializers.ModelSerializer):
    """Abbreviated enrollment listing"""
    
    worker_name = serializers.CharField(source='worker.full_name', read_only=True)
    program_name = serializers.CharField(source='program.name', read_only=True)
    compliance_status_display = serializers.CharField(source='get_compliance_status_display', read_only=True)
    
    class Meta:
        model = SurveillanceEnrollment
        fields = [
            'id', 'program_name', 'worker_name',
            'enrollment_date', 'next_screening_due',
            'compliance_status', 'compliance_status_display',
            'compliance_rate', 'is_active',
        ]


class EnrollWorkerSerializer(serializers.Serializer):
    """Serializer for enrolling a worker in a program"""
    
    worker_id = serializers.IntegerField()
    program_id = serializers.IntegerField()
    reason_for_enrollment = serializers.CharField(max_length=200, required=False)
    
    def validate(self, data):
        """Validate worker and program exist"""
        from .models import Worker
        from .models_surveillance import SurveillanceProgram
        
        try:
            Worker.objects.get(id=data['worker_id'])
        except Worker.DoesNotExist:
            raise serializers.ValidationError("Worker not found")
        
        try:
            SurveillanceProgram.objects.get(id=data['program_id'])
        except SurveillanceProgram.DoesNotExist:
            raise serializers.ValidationError("Program not found")
        
        return data


# ==================== THRESHOLD VIOLATION SERIALIZERS ====================

class ThresholdViolationSerializer(serializers.ModelSerializer):
    """Full threshold violation details"""
    
    worker_name = serializers.CharField(source='worker.full_name', read_only=True)
    program_name = serializers.CharField(source='program.name', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    exemination_number = serializers.CharField(source='related_exam.exam_number', read_only=True)
    is_open = serializers.BooleanField(read_only=True)
    days_open = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = ThresholdViolation
        fields = [
            'id',
            'enrollment', 'program', 'program_name',
            'worker', 'worker_name',
            'related_exam', 'exemination_number',
            'violation_date',
            'parameter_tested', 'measured_value', 'unit_of_measurement',
            'threshold_value', 'threshold_type',
            'percentage_above_threshold',
            'severity', 'severity_display',
            'status', 'status_display',
            'action_required', 'recommended_followup',
            'resolution_date', 'resolution_notes', 'resolved_by',
            'acknowledged_date', 'acknowledged_by',
            'regulatory_filing_required', 'filed_to_authorities', 'filing_date',
            'is_open', 'days_open',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'violation_date', 'created_at', 'updated_at',
            'is_open', 'days_open', 'percentage_above_threshold'
        ]


class ThresholdViolationListSerializer(serializers.ModelSerializer):
    """Abbreviated violation listing"""
    
    worker_name = serializers.CharField(source='worker.full_name', read_only=True)
    program_name = serializers.CharField(source='program.name', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = ThresholdViolation
        fields = [
            'id', 'worker_name', 'program_name',
            'violation_date',
            'parameter_tested', 'measured_value', 'threshold_value',
            'severity', 'severity_display',
            'status', 'status_display',
            'is_open', 'days_open',
        ]


class AcknowledgeViolationSerializer(serializers.Serializer):
    """Serializer for acknowledging a violation"""
    pass  # No fields needed, uses authenticated user


class ResolveViolationSerializer(serializers.Serializer):
    """Serializer for resolving a violation"""
    
    resolution_notes = serializers.CharField(
        max_length=500, required=False, help_text="Notes about resolution"
    )


class CheckExamThresholdsSerializer(serializers.Serializer):
    """Serializer for checking exam results against program thresholds"""
    
    exam_id = serializers.IntegerField()
    program_id = serializers.IntegerField()
    
    def validate(self, data):
        """Validate exam and program exist"""
        from .models import MedicalExamination
        from .models_surveillance import SurveillanceProgram
        
        try:
            MedicalExamination.objects.get(id=data['exam_id'])
        except MedicalExamination.DoesNotExist:
            raise serializers.ValidationError("Exam not found")
        
        try:
            SurveillanceProgram.objects.get(id=data['program_id'])
        except SurveillanceProgram.DoesNotExist:
            raise serializers.ValidationError("Program not found")
        
        return data


# ==================== COMPLIANCE METRICS SERIALIZERS ====================

class ComplianceMetricsSerializer(serializers.ModelSerializer):
    """Full compliance metrics"""
    
    program_name = serializers.CharField(source='program.name', read_only=True)
    compliance_trend_display = serializers.CharField(source='get_compliance_trend_display', read_only=True)
    
    class Meta:
        model = ComplianceMetrics
        fields = [
            'id',
            'program', 'program_name',
            'metrics_date', 'period',
            'total_workers_enrolled',
            'active_enrollments', 'inactive_enrollments',
            'screenings_due', 'screenings_completed', 'screenings_pending', 'screenings_overdue',
            'overall_compliance_rate',
            'total_violations', 'open_violations', 'resolved_violations',
            'warning_level_violations', 'action_level_violations', 'critical_level_violations',
            'compliant_workers', 'overdue_workers', 'non_compliant_workers', 'pending_workers',
            'compliance_rate_previous_period',
            'compliance_trend', 'compliance_trend_display',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['metrics_date', 'created_at', 'updated_at']


# ==================== DASHBOARD SERIALIZERS ====================

class SurveillanceDashboardSerializer(serializers.Serializer):
    """Summary data for surveillance compliance dashboard"""
    
    total_programs = serializers.IntegerField()
    total_workers_enrolled = serializers.IntegerField()
    total_violations = serializers.IntegerField()
    open_violations_count = serializers.IntegerField()
    
    overall_compliance_rate = serializers.DecimalField(max_digits=5, decimal_places=2)
    programs_by_status = serializers.DictField()
    
    violations_by_severity = serializers.DictField(
        child=serializers.IntegerField()
    )
    violations_by_status = serializers.DictField(
        child=serializers.IntegerField()
    )
    
    recent_violations = ThresholdViolationListSerializer(many=True)
    overdue_workers_by_program = serializers.DictField(
        child=serializers.IntegerField()
    )


# ==================== REPORT GENERATION SERIALIZERS ====================

class ComplianceReportSerializer(serializers.Serializer):
    """Parameters for generating compliance report"""
    
    program_id = serializers.IntegerField(required=False)
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)
    format = serializers.ChoiceField(
        choices=['pdf', 'csv', 'json'],
        default='pdf'
    )


class TrendDataSerializer(serializers.Serializer):
    """Serializer for surveillance trend data"""
    
    month = serializers.CharField()
    completed = serializers.IntegerField()
    pending = serializers.IntegerField()
    overdue = serializers.IntegerField()
    violations = serializers.IntegerField()
