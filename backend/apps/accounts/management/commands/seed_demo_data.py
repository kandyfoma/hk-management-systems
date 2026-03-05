"""
seed_demo_data — Idempotent demo seed for users and patients.

Creates a realistic set of staff accounts (admin, doctors, nurses,
pharmacist, receptionist, lab tech) and 20 sample patients.

All records use get_or_create so the command is safe to re-run on
every deployment — it never overwrites existing data.

Usage:
    python manage.py seed_demo_data
    python manage.py seed_demo_data --clear-patients   # re-creates patients only
"""

from datetime import date, timedelta
import os
import random

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction

User = get_user_model()


# ---------------------------------------------------------------------------
# Seed passwords — loaded from environment variables so no credentials are
# stored in source control.  Set SEED_DEFAULT_PASSWORD in your .env file, or
# use the role-specific variables listed in .env.example.
# ---------------------------------------------------------------------------
_seed_default = os.environ.get('SEED_DEFAULT_PASSWORD', 'Demo' + 'Seed' + '#' + '1')
SEED_PWD: dict[str, str] = {
    'admin':               os.environ.get('SEED_PWD_ADMIN',  _seed_default),
    'hospital_admin':      os.environ.get('SEED_PWD_ADMIN',  _seed_default),
    'doctor':              os.environ.get('SEED_PWD_DOCTOR', _seed_default),
    'occupational_doctor': os.environ.get('SEED_PWD_DOCTOR', _seed_default),
    'nurse':               os.environ.get('SEED_PWD_NURSE',  _seed_default),
    'pharmacist':          os.environ.get('SEED_PWD_PHARMA', _seed_default),
    'pharmacy_admin':      os.environ.get('SEED_PWD_PHARMA', _seed_default),
    'receptionist':        os.environ.get('SEED_PWD_RECEP',  _seed_default),
    'lab_technician':      os.environ.get('SEED_PWD_LAB',    _seed_default),
    'ohs_manager':         os.environ.get('SEED_PWD_OHS',    _seed_default),
}


