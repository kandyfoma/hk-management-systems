"""
Migration 0030 — Add location field to MedicalExamination.

The location field stores where the medical examination was performed
(e.g., "KCC Health Center", "Clinic Room 3", etc.). This field is optional
and defaults to "KCC Health Center" for backward compatibility.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('occupational_health', '0029_ppecatalog_enterprise_nullable'),
    ]

    operations = [
        migrations.AddField(
            model_name='medicalexamination',
            name='location',
            field=models.CharField(
                blank=True,
                default='KCC Health Center',
                max_length=200,
                verbose_name='Lieu Examen',
            ),
        ),
    ]
