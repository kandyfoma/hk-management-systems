"""
ISO 45001 Occupational Health and Safety Management Models

Comprehensive OH&S management models for ISO 45001 compliance.
"""
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from decimal import Decimal
import json

User = get_user_model()


class OHSPolicy(models.Model):
    """Organizational OH&S policy documentation"""
    
    policy_code = models.CharField(max_length=50, unique=True)
    title = models.CharField(max_length=200)
    description = models.TextField()
    full_text = models.TextField()  # Complete policy document
    version = models.CharField(max_length=20)
    effective_date = models.DateField()
    review_date = models.DateField()
    next_review_date = models.DateField()
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='ohs_policies_approved')
    publication_date = models.DateTimeField(auto_now_add=True)
    revision_history = models.JSONField(default=list)
    scope = models.TextField(help_text='Who and what this policy applies to')
    objectives = models.TextField(help_text='Policy objectives and goals')
    communication_plan = models.TextField(help_text='How policy is communicated to workers')
    training_plan = models.TextField(help_text='Training requirements for policy understanding')
    is_active = models.BooleanField(default=True)
    
    class Meta:
        verbose_name = 'OH&S Policy'
        verbose_name_plural = 'OH&S Policies'
        ordering = ['-effective_date']
    
    def __str__(self):
        return f"{self.policy_code} - {self.title} v{self.version}"


class HazardRegister(models.Model):
    """Comprehensive hazard identification and control tracking"""
    
    HAZARD_TYPES = [
        ('physical', 'Physical Hazard'),
        ('chemical', 'Chemical Hazard'),
        ('biological', 'Biological Hazard'),
        ('ergonomic', 'Ergonomic Hazard'),
        ('psychosocial', 'Psychosocial Hazard'),
        ('environmental', 'Environmental Hazard'),
    ]
    
    CONTROL_EFFECTIVENESS = [
        ('excellent', 'Excellent - Risk eliminated'),
        ('good', 'Good - Risk significantly reduced'),
        ('fair', 'Fair - Risk moderately reduced'),
        ('poor', 'Poor - Risk minimally reduced'),
        ('ineffective', 'Ineffective - No risk reduction'),
    ]
    
    hazard_id = models.CharField(max_length=50, unique=True)
    enterprise = models.ForeignKey('occupational_health.Enterprise', on_delete=models.CASCADE)
    work_site = models.ForeignKey('occupational_health.WorkSite', on_delete=models.CASCADE, null=True, blank=True)
    hazard_type = models.CharField(max_length=20, choices=HAZARD_TYPES)
    description = models.TextField()
    location = models.CharField(max_length=200)
    
    # Risk assessment
    potential_harm = models.TextField()
    affected_workers_count = models.PositiveIntegerField()
    affected_job_categories = models.JSONField(default=list)  # List of affected roles
    
    # Current controls (Hierarchy of Controls)
    elimination_controls = models.TextField(blank=True)
    substitution_controls = models.TextField(blank=True)
    engineering_controls = models.TextField(blank=True)
    administrative_controls = models.TextField(blank=True)
    ppe_controls = models.TextField(blank=True)
    
    # Risk rating
    probability_before = models.PositiveIntegerField()  # 1-5
    severity_before = models.PositiveIntegerField()  # 1-5
    risk_score_before = models.PositiveIntegerField()
    
    probability_after = models.PositiveIntegerField()  # 1-5
    severity_after = models.PositiveIntegerField()  # 1-5
    risk_score_after = models.PositiveIntegerField()
    
    control_effectiveness = models.CharField(max_length=20, choices=CONTROL_EFFECTIVENESS)
    residual_risk_acceptable = models.BooleanField(default=False)
    
    # Monitoring and review
    identified_date = models.DateField(auto_now_add=True)
    last_review_date = models.DateField()
    next_review_date = models.DateField()
    identified_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='hazards_identified')
    
    # Related incidents and near-misses
    related_incidents_count = models.PositiveIntegerField(default=0)
    last_incident_date = models.DateField(null=True, blank=True)
    
    active = models.BooleanField(default=True)
    
    class Meta:
        verbose_name = 'Hazard Register'
        verbose_name_plural = 'Hazard Registers'
        ordering = ['-identified_date']
    
    def __str__(self):
        return f"{self.hazard_id} - {self.description}"


