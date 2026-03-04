from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('occupational_health', '0014_hazardidentification_responsible_person_worker'),
    ]

    operations = [
        # updated_by: who last updated this record
        migrations.AddField(
            model_name='workplaceincident',
            name='updated_by',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='incidents_updated',
                to=settings.AUTH_USER_MODEL,
                verbose_name='Mis à Jour Par',
            ),
        ),
        # closed_by: who closed the incident
        migrations.AddField(
            model_name='workplaceincident',
            name='closed_by',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='incidents_closed',
                to=settings.AUTH_USER_MODEL,
                verbose_name='Fermé Par',
            ),
        ),
        # closed_at: when the incident was closed
        migrations.AddField(
            model_name='workplaceincident',
            name='closed_at',
            field=models.DateTimeField(
                blank=True, null=True,
                verbose_name='Fermé le',
            ),
        ),
        # status_history: JSON log of status transitions
        migrations.AddField(
            model_name='workplaceincident',
            name='status_history',
            field=models.JSONField(
                blank=True,
                default=list,
                verbose_name='Historique Statut',
            ),
        ),
        # Also fix the reported_by FK to allow blank=True for consistency
        migrations.AlterField(
            model_name='workplaceincident',
            name='reported_by',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='incidents_reported',
                to=settings.AUTH_USER_MODEL,
                verbose_name='Déclaré Par',
            ),
        ),
    ]
