from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('occupational_health', '0030_medicalexamination_location'),
    ]

    operations = [
        # Add standard normative reference field to PPEItem (ISO 45001 §8.1.2 traceability)
        migrations.AddField(
            model_name='ppeitem',
            name='standard_ref',
            field=models.CharField(
                blank=True,
                help_text='Ex: EN 397:2012, ANSI Z89.1-2014, EN 149 FFP2, ISO 20345:2021',
                max_length=100,
                verbose_name='Référence Norme',
            ),
        ),
        # Add conformity document reference field to PPEItem
        migrations.AddField(
            model_name='ppeitem',
            name='document_ref',
            field=models.CharField(
                blank=True,
                help_text="Déclaration CE de conformité, certificat d'essai ou référence documentaire",
                max_length=255,
                verbose_name='Réf. Document Conformité',
            ),
        ),
        # Data migration: rename existing 'expiry' check_type values to 'expiry_check'
        # Rationale: 'expiry' was semantically wrong — expiry is a trigger condition,
        # not a check type. The inspection is still routine/inventory, prompted by expiry.
        migrations.RunSQL(
            sql="UPDATE occupational_health_ppecompliancerecord SET check_type = 'expiry_check' WHERE check_type = 'expiry';",
            reverse_sql="UPDATE occupational_health_ppecompliancerecord SET check_type = 'expiry' WHERE check_type = 'expiry_check';",
        ),
        # Update check_type field choices on PPEComplianceRecord
        migrations.AlterField(
            model_name='ppecompliancerecord',
            name='check_type',
            field=models.CharField(
                choices=[
                    ('routine', 'Routine'),
                    ('pre_use', 'Pre-Use'),
                    ('post_incident', 'Post-Incident'),
                    ('inventory', 'Inventory'),
                    ('expiry_check', 'Expiry Check'),
                    ('damage', 'Damage'),
                ],
                max_length=50,
            ),
        ),
    ]
