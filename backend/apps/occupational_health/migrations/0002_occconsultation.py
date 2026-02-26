# Generated migration for OccConsultation model

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('occupational_health', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='OccConsultation',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('consultation_number', models.CharField(max_length=50, unique=True, verbose_name='Numéro Consultation')),
                ('visit_type', models.CharField(choices=[('pre_employment', "Visite d'Embauche"), ('periodic', 'Visite Périodique'), ('return_to_work', 'Visite de Reprise'), ('post_incident', 'Visite Post-Accident'), ('fitness_for_duty', 'Aptitude Spécifique'), ('exit_medical', 'Visite de Sortie'), ('special_request', 'Demande Spéciale'), ('pregnancy_related', 'Suivi Grossesse'), ('night_work', 'Aptitude Travail de Nuit')], default='periodic', max_length=30, verbose_name='Type de Visite')),
                ('exam_type', models.CharField(blank=True, help_text='Ex: periodic, pre_employment, post_incident, etc.', max_length=50, verbose_name='Type Examen')),
                ('vitals', models.JSONField(blank=True, default=dict, help_text='Height, weight, BP, temperature, O2 sat, etc.', verbose_name='Signes Vitaux')),
                ('status', models.CharField(choices=[('waiting', 'En Attente'), ('in_consultation', 'En Consultation'), ('completed', 'Terminée'), ('archived', 'Archivée')], default='waiting', max_length=30, verbose_name='Statut')),
                ('chief_complaint', models.TextField(blank=True, verbose_name='Motif Principal')),
                ('medical_history', models.TextField(blank=True, verbose_name='Antécédents Médicaux')),
                ('physical_examination_findings', models.TextField(blank=True, verbose_name='Résultats Examen Physique')),
                ('exams_ordered', models.JSONField(blank=True, default=list, help_text='List of exam codes ordered during consultation', verbose_name='Examens Commandés')),
                ('fitness_status', models.CharField(choices=[('fit', 'Apte'), ('fit_with_restrictions', 'Apte avec Restrictions'), ('temporarily_unfit', 'Inapte Temporaire'), ('permanently_unfit', 'Inapte Définitif'), ('pending', "En Attente d'Évaluation")], default='pending', max_length=30, verbose_name='Statut Aptitude')),
                ('fitness_decision_notes', models.TextField(blank=True, help_text='Reason for fitness decision, restrictions, recommendations', verbose_name='Notes Décision Aptitude')),
                ('restrictions', models.JSONField(blank=True, default=list, help_text='List of job restrictions if fit_with_restrictions', verbose_name='Restrictions')),
                ('certificate_valid_from', models.DateField(blank=True, null=True, verbose_name='Certificat Valide À Partir De')),
                ('certificate_valid_until', models.DateField(blank=True, null=True, verbose_name='Certificat Valide Jusqu\'au')),
                ('certificate_issued', models.BooleanField(default=False, verbose_name='Certificat Émis')),
                ('followup_required', models.BooleanField(default=False, verbose_name='Suivi Requis')),
                ('followup_reason', models.TextField(blank=True, verbose_name='Raison Suivi')),
                ('followup_date', models.DateField(blank=True, null=True, verbose_name='Date Suivi Prévue')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Créé')),
                ('started_at', models.DateTimeField(blank=True, null=True, verbose_name='Démarré')),
                ('completed_at', models.DateTimeField(blank=True, null=True, verbose_name='Terminé')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Mis à Jour')),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='consultations_created', to=settings.AUTH_USER_MODEL, verbose_name='Créé Par')),
                ('doctor', models.ForeignKey(blank=True, limit_choices_to={'groups__name': 'Doctors'}, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='occupational_consultations', to=settings.AUTH_USER_MODEL, verbose_name='Médecin Assigné')),
                ('worker', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='occupational_consultations', to='occupational_health.worker', verbose_name='Travailleur')),
            ],
            options={
                'verbose_name': 'Consultation Santé Travail',
                'verbose_name_plural': 'Consultations Santé Travail',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='occconsultation',
            index=models.Index(fields=['worker', 'status'], name='occupational_worker_status_idx'),
        ),
        migrations.AddIndex(
            model_name='occconsultation',
            index=models.Index(fields=['doctor', 'status'], name='occupational_doctor_status_idx'),
        ),
        migrations.AddIndex(
            model_name='occconsultation',
            index=models.Index(fields=['-created_at'], name='occupational_created_at_idx'),
        ),
    ]