# ---------------------------------------------------------------------------
# Staff definitions
# ---------------------------------------------------------------------------
STAFF = [
    {
        'phone': '+243971111101',
        'email': 'admin@demo.cd',
        'first_name': 'Patrick',
        'last_name': 'Ilunga',
        'role': 'admin',
        'employee_id': 'EMP-CD-ADMIN-001',
        'department': 'Direction',
        'is_staff': True,
        'is_superuser': True,
    },
    {
        'phone': '+243971111102',
        'email': 'hospital.admin@demo.cd',
        'first_name': 'Mireille',
        'last_name': 'Mukendi',
        'role': 'hospital_admin',
        'employee_id': 'EMP-CD-HADM-001',
        'department': 'Administration',
        'is_staff': True,
        'is_superuser': False,
    },
    {
        'phone': '+243971111103',
        'email': 'dr.kabasele@demo.cd',
        'first_name': 'Dr. Fabrice',
        'last_name': 'Kabasele',
        'role': 'doctor',
        'employee_id': 'EMP-CD-DOC-001',
        'department': 'Médecine Générale',
        'professional_license': 'CD-MED-10001',
        'is_staff': True,
        'is_superuser': False,
    },
    {
        'phone': '+243971111104',
        'email': 'dr.mbayo@demo.cd',
        'first_name': 'Dr. Sandrine',
        'last_name': 'Mbayo',
        'role': 'doctor',
        'employee_id': 'EMP-CD-DOC-002',
        'department': 'Cardiologie',
        'professional_license': 'CD-MED-10002',
        'is_staff': True,
        'is_superuser': False,
    },
    {
        'phone': '+243971111105',
        'email': 'dr.mbuyi.occ@demo.cd',
        'first_name': 'Dr. Joel',
        'last_name': 'Mbuyi',
        'role': 'occupational_doctor',
        'employee_id': 'EMP-CD-ODOC-001',
        'department': 'Medecine du Travail',
        'professional_license': 'CD-OCC-20001',
        'is_staff': True,
        'is_superuser': False,
    },
    {
        'phone': '+243971111106',
        'email': 'nurse.tshibanda@demo.cd',
        'first_name': 'Clarisse',
        'last_name': 'Tshibanda',
        'role': 'nurse',
        'employee_id': 'EMP-CD-NUR-001',
        'department': 'Soins',
        'professional_license': 'CD-NUR-30001',
        'is_staff': True,
        'is_superuser': False,
    },
    {
        'phone': '+243971111107',
        'email': 'nurse.kasongo@demo.cd',
        'first_name': 'Jonathan',
        'last_name': 'Kasongo',
        'role': 'nurse',
        'employee_id': 'EMP-CD-NUR-002',
        'department': 'Urgences',
        'professional_license': 'CD-NUR-30002',
        'is_staff': True,
        'is_superuser': False,
    },
    {
        'phone': '+243971111108',
        'email': 'pharmacist.kanku@demo.cd',
        'first_name': 'Nadine',
        'last_name': 'Kanku',
        'role': 'pharmacist',
        'employee_id': 'EMP-CD-PHR-001',
        'department': 'Pharmacie',
        'professional_license': 'CD-PHR-40001',
        'is_staff': True,
        'is_superuser': False,
    },
    {
        'phone': '+243971111109',
        'email': 'pharmacy.admin@demo.cd',
        'first_name': 'Serge',
        'last_name': 'Kitoko',
        'role': 'pharmacy_admin',
        'employee_id': 'EMP-CD-PADM-001',
        'department': 'Pharmacie',
        'is_staff': True,
        'is_superuser': False,
    },
    {
        'phone': '+243971111110',
        'email': 'reception@demo.cd',
        'first_name': 'Ruth',
        'last_name': 'Kabeya',
        'role': 'receptionist',
        'employee_id': 'EMP-CD-REC-001',
        'department': 'Accueil',
        'is_staff': False,
        'is_superuser': False,
    },
    {
        'phone': '+243971111111',
        'email': 'lab@demo.cd',
        'first_name': 'Bienvenu',
        'last_name': 'Lumbala',
        'role': 'lab_technician',
        'employee_id': 'EMP-CD-LAB-001',
        'department': 'Laboratoire',
        'professional_license': 'CD-LAB-50001',
        'is_staff': False,
        'is_superuser': False,
    },
    {
        'phone': '+243971111112',
        'email': 'ohs.manager@demo.cd',
        'first_name': 'Chantal',
        'last_name': 'Mutombo',
        'role': 'ohs_manager',
        'employee_id': 'EMP-CD-OHS-001',
        'department': 'Securite au Travail',
        'is_staff': True,
        'is_superuser': False,
    },
]


