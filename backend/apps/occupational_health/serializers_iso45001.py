"""
ISO 45001 Occupational Health & Safety Management Serializers

DRF serializers for ISO 45001 compliance models.
"""
from rest_framework import serializers
from .models_iso45001 import (
    OHSPolicy,
    HazardRegister,
    IncidentInvestigation,
    SafetyTraining,
    TrainingCertification,
    EmergencyProcedure,
    EmergencyDrill,
    HealthSurveillance,
    PerformanceIndicator,
    ComplianceAudit,
    ContractorQualification,
    ManagementReview,
    WorkerFeedback,
)


class OHSPolicySerializer(serializers.ModelSerializer):
    """Serializer for OH&S policies"""
    approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True, allow_null=True)
    
    class Meta:
        model = OHSPolicy
        fields = [
            'id', 'policy_code', 'title', 'description', 'version', 'effective_date',
            'review_date', 'next_review_date', 'approved_by', 'approved_by_name',
            'publication_date', 'scope', 'objectives', 'communication_plan', 'training_plan', 'is_active'
        ]
        read_only_fields = ['publication_date']


class HazardRegisterSerializer(serializers.ModelSerializer):
    """Serializer for hazard register"""
    hazard_type_display = serializers.CharField(source='get_hazard_type_display', read_only=True)
    control_effectiveness_display = serializers.CharField(source='get_control_effectiveness_display', read_only=True)
    identified_by_name = serializers.CharField(source='identified_by.get_full_name', read_only=True, allow_null=True)
    risk_reduction = serializers.SerializerMethodField()
    
    class Meta:
        model = HazardRegister
        fields = [
            'id', 'hazard_id', 'enterprise', 'work_site', 'hazard_type', 'hazard_type_display',
            'description', 'location', 'potential_harm', 'affected_workers_count', 'affected_job_categories',
            'probability_before', 'severity_before', 'risk_score_before',
            'probability_after', 'severity_after', 'risk_score_after',
            'control_effectiveness', 'control_effectiveness_display', 'residual_risk_acceptable',
            'identified_date', 'last_review_date', 'next_review_date', 'identified_by', 'identified_by_name',
            'related_incidents_count', 'last_incident_date', 'active', 'risk_reduction'
        ]
    
    def get_risk_reduction(self, obj):
        if obj.risk_score_before > 0:
            return round(((obj.risk_score_before - obj.risk_score_after) / obj.risk_score_before) * 100, 1)
        return 0


class IncidentInvestigationSerializer(serializers.ModelSerializer):
    """Serializer for incident investigations"""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    rca_method_display = serializers.CharField(source='get_rca_method_display', read_only=True)
    corrective_action_owner_name = serializers.CharField(source='corrective_action_owner.get_full_name', read_only=True, allow_null=True)
    investigation_team = serializers.StringRelatedField(many=True, read_only=True)
    
    class Meta:
        model = IncidentInvestigation
        fields = [
            'id', 'investigation_id', 'incident', 'status', 'status_display', 'investigation_date',
            'investigation_team', 'investigation_findings', 'rca_method', 'rca_method_display',
            'rca_documentation', 'root_causes', 'contributing_factors', 'corrective_actions',
            'corrective_action_owner', 'corrective_action_owner_name', 'corrective_action_deadline',
            'corrective_action_implemented_date', 'preventive_actions', 'preventive_action_deadline',
            'effectiveness_check_date', 'effectiveness_verified', 'effectiveness_notes',
            'completion_date', 'lessons_learned'
        ]


class SafetyTrainingSerializer(serializers.ModelSerializer):
    """Serializer for safety training courses"""
    training_type_display = serializers.CharField(source='get_training_type_display', read_only=True)
    delivery_method_display = serializers.CharField(source='get_delivery_method_display', read_only=True)
    mandatory_frequency_display = serializers.CharField(source='get_mandatory_frequency_display', read_only=True, allow_null=True)
    
    class Meta:
        model = SafetyTraining
        fields = [
            'id', 'training_code', 'title', 'description', 'training_type', 'training_type_display',
            'duration_hours', 'delivery_method', 'delivery_method_display', 'mandatory',
            'mandatory_frequency', 'mandatory_frequency_display', 'applicable_job_categories',
            'applicable_hazards', 'trainer_requirements', 'course_materials', 'created_date', 'version'
        ]


