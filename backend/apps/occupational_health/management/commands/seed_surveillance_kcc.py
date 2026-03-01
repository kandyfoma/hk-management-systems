"""
Seed surveillance programs for KCC Mining Company

This command creates occupational health surveillance programs specific to mining hazards,
including respiratory, auditory, chemical, and ergonomic monitoring protocols.
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.occupational_health.models_surveillance import SurveillanceProgram
from apps.occupational_health.models import Enterprise
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed surveillance programs for KCC Mining Company'

    def handle(self, *args, **options):
        # Get KCC enterprise
        kcc = Enterprise.objects.filter(name__icontains='KCC').first()
        if not kcc:
            self.stdout.write(self.style.ERROR('KCC Mining enterprise not found. Please create it first.'))
            return

        admin = User.objects.filter(primary_role='admin').first()
        if not admin:
            self.stdout.write(self.style.WARNING('No admin user found.'))
            admin = None

        programs = [
            {
                'name': 'Surveillance Respiratoire — Mines de Cuivre',
                'code': 'SURV_RESP_MINING',
                'description': 'Programme de surveillance des travailleurs exposés aux poussières de silice et aux poussières de mines. Comprend spirométrie, radiographie thoracique et tests de la fonction pulmonaire.',
                'sector': 'mining',
                'target_risk_group': 'respiratory_exposed',
                'required_screenings': ['spirometry', 'chest_xray'],
                'screening_interval_months': 6,
                'action_levels': {
                    'FEV1': {'warning': 80, 'action': 70, 'critical': 60, 'unit': '% prédit', 'action_required': 'Consultation pneumologue + restriction travail hauteur'},
                    'Silica': {'warning': 0.025, 'action': 0.05, 'critical': 0.1, 'unit': 'mg/m³', 'action_required': 'Renforcement ventilation + amélioration EPI'},
                },
                'is_active': True,
            },
            {
                'name': 'Surveillance Auditive — Environnement Bruyant',
                'code': 'SURV_AUD_NOISE',
                'description': 'Audiométrie annuelle pour les travailleurs exposés au bruit >85 dB(A). Détection précoce de la perte auditive.',
                'sector': 'mining',
                'target_risk_group': 'noise_exposed',
                'required_screenings': ['audiometry'],
                'screening_interval_months': 12,
                'action_levels': {
                    'STS': {'warning': 10, 'action': 15, 'critical': 25, 'unit': 'dB', 'action_required': 'Renforcement protection auditive'},
                },
                'is_active': True,
            },
            {
                'name': 'Surveillance des Métaux Lourds — Plomb & Cobalt',
                'code': 'SURV_METALS_BLOOD',
                'description': 'Surveillance du taux de plomb et de cobalt sanguins tous les 6 mois. Applicable aux mineurs, fondeurs et ouvriers d\'entretien.',
                'sector': 'mining',
                'target_risk_group': 'heavy_metals',
                'required_screenings': ['blood_lead', 'blood_cobalt'],
                'screening_interval_months': 6,
                'action_levels': {
                    'Lead': {'warning': 30, 'action': 50, 'critical': 70, 'unit': 'µg/dL', 'action_required': 'Augmentation monitoring + chélation thérapeutique'},
                    'Cobalt': {'warning': 10, 'action': 15, 'critical': 25, 'unit': 'µg/L', 'action_required': 'Relocalisation temporaire + dépistage reins'},
                },
                'is_active': True,
            },
            {
                'name': 'Surveillance Musculo-Squelettique — Travail Physique',
                'code': 'SURV_ERGO_MSK',
                'description': 'Évaluation ergonomique semestrielle des lombalgies et troubles musculo-squelettiques chez les mineurs. Prévention des TMS chroniques.',
                'sector': 'mining',
                'target_risk_group': 'high_risk',
                'required_screenings': ['musculoskeletal_screening'],
                'screening_interval_months': 6,
                'action_levels': {
                    'REBA': {'warning': 4, 'action': 8, 'critical': 11, 'unit': '/15', 'action_required': 'Aménagement poste + physiothérapie'},
                },
                'is_active': True,
            },
            {
                'name': 'Surveillance Psychosociale — Bien-être Mineur',
                'code': 'SURV_PSYCH_STRESS',
                'description': 'Dépistage du stress, fatigue et burnout chez les mineurs souterrains. Travail isolé justifie surveillance spécifique.',
                'sector': 'mining',
                'target_risk_group': 'night_workers',
                'required_screenings': ['mental_health_screening'],
                'screening_interval_months': 12,
                'action_levels': {
                    'GHQ-12': {'warning': 3, 'action': 5, 'critical': 8, 'unit': '/12', 'action_required': 'Consultation psychologue du travail'},
                },
                'is_active': True,
            },
            {
                'name': 'Surveillance des Maladies Infectieuses',
                'code': 'SURV_INFECT_TB',
                'description': 'Dépistage TB, VIH et hépatite B. Espaces confinés augmentent risque transmission. Vaccination obligatoire.',
                'sector': 'mining',
                'target_risk_group': 'respiratory_exposed',
                'required_screenings': ['tb_screening', 'hiv_screening'],
                'screening_interval_months': 12,
                'action_levels': {
                    'Mantoux': {'warning': 5, 'action': 15, 'critical': 20, 'unit': 'mm', 'action_required': 'Enquête épidémiologique + radiographie'},
                },
                'is_active': True,
            },
            {
                'name': 'Surveillance Générale de Santé — Tous Travailleurs',
                'code': 'SURV_GENERAL_HEALTH',
                'description': 'Examen médical annuel complet pour tous les employés KCC. Bilan sanguin, tension artérielle, vision.',
                'sector': 'mining',
                'target_risk_group': 'all_workers',
                'required_screenings': ['blood_work', 'blood_pressure', 'vision_test'],
                'screening_interval_months': 12,
                'action_levels': {
                    'BP Systolic': {'warning': 130, 'action': 140, 'critical': 160, 'unit': 'mmHg', 'action_required': 'Suivi cardiologue'},
                },
                'is_active': True,
            },
        ]

        created_count = 0
        for prog_data in programs:
            # Check if program already exists
            exists = SurveillanceProgram.objects.filter(code=prog_data['code']).exists()
            if exists:
                self.stdout.write(self.style.WARNING(f'Programme déjà existant: {prog_data["name"]}'))
                continue

            # Create the program
            program = SurveillanceProgram.objects.create(
                name=prog_data['name'],
                code=prog_data['code'],
                description=prog_data['description'],
                enterprise=kcc,
                sector=prog_data['sector'],
                target_risk_group=prog_data['target_risk_group'],
                required_screenings=prog_data['required_screenings'],
                screening_interval_months=prog_data['screening_interval_months'],
                action_levels=prog_data['action_levels'],
                is_active=prog_data['is_active'],
            )

            created_count += 1
            self.stdout.write(
                self.style.SUCCESS(f'✓ Programme créé: {program.name} (Code: {program.code})')
            )

        self.stdout.write(
            self.style.SUCCESS(f'\n✅ {created_count} programme(s) de surveillance créé(s) pour KCC Mining')
        )
