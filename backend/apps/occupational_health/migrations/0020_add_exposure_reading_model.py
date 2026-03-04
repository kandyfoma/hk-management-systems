# Generated migration for ExposureReading model

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.core.validators
from decimal import Decimal


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('occupational_health', '0019_add_ppe_catalog_and_audit_log'),
    ]

    operations = [
        migrations.CreateModel(
            name='ExposureReading',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('exposure_type', models.CharField(choices=[('silica_dust', 'Crystalline Silica (Respirable)'), ('cobalt', 'Cobalt & Compounds'), ('total_dust', 'Total Inhalable Dust'), ('noise', 'Noise Level'), ('vibration', 'Hand-Arm Vibration'), ('heat', 'Wet Bulb Globe Temperature (WBGT)'), ('lead', 'Lead & Compounds'), ('asbestos', 'Asbestos Fibers'), ('chemical', 'Chemical Vapor'), ('biological', 'Biological Agents')], max_length=50)),
                ('exposure_value', models.DecimalField(decimal_places=3, max_digits=10, validators=[django.core.validators.MinValueValidator(Decimal('0'))], verbose_name='Valeur Exposition')),
                ('unit_measurement', models.CharField(help_text='ex: mg/m³, µg/m³, dB(A), m/s²', max_length=20, verbose_name='Unité')),
                ('osha_twa_limit', models.DecimalField(blank=True, decimal_places=3, help_text='Time Weighted Average limit', max_digits=10, null=True, verbose_name='Limite OSHA TWA')),
                ('acgih_tlv_limit', models.DecimalField(blank=True, decimal_places=3, help_text='American Conference of Industrial Hygienists Threshold Limit Value', max_digits=10, null=True, verbose_name='Limite ACGIH TLV')),
                ('local_limit', models.DecimalField(blank=True, decimal_places=3, help_text='Country/enterprise specific limit', max_digits=10, null=True, verbose_name='Limite Locale')),
                ('status', models.CharField(choices=[('safe', 'Safe'), ('warning', 'Warning'), ('critical', 'Critical'), ('exceeded', 'Exceeded Limit')], default='safe', max_length=20)),
                ('measurement_date', models.DateTimeField(verbose_name='Date Mesure')),
                ('sampling_duration_hours', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True, verbose_name='Durée Échantillonnage (h)')),
                ('sampling_location', models.CharField(help_text='ex: Main Shaft, Grinding Mill, Office A, etc', max_length=200, verbose_name='Lieu Échantillonnage')),
                ('source_type', models.CharField(choices=[('direct_measurement', 'Direct Measurement'), ('area_monitoring', 'Area Monitoring'), ('personal_sampler', 'Personal Air Sampler'), ('real_time_monitor', 'Real-Time Monitor'), ('manual_entry', 'Manual Entry'), ('equipment_api', 'Equipment API Integration')], max_length=30)),
                ('equipment_id', models.CharField(blank=True, help_text='Equipment serial number or sensor ID', max_length=100, verbose_name='ID Équipement')),
                ('equipment_name', models.CharField(blank=True, help_text='ex: Gravimetric Sampler #02, Sound Level Meter SLM-001', max_length=200, verbose_name='Nom Équipement')),
                ('calibration_date', models.DateField(blank=True, null=True, verbose_name='Date Étalonnage')),
                ('calibration_due_date', models.DateField(blank=True, null=True, verbose_name='Étalonnage Dû')),
                ('is_valid_measurement', models.BooleanField(default=True, help_text='Uncheck if equipment malfunction or invalid conditions', verbose_name='Mesure Valide')),
                ('measurement_notes', models.TextField(blank=True, help_text='Conditions, interference, anomalies observed', verbose_name='Notes Mesure')),
                ('alert_triggered', models.BooleanField(default=False, verbose_name='Alerte Déclenchée')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('enterprise', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='exposure_readings', to='occupational_health.enterprise')),
                ('measured_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='exposure_readings_measured', to=settings.AUTH_USER_MODEL)),
                ('related_alert', models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='source_reading', to='occupational_health.overexposurealert')),
                ('reviewed_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='exposure_readings_reviewed', to=settings.AUTH_USER_MODEL)),
                ('worker', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='exposure_readings', to='occupational_health.worker')),
            ],
            options={
                'verbose_name': 'Exposure Reading',
                'verbose_name_plural': 'Exposure Readings',
                'ordering': ['-measurement_date'],
            },
        ),
        migrations.AddIndex(
            model_name='exposurereading',
            index=models.Index(fields=['worker', '-measurement_date'], name='occupational_worker_measure_idx'),
        ),
        migrations.AddIndex(
            model_name='exposurereading',
            index=models.Index(fields=['enterprise', 'exposure_type', '-measurement_date'], name='occupational_enter_expo_idx'),
        ),
        migrations.AddIndex(
            model_name='exposurereading',
            index=models.Index(fields=['status', '-measurement_date'], name='occupational_status_date_idx'),
        ),
    ]