class TrainingCertificationSerializer(serializers.ModelSerializer):
    """Serializer for training certifications"""
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    training_title = serializers.CharField(source='training.title', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_expired = serializers.SerializerMethodField()
    days_until_expiry = serializers.SerializerMethodField()
    
    class Meta:
        model = TrainingCertification
        fields = [
            'id', 'employee', 'employee_name', 'training', 'training_title', 'completion_date',
            'trainer', 'trainer_qualification', 'score', 'certificate_number', 'expiry_date',
            'renewal_reminder_sent', 'renewal_completion_date', 'status', 'status_display',
            'is_expired', 'days_until_expiry'
        ]
    
    def get_is_expired(self, obj):
        return obj.is_expired()
    
    def get_days_until_expiry(self, obj):
        if obj.expiry_date:
            from django.utils import timezone
            return (obj.expiry_date - timezone.now().date()).days
        return None


class EmergencyProcedureSerializer(serializers.ModelSerializer):
    """Serializer for emergency procedures"""
    emergency_type_display = serializers.CharField(source='get_emergency_type_display', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True, allow_null=True)
    
    class Meta:
        model = EmergencyProcedure
        fields = [
            'id', 'procedure_code', 'emergency_type', 'emergency_type_display', 'title', 'description',
            'work_site', 'procedure_steps', 'roles_and_responsibilities', 'assembly_point_location',
            'evacuation_routes', 'emergency_contacts', 'external_contacts', 'emergency_equipment',
            'created_date', 'last_reviewed_date', 'next_review_date', 'version', 'approved_by', 'approved_by_name'
        ]


class EmergencyDrillSerializer(serializers.ModelSerializer):
    """Serializer for emergency drills"""
    procedure_title = serializers.CharField(source='procedure.title', read_only=True)
    effectiveness_rating_display = serializers.CharField(source='get_effectiveness_rating_display', read_only=True)
    conducted_by_name = serializers.CharField(source='conducted_by.get_full_name', read_only=True, allow_null=True)
    
    class Meta:
        model = EmergencyDrill
        fields = [
            'id', 'drill_id', 'procedure', 'procedure_title', 'scheduled_date', 'actual_date',
            'duration_minutes', 'participants_count', 'objectives', 'observations',
            'effectiveness_rating', 'effectiveness_rating_display', 'areas_for_improvement',
            'corrective_actions_identified', 'conducted_by', 'conducted_by_name', 'next_drill_date'
        ]


class HealthSurveillanceSerializer(serializers.ModelSerializer):
    """Serializer for health surveillance programs"""
    program_type_display = serializers.CharField(source='get_program_type_display', read_only=True)
    scheduled_frequency_display = serializers.CharField(source='get_scheduled_frequency_display', read_only=True)
    participation_rate = serializers.SerializerMethodField()
    abnormal_percentage = serializers.SerializerMethodField()
    
    class Meta:
        model = HealthSurveillance
        fields = [
            'id', 'program_id', 'enterprise', 'program_type', 'program_type_display', 'title',
            'description', 'target_job_categories', 'target_hazards', 'scheduled_frequency',
            'scheduled_frequency_display', 'tests_included', 'participants_scheduled',
            'participants_examined', 'abnormal_findings_count', 'referrals_made',
            'program_start_date', 'program_end_date', 'responsible_medical_professional',
            'effectiveness_assessed', 'effectiveness_notes', 'participation_rate', 'abnormal_percentage'
        ]
    
    def get_participation_rate(self, obj):
        if obj.participants_scheduled > 0:
            return round((obj.participants_examined / obj.participants_scheduled) * 100, 1)
        return 0
    
    def get_abnormal_percentage(self, obj):
        if obj.participants_examined > 0:
            return round((obj.abnormal_findings_count / obj.participants_examined) * 100, 1)
        return 0


class PerformanceIndicatorSerializer(serializers.ModelSerializer):
    """Serializer for performance indicators"""
    indicator_type_display = serializers.CharField(source='get_indicator_type_display', read_only=True)
    measurement_frequency_display = serializers.CharField(source='get_measurement_frequency_display', read_only=True)
    trend_display = serializers.CharField(source='get_trend_display', read_only=True)
    status = serializers.SerializerMethodField()
    
    class Meta:
        model = PerformanceIndicator
        fields = [
            'id', 'indicator_code', 'indicator_name', 'description', 'indicator_type',
            'indicator_type_display', 'target_value', 'target_unit', 'acceptable_lower_bound',
            'acceptable_upper_bound', 'measurement_frequency', 'measurement_frequency_display',
            'data_source', 'calculation_method', 'current_value', 'last_measurement_date',
            'trend', 'trend_display', 'status'
        ]
    
    def get_status(self, obj):
        if obj.current_value is None:
            return 'no_data'
        if obj.acceptable_lower_bound and obj.current_value < obj.acceptable_lower_bound:
            return 'below_acceptable'
        if obj.acceptable_upper_bound and obj.current_value > obj.acceptable_upper_bound:
            return 'above_acceptable'
        return 'within_acceptable'


class ComplianceAuditSerializer(serializers.ModelSerializer):
    """Serializer for compliance audits"""
    audit_type_display = serializers.CharField(source='get_audit_type_display', read_only=True)
    auditor_name = serializers.CharField(source='auditor_name', read_only=True)
    
    class Meta:
        model = ComplianceAudit
        fields = [
            'id', 'audit_id', 'audit_type', 'audit_type_display', 'enterprise', 'scheduled_date',
            'actual_date', 'auditor_name', 'auditor_qualification', 'scope_description', 'areas_audited',
            'findings_summary', 'total_findings', 'conformities', 'minor_nonconformities',
            'major_nonconformities', 'observations', 'audit_findings', 'corrective_action_plan',
            'corrective_actions_deadline', 'corrective_actions_verified_date', 'verification_notes',
            'audit_conclusion'
        ]


class ContractorQualificationSerializer(serializers.ModelSerializer):
    """Serializer for contractor qualifications"""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True, allow_null=True)
    
    class Meta:
        model = ContractorQualification
        fields = [
            'id', 'contractor_id', 'company_name', 'contact_person', 'contact_email', 'contact_phone',
            'work_description', 'work_site', 'contract_start_date', 'contract_end_date',
            'insurance_certificate_provided', 'ohs_policy_provided', 'risk_assessment_provided',
            'worker_competence_verified', 'equipment_certification_verified', 'safety_score',
            'status', 'status_display', 'status_notes', 'induction_required', 'induction_completed_date',
            'site_rules_acknowledgement', 'emergency_procedures_briefing', 'last_review_date',
            'next_review_date', 'approved_by', 'approved_by_name'
        ]