class IncidentInvestigation(models.Model):
    """Structured incident investigation with root cause analysis and CAPA"""
    
    STATUS_CHOICES = [
        ('reported', 'Reported'),
        ('under_investigation', 'Under Investigation'),
        ('root_cause_identified', 'Root Cause Identified'),
        ('corrective_action_planned', 'Corrective Action Planned'),
        ('corrective_action_implemented', 'Corrective Action Implemented'),
        ('effectiveness_verified', 'Effectiveness Verified'),
        ('closed', 'Closed'),
    ]
    
    investigation_id = models.CharField(max_length=50, unique=True)
    incident = models.OneToOneField(
        'occupational_health.WorkplaceIncident',
        on_delete=models.CASCADE,
        related_name='investigation'
    )
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='reported')
    
    # Investigation details
    investigation_date = models.DateField()
    investigation_team = models.ManyToManyField(User, related_name='incident_investigations')
    investigation_findings = models.TextField()
    
    # Root cause analysis methods
    rca_method = models.CharField(
        max_length=50,
        choices=[
            ('5why', '5-Why Analysis'),
            ('fishbone', 'Fishbone Diagram'),
            ('fault_tree', 'Fault Tree Analysis'),
            ('timeline', 'Timeline Analysis'),
            ('other', 'Other'),
        ]
    )
    rca_documentation = models.TextField(help_text='Detailed root cause analysis results')
    root_causes = models.JSONField(default=list)  # List of identified root causes
    contributing_factors = models.JSONField(default=list)
    
    # Corrective actions
    corrective_actions = models.TextField()
    corrective_action_owner = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='corrective_actions_owned')
    corrective_action_deadline = models.DateField()
    corrective_action_implemented_date = models.DateField(null=True, blank=True)
    
    # Preventive actions
    preventive_actions = models.TextField(blank=True)
    preventive_action_deadline = models.DateField(null=True, blank=True)
    
    # Effectiveness verification
    effectiveness_check_date = models.DateField(null=True, blank=True)
    effectiveness_verified = models.BooleanField(default=False)
    effectiveness_notes = models.TextField(blank=True)
    
    completion_date = models.DateField(null=True, blank=True)
    lessons_learned = models.TextField(blank=True)
    
    class Meta:
        verbose_name = 'Incident Investigation'
        verbose_name_plural = 'Incident Investigations'
        ordering = ['-investigation_date']
    
    def __str__(self):
        return f"{self.investigation_id} - {self.incident}"


class SafetyTraining(models.Model):
    """Safety training courses and requirements"""
    
    TRAINING_TYPES = [
        ('induction', 'Safety Induction'),
        ('task_specific', 'Task-Specific Training'),
        ('hazard_awareness', 'Hazard Awareness'),
        ('equipment', 'Equipment Operation'),
        ('emergency', 'Emergency Response'),
        ('first_aid', 'First Aid'),
        ('fire', 'Fire Safety'),
        ('confined_space', 'Confined Space'),
        ('heights', 'Work at Heights'),
        ('management', 'OH&S Management'),
        ('auditor', 'Auditor Training'),
        ('other', 'Other'),
    ]
    
    training_code = models.CharField(max_length=50, unique=True)
    title = models.CharField(max_length=200)
    description = models.TextField()
    training_type = models.CharField(max_length=20, choices=TRAINING_TYPES)
    duration_hours = models.PositiveIntegerField()
    delivery_method = models.CharField(
        max_length=50,
        choices=[
            ('classroom', 'Classroom'),
            ('online', 'Online'),
            ('onsite', 'On-Site'),
            ('blended', 'Blended'),
            ('hands_on', 'Hands-On'),
        ]
    )
    mandatory = models.BooleanField(default=False)
    mandatory_frequency = models.CharField(
        max_length=50,
        choices=[
            ('once', 'Once'),
            ('annual', 'Annual'),
            ('biennial', 'Every 2 Years'),
            ('triennial', 'Every 3 Years'),
            ('as_needed', 'As Needed'),
        ],
        blank=True
    )
    
    # Target audience
    applicable_job_categories = models.JSONField(default=list)
    applicable_hazards = models.JSONField(default=list)
    
    trainer_requirements = models.TextField()
    course_materials = models.URLField(blank=True)
    created_date = models.DateField(auto_now_add=True)
    version = models.CharField(max_length=20, default='1.0')
    
    class Meta:
        verbose_name = 'Safety Training'
        verbose_name_plural = 'Safety Trainings'
    
    def __str__(self):
        return f"{self.training_code} - {self.title}"


