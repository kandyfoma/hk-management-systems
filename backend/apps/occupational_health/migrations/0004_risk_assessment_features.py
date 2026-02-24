# Generated migration for Risk Assessment Extended Features

from django.db import migrations, models
import django.db.models.deletion
import django.core.validators
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('occupational_health', '0003_medical_extended_features'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # HierarchyOfControls model
        migrations.CreateModel(
            name='HierarchyOfControls',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('control_level', models.IntegerField(choices=[(1, 'Elimination - Remove hazard completely'), (2, 'Substitution - Replace with less hazardous alternative'), (3, 'Engineering Controls - Isolate hazard'), (4, 'Administrative Controls - Procedures and training'), (5, 'Personal Protective Equipment (PPE) - Last resort')])),
                ('control_name', models.CharField(max_length=200)),
                ('description', models.TextField()),
                ('implementation_requirements', models.TextField(blank=True)),
                ('estimated_cost', models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True, help_text='Estimated cost in local currency')),
                ('estimated_timeline', models.CharField(blank=True, max_length=100, help_text='e.g., 2 weeks, 1 month, 3 months')),
                ('status', models.CharField(choices=[('draft', 'Draft'), ('recommended', 'Recommended'), ('approved', 'Approved'), ('implemented', 'Implemented'), ('effective', 'Effective'), ('ineffective', 'Ineffective'), ('archived', 'Archived')], default='recommended', max_length=20)),
                ('implementation_date', models.DateField(blank=True, null=True)),
                ('effectiveness_rating', models.CharField(blank=True, choices=[('excellent', 'Excellent (>90%)'), ('good', 'Good (70-90%)'), ('fair', 'Fair (50-70%)'), ('poor', 'Poor (<50%)'), ('unknown', 'Unknown/Not yet evaluated')], max_length=20)),
                ('effectiveness_notes', models.TextField(blank=True)),
                ('risk_reduction_percentage', models.IntegerField(blank=True, help_text='Expected/actual risk reduction %', null=True, validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(100)])),
                ('residual_risk_score', models.IntegerField(blank=True, help_text='Risk score after control implementation', null=True, validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(100)])),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('updated', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='hoc_created', to=settings.AUTH_USER_MODEL)),
                ('dependant_controls', models.ManyToManyField(blank=True, related_name='dependent_on', to='occupational_health.hierarchyofcontrols')),
                ('enterprise', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='hoc_recommendations', to='occupational_health.enterprise')),
                ('hazard', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='hoc_recommendations', to='occupational_health.hazardidentification')),
                ('responsible_person', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='hoc_responsibilities', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Hierarchy of Controls',
                'verbose_name_plural': 'Hierarchy of Controls',
                'ordering': ['control_level', '-created'],
            },
        ),

        # RiskHeatmapData model
        migrations.CreateModel(
            name='RiskHeatmapData',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('heatmap_date', models.DateField(auto_now_add=True)),
                ('period', models.CharField(blank=True, help_text='e.g., Q1 2026, February 2026', max_length=50)),
                ('probability_level', models.IntegerField(choices=[(1, '1 - Remote (Almost never happens)'), (2, '2 - Low (Unlikely)'), (3, '3 - Medium (Possible)'), (4, '4 - High (Likely)'), (5, '5 - Very High (Almost certainly)')])),
                ('severity_level', models.IntegerField(choices=[(1, '1 - Negligible (Minor injuries, no lost time)'), (2, '2 - Minor (Minor injuries, <3 days lost time)'), (3, '3 - Moderate (Serious injuries, 3-30 days lost time)'), (4, '4 - Severe (Permanent disability or hospitalization)'), (5, '5 - Catastrophic (Fatality or major property damage)')])),
                ('risk_score', models.IntegerField(help_text='Probability × Severity', validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(25)])),
                ('risk_zone', models.CharField(choices=[('green', 'Green - Low Risk (1-4 points)'), ('yellow', 'Yellow - Medium Risk (5-10 points)'), ('orange', 'Orange - High Risk (11-20 points)'), ('red', 'Red - Critical Risk (21-25 points)')], max_length=20)),
                ('hazards_count', models.IntegerField(default=0)),
                ('incidents_count', models.IntegerField(default=0, help_text='Number of incidents in this risk zone last period')),
                ('near_misses_count', models.IntegerField(default=0, help_text='Number of near-misses in this risk zone last period')),
                ('workers_affected_count', models.IntegerField(default=0)),
                ('controls_implemented', models.IntegerField(default=0, help_text='Number of HOC controls for hazards in this cell')),
                ('controls_effective_percentage', models.IntegerField(blank=True, help_text='Percentage of controls that are effective', null=True, validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(100)])),
                ('previous_period_score', models.IntegerField(blank=True, help_text='Risk score from previous period', null=True)),
                ('trend', models.CharField(blank=True, choices=[('improving', 'Improving (↓)'), ('stable', 'Stable (→)'), ('worsening', 'Worsening (↑)')], help_text='Trend compared to previous period', max_length=20)),
                ('priority', models.CharField(choices=[('critical', 'Critical - Immediate action required'), ('high', 'High - Action required within 1 month'), ('medium', 'Medium - Action required within 3 months'), ('low', 'Low - Action recommended')], default='medium', max_length=20)),
                ('notes', models.TextField(blank=True)),
                ('action_recommendations', models.TextField(blank=True)),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('updated', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='risk_heatmaps_created', to=settings.AUTH_USER_MODEL)),
                ('enterprise', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='risk_heatmaps', to='occupational_health.enterprise')),
                ('related_hazards', models.ManyToManyField(blank=True, related_name='heatmap_entries', to='occupational_health.hazardidentification')),
                ('workers_exposed', models.ManyToManyField(blank=True, related_name='risk_heatmap_exposure', to='occupational_health.worker')),
            ],
            options={
                'verbose_name': 'Risk Heatmap Data',
                'verbose_name_plural': 'Risk Heatmap Data',
                'ordering': ['-heatmap_date', '-risk_score'],
            },
        ),

        # RiskHeatmapReport model
        migrations.CreateModel(
            name='RiskHeatmapReport',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('report_date', models.DateField(auto_now_add=True)),
                ('period', models.CharField(help_text='e.g., Q1 2026, February 2026', max_length=50)),
                ('total_heatmap_cells', models.IntegerField(default=25, help_text='Total cells in 5x5 matrix')),
                ('critical_cells', models.IntegerField(help_text='Red zone cells with risk > 20')),
                ('high_risk_cells', models.IntegerField(help_text='Orange zone cells with risk 11-20')),
                ('medium_risk_cells', models.IntegerField(help_text='Yellow zone cells with risk 5-10')),
                ('low_risk_cells', models.IntegerField(help_text='Green zone cells with risk 1-4')),
                ('average_risk_score', models.DecimalField(decimal_places=2, help_text='Average risk score across all hazards', max_digits=5)),
                ('highest_risk_score', models.IntegerField()),
                ('lowest_risk_score', models.IntegerField()),
                ('total_workers_exposed', models.IntegerField()),
                ('workers_in_critical_zones', models.IntegerField()),
                ('incidents_this_period', models.IntegerField()),
                ('incidents_last_period', models.IntegerField()),
                ('incident_trend', models.CharField(choices=[('up', 'Increasing'), ('down', 'Decreasing'), ('stable', 'Stable')], max_length=20)),
                ('total_controls', models.IntegerField()),
                ('effective_controls', models.IntegerField()),
                ('ineffective_controls', models.IntegerField()),
                ('control_effectiveness_percentage', models.IntegerField(validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(100)])),
                ('critical_actions_required', models.IntegerField()),
                ('action_items', models.TextField(blank=True)),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='risk_heatmap_reports_created', to=settings.AUTH_USER_MODEL)),
                ('enterprise', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='risk_heatmap_reports', to='occupational_health.enterprise')),
            ],
            options={
                'verbose_name': 'Risk Heatmap Report',
                'verbose_name_plural': 'Risk Heatmap Reports',
                'ordering': ['-report_date'],
            },
        ),

        # Add unique constraints
        migrations.AddConstraint(
            model_name='hierarchyofcontrols',
            constraint=models.UniqueConstraint(fields=['hazard', 'control_level', 'control_name'], name='unique_hoc_hazard_level_name'),
        ),
        migrations.AddConstraint(
            model_name='riskheatmapdata',
            constraint=models.UniqueConstraint(fields=['enterprise', 'heatmap_date', 'probability_level', 'severity_level'], name='unique_heatmap_cell'),
        ),
        migrations.AddConstraint(
            model_name='riskheatmapreport',
            constraint=models.UniqueConstraint(fields=['enterprise', 'report_date', 'period'], name='unique_heatmap_report'),
        ),
    ]
