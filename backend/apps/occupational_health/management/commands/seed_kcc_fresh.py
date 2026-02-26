"""
Fresh seed command: Creates admin, doctor, nurse users + KCC workers + sample data
Run after reset_db_fresh

Usage: python manage.py seed_kcc_fresh
"""

from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import date, timedelta
import random

from apps.occupational_health.models import (
    Enterprise, WorkSite, Worker, OccSector, OccDepartment, OccPosition
)
from apps.organizations.models import Organization

User = get_user_model()


class Command(BaseCommand):
    help = 'Fresh seed: creates admin/doctor/nurse users + KCC enterprise + workers'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('\n' + '═' * 60))
        self.stdout.write(self.style.SUCCESS('🌱 Fresh Database Seed: Admin/Doctor/Nurse + KCC Workers'))
        self.stdout.write(self.style.SUCCESS('═' * 60 + '\n'))

        try:
            # 1. Create organization
            org = self._create_organization()

            # 2. Create users (admin, doctor, nurse)
            admin_user, doctor_user, nurse_user = self._create_users(org)

            # 3. Create KCC enterprise and sites
            kcc_enterprise = self._create_kcc_enterprise(admin_user)

            # 4. Create sectors, departments, positions
            self._create_sector_hierarchy(admin_user)

            # 5. Create workers
            self._create_workers(kcc_enterprise, admin_user)

            self.stdout.write(self.style.SUCCESS('\n' + '=' * 60))
            self.stdout.write(self.style.SUCCESS('✓✓✓ Fresh seed completed successfully!'))
            self.stdout.write(self.style.SUCCESS('=' * 60))
            self.stdout.write(self.style.WARNING('\n📋 Created users (login by phone):'))
            self.stdout.write(f'  • Admin:  +243971111111 / admin123')
            self.stdout.write(f'  • Doctor: +243971111112 / doctor123')
            self.stdout.write(f'  • Nurse:  +243971111113 / nurse123')
            self.stdout.write(self.style.WARNING(f'\n🏢 Enterprises:'))
            self.stdout.write(f'  • {kcc_enterprise.name}')
            self.stdout.write(self.style.WARNING(f'\n👥 Workers: ~50 KCC mining workers created'))
            self.stdout.write(self.style.SUCCESS(f'\n✓ Database ready for testing!\n'))

        except Exception as e:
            raise CommandError(f'❌ Seed failed: {str(e)}')

    def _create_organization(self):
        """Create or get KCC organization"""
        org, created = Organization.objects.get_or_create(
            registration_number='KCC-MINING-ORG-001',
            defaults={
                'name': 'KCC Mining Occupational Health',
                'type': 'health_center',
                'license_number': 'LICENSE-KCC-001',
                'address': 'KCC Mining Head Office, Kolwezi, Katanga Province, DRC',
                'city': 'Kolwezi',
                'postal_code': '0001',
                'country': 'DRC',
                'phone': '+243971234567',
                'email': 'admin@kcmining.com',
                'website': 'https://kcmining.com',
                'director_name': 'Dr. Jean-Marie Mukeba',
                'director_license': 'DIR-KCC-001',
                'is_active': True,
                'established_date': date(2024, 1, 1),
            }
        )
        if created:
            self.stdout.write(f'✓ Organization: {org.name}')
        return org

    def _create_users(self, organization):
        """Create admin, doctor, nurse users"""
        users = []
        user_configs = [
            {'phone': '+243971111111', 'email': 'admin@kcmining.com', 'password': 'admin123', 'role': 'admin'},
            {'phone': '+243971111112', 'email': 'doctor@kcmining.com', 'password': 'doctor123', 'role': 'doctor'},
            {'phone': '+243971111113', 'email': 'nurse@kcmining.com', 'password': 'nurse123', 'role': 'nurse'},
        ]

        for config in user_configs:
            user, created = User.objects.get_or_create(
                email=config['email'],
                defaults={
                    'phone': config['phone'],
                    'first_name': config['role'].capitalize(),
                    'last_name': 'KCC',
                    'organization': organization,
                    'is_staff': True,
                    'is_superuser': config['role'] == 'admin',
                }
            )
            if created:
                user.set_password(config['password'])
                user.save()
                self.stdout.write(f'✓ Created {config["role"]} user: {config["phone"]}')
            users.append(user)

        return users

    def _create_kcc_enterprise(self, created_by):
        """Create KCC Mining enterprise"""
        enterprise, created = Enterprise.objects.get_or_create(
            rccm='KCC-MINING-KASUMBALESA-001',
            defaults={
                'name': 'KCC Mining - Kasumbalesa Border',
                'sector': 'mining',
                'nif': 'NIF-KCC-BORDER-001',
                'address': 'Kasumbalesa Border, Katanga Province, DRC',
                'contact_person': 'Operations Manager',
                'phone': '+243971234567',
                'email': 'ops@kcmining.com',
                'contract_start_date': date(2023, 1, 1),
                'contract_end_date': None,
                'is_active': True,
                'created_by': created_by,
            }
        )

        if created:
            self.stdout.write(f'✓ Enterprise: {enterprise.name}')
            # Create work sites
            self._create_worksites(enterprise)

        return enterprise

    def _create_worksites(self, enterprise):
        """Create work sites for KCC"""
        sites_data = [
            {
                'name': 'Main Mining Operations',
                'address': 'Main Pit, Kasumbalesa',
                'manager': 'Site Supervisor Mzema',
                'workers': 35,
                'remote': True,
                'medical': False,
            },
            {
                'name': 'Administration & Clinic',
                'address': 'Admin Building, Kasumbalesa',
                'manager': 'HR Manager Kapinga',
                'workers': 15,
                'remote': False,
                'medical': True,
            },
        ]

        for site_data in sites_data:
            WorkSite.objects.get_or_create(
                enterprise=enterprise,
                name=site_data['name'],
                defaults={
                    'address': site_data['address'],
                    'site_manager': site_data['manager'],
                    'phone': enterprise.phone,
                    'worker_count': site_data['workers'],
                    'is_remote_site': site_data['remote'],
                    'has_medical_facility': site_data['medical'],
                }
            )

    def _create_sector_hierarchy(self, created_by):
        """Create Sector → Department → Position hierarchy"""
        # Sector
        sector, _ = OccSector.objects.get_or_create(
            code='MINING',
            defaults={
                'name': 'Mining Operations',
                'industry_sector_key': 'mining',
                'is_active': True,
                'created_by': created_by,
            }
        )

        # Departments
        departments = [
            {'code': 'MINE-OPS', 'name': 'Mining Operations'},
            {'code': 'PROC', 'name': 'Processing'},
            {'code': 'ADMIN', 'name': 'Administration'},
        ]

        for dept_data in departments:
            OccDepartment.objects.get_or_create(
                sector=sector,
                code=dept_data['code'],
                defaults={'name': dept_data['name'], 'is_active': True}
            )

        # Positions
        positions = [
            {'code': 'MINER', 'name': 'Miner', 'dept_code': 'MINE-OPS'},
            {'code': 'FOREMAN', 'name': 'Foreman', 'dept_code': 'MINE-OPS'},
            {'code': 'OPERATOR', 'name': 'Equipment Operator', 'dept_code': 'MINE-OPS'},
            {'code': 'PROCESSOR', 'name': 'Processor', 'dept_code': 'PROC'},
            {'code': 'ADMIN', 'name': 'Administrator', 'dept_code': 'ADMIN'},
        ]

        for pos_data in positions:
            dept = OccDepartment.objects.get(code=pos_data['dept_code'])
            OccPosition.objects.get_or_create(
                department=dept,
                code=pos_data['code'],
                defaults={
                    'name': pos_data['name'],
                    'is_active': True,
                    'created_by': created_by,
                }
            )

    def _create_workers(self, enterprise, created_by):
        """Create sample workers"""
        first_names = [
            'Jean', 'Pierre', 'Marcel', 'Joseph', 'Georges',
            'Paul', 'André', 'Luc', 'Marc', 'François',
            'Kabunga', 'Mzema', 'Kalibo', 'Kamba', 'Nsundi',
            'Mukeba', 'Tshimanga', 'Kabila', 'Mbala', 'Kasongo'
        ]
        last_names = [
            'Mubamba', 'Kitenge', 'Mbubu', 'Kombe', 'Ilamba',
            'Shakila', 'Tumbonene', 'Mbutu', 'Kampile', 'Mukamba'
        ]

        positions = list(OccPosition.objects.all())
        worksites = list(enterprise.work_sites.all())
        genders = ['male', 'female']

        workers_created = 0
        for i in range(50):
            first_name = random.choice(first_names)
            last_name = random.choice(last_names)
            employee_id = f'KCC-EMP-{2000 + i:04d}'

            try:
                worker, created = Worker.objects.get_or_create(
                    employee_id=employee_id,
                    defaults={
                        'first_name': first_name,
                        'last_name': last_name,
                        'date_of_birth': date(1970, 1, 1) + timedelta(days=random.randint(0, 15000)),
                        'gender': random.choice(genders),
                        'enterprise': enterprise,
                        'work_site': random.choice(worksites),
                        'job_category': 'manual_labor',
                        'job_title': 'Mining Worker',
                        'hire_date': date(2020, 1, 1) + timedelta(days=random.randint(0, 1460)),
                        'employment_status': 'active',
                        'occ_sector': positions[0].department.sector if positions else None,
                        'occ_department': positions[0].department if positions else None,
                        'occ_position': random.choice(positions) if positions else None,
                        'phone': f'+2439{random.randint(0, 999999999):09d}',
                        'email': f'{first_name.lower()}.{last_name.lower()}@kcmining.com',
                        'address': 'Kasumbalesa, Katanga',
                        'emergency_contact_name': f'{random.choice(first_names)} {random.choice(last_names)}',
                        'emergency_contact_phone': f'+2439{random.randint(0, 999999999):09d}',
                        'exposure_risks': ['heavy_metals', 'dust', 'noise'],
                        'ppe_required': ['hard_hat', 'respirator', 'gloves'],
                        'ppe_provided': ['hard_hat', 'respirator', 'gloves'],
                        'allergies': '',
                        'chronic_conditions': '',
                        'medications': '',
                        'prior_occupational_exposure': '',
                        'current_fitness_status': 'fit',
                        'fitness_restrictions': '',
                        'created_by': created_by,
                    }
                )
                if created:
                    workers_created += 1
            except Exception as e:
                self.stdout.write(self.style.WARNING(f'  ⚠️  Worker {employee_id}: {str(e)}'))

        self.stdout.write(f'✓ Workers: {workers_created} created')