class TrainingCertification(models.Model):
    """Employee training records and certification tracking"""
    
    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('completed', 'Completed'),
        ('expired', 'Expired'),
        ('renewal_due', 'Renewal Due'),
    ]
    
    employee = models.ForeignKey('occupational_health.Worker', on_delete=models.CASCADE, related_name='training_certifications')
    training = models.ForeignKey(SafetyTraining, on_delete=models.CASCADE)
    completion_date = models.DateField()
    trainer = models.CharField(max_length=200)
    trainer_qualification = models.TextField()
    score = models.PositiveIntegerField(null=True, blank=True)  # If applicable
    certificate_number = models.CharField(max_length=100, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    renewal_reminder_sent = models.BooleanField(default=False)
    renewal_completion_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='completed')
    
    class Meta:
        verbose_name = 'Training Certification'
        verbose_name_plural = 'Training Certifications'
        ordering = ['-completion_date']
    
    def __str__(self):
        return f"{self.employee} - {self.training}"
    
    def is_expired(self):
        from django.utils import timezone
        return self.expiry_date and timezone.now().date() > self.expiry_date


class EmergencyProcedure(models.Model):
    """Emergency response and evacuation procedures"""
    
    EMERGENCY_TYPES = [
        ('fire', 'Fire Emergency'),
        ('medical', 'Medical Emergency'),
        ('chemical_spill', 'Chemical Spill'),
        ('evacuation', 'Evacuation'),
        ('active_threat', 'Active Threat'),
        ('utility_failure', 'Utility Failure'),
        ('natural_disaster', 'Natural Disaster'),
        ('other', 'Other Emergency'),
    ]
    
    procedure_code = models.CharField(max_length=50, unique=True)
    emergency_type = models.CharField(max_length=30, choices=EMERGENCY_TYPES)
    title = models.CharField(max_length=200)
    description = models.TextField()
    work_site = models.ForeignKey('occupational_health.WorkSite', on_delete=models.CASCADE)
    
    # Procedure details
    procedure_steps = models.JSONField(default=list)  # Ordered list of steps
    roles_and_responsibilities = models.TextField()
    assembly_point_location = models.CharField(max_length=200, blank=True)
    evacuation_routes = models.TextField(blank=True)
    
    # Contacts
    emergency_contacts = models.JSONField(default=list)  # List of {name, role, phone}
    external_contacts = models.JSONField(default=list)  # Fire, police, medical
    
    # Equipment and resources
    emergency_equipment = models.JSONField(default=list)  # First aid kits, AED locations, etc.
    
    # Documentation
    created_date = models.DateField(auto_now_add=True)
    last_reviewed_date = models.DateField()
    next_review_date = models.DateField()
    version = models.CharField(max_length=20, default='1.0')
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    
    class Meta:
        verbose_name = 'Emergency Procedure'
        verbose_name_plural = 'Emergency Procedures'
    
    def __str__(self):
        return f"{self.procedure_code} - {self.title}"