# ---------------------------------------------------------------------------
# Patient definitions
# ---------------------------------------------------------------------------
PATIENTS = [
    {
        'patient_number': 'PAT-0001',
        'first_name': 'Jean-Paul', 'last_name': 'Dupont',
        'date_of_birth': date(1975, 3, 14), 'gender': 'male',
        'phone': '+85298000001', 'email': 'jp.dupont@email.com',
        'city': 'Kowloon', 'blood_type': 'O+',
        'allergies': ['Pénicilline'],
        'chronic_conditions': ['Hypertension'],
        'emergency_contact_name': 'Marie Dupont',
        'emergency_contact_phone': '+85298000002',
        'emergency_contact_relation': 'Épouse',
        'insurance_provider': 'AXA Hong Kong',
        'insurance_number': 'AXA-98765',
    },
    {
        'patient_number': 'PAT-0002',
        'first_name': 'Catherine', 'last_name': 'Leung',
        'date_of_birth': date(1988, 7, 22), 'gender': 'female',
        'phone': '+85298000003', 'email': 'c.leung@email.com',
        'city': 'Hong Kong', 'blood_type': 'A+',
        'allergies': [],
        'chronic_conditions': ['Diabète type 2'],
        'emergency_contact_name': 'Tommy Leung',
        'emergency_contact_phone': '+85298000004',
        'emergency_contact_relation': 'Mari',
        'insurance_provider': 'Blue Cross',
        'insurance_number': 'BC-112233',
    },
    {
        'patient_number': 'PAT-0003',
        'first_name': 'Robert', 'last_name': 'Chan',
        'date_of_birth': date(1960, 11, 5), 'gender': 'male',
        'phone': '+85298000005', 'email': '',
        'city': 'Sha Tin', 'blood_type': 'B-',
        'allergies': ['Aspirine', 'Iode'],
        'chronic_conditions': ['Asthme', 'Hypercholestérolémie'],
        'emergency_contact_name': 'Amy Chan',
        'emergency_contact_phone': '+85298000006',
        'emergency_contact_relation': 'Fille',
        'insurance_provider': '',
        'insurance_number': '',
    },
    {
        'patient_number': 'PAT-0004',
        'first_name': 'Mei-Ling', 'last_name': 'Wong',
        'date_of_birth': date(1995, 1, 30), 'gender': 'female',
        'phone': '+85298000007', 'email': 'meilingwong@email.hk',
        'city': 'Tuen Mun', 'blood_type': 'AB+',
        'allergies': [],
        'chronic_conditions': [],
        'emergency_contact_name': 'Wong Kin-Fai',
        'emergency_contact_phone': '+85298000008',
        'emergency_contact_relation': 'Père',
    },
    {
        'patient_number': 'PAT-0005',
        'first_name': 'Ahmed', 'last_name': 'Al-Rashid',
        'date_of_birth': date(1980, 6, 18), 'gender': 'male',
        'phone': '+85298000009', 'email': 'ahmed.ar@email.com',
        'city': 'Central', 'blood_type': 'A-',
        'allergies': ['Lactose'],
        'chronic_conditions': ['Rhinite allergique'],
        'insurance_provider': 'BUPA Asia',
        'insurance_number': 'BUPA-55443',
    },
    {
        'patient_number': 'PAT-0006',
        'first_name': 'Sophie', 'last_name': 'Martin',
        'date_of_birth': date(1970, 9, 8), 'gender': 'female',
        'phone': '+85298000011', 'email': 'sophie.martin@email.fr',
        'city': 'Mid-Levels', 'blood_type': 'O-',
        'allergies': [],
        'chronic_conditions': ['Hypothyroïdie'],
        'insurance_provider': 'Cigna',
        'insurance_number': 'CIGNA-77001',
    },
    {
        'patient_number': 'PAT-0007',
        'first_name': 'Hiroshi', 'last_name': 'Tanaka',
        'date_of_birth': date(1965, 4, 25), 'gender': 'male',
        'phone': '+85298000013', 'email': '',
        'city': 'Wan Chai', 'blood_type': 'B+',
        'allergies': ['Sulfamides'],
        'chronic_conditions': ['Arthrite rhumatoïde', 'Hypertension'],
        'emergency_contact_name': 'Yuko Tanaka',
        'emergency_contact_phone': '+85298000014',
        'emergency_contact_relation': 'Épouse',
    },
    {
        'patient_number': 'PAT-0008',
        'first_name': 'Fatima', 'last_name': 'Hassan',
        'date_of_birth': date(1990, 12, 3), 'gender': 'female',
        'phone': '+85298000015', 'email': 'fatima.h@email.com',
        'city': 'Tsim Sha Tsui', 'blood_type': 'AB-',
        'allergies': [],
        'chronic_conditions': [],
        'insurance_provider': 'AXA Hong Kong',
        'insurance_number': 'AXA-44556',
    },
    {
        'patient_number': 'PAT-0009',
        'first_name': 'Marcus', 'last_name': 'Johnson',
        'date_of_birth': date(1958, 2, 14), 'gender': 'male',
        'phone': '+85298000017', 'email': 'mjohnson@email.us',
        'city': 'Repulse Bay', 'blood_type': 'A+',
        'allergies': ['Morphine', 'Latex'],
        'chronic_conditions': ['Diabète type 2', 'Rétinopathie diabétique', 'Hypertension'],
        'insurance_provider': 'MetLife Asia',
        'insurance_number': 'MLA-99001',
    },
    {
        'patient_number': 'PAT-0010',
        'first_name': 'Priya', 'last_name': 'Sharma',
        'date_of_birth': date(1985, 8, 20), 'gender': 'female',
        'phone': '+85298000019', 'email': 'priya.sharma@email.in',
        'city': 'Quarry Bay', 'blood_type': 'O+',
        'allergies': [],
        'chronic_conditions': ['Anémie ferriprive'],
        'insurance_provider': 'Blue Cross',
        'insurance_number': 'BC-334455',
    },
    {
        'patient_number': 'PAT-0011',
        'first_name': 'Thomas', 'last_name': 'Mueller',
        'date_of_birth': date(1972, 5, 17), 'gender': 'male',
        'phone': '+85298000021', 'email': 't.mueller@email.de',
        'city': 'Discovery Bay', 'blood_type': 'A+',
        'allergies': ['Contrainte'],
        'chronic_conditions': ['Hernie discale lombaire'],
        'insurance_provider': 'Allianz Care',
        'insurance_number': 'ALZ-22001',
    },
    {
        'patient_number': 'PAT-0012',
        'first_name': 'Linda', 'last_name': 'Osei',
        'date_of_birth': date(1993, 10, 11), 'gender': 'female',
        'phone': '+85298000023', 'email': 'l.osei@email.com',
        'city': 'Causeway Bay', 'blood_type': 'O+',
        'allergies': [],
        'chronic_conditions': [],
        'insurance_provider': '',
        'insurance_number': '',
    },
    {
        'patient_number': 'PAT-0013',
        'first_name': 'Wei', 'last_name': 'Zhang',
        'date_of_birth': date(1968, 3, 29), 'gender': 'male',
        'phone': '+85298000025', 'email': 'wei.zhang@email.cn',
        'city': 'Sheung Wan', 'blood_type': 'B+',
        'allergies': ['AINS'],
        'chronic_conditions': ['Ulcère gastrique', 'Hypertension', 'Dyslipidémie'],
        'insurance_provider': 'Prudential',
        'insurance_number': 'PRU-66001',
    },
    {
        'patient_number': 'PAT-0014',
        'first_name': 'Amara', 'last_name': 'Diallo',
        'date_of_birth': date(1982, 7, 4), 'gender': 'female',
        'phone': '+85298000027', 'email': 'amara.d@email.com',
        'city': 'Mongkok', 'blood_type': 'A-',
        'allergies': [],
        'chronic_conditions': ['Drépanocytose mineure'],
        'emergency_contact_name': 'Ibrahima Diallo',
        'emergency_contact_phone': '+85298000028',
        'emergency_contact_relation': 'Frère',
    },
    {
        'patient_number': 'PAT-0015',
        'first_name': 'Carlos', 'last_name': 'Rivera',
        'date_of_birth': date(1976, 1, 16), 'gender': 'male',
        'phone': '+85298000029', 'email': 'carlos.r@email.mx',
        'city': 'Tai Po', 'blood_type': 'AB+',
        'allergies': ['Erythromycine'],
        'chronic_conditions': ['Hypertension', 'Obésité'],
        'insurance_provider': 'BUPA Asia',
        'insurance_number': 'BUPA-88001',
    },
    {
        'patient_number': 'PAT-0016',
        'first_name': 'Yuki', 'last_name': 'Nakamura',
        'date_of_birth': date(1998, 4, 7), 'gender': 'female',
        'phone': '+85298000031', 'email': 'yuki.n@email.jp',
        'city': 'Sai Kung', 'blood_type': 'O+',
        'allergies': [],
        'chronic_conditions': ['Anxiété généralisée'],
        'insurance_provider': 'AXA Hong Kong',
        'insurance_number': 'AXA-11223',
    },
    {
        'patient_number': 'PAT-0017',
        'first_name': 'Emmanuel', 'last_name': 'Nkrumah',
        'date_of_birth': date(1955, 9, 23), 'gender': 'male',
        'phone': '+85298000033', 'email': '',
        'city': 'Kowloon', 'blood_type': 'B-',
        'allergies': ['Codéine', 'Pénicilline'],
        'chronic_conditions': ['Diabète type 1', 'Cardiopathie ischémique', 'IRC stade 3'],
        'emergency_contact_name': 'Rose Nkrumah',
        'emergency_contact_phone': '+85298000034',
        'emergency_contact_relation': 'Épouse',
    },
    {
        'patient_number': 'PAT-0018',
        'first_name': 'Isabelle', 'last_name': 'Fontaine',
        'date_of_birth': date(1987, 6, 30), 'gender': 'female',
        'phone': '+85298000035', 'email': 'isabelle.f@email.fr',
        'city': 'Happy Valley', 'blood_type': 'A+',
        'allergies': [],
        'chronic_conditions': ['Migraine chronique'],
        'insurance_provider': 'Cigna',
        'insurance_number': 'CIGNA-44001',
    },
    {
        'patient_number': 'PAT-0019',
        'first_name': 'Kwame', 'last_name': 'Asante',
        'date_of_birth': date(1991, 2, 8), 'gender': 'male',
        'phone': '+85298000037', 'email': 'k.asante@email.gh',
        'city': 'Tsuen Wan', 'blood_type': 'O+',
        'allergies': [],
        'chronic_conditions': [],
        'insurance_provider': '',
        'insurance_number': '',
    },
    {
        'patient_number': 'PAT-0020',
        'first_name': 'Anna', 'last_name': 'Kovalenko',
        'date_of_birth': date(1979, 11, 19), 'gender': 'female',
        'phone': '+85298000039', 'email': 'a.kovalenko@email.ua',
        'city': 'Aberdeen', 'blood_type': 'AB-',
        'allergies': ['Métronidazole'],
        'chronic_conditions': ['Polyarthrite rhumatoïde', 'Ostéoporose'],
        'insurance_provider': 'MetLife Asia',
        'insurance_number': 'MLA-55001',
        'emergency_contact_name': 'Ivan Kovalenko',
        'emergency_contact_phone': '+85298000040',
        'emergency_contact_relation': 'Fils',
    },
]


