"""
Migration 0032 — PPEComplianceRecord: add direct Worker + PPECatalog FKs

Architecture fix: the compliance form at #oh-ppe-compliance was broken because
it depended on PPEItem (worker-assigned individual items) which were never
created — the PPE management screen (#oh-ppe) manages PPECatalog (stock only,
no worker assignments).

This migration adds:
  • worker  FK  → PPEComplianceRecord (who is being checked)
  • ppe_catalog FK → PPEComplianceRecord (which catalog item is being checked)

And makes the legacy ppe_item FK nullable (backward compatible).
"""

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('occupational_health', '0031_ppeitem_standard_ref_document_ref_expirycheck'),
    ]

    operations = [
        # 1. Make legacy ppe_item FK nullable (backward compatible)
        migrations.AlterField(
            model_name='ppecompliancerecord',
            name='ppe_item',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='compliance_records',
                to='occupational_health.ppeitem',
            ),
        ),

        # 2. Add direct worker FK
        migrations.AddField(
            model_name='ppecompliancerecord',
            name='worker',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='ppe_compliance_records',
                to='occupational_health.worker',
                verbose_name='Travailleur',
            ),
        ),

        # 3. Add direct ppe_catalog FK
        migrations.AddField(
            model_name='ppecompliancerecord',
            name='ppe_catalog',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='compliance_records',
                to='occupational_health.ppecatalog',
                verbose_name='Article EPI (Catalogue)',
            ),
        ),

        # 4. Update check_type choices (expiry → expiry_check already done in 0031,
        #    this re-declares the full field to be consistent with the model)
        migrations.AlterField(
            model_name='ppecompliancerecord',
            name='check_type',
            field=models.CharField(
                choices=[
                    ('routine',       'Routine'),
                    ('pre_use',       'Pre-Use'),
                    ('post_incident', 'Post-Incident'),
                    ('inventory',     'Inventory'),
                    ('expiry_check',  'Expiry Check'),
                    ('damage',        'Damage'),
                ],
                max_length=50,
                verbose_name='Type Vérification',
            ),
        ),

        # 5. Likewise tidy up status choices declaration
        migrations.AlterField(
            model_name='ppecompliancerecord',
            name='status',
            field=models.CharField(
                choices=[
                    ('in_use',        'In Use'),
                    ('expired',       'Expired'),
                    ('damaged',       'Damaged'),
                    ('lost',          'Lost'),
                    ('replaced',      'Replaced'),
                    ('compliant',     'Compliant'),
                    ('non_compliant', 'Non-Compliant'),
                ],
                max_length=50,
                verbose_name='Statut',
            ),
        ),
    ]