class EmergencyDrill(models.Model):
    """Emergency drill scheduling and tracking"""
    
    drill_id = models.CharField(max_length=50, unique=True)
    procedure = models.ForeignKey(EmergencyProcedure, on_delete=models.CASCADE, related_name='drills')
    scheduled_date = models.DateField()
    actual_date = models.DateField()
    duration_minutes = models.PositiveIntegerField()
    participants_count = models.PositiveIntegerField()
    
    # Drill results
    objectives = models.TextField()
    observations = models.TextField()
    effectiveness_rating = models.CharField(
        max_length=20,
        choices=[
            ('excellent', 'Excellent'),
            ('good', 'Good'),
            ('satisfactory', 'Satisfactory'),
            ('needs_improvement', 'Needs Improvement'),
        ]
    )
    areas_for_improvement = models.TextField(blank=True)
    corrective_actions_identified = models.TextField(blank=True)
    
    conducted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    next_drill_date = models.DateField()
    
    class Meta:
        verbose_name = 'Emergency Drill'
        verbose_name_plural = 'Emergency Drills'
        ordering = ['-actual_date']
    
    def __str__(self):
        return f"{self.drill_id} - {self.procedure}"


class HealthSurveillance(models.Model):
    """Medical surveillance program monitoring"""
    
    PROGRAM_TYPES = [
        ('baseline', 'Baseline Health Assessment'),
        ('periodic', 'Periodic Medical Examination'),
        ('exit', 'Exit Examination'),
        ('return_to_work', 'Return to Work Assessment'),
        ('targeted', 'Targeted Health Assessment'),
    ]
    
    program_id = models.CharField(max_length=50, unique=True)
    enterprise = models.ForeignKey('occupational_health.Enterprise', on_delete=models.CASCADE)
    program_type = models.CharField(max_length=30, choices=PROGRAM_TYPES)
    title = models.CharField(max_length=200)
    description = models.TextField()
    
    # Target population
    target_job_categories = models.JSONField(default=list)
    target_hazards = models.JSONField(default=list)
    
    # Examination details
    scheduled_frequency = models.CharField(
        max_length=50,
        choices=[
            ('on_hire', 'On Hire'),
            ('annual', 'Annual'),
            ('biennial', 'Every 2 Years'),
            ('on_exposure_change', 'On Exposure Change'),
        ]
    )
    tests_included = models.JSONField(default=list)  # e.g., ['spirometry', 'audiometry', 'chest_xray']
    
    # Outcomes tracking
    participants_scheduled = models.PositiveIntegerField(default=0)
    participants_examined = models.PositiveIntegerField(default=0)
    abnormal_findings_count = models.PositiveIntegerField(default=0)
    referrals_made = models.PositiveIntegerField(default=0)
    
    # Program management
    program_start_date = models.DateField()
    program_end_date = models.DateField(null=True, blank=True)
    responsible_medical_professional = models.CharField(max_length=200)
    
    effectiveness_assessed = models.BooleanField(default=False)
    effectiveness_notes = models.TextField(blank=True)
    
    class Meta:
        verbose_name = 'Health Surveillance'
        verbose_name_plural = 'Health Surveillance Programs'
    
    def __str__(self):
        return f"{self.program_id} - {self.title}"


class PerformanceIndicator(models.Model):
    """OH&S Key Performance Indicators (KPIs) tracking"""
    
    INDICATOR_TYPES = [
        ('leading', 'Leading Indicator'),
        ('lagging', 'Lagging Indicator'),
    ]
    
    indicator_code = models.CharField(max_length=50, unique=True)
    indicator_name = models.CharField(max_length=200)
    description = models.TextField()
    indicator_type = models.CharField(max_length=20, choices=INDICATOR_TYPES)
    
    # Target and threshold
    target_value = models.DecimalField(max_digits=10, decimal_places=2)
    target_unit = models.CharField(max_length=100)  # e.g., 'incidents/year', '%', 'days'
    acceptable_lower_bound = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    acceptable_upper_bound = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Measurement
    measurement_frequency = models.CharField(
        max_length=50,
        choices=[
            ('daily', 'Daily'),
            ('weekly', 'Weekly'),
            ('monthly', 'Monthly'),
            ('quarterly', 'Quarterly'),
            ('annually', 'Annually'),
        ]
    )
    data_source = models.TextField()
    calculation_method = models.TextField()
    
    # Trending
    previous_values = models.JSONField(default=list)  # Historical values with dates
    current_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    last_measurement_date = models.DateField(null=True, blank=True)
    trend = models.CharField(
        max_length=20,
        choices=[
            ('improving', 'Improving'),
            ('stable', 'Stable'),
            ('worsening', 'Worsening'),
            ('insufficient_data', 'Insufficient Data'),
        ],
        default='insufficient_data'
    )
    
    class Meta:
        verbose_name = 'Performance Indicator'
        verbose_name_plural = 'Performance Indicators'
    
    def __str__(self):
        return f"{self.indicator_code} - {self.indicator_name}"


