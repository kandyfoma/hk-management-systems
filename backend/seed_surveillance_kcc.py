#!/usr/bin/env python
"""
Seed script: Create surveillance programs for KCC Mining

Populates occupational health surveillance programs tailored to mining industry hazards.
Covers: silica dust, noise exposure, heavy metals, ergonomics, and biological risks.
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.occupational_health.models import Enterprise, SurveillanceProgram, SurveillanceEnrollment, Worker

User = get_user_model()

def seed_surveillance_programs():
    """Create surveillance programs for KCC Mining"""
    
    # Get KCC enterprise
    try:
        kcc = Enterprise.objects.get(name__icontains='KCC Mining')
    except Enterprise.DoesNotExist:
        print("❌ KCC Mining enterprise not found. Run seed_kcc_fresh.py first.")
        return
    
    # Get organization from KCC enterprise
    organization = kcc.created_by.organization if kcc.created_by else None
    if not organization:
        # Try to get any organization
        from apps.organizations.models import Organization
        organization = Organization.objects.first()
        if not organization:
            print("❌ No organization found. Please create one first.")
            return
    
    # Get or create occupational health staff
    ohs_user, created = User.objects.get_or_create(
        phone='+243812345678',
        defaults={
            'email': 'ohs@kcc-mining.cd',
            'first_name': 'Dr.',
            'last_name': 'Occupational Health',
            'primary_role': 'occupational_doctor',
            'organization': organization,
            'is_active': True,
        }
    )
    if created:
        print(f"✅ Created OHS user: {ohs_user.full_name}")
    
    # Define surveillance programs for mining
    programs_data = [
        {
            'name': 'Surveillance Respiratoire — Mines',
            'code': 'SURV_RESP_MIN',
            'description': 'Programme de surveillance des travailleurs exposés aux poussières de silice dans le secteur minier. Comprend spirométrie baseline, radiographie thoracique, et tests de fonction pulmonaire périodiques.',
            'sector': 'mining',
            'target_risk_group': 'respiratory_exposed',
            'required_screenings': ['spirometry', 'chest_xray', 'blood_silica_levels'],
            'screening_interval_months': 6,  # Biannual = 6 months
            'is_active': True,
            'action_levels': {
                'FEV1': {
                    'parameter': 'FEV1',
                    'warning_threshold': 80,
                    'action_threshold': 70,
                    'critical_threshold': 60,
                    'unit': '% prédit',
                    'action_required': 'Consultation pneumologue immédiate'
                },
                'silica_concentration': {
                    'parameter': 'Concentration silice aérienne',
                    'warning_threshold': 0.05,
                    'action_threshold': 0.1,
                    'critical_threshold': 0.2,
                    'unit': 'mg/m³',
                    'action_required': 'Renforcement ventilation + EPI obligatoire'
                }
            },
            'regulatory_reference': 'Code Minier RDC Art. 381-389',
            'compliance_standard': 'ISO 45001:2018, ILO C161',
        },
        {
            'name': 'Surveillance Auditive — Bruit Minier',
            'code': 'SURV_AUD_BRT',
            'description': 'Audiométrie de suivi pour les travailleurs exposés au bruit >85 dB(A) (forage, dynamitage, concassage). Détection précoce de la surdité professionnelle.',
            'sector': 'mining',
            'target_risk_group': 'noise_exposed',
            'required_screenings': ['audiometry', 'tympanometry'],
            'screening_interval_months': 12,  # Annual
            'is_active': True,
            'action_levels': {
                'sts': {
                    'parameter': 'STS (Standard Threshold Shift)',
                    'warning_threshold': 10,
                    'action_threshold': 15,
                    'critical_threshold': 25,
                    'unit': 'dB',
                    'action_required': 'Renforcement protection auditive + formation'
                }
            },
            'regulatory_reference': 'OMS Noise Guidelines',
            'compliance_standard': 'OSHA 1910.95',
        },
        {
            'name': 'Surveillance Métaux Lourds — Plomb et Cobalt',
            'code': 'SURV_HM_PBCO',
            'description': 'Suivi des niveaux de plomb et cobalt sanguin pour les mineurs exposés. Prévention de l\'intoxication chronique aux métaux lourds. Tests sanguins trimestriels.',
            'sector': 'mining',
            'target_risk_group': 'heavy_metals',
            'required_screenings': ['blood_lead', 'blood_cobalt', 'kidney_function_test'],
            'screening_interval_months': 3,  # Quarterly
            'is_active': True,
            'action_levels': {
                'lead': {
                    'parameter': 'Plomémie',
                    'warning_threshold': 30,
                    'action_threshold': 50,
                    'critical_threshold': 70,
                    'unit': 'µg/dL',
                    'action_required': 'Consultation toxicologue + retrait exposition'
                },
                'cobalt': {
                    'parameter': 'Cobalt sanguin',
                    'warning_threshold': 15,
                    'action_threshold': 25,
                    'critical_threshold': 50,
                    'unit': 'µg/L',
                    'action_required': 'Rotation poste + suivi médical intensif'
                }
            },
            'regulatory_reference': 'Code Minier RDC',
            'compliance_standard': 'ACGIH BEI Guidelines',
        },
        {
            'name': 'Surveillance Ergonomique — Charges Lourdes',
            'code': 'SURV_ERGO_CH',
            'description': 'Évaluation musculo-squelettique pour mineurs soumis à manutention manuelle et charges lourdes. Prévention des troubles dorso-lombaires.',
            'sector': 'mining',
            'target_risk_group': 'high_risk',
            'required_screenings': ['musculoskeletal_screening', 'spine_xray'],
            'screening_interval_months': 6,  # Biannual
            'is_active': True,
            'action_levels': {
                'reba': {
                    'parameter': 'Score REBA (Rapid Entire Body Assessment)',
                    'warning_threshold': 4,
                    'action_threshold': 8,
                    'critical_threshold': 11,
                    'unit': '/15',
                    'action_required': 'Aménagement immédiat du poste + thérapeute'
                }
            },
            'regulatory_reference': 'ILO R194',
            'compliance_standard': 'ISO 11228-1',
        },
        {
            'name': 'Surveillance Générale — Examen Annuel',
            'code': 'SURV_GEN_ANN',
            'description': 'Suivi global de santé annuel pour tous les mineurs. Examination médicale complète, tension artérielle, glycémie, antécédents de maladie occupationnelle.',
            'sector': 'mining',
            'target_risk_group': 'all_workers',
            'required_screenings': ['general_physical', 'blood_pressure', 'blood_glucose', 'blood_count'],
            'screening_interval_months': 12,  # Annual
            'is_active': True,
            'action_levels': {
                'systolic_bp': {
                    'parameter': 'Tension artérielle systolique',
                    'warning_threshold': 140,
                    'action_threshold': 160,
                    'critical_threshold': 180,
                    'unit': 'mmHg',
                    'action_required': 'Consultation cardiologie + suivi antihypertenseurs'
                }
            },
            'regulatory_reference': 'Code Minier RDC Art. 385',
            'compliance_standard': 'ILO C161',
        },
    ]
    
    created_count = 0
    for prog_data in programs_data:
        action_levels = prog_data.pop('action_levels')
        
        program, created = SurveillanceProgram.objects.get_or_create(
            code=prog_data.pop('code'),
            defaults={
                **prog_data,
                'enterprise': kcc,
                'created_by': ohs_user,
                'action_levels': action_levels,
            }
        )
        
        if created:
            created_count += 1
            print(f"✅ Created: {program.name}")
        else:
            print(f"⏭️  Already exists: {program.name}")
    
    # Enroll active workers in appropriate programs
    workers = Worker.objects.filter(enterprise=kcc, employment_status='active')[:30]
    enrollment_count = 0
    
    for worker in workers:
        # Enroll in all active programs
        for program in SurveillanceProgram.objects.filter(is_active=True, enterprise=kcc):
            enrollment, created = SurveillanceEnrollment.objects.get_or_create(
                worker=worker,
                program=program,
                defaults={'enrolled_by': ohs_user}
            )
            if created:
                enrollment_count += 1
    
    print(f"\n{'='*60}")
    print(f"✅ Surveillance Seed Complete!")
    print(f"{'='*60}")
    print(f"  Programs created: {created_count}")
    print(f"  Worker enrollments: {enrollment_count}")
    print(f"  OHS staff: {ohs_user.full_name}")
    print(f"  Enterprise: {kcc.name}")
    print(f"{'='*60}\n")

if __name__ == '__main__':
    seed_surveillance_programs()
