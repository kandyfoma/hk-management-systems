"""
Migration: Add national_id to Worker, spinal_xray_done to MedicalExamination,
and mining-specific restriction fields + PERMANENT/TEMPORAIRE + revision date
to FitnessCertificate.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('occupational_health', '0034_sync_ppeitem_related_name'),
    ]

    operations = [
        # ── Worker: national identity card number ─────────────────────────────
        migrations.AddField(
            model_name='worker',
            name='national_id',
            field=models.CharField(
                blank=True,
                help_text="Numéro de la carte nationale d'identité",
                max_length=50,
                verbose_name='N° Identité (CIN)',
            ),
        ),

        # ── MedicalExamination: spinal / lumbar X-ray done flag ───────────────
        migrations.AddField(
            model_name='medicalexamination',
            name='spinal_xray_done',
            field=models.BooleanField(
                default=False,
                verbose_name='Radio Colonne Vertébrale effectuée',
            ),
        ),        migrations.AddField(
            model_name='medicalexamination',
            name='lab_tests_done',
            field=models.BooleanField(
                default=False,
                verbose_name='Tests de laboratoire effectués',
            ),
        ),
        migrations.AddField(
            model_name='medicalexamination',
            name='ecg_done',
            field=models.BooleanField(
                default=False,
                verbose_name='ECG effectué',
            ),
        ),
        # ── FitnessCertificate: mining-specific restriction booleans ──────────
        migrations.AddField(
            model_name='fitnesscertificate',
            name='restrict_underground_mine',
            field=models.BooleanField(
                default=False,
                verbose_name='Interdit mine souterraine',
            ),
        ),
        migrations.AddField(
            model_name='fitnesscertificate',
            name='restrict_opencast_mine',
            field=models.BooleanField(
                default=False,
                verbose_name='Interdit mine à ciel ouvert',
            ),
        ),
        migrations.AddField(
            model_name='fitnesscertificate',
            name='restrict_noise_exposure',
            field=models.BooleanField(
                default=False,
                verbose_name='Interdit exposition aux bruits',
            ),
        ),
        migrations.AddField(
            model_name='fitnesscertificate',
            name='restrict_mobile_equipment',
            field=models.BooleanField(
                default=False,
                verbose_name='Interdit équipement mobile',
            ),
        ),

        # ── FitnessCertificate: permanent vs temporary + revision date ─────────
        migrations.AddField(
            model_name='fitnesscertificate',
            name='restriction_is_permanent',
            field=models.BooleanField(
                default=False,
                help_text='True = PERMANENT, False = TEMPORAIRE',
                verbose_name='Restriction permanente',
            ),
        ),
        migrations.AddField(
            model_name='fitnesscertificate',
            name='restriction_revision_date',
            field=models.DateField(
                blank=True,
                null=True,
                verbose_name='Date de révision',
            ),
        ),
    ]
