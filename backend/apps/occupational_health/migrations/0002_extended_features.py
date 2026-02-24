# Generated migration for extended occupational health features

from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('occupational_health', '0001_initial'),  # Adjust to match your latest migration
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # WorkerRiskProfile model
        migrations.CreateModel(
            name='WorkerRiskProfile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('health_risk_score', models.PositiveIntegerField(default=0, help_text='Health risk score 0-100')),
                ('exposure_risk_score', models.PositiveIntegerField(default=0, help_text='Exposure risk score 0-100')),
                ('compliance_risk_score', models.PositiveIntegerField(default=0, help_text='Compliance risk score 0-100')),
                ('overall_risk_score', models.PositiveIntegerField(default=0, help_text='Composite risk score 0-100')),
                ('risk_level', models.CharField(choices=[('low', 'Faible'), ('moderate', 'Modéré'), ('high', 'Élevé'), ('critical', 'Critique')], default='low', max_length=20)),
                ('age_risk_factor', models.IntegerField(default=0)),
                ('exposure_years_factor', models.IntegerField(default=0)),
                ('medical_history_factor', models.IntegerField(default=0)),
                ('fitness_status_factor', models.IntegerField(default=0)),
                ('ppe_compliance_factor', models.IntegerField(default=0)),
                ('exams_overdue', models.BooleanField(default=False)),
                ('days_overdue', models.IntegerField(default=0)),
                ('abnormal_findings_count', models.IntegerField(default=0)),
                ('incidents_last_12months', models.IntegerField(default=0)),
                ('near_misses_last_12months', models.IntegerField(default=0)),
                ('intervention_required', models.BooleanField(default=False)),
                ('intervention_type', models.CharField(blank=True, choices=[('medical_evaluation', 'Medical Evaluation'), ('job_modification', 'Job Modification'), ('additional_ppe', 'Additional PPE'), ('relocation', 'Work Relocation'), ('mandatory_leave', 'Mandatory Leave'), ('retraining', 'Retraining')], max_length=50)),
                ('priority_actions', models.TextField(blank=True, help_text='Recommended priority actions')),
                ('intervention_recommended', models.BooleanField(default=False)),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('last_calculated', models.DateTimeField(auto_now=True)),
                ('worker', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, to='occupational_health.worker')),
            ],
            options={
                'verbose_name': 'Worker Risk Profile',
                'verbose_name_plural': 'Worker Risk Profiles',
            },
        ),
        
        # OverexposureAlert model
        migrations.CreateModel(
            name='OverexposureAlert',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('exposure_type', models.CharField(choices=[('silica_dust', 'Silica Dust'), ('noise', 'Noise'), ('cobalt', 'Cobalt'), ('vibration', 'Vibration'), ('heat', 'Heat'), ('chemicals', 'Chemicals'), ('radiation', 'Radiation'), ('biological', 'Biological')], max_length=50)),
                ('exposure_level', models.DecimalField(decimal_places=2, max_digits=10)),
                ('threshold', models.DecimalField(decimal_places=2, max_digits=10)),
                ('measurement_unit', models.CharField(max_length=20)),
                ('measurement_method', models.CharField(blank=True, max_length=100)),
                ('severity', models.CharField(choices=[('warning', 'Warning'), ('critical', 'Critical'), ('emergency', 'Emergency')], max_length=20)),
                ('status', models.CharField(choices=[('active', 'Active'), ('acknowledged', 'Acknowledged'), ('resolved', 'Resolved')], default='active', max_length=20)),
                ('recommended_action', models.TextField(blank=True)),
                ('medical_followup_scheduled', models.BooleanField(default=False)),
                ('detected_date', models.DateTimeField(auto_now_add=True)),
                ('acknowledged_date', models.DateTimeField(blank=True, null=True)),
                ('resolved_date', models.DateTimeField(blank=True, null=True)),
                ('acknowledged_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='acknowledged_alerts', to=settings.AUTH_USER_MODEL)),
                ('resolved_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='resolved_alerts', to=settings.AUTH_USER_MODEL)),
                ('worker', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='occupational_health.worker')),
            ],
            options={
                'verbose_name': 'Overexposure Alert',
                'verbose_name_plural': 'Overexposure Alerts',
                'ordering': ['-detected_date'],
            },
        ),
        
        # ExitExamination model
        migrations.CreateModel(
            name='ExitExamination',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('exit_date', models.DateField()),
                ('reason_for_exit', models.CharField(choices=[('retirement', 'Retirement'), ('resignation', 'Resignation'), ('termination', 'Termination'), ('contract_end', 'Contract End'), ('medical_unfitness', 'Medical Unfitness'), ('relocation', 'Relocation'), ('other', 'Other')], max_length=50)),
                ('exam_completed', models.BooleanField(default=False)),
                ('exam_date', models.DateField(blank=True, null=True)),
                ('health_status_summary', models.TextField(blank=True)),
                ('occupational_disease_present', models.BooleanField(default=False)),
                ('disease_notes', models.TextField(blank=True)),
                ('post_employment_medical_followup', models.BooleanField(default=False)),
                ('followup_recommendations', models.TextField(blank=True)),
                ('worker_compensation_claim', models.BooleanField(default=False)),
                ('exit_certificate_issued', models.BooleanField(default=False)),
                ('exit_certificate_date', models.DateField(blank=True, null=True)),
                ('reported_to_cnss', models.BooleanField(default=False)),
                ('cnss_report_date', models.DateField(blank=True, null=True)),
                ('cnss_reference_number', models.CharField(blank=True, max_length=100)),
                ('examiner', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='exit_exams', to=settings.AUTH_USER_MODEL)),
                ('worker', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, to='occupational_health.worker')),
            ],
            options={
                'verbose_name': 'Exit Examination',
                'verbose_name_plural': 'Exit Examinations',
            },
        ),
        
        # PPEComplianceRecord model
        migrations.CreateModel(
            name='PPEComplianceRecord',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('check_date', models.DateField()),
                ('check_type', models.CharField(choices=[('routine', 'Routine'), ('pre_use', 'Pre-Use'), ('post_incident', 'Post-Incident'), ('inventory', 'Inventory'), ('expiry', 'Expiry'), ('damage', 'Damage')], max_length=50)),
                ('status', models.CharField(choices=[('in_use', 'In Use'), ('expired', 'Expired'), ('damaged', 'Damaged'), ('lost', 'Lost'), ('replaced', 'Replaced'), ('compliant', 'Compliant'), ('non_compliant', 'Non-Compliant')], default='in_use', max_length=30)),
                ('is_compliant', models.BooleanField(default=True)),
                ('non_compliance_reason', models.CharField(blank=True, max_length=200)),
                ('corrective_action', models.TextField(blank=True)),
                ('notes', models.TextField(blank=True)),
                ('approval_date', models.DateField(blank=True, null=True)),
                ('approved_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='approved_ppe_compliance', to=settings.AUTH_USER_MODEL)),
                ('checked_by', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='ppe_compliance_checks', to=settings.AUTH_USER_MODEL)),
                ('ppe_item', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='occupational_health.ppeitem')),
            ],
            options={
                'verbose_name': 'PPE Compliance Record',
                'verbose_name_plural': 'PPE Compliance Records',
                'ordering': ['-check_date'],
            },
        ),
        
        # RegulatoryCNSSReport model
        migrations.CreateModel(
            name='RegulatoryCNSSReport',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('reference_number', models.CharField(max_length=100, unique=True)),
                ('report_type', models.CharField(choices=[('incident', 'Incident Report'), ('disease', 'Occupational Disease'), ('fatality', 'Fatality Report'), ('monthly_stats', 'Monthly Statistics'), ('quarterly_summary', 'Quarterly Summary'), ('annual_report', 'Annual Report')], max_length=50)),
                ('report_period_start', models.DateField()),
                ('report_period_end', models.DateField()),
                ('content_json', models.JSONField(help_text='Report content in JSON format')),
                ('status', models.CharField(choices=[('draft', 'Draft'), ('ready_for_submission', 'Ready for Submission'), ('submitted', 'Submitted'), ('acknowledged', 'Acknowledged by CNSS'), ('approved', 'Approved'), ('rejected', 'Rejected')], default='draft', max_length=30)),
                ('prepared_date', models.DateField(auto_now_add=True)),
                ('submitted_date', models.DateTimeField(blank=True, null=True)),
                ('submission_method', models.CharField(blank=True, choices=[('online', 'Online Portal'), ('email', 'Email'), ('paper', 'Paper'), ('courier', 'Courier')], max_length=20)),
                ('cnss_acknowledge_number', models.CharField(blank=True, max_length=100)),
                ('cnss_acknowledgment_date', models.DateField(blank=True, null=True)),
                ('prepared_by', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='cnss_reports_prepared', to=settings.AUTH_USER_MODEL)),
                ('related_disease', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='occupational_health.occupationaldisease')),
                ('related_incident', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='occupational_health.workplaceincident')),
                ('enterprise', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='occupational_health.enterprise')),
            ],
            options={
                'verbose_name': 'CNSS Regulatory Report',
                'verbose_name_plural': 'CNSS Regulatory Reports',
                'ordering': ['-submitted_date', '-prepared_date'],
            },
        ),
        
        # DRCRegulatoryReport model
        migrations.CreateModel(
            name='DRCRegulatoryReport',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('reference_number', models.CharField(max_length=100, unique=True)),
                ('report_type', models.CharField(choices=[('monthly_incidents', 'Monthly Incidents'), ('quarterly_health', 'Quarterly Health'), ('annual_compliance', 'Annual Compliance'), ('fatal_incident', 'Fatal Incident'), ('severe_incident', 'Severe Incident'), ('disease_notice', 'Disease Notice')], max_length=50)),
                ('report_period_start', models.DateField()),
                ('report_period_end', models.DateField()),
                ('status', models.CharField(choices=[('draft', 'Draft'), ('submitted', 'Submitted'), ('acknowledged', 'Acknowledged'), ('pending_response', 'Pending Response'), ('closed', 'Closed')], default='draft', max_length=30)),
                ('submitted_date', models.DateTimeField(blank=True, null=True)),
                ('submission_method', models.CharField(blank=True, choices=[('email', 'Email'), ('online_portal', 'Online Portal'), ('courier', 'Courier'), ('in_person', 'In Person')], max_length=30)),
                ('submission_recipient', models.CharField(blank=True, max_length=100)),
                ('authority_response', models.TextField(blank=True)),
                ('required_actions', models.TextField(blank=True)),
                ('response_deadline', models.DateField(blank=True, null=True)),
                ('enterprise', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='occupational_health.enterprise')),
                ('submitted_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='drc_reports_submitted', to=settings.AUTH_USER_MODEL)),
                ('related_diseases', models.ManyToManyField(blank=True, related_name='drc_reports', to='occupational_health.OccupationalDisease')),
                ('related_incidents', models.ManyToManyField(blank=True, related_name='drc_reports', to='occupational_health.WorkplaceIncident')),
            ],
            options={
                'verbose_name': 'DRC Regulatory Report',
                'verbose_name_plural': 'DRC Regulatory Reports',
                'ordering': ['-submitted_date'],
            },
        ),
    ]
