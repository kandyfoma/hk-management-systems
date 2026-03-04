"""
Migration 0023 — Consultation enhancements:
  1. MedicalExamination: add structured occupational history & lifestyle fields
     (smoking_status, pack_years, alcohol_audit_c_score, family_history,
      prior_occupational_history, working_schedule, functional_complaints_at_work)
  2. FitnessCertificate: add 5th fitness category, structured restriction
     checkboxes, and legal compliance fields.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('occupational_health', '0022_rename_occupational_worker_measure_idx_occupationa_worker__b03d0c_idx_and_more'),
    ]

    operations = [
        # ── MedicalExamination — lifestyle & occupational history ─────────────
        migrations.AddField(
            model_name='medicalexamination',
            name='smoking_status',
            field=models.CharField(
                blank=True,
                choices=[('never', 'Non-fumeur'), ('ex_smoker', 'Ex-fumeur'), ('current', 'Fumeur actuel')],
                max_length=20,
                verbose_name='Statut tabagique',
            ),
        ),
        migrations.AddField(
            model_name='medicalexamination',
            name='pack_years',
            field=models.DecimalField(
                blank=True,
                decimal_places=1,
                help_text='(nb cigarettes/jour ÷ 20) × années',
                max_digits=5,
                null=True,
                verbose_name='Paquets-années',
            ),
        ),
        migrations.AddField(
            model_name='medicalexamination',
            name='alcohol_audit_c_score',
            field=models.PositiveIntegerField(
                blank=True,
                help_text='Score AUDIT-C 0-12',
                null=True,
                verbose_name='Score AUDIT-C',
            ),
        ),
        migrations.AddField(
            model_name='medicalexamination',
            name='family_history',
            field=models.TextField(blank=True, verbose_name='Antécédents familiaux'),
        ),
        migrations.AddField(
            model_name='medicalexamination',
            name='prior_occupational_history',
            field=models.JSONField(
                default=list,
                help_text='[{"employer":"…","job_title":"…","from_year":2010,"to_year":2018,"exposures":["poussières","bruit"]}]',
                verbose_name='Historique professionnel antérieur',
            ),
        ),
        migrations.AddField(
            model_name='medicalexamination',
            name='working_schedule',
            field=models.CharField(
                blank=True,
                choices=[('day', 'Jour'), ('night', 'Nuit'), ('rotating', 'Rotatif'), ('irregular', 'Irrégulier')],
                max_length=20,
                verbose_name='Horaire de travail',
            ),
        ),
        migrations.AddField(
            model_name='medicalexamination',
            name='functional_complaints_at_work',
            field=models.TextField(blank=True, verbose_name='Plaintes fonctionnelles au travail'),
        ),

        # ── FitnessCertificate — alter fitness_decision choices ───────────────
        migrations.AlterField(
            model_name='fitnesscertificate',
            name='fitness_decision',
            field=models.CharField(
                choices=[
                    ('fit', 'Apte'),
                    ('fit_with_restrictions', 'Apte avec Restrictions'),
                    ('fit_enhanced_surveillance', 'Apte sous Surveillance Renforcée'),
                    ('temporarily_unfit', 'Inapte Temporaire'),
                    ('permanently_unfit', 'Inapte Définitif'),
                ],
                max_length=30,
                verbose_name='Décision Aptitude',
            ),
        ),

        # ── FitnessCertificate — structured restriction checkboxes ────────────
        migrations.AddField(
            model_name='fitnesscertificate',
            name='restrict_no_driving',
            field=models.BooleanField(default=False, verbose_name='Interdit de conduire'),
        ),
        migrations.AddField(
            model_name='fitnesscertificate',
            name='restrict_no_height_work',
            field=models.BooleanField(default=False, verbose_name='Interdit travail en hauteur'),
        ),
        migrations.AddField(
            model_name='fitnesscertificate',
            name='restrict_max_lifting_kg',
            field=models.PositiveIntegerField(
                blank=True,
                null=True,
                verbose_name='Port de charge max (kg)',
            ),
        ),
        migrations.AddField(
            model_name='fitnesscertificate',
            name='restrict_no_night_shift',
            field=models.BooleanField(default=False, verbose_name='Interdit travail de nuit'),
        ),
        migrations.AddField(
            model_name='fitnesscertificate',
            name='restrict_adapted_workstation',
            field=models.BooleanField(default=False, verbose_name='Poste aménagé requis'),
        ),
        migrations.AddField(
            model_name='fitnesscertificate',
            name='restrict_reduced_hours',
            field=models.BooleanField(default=False, verbose_name='Horaire aménagé requis'),
        ),
        migrations.AddField(
            model_name='fitnesscertificate',
            name='restrict_no_confined_space',
            field=models.BooleanField(default=False, verbose_name='Interdit espaces confinés'),
        ),
        migrations.AddField(
            model_name='fitnesscertificate',
            name='restrict_no_chemical_exposure',
            field=models.BooleanField(default=False, verbose_name='Interdit exposition chimique'),
        ),
        migrations.AddField(
            model_name='fitnesscertificate',
            name='restrict_custom',
            field=models.TextField(
                blank=True,
                help_text='Restriction non couverte par les cases ci-dessus',
                verbose_name='Restriction personnalisée',
            ),
        ),

        # ── FitnessCertificate — legal compliance fields ──────────────────────
        migrations.AddField(
            model_name='fitnesscertificate',
            name='legal_article_reference',
            field=models.CharField(
                blank=True,
                default='Code du Travail RDC, Art. 156 — Décret No. 68/432',
                max_length=200,
                verbose_name='Référence légale',
            ),
        ),
        migrations.AddField(
            model_name='fitnesscertificate',
            name='right_of_appeal_offered',
            field=models.BooleanField(default=True, verbose_name='Droit de recours notifié'),
        ),
        migrations.AddField(
            model_name='fitnesscertificate',
            name='right_of_appeal_deadline_days',
            field=models.PositiveIntegerField(default=15, verbose_name='Délai de recours (jours)'),
        ),
        migrations.AddField(
            model_name='fitnesscertificate',
            name='functional_impairment_percent',
            field=models.PositiveIntegerField(
                blank=True,
                help_text='0-100 — pour déclaration CNSS/IPM',
                null=True,
                verbose_name="Taux d'incapacité fonctionnelle (%)",
            ),
        ),
    ]