class ComplianceAudit(models.Model):
    """Internal and external compliance audits"""
    
    AUDIT_TYPES = [
        ('internal', 'Internal Audit'),
        ('management_review', 'Management Review'),
        ('external_certification', 'External Certification Audit'),
        ('regulatory', 'Regulatory Inspection'),
        ('third_party', 'Third-Party Audit'),
    ]
    
    FINDING_TYPES = [
        ('conformity', 'Conformity'),
        ('minor_nc', 'Minor Non-Conformity'),
        ('major_nc', 'Major Non-Conformity'),
        ('observation', 'Observation'),
        ('best_practice', 'Best Practice'),
    ]
    
    audit_id = models.CharField(max_length=50, unique=True)
    audit_type = models.CharField(max_length=30, choices=AUDIT_TYPES)
    enterprise = models.ForeignKey('occupational_health.Enterprise', on_delete=models.CASCADE)
    scheduled_date = models.DateField()
    actual_date = models.DateField()
    auditor_name = models.CharField(max_length=200)
    auditor_qualification = models.TextField()
    
    # Audit scope
    scope_description = models.TextField()
    areas_audited = models.JSONField(default=list)
    
    # Findings
    findings_summary = models.TextField()
    total_findings = models.PositiveIntegerField()
    conformities = models.PositiveIntegerField(default=0)
    minor_nonconformities = models.PositiveIntegerField(default=0)
    major_nonconformities = models.PositiveIntegerField(default=0)
    observations = models.PositiveIntegerField(default=0)
    
    # Detailed findings
    audit_findings = models.JSONField(default=list)  # List of {type, finding, evidence}
    
    # Follow-up
    corrective_action_plan = models.TextField()
    corrective_actions_deadline = models.DateField()
    corrective_actions_verified_date = models.DateField(null=True, blank=True)
    verification_notes = models.TextField(blank=True)
    
    audit_conclusion = models.TextField()
    
    class Meta:
        verbose_name = 'Compliance Audit'
        verbose_name_plural = 'Compliance Audits'
        ordering = ['-actual_date']
    
    def __str__(self):
        return f"{self.audit_id} - {self.enterprise}"


class ContractorQualification(models.Model):
    """Third-party/contractor safety management"""
    
    STATUS_CHOICES = [
        ('pending_review', 'Pending Review'),
        ('approved', 'Approved'),
        ('conditional_approval', 'Conditional Approval'),
        ('rejected', 'Rejected'),
        ('suspended', 'Suspended'),
    ]
    
    contractor_id = models.CharField(max_length=50, unique=True)
    company_name = models.CharField(max_length=200)
    contact_person = models.CharField(max_length=200)
    contact_email = models.EmailField()
    contact_phone = models.CharField(max_length=20)
    
    # Scope of work
    work_description = models.TextField()
    work_site = models.ForeignKey('occupational_health.WorkSite', on_delete=models.CASCADE)
    contract_start_date = models.DateField()
    contract_end_date = models.DateField()
    
    # Safety assessment
    insurance_certificate_provided = models.BooleanField(default=False)
    ohs_policy_provided = models.BooleanField(default=False)
    risk_assessment_provided = models.BooleanField(default=False)
    worker_competence_verified = models.BooleanField(default=False)
    equipment_certification_verified = models.BooleanField(default=False)
    
    safety_score = models.PositiveIntegerField(null=True, blank=True)  # 0-100
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='pending_review')
    status_notes = models.TextField(blank=True)
    
    # Monitoring
    induction_required = models.BooleanField(default=True)
    induction_completed_date = models.DateField(null=True, blank=True)
    site_rules_acknowledgement = models.BooleanField(default=False)
    emergency_procedures_briefing = models.BooleanField(default=False)
    
    # Review and renewal
    last_review_date = models.DateField()
    next_review_date = models.DateField()
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    
    class Meta:
        verbose_name = 'Contractor Qualification'
        verbose_name_plural = 'Contractor Qualifications'
    
    def __str__(self):
        return f"{self.contractor_id} - {self.company_name}"


