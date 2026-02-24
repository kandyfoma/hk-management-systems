# Generated migration for medical examination extended features

from django.db import migrations, models
import django.db.models.deletion
import django.core.validators
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('occupational_health', '0002_extended_features'),  # Adjust if needed
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # XrayImagingResult model
        migrations.CreateModel(
            name='XrayImagingResult',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('imaging_type', models.CharField(choices=[('chest_xray', 'Chest X-Ray'), ('hrct', 'High-Resolution CT'), ('plain_film', 'Plain Film')], default='chest_xray', max_length=20)),
                ('imaging_date', models.DateField()),
                ('imaging_facility', models.CharField(blank=True, max_length=200)),
                ('radiologist', models.CharField(blank=True, max_length=200)),
                ('ilo_classification', models.CharField(choices=[('0/0', 'Category 0/0 - No opacities'), ('0/1', 'Category 0/1 - Borderline opacities'), ('1/0', 'Category 1/0 - Small rounded opacities'), ('1/1', 'Category 1/1 - Small rounded opacities'), ('1/2', 'Category 1/2 - Small rounded opacities'), ('2/1', 'Category 2/1 - Moderate opacities'), ('2/2', 'Category 2/2 - Moderate opacities'), ('2/3', 'Category 2/3 - Moderate opacities'), ('3/2', 'Category 3/2 - Extensive opacities'), ('3/3', 'Category 3/3 - Extensive opacities')], default='0/0', help_text='ILO 2000 pneumoconiosis classification', max_length=10)),
                ('profusion', models.CharField(choices=[('absent', 'Absent'), ('minimal', 'Minimal'), ('mild', 'Mild'), ('moderate', 'Moderate'), ('severe', 'Severe')], default='absent', max_length=20)),
                ('small_opacities', models.BooleanField(default=False)),
                ('large_opacities', models.BooleanField(default=False)),
                ('pleural_thickening', models.BooleanField(default=False)),
                ('pleural_effusion', models.BooleanField(default=False)),
                ('costophrenic_angle_obliteration', models.BooleanField(default=False)),
                ('cardiac_enlargement', models.BooleanField(default=False)),
                ('other_findings', models.TextField(blank=True)),
                ('pneumoconiosis_detected', models.BooleanField(default=False)),
                ('pneumoconiosis_type', models.CharField(blank=True, help_text='e.g., Silicosis, Asbestosis, Coal worker pneumoconiosis', max_length=100)),
                ('severity', models.CharField(blank=True, choices=[('mild', 'Mild'), ('moderate', 'Moderate'), ('severe', 'Severe'), ('advanced', 'Advanced')], max_length=20)),
                ('follow_up_required', models.BooleanField(default=False)),
                ('follow_up_interval_months', models.IntegerField(blank=True, null=True)),
                ('clinical_notes', models.TextField(blank=True)),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('updated', models.DateTimeField(auto_now=True)),
                ('examination', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='xray_result', to='occupational_health.medicalexamination')),
            ],
            options={
                'verbose_name': 'X-Ray Imaging Result',
                'verbose_name_plural': 'X-Ray Imaging Results',
            },
        ),

        # HeavyMetalsTest model
        migrations.CreateModel(
            name='HeavyMetalsTest',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('heavy_metal', models.CharField(choices=[('lead', 'Lead (Pb)'), ('mercury', 'Mercury (Hg)'), ('cadmium', 'Cadmium (Cd)'), ('cobalt', 'Cobalt (Co)'), ('chromium', 'Chromium (Cr)'), ('nickel', 'Nickel (Ni)'), ('manganese', 'Manganese (Mn)'), ('arsenic', 'Arsenic (As)'), ('beryllium', 'Beryllium (Be)'), ('aluminum', 'Aluminum (Al)')], max_length=20)),
                ('specimen_type', models.CharField(choices=[('blood', 'Blood'), ('urine', 'Urine'), ('hair', 'Hair')], max_length=10)),
                ('test_date', models.DateField()),
                ('level_value', models.DecimalField(decimal_places=4, help_text='Concentration level', max_digits=10)),
                ('unit', models.CharField(help_text='e.g., µg/dL, µg/L, ppm', max_length=20)),
                ('reference_lower', models.DecimalField(blank=True, decimal_places=4, max_digits=10, null=True)),
                ('reference_upper', models.DecimalField(blank=True, decimal_places=4, max_digits=10, null=True)),
                ('status', models.CharField(choices=[('normal', 'Normal'), ('elevated', 'Elevated'), ('high', 'High'), ('critical', 'Critical')], default='normal', max_length=20)),
                ('osha_action_level', models.DecimalField(blank=True, decimal_places=4, max_digits=10, null=True)),
                ('exceeds_osha_limit', models.BooleanField(default=False)),
                ('clinical_significance', models.CharField(blank=True, help_text='Medical interpretation of result', max_length=200)),
                ('occupational_exposure', models.BooleanField(default=True, help_text='Result attributable to occupational exposure')),
                ('follow_up_required', models.BooleanField(default=False)),
                ('follow_up_recommendation', models.TextField(blank=True)),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('updated', models.DateTimeField(auto_now=True)),
                ('examination', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='heavy_metals_tests', to='occupational_health.medicalexamination')),
            ],
            options={
                'verbose_name': 'Heavy Metals Test',
                'verbose_name_plural': 'Heavy Metals Tests',
                'ordering': ['-test_date'],
            },
        ),

        # DrugAlcoholScreening model
        migrations.CreateModel(
            name='DrugAlcoholScreening',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('test_type', models.CharField(choices=[('urine', 'Urine Screening'), ('breath', 'Breath Alcohol Test'), ('blood', 'Blood Test'), ('oral_fluid', 'Oral Fluid Test')], max_length=20)),
                ('test_date', models.DateField()),
                ('testing_facility', models.CharField(blank=True, max_length=200)),
                ('collector', models.CharField(blank=True, max_length=200)),
                ('alcohol_tested', models.BooleanField(default=True)),
                ('alcohol_result', models.CharField(choices=[('negative', 'Negative'), ('positive', 'Positive'), ('presumptive', 'Presumptive Positive'), ('invalid', 'Invalid Result')], default='negative', max_length=20)),
                ('alcohol_level', models.DecimalField(blank=True, decimal_places=3, help_text='BAC (Blood Alcohol Content) in %, or breath test equivalent', max_digits=5, null=True)),
                ('drug_tested', models.BooleanField(default=True)),
                ('drug_result', models.CharField(choices=[('negative', 'Negative'), ('positive', 'Positive'), ('presumptive', 'Presumptive Positive'), ('invalid', 'Invalid Result')], default='negative', max_length=20)),
                ('substances_tested', models.CharField(blank=True, help_text='Comma-separated list of substances screened', max_length=200)),
                ('specific_substances_detected', models.CharField(blank=True, help_text='Comma-separated list of substances found', max_length=200)),
                ('confirmation_required', models.BooleanField(default=False)),
                ('confirmation_date', models.DateField(blank=True, null=True)),
                ('confirmation_result', models.CharField(blank=True, choices=[('negative', 'Negative'), ('positive', 'Positive'), ('presumptive', 'Presumptive Positive'), ('invalid', 'Invalid Result')], max_length=20, null=True)),
                ('mro_reviewed', models.BooleanField(default=False)),
                ('mro_name', models.CharField(blank=True, max_length=200)),
                ('mro_comments', models.TextField(blank=True)),
                ('fit_for_duty', models.BooleanField(default=True, help_text='Fitness for duty determination')),
                ('restrictions', models.TextField(blank=True, help_text='Any work restrictions or recommendations')),
                ('chain_of_custody_verified', models.BooleanField(default=True)),
                ('specimen_id', models.CharField(blank=True, max_length=100)),
                ('notes', models.TextField(blank=True)),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('updated', models.DateTimeField(auto_now=True)),
                ('examination', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='drug_alcohol_screening', to='occupational_health.medicalexamination')),
            ],
            options={
                'verbose_name': 'Drug & Alcohol Screening',
                'verbose_name_plural': 'Drug & Alcohol Screenings',
            },
        ),

        # FitnessCertificationDecision model
        migrations.CreateModel(
            name='FitnessCertificationDecision',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('decision_date', models.DateField(auto_now_add=True)),
                ('fitness_status', models.CharField(choices=[('fit', 'Fit for Duty'), ('fit_with_restrictions', 'Fit with Work Restrictions'), ('temporarily_unfit', 'Temporarily Unfit'), ('permanently_unfit', 'Permanently Unfit')], max_length=25)),
                ('decision_basis', models.CharField(choices=[('medical_exam', 'Medical Examination Findings'), ('test_results', 'Test Results (Audiometry, Spirometry, etc)'), ('xray', 'X-Ray Imaging Classification'), ('drug_alcohol', 'Drug & Alcohol Screening'), ('heavy_metals', 'Heavy Metals Exposure'), ('mental_health', 'Mental Health Assessment'), ('ergonomic', 'Ergonomic Assessment'), ('medical_history', 'Medical History'), ('combination', 'Multiple Factors')], max_length=20)),
                ('key_findings', models.TextField()),
                ('risk_factors', models.TextField(blank=True)),
                ('work_restrictions', models.TextField(blank=True, help_text='Specific work restrictions if applicable')),
                ('required_accommodations', models.TextField(blank=True, help_text='Job accommodations or equipment modifications')),
                ('recommended_interventions', models.TextField(blank=True, help_text='Recommended medical or occupational interventions')),
                ('follow_up_required', models.BooleanField(default=False)),
                ('follow_up_interval_months', models.IntegerField(blank=True, null=True, validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(36)])),
                ('follow_up_justification', models.TextField(blank=True)),
                ('certification_date', models.DateField()),
                ('certification_valid_until', models.DateField()),
                ('medical_fit', models.BooleanField(default=True)),
                ('psychological_fit', models.BooleanField(default=True)),
                ('safety_sensitive', models.BooleanField(default=False, help_text='Is this a safety-sensitive position?')),
                ('subject_to_appeal', models.BooleanField(default=False)),
                ('appeal_deadline', models.DateField(blank=True, null=True)),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('updated', models.DateTimeField(auto_now=True)),
                ('examinations', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='fitness_decisions', to='occupational_health.medicalexamination')),
                ('reviewed_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='fitness_decisions_reviewed', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Fitness Certification Decision',
                'verbose_name_plural': 'Fitness Certification Decisions',
                'ordering': ['-certification_date'],
            },
        ),
    ]