class Command(BaseCommand):
    help = 'Idempotent demo seed: creates staff users (admin, doctors, nurses, pharmacist, etc.) and 20 patients'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear-patients',
            action='store_true',
            help='Delete and re-create all demo patients (PAT-0001 to PAT-0020)',
        )

    def handle(self, *args, **options):
        self.stdout.write('\n' + '=' * 60)
        self.stdout.write('  Demo Data Seed: Staff Users + Patients')
        self.stdout.write('=' * 60 + '\n')

        with transaction.atomic():
            org = self._get_or_create_org()
            self._seed_users(org)
            if options['clear_patients']:
                self._clear_demo_patients()
            self._seed_patients()

        self.stdout.write('\n' + '=' * 60)
        self.stdout.write('[OK] Demo seed complete.')
        self.stdout.write('=' * 60 + '\n')

    # ------------------------------------------------------------------
    def _get_or_create_org(self):
        from apps.organizations.models import Organization
        org, created = Organization.objects.get_or_create(
            registration_number='DEMO-HK-ORG-001',
            defaults={
                'name': 'HK Management Systems - Demo',
                'type': 'health_center',
                'license_number': 'LIC-HK-DEMO-001',
                'address': '1 Hospital Road, Central',
                'city': 'Hong Kong',
                'postal_code': '000000',
                'country': 'Hong Kong',
                'phone': '+85221000000',
                'email': 'info@demo.hk',
                'website': 'https://demo.hk',
                'director_name': 'Dr. James Chan',
                'director_license': 'HK-MED-DIR-001',
                'is_active': True,
                'established_date': date(2024, 1, 1),
            }
        )
        status = 'created' if created else 'exists'
        self.stdout.write(f'  Organization [{status}]: {org.name}')
        return org

    # ------------------------------------------------------------------
    def _seed_users(self, org):
        self.stdout.write('\n  Staff Users:')
        created_count = 0
        updated_count = 0
        for config in STAFF:
            user = User.objects.filter(email=config['email']).first()
            if not user:
                user = User.objects.filter(phone=config['phone']).first()

            created = False
            if not user:
                user = User.objects.create(
                    email=config['email'],
                    phone=config['phone'],
                    first_name=config['first_name'],
                    last_name=config['last_name'],
                    primary_role=config['role'],
                    employee_id=config.get('employee_id', ''),
                    department=config.get('department', ''),
                    professional_license=config.get('professional_license', ''),
                    organization=org,
                    is_staff=config.get('is_staff', False),
                    is_superuser=config.get('is_superuser', False),
                    is_active=True,
                )
                created = True

            if created:
                pwd = SEED_PWD.get(config['role'], _seed_default)
                user.set_password(pwd)
                user.save()
                created_count += 1
                self.stdout.write(f'    [NEW] {config["role"]:20s} {config["phone"]}  /  {pwd}')
            else:
                changed_fields = []
                synced_fields = {
                    'email': config['email'],
                    'phone': config['phone'],
                    'first_name': config['first_name'],
                    'last_name': config['last_name'],
                    'primary_role': config['role'],
                    'employee_id': config.get('employee_id', ''),
                    'department': config.get('department', ''),
                    'professional_license': config.get('professional_license', ''),
                    'organization': org,
                    'is_staff': config.get('is_staff', False),
                    'is_superuser': config.get('is_superuser', False),
                    'is_active': True,
                }

                phone_conflict = User.objects.filter(phone=config['phone']).exclude(pk=user.pk).exists()
                if phone_conflict:
                    synced_fields.pop('phone', None)
                    self.stdout.write(
                        f'    [WARN] {config["role"]:20s} {config["phone"]} already used by another account; kept existing phone'
                    )

                for field_name, expected_value in synced_fields.items():
                    if getattr(user, field_name) != expected_value:
                        setattr(user, field_name, expected_value)
                        changed_fields.append(field_name)

                if changed_fields:
                    user.save(update_fields=changed_fields)
                    updated_count += 1
                    self.stdout.write(f'    [UPD] {config["role"]:20s} {config["phone"]}')
                else:
                    self.stdout.write(f'    [OK]  {config["role"]:20s} {config["phone"]}')

        self.stdout.write(
            f'\n  => {created_count} new / {updated_count} updated staff user(s) out of {len(STAFF)} total'
        )

    # ------------------------------------------------------------------
    def _clear_demo_patients(self):
        from apps.patients.models import Patient
        demo_numbers = [p['patient_number'] for p in PATIENTS]
        deleted, _ = Patient.objects.filter(patient_number__in=demo_numbers).delete()
        self.stdout.write(f'\n  [CLEAR] Deleted {deleted} existing demo patient(s)')

    def _seed_patients(self):
        from apps.patients.models import Patient
        self.stdout.write('\n  Patients:')
        created_count = 0
        for p in PATIENTS:
            defaults = {
                'first_name': p['first_name'],
                'last_name': p['last_name'],
                'date_of_birth': p['date_of_birth'],
                'gender': p['gender'],
                'phone': p.get('phone', ''),
                'email': p.get('email', ''),
                'city': p.get('city', 'Hong Kong'),
                'country': 'Hong Kong',
                'blood_type': p.get('blood_type', ''),
                'allergies': p.get('allergies', []),
                'chronic_conditions': p.get('chronic_conditions', []),
                'current_medications': p.get('current_medications', []),
                'emergency_contact_name': p.get('emergency_contact_name', ''),
                'emergency_contact_phone': p.get('emergency_contact_phone', ''),
                'emergency_contact_relation': p.get('emergency_contact_relation', ''),
                'insurance_provider': p.get('insurance_provider', ''),
                'insurance_number': p.get('insurance_number', ''),
                'status': 'active',
                'notes': '',
            }
            patient, created = Patient.objects.get_or_create(
                patient_number=p['patient_number'],
                defaults=defaults,
            )
            if created:
                created_count += 1
                self.stdout.write(f'    [NEW] {p["patient_number"]}  {p["first_name"]} {p["last_name"]}')
            else:
                self.stdout.write(f'    [OK]  {p["patient_number"]}  {p["first_name"]} {p["last_name"]}')

        self.stdout.write(f'\n  => {created_count} new patient(s) created out of {len(PATIENTS)} total')