class ManagementReview(models.Model):
    """Periodic management review records"""
    
    review_id = models.CharField(max_length=50, unique=True)
    enterprise = models.ForeignKey('occupational_health.Enterprise', on_delete=models.CASCADE)
    review_period = models.CharField(max_length=50)  # e.g., 'Q1 2026', 'Annual 2025'
    review_date = models.DateField()
    next_review_date = models.DateField()
    
    # Participants
    attendees = models.ManyToManyField(User, related_name='management_reviews_attended')
    
    # Performance data reviewed
    kpi_summary = models.TextField()
    incident_summary = models.TextField()
    audit_findings_summary = models.TextField()
    nonconformity_status = models.TextField()
    corrective_action_status = models.TextField()
    
    # Stakeholder feedback
    worker_feedback_summary = models.TextField()
    contractor_feedback_summary = models.TextField()
    customer_complaints = models.PositiveIntegerField(default=0)
    regulatory_feedback = models.TextField(blank=True)
    
    # Policy and objectives
    policy_changes_required = models.TextField(blank=True)
    objectives_changes_required = models.TextField(blank=True)
    resource_allocation_changes = models.TextField(blank=True)
    
    # Management conclusions
    management_conclusions = models.TextField()
    action_items = models.JSONField(default=list)  # List of {action, owner, deadline}
    
    # Overall assessment
    ohs_system_effectiveness = models.CharField(
        max_length=20,
        choices=[
            ('highly_effective', 'Highly Effective'),
            ('effective', 'Effective'),
            ('moderately_effective', 'Moderately Effective'),
            ('needs_improvement', 'Needs Improvement'),
        ]
    )
    
    class Meta:
        verbose_name = 'Management Review'
        verbose_name_plural = 'Management Reviews'
        ordering = ['-review_date']
    
    def __str__(self):
        return f"{self.review_id} - {self.enterprise}"


class WorkerFeedback(models.Model):
    """Worker incident reporting and safety suggestions"""
    
    FEEDBACK_TYPE = [
        ('hazard_report', 'Hazard Report'),
        ('near_miss_report', 'Near Miss Report'),
        ('safety_suggestion', 'Safety Suggestion'),
        ('incident_report', 'Incident Report'),
    ]
    
    STATUS_CHOICES = [
        ('submitted', 'Submitted'),
        ('acknowledged', 'Acknowledged'),
        ('under_review', 'Under Review'),
        ('action_taken', 'Action Taken'),
        ('closed', 'Closed'),
    ]
    
    feedback_id = models.CharField(max_length=50, unique=True)
    feedback_type = models.CharField(max_length=30, choices=FEEDBACK_TYPE)
    submitted_by = models.ForeignKey('occupational_health.Worker', on_delete=models.CASCADE, related_name='safety_feedback')
    submitted_date = models.DateTimeField(auto_now_add=True)
    anonymous = models.BooleanField(default=False)
    
    # Description
    title = models.CharField(max_length=200)
    description = models.TextField()
    location = models.CharField(max_length=200)
    
    # Details specific to incident/hazard
    potential_harm = models.TextField(blank=True)
    suggested_solution = models.TextField(blank=True)
    
    # Response
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='submitted')
    acknowledged_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='feedback_acknowledged')
    acknowledged_date = models.DateTimeField(null=True, blank=True)
    acknowledgement_message = models.TextField(blank=True)
    
    # Action taken
    action_taken = models.TextField(blank=True)
    action_completion_date = models.DateField(null=True, blank=True)
    effectiveness_notes = models.TextField(blank=True)
    
    # Feedback to worker
    follow_up_message = models.TextField(blank=True)
    follow_up_date = models.DateField(null=True, blank=True)
    
    class Meta:
        verbose_name = 'Worker Feedback'
        verbose_name_plural = 'Worker Feedback'
        ordering = ['-submitted_date']
    
    def __str__(self):
        return f"{self.feedback_id} - {self.title}"
