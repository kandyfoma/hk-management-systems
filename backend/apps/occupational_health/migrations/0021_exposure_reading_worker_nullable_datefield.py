"""
Migration 0021: Audit fixes for ExposureReading model
- Make 'worker' FK nullable (null=True, blank=True, SET_NULL) to support
  area/environmental readings not tied to a specific worker.
- Change 'measurement_date' from DateTimeField to DateField (semantically correct;
  daily exposure readings only need date precision, not datetime).
"""

import datetime
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('occupational_health', '0020_add_exposure_reading_model'),
    ]

    operations = [
        # 1. Make worker FK optional (null=True, blank=True, SET_NULL)
        migrations.AlterField(
            model_name='exposurereading',
            name='worker',
            field=models.ForeignKey(
                blank=True,
                help_text='Leave blank for area/environmental readings not tied to a specific worker',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='exposure_readings',
                to='occupational_health.worker',
            ),
        ),
        # 2. Change measurement_date from DateTimeField to DateField
        migrations.AlterField(
            model_name='exposurereading',
            name='measurement_date',
            field=models.DateField(
                default=datetime.date.today,
                verbose_name='Date Mesure',
            ),
        ),
    ]
