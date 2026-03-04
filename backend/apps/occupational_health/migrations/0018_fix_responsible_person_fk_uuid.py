"""
Migration to fix responsible_person_id column type mismatch.

Migration 0014 created responsible_person as a FK to occupational_health.Worker
(bigint PK). The model was later updated to point to the User model (UUID PK),
causing a ProgrammingError: column is of type bigint but expression is of type uuid.

This migration drops the old column and recreates it as a UUID FK to auth user.
"""
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('occupational_health', '0017_fix_hazard_blank_fields'),
    ]

    operations = [
        # Drop the old bigint FK column pointing to Worker
        migrations.RunSQL(
            sql="""
                ALTER TABLE occupational_health_hazardidentification
                DROP COLUMN IF EXISTS responsible_person_id;
            """,
            reverse_sql="""
                ALTER TABLE occupational_health_hazardidentification
                ADD COLUMN responsible_person_id bigint NULL;
            """,
        ),
        # Add the correct UUID FK column pointing to the User model
        migrations.AddField(
            model_name='hazardidentification',
            name='responsible_person',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='hazard_responsibilities',
                to=settings.AUTH_USER_MODEL,
                verbose_name='Personne Responsable',
            ),
        ),
    ]
