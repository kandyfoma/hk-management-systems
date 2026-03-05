"""
Migration 0029 — Allow PPECatalog.enterprise to be NULL.

When a staff user registers a new PPE catalog item but is not linked
to any Worker (and therefore no Enterprise), the NOT NULL constraint
previously caused an IntegrityError.  Making the FK nullable is the
cleanest fix: catalog items can exist independently of an enterprise.
"""

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('occupational_health', '0028_seed_exam_catalog'),
    ]

    operations = [
        migrations.AlterField(
            model_name='ppecatalog',
            name='enterprise',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='ppe_catalog',
                to='occupational_health.enterprise',
                verbose_name='Entreprise',
            ),
        ),
    ]