class ManagementReviewSerializer(serializers.ModelSerializer):
    """Serializer for management reviews"""
    attendees_names = serializers.StringRelatedField(source='attendees', many=True, read_only=True)
    ohs_system_effectiveness_display = serializers.CharField(source='get_ohs_system_effectiveness_display', read_only=True)
    
    class Meta:
        model = ManagementReview
        fields = [
            'id', 'review_id', 'enterprise', 'review_period', 'review_date', 'next_review_date',
            'attendees', 'attendees_names', 'kpi_summary', 'incident_summary', 'audit_findings_summary',
            'nonconformity_status', 'corrective_action_status', 'worker_feedback_summary',
            'contractor_feedback_summary', 'customer_complaints', 'regulatory_feedback',
            'policy_changes_required', 'objectives_changes_required', 'resource_allocation_changes',
            'management_conclusions', 'action_items', 'ohs_system_effectiveness', 'ohs_system_effectiveness_display'
        ]


class WorkerFeedbackSerializer(serializers.ModelSerializer):
    """Serializer for worker feedback"""
    feedback_type_display = serializers.CharField(source='get_feedback_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    submitted_by_name = serializers.CharField(source='submitted_by.full_name', read_only=True)
    acknowledged_by_name = serializers.CharField(source='acknowledged_by.get_full_name', read_only=True, allow_null=True)
    
    class Meta:
        model = WorkerFeedback
        fields = [
            'id', 'feedback_id', 'feedback_type', 'feedback_type_display', 'submitted_by',
            'submitted_by_name', 'submitted_date', 'anonymous', 'title', 'description',
            'location', 'potential_harm', 'suggested_solution', 'status', 'status_display',
            'acknowledged_by', 'acknowledged_by_name', 'acknowledged_date', 'acknowledgement_message',
            'action_taken', 'action_completion_date', 'effectiveness_notes', 'follow_up_message', 'follow_up_date'
        ]
        read_only_fields = ['submitted_date']
