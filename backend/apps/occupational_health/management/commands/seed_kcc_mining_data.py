"""
Seed data script for KCC Mining Occupational Health Management System
Creates realistic test data with various scenarios for frontend testing

Run with: python manage.py seed_kcc_mining_data
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import datetime, timedelta, date, time
import random
import json
import uuid

from apps.occupational_health.models import (
    Enterprise, WorkSite, Worker, MedicalExamination, FitnessCertificate,
    OccupationalDisease, OccupationalDiseaseType, WorkplaceIncident,
    PPEItem, MentalHealthScreening, ErgonomicAssessment, AudiometryResult,
    SpirometryResult, VisionTestResult, HazardIdentification
)
from apps.organizations.models import Organization

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed KCC Mining occupational health database with realistic test data'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting occupational health database seeding...'))
        
        # Create organization first
        organization = self.create_organization()
        
        # Create admin user
        admin_user = self.create_admin_user(organization)
        
        # Create mining enterprises
        mining_enterprises = self.create_mining_enterprises(admin_user)
        
        # Only use KCC Mining data for focused testing
        all_enterprises = mining_enterprises
        
        # Create workers for each enterprise
        for enterprise in all_enterprises:
            self.create_workers(enterprise, admin_user)
        
        # Create medical examinations and certificates
        for enterprise in all_enterprises:
            self.create_medical_examinations(enterprise, admin_user)
        
        # Create incidents
        for enterprise in all_enterprises:
            self.create_incidents(enterprise, admin_user)
        
        # Create hazard identifications
        for enterprise in all_enterprises:
            self.create_hazard_identifications(enterprise, admin_user)
        
        # Create occupational diseases
        for enterprise in all_enterprises:
            self.create_occupational_diseases(enterprise, admin_user)
        
        # Create PPE items
        for enterprise in all_enterprises:
            self.create_ppe_items(enterprise, admin_user)

        self.stdout.write(self.style.SUCCESS('[SUCCESS] Data seeding completed successfully!'))

    def create_organization(self):
        """Create KCC Mining organization"""
        org, created = Organization.objects.get_or_create(
            registration_number='KCC-MINING-ORG-001',
            defaults={
                'name': 'KCC Mining Occupational Health',
                'type': 'health_center',  # Using health_center as closest match
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
            self.stdout.write(f'  Created organization: {org.name}')
        return org

    def create_admin_user(self, organization):
        """Create admin user if not exists"""
        user, created = User.objects.get_or_create(
            email='admin@kcmining.com',
            defaults={
                'first_name': 'Admin',
                'last_name': 'System',
                'organization': organization,
                'is_staff': True,
                'is_superuser': True
            }
        )
        if created:
            user.set_password('admin123')
            user.save()
            self.stdout.write(f'  Created admin user: {user.email}')
        return user

    def create_mining_enterprises(self, admin_user):
        """Create KCC Mining enterprises"""
        enterprises = []
        
        kcc_enterprises = [
            {
                'name': 'KCC Mining - Katanga Main',
                'sector': 'mining',
                'rccm': 'KCC-KATANGA-2024-001',
                'nif': 'NIF-KATANGA-001',
                'address': 'XX Avenue, Kolwezi, Katanga Province, DRC',
                'contact_person': 'Jean-Marie Mukeba',
                'phone': '+243-971234567',
                'email': 'katanga@kcmining.com',
                'contract_start_date': date(2024, 1, 1),
                'contract_end_date': date(2026, 12, 31),
            },
            {
                'name': 'KCC Mining - Kasumbalesa Border',
                'sector': 'mining',
                'rccm': 'KCC-KASUMBALESA-2024-002',
                'nif': 'NIF-KASUMBALESA-002',
                'address': 'XX Zone Libre, Kasumbalesa, Katanga Province, DRC',
                'contact_person': 'Pierre Kalombo',
                'phone': '+243-971234568',
                'email': 'kasumbalesa@kcmining.com',
                'contract_start_date': date(2024, 6, 1),
                'contract_end_date': date(2026, 12, 31),
            },
            {
                'name': 'KCC Mining - Safety Research Lab',
                'sector': 'mining',
                'rccm': 'KCC-LAB-2024-003',
                'nif': 'NIF-LAB-003',
                'address': 'XX Industrial, Lusaka, Zambia',
                'contact_person': 'Dr. Amulani Ndlovu',
                'phone': '+260-966234567',
                'email': 'lab@kcmining.com',
                'contract_start_date': date(2023, 1, 1),
                'contract_end_date': None,
            }
        ]
        
        for ent_data in kcc_enterprises:
            enterprise, created = Enterprise.objects.get_or_create(
                rccm=ent_data['rccm'],
                defaults={**ent_data, 'created_by': admin_user}
            )
            if created:
                self.stdout.write(f'  Created enterprise: {enterprise.name}')
            enterprises.append(enterprise)
            
            # Create work sites for each enterprise
            self.create_work_sites(enterprise, admin_user)
        
        return enterprises
    
    def create_multisector_enterprises(self, admin_user):
        """Create enterprises from multiple industry sectors for dashboard diversity"""
        enterprises = []
        
        multisector_enterprises = [
            {
                'name': 'GenX Construction Co.',
                'sector': 'construction',
                'rccm': 'GENX-CONST-2024-001',
                'nif': 'NIF-GENX-CONST-001',
                'address': 'Construction Boulevard, Kinshasa, DRC',
                'contact_person': 'Engineer Habimana',
                'phone': '+243-971111111',
                'email': 'contact@genxconstruction.com',
                'contract_start_date': date(2023, 6, 1),
                'contract_end_date': date(2026, 12, 31),
            },
            {
                'name': 'Banque Kinshasa SA',
                'sector': 'banking_finance',
                'rccm': 'BANQUE-KIN-2024-001',
                'nif': 'NIF-BANQUE-001',
                'address': 'Financial District, Kinshasa, DRC',
                'contact_person': 'Dr. Mukalay',
                'phone': '+243-972222222',
                'email': 'hr@banque-kinshasa.cd',
                'contract_start_date': date(2024, 1, 1),
                'contract_end_date': date(2027, 12, 31),
            },
            {
                'name': 'Hôpital Central de Kinshasa',
                'sector': 'healthcare',
                'rccm': 'HCKIN-2024-001',
                'nif': 'NIF-HCKIN-001',
                'address': 'Medical Complex Avenue, Kinshasa, DRC',
                'contact_person': 'Dr. Kasongo',
                'phone': '+243-973333333',
                'email': 'admin@hckinshasa.org',
                'contract_start_date': date(2023, 1, 1),
                'contract_end_date': None,
            },
            {
                'name': 'TeleCom Katanga Ltd',
                'sector': 'telecom_it',
                'rccm': 'TELECOM-KAT-2024-001',
                'nif': 'NIF-TELECOM-001',
                'address': 'Tech Park, Lubumbashi, DRC',
                'contact_person': 'Manager Kalala',
                'phone': '+243-974444444',
                'email': 'safety@telecom-katanga.cd',
                'contract_start_date': date(2023, 9, 1),
                'contract_end_date': date(2026, 12, 31),
            },
            {
                'name': 'Manufacture Kasai Ltd',
                'sector': 'manufacturing',
                'rccm': 'MANUF-KAS-2024-001',
                'nif': 'NIF-MANUF-001',
                'address': 'Industrial Zone, Kananga, DRC',
                'contact_person': 'Supervisor Tshimanga',
                'phone': '+243-975555555',
                'email': 'hr@manufacture-kasai.cd',
                'contract_start_date': date(2023, 3, 1),
                'contract_end_date': date(2026, 12, 31),
            },
        ]
        
        for ent_data in multisector_enterprises:
            enterprise, created = Enterprise.objects.get_or_create(
                rccm=ent_data['rccm'],
                defaults={**ent_data, 'created_by': admin_user}
            )
            if created:
                self.stdout.write(f'  Created enterprise: {enterprise.name}')
            enterprises.append(enterprise)
            
            # Create work sites for each enterprise
            self.create_work_sites_multisector(enterprise, admin_user)
        
        return enterprises
    
    def create_work_sites_multisector(self, enterprise, admin_user):
        """Create work sites for multi-sector enterprises"""
        sector = enterprise.sector
        
        site_configs = {
            'construction': [
                {'name': 'Main Construction Site', 'remote': True, 'medical': False},
                {'name': 'Office & Warehouse', 'remote': False, 'medical': True},
            ],
            'banking_finance': [
                {'name': 'Head Office', 'remote': False, 'medical': True},
                {'name': 'Branch Office Gombe', 'remote': False, 'medical': False},
            ],
            'healthcare': [
                {'name': 'Emergency Department', 'remote': False, 'medical': True},
                {'name': 'ICU & Surgery', 'remote': False, 'medical': True},
                {'name': 'Administrative Office', 'remote': False, 'medical': True},
            ],
            'telecom_it': [
                {'name': 'Data Center', 'remote': False, 'medical': False},
                {'name': 'Tech Support Office', 'remote': False, 'medical': True},
                {'name': 'Field Installation Crew', 'remote': True, 'medical': False},
            ],
            'manufacturing': [
                {'name': 'Production Floor', 'remote': False, 'medical': False},
                {'name': 'Packaging Area', 'remote': False, 'medical': False},
                {'name': 'Administrative Block', 'remote': False, 'medical': True},
                {'name': 'Warehouse', 'remote': False, 'medical': False},
            ],
        }
        
        sites = site_configs.get(sector, [
            {'name': 'Main Facility', 'remote': False, 'medical': True},
            {'name': 'Branch Office', 'remote': False, 'medical': False},
        ])
        
        for site_data in sites:
            WorkSite.objects.get_or_create(
                enterprise=enterprise,
                name=site_data['name'],
                defaults={
                    'address': f"{site_data['name']}, {enterprise.name}",
                    'site_manager': 'Site Manager',
                    'phone': enterprise.phone,
                    'worker_count': random.randint(20, 200),
                    'is_remote_site': site_data['remote'],
                    'has_medical_facility': site_data['medical'],
                }
            )

    def create_work_sites(self, enterprise, admin_user):
        """Create work sites for enterprise"""
        if 'Katanga' in enterprise.name:
            sites = [
                {'name': 'Kolwezi Main Mine', 'remote': True, 'medical': False},
                {'name': 'Kolwezi Processing Facility', 'remote': False, 'medical': True},
                {'name': 'Kolwezi Admin Office', 'remote': False, 'medical': True},
            ]
        elif 'Kasumbalesa' in enterprise.name:
            sites = [
                {'name': 'Kasumbalesa Extraction Site', 'remote': True, 'medical': False},
                {'name': 'Kasumbalesa Border Processing', 'remote': False, 'medical': True},
            ]
        else:
            sites = [
                {'name': 'Main Laboratory', 'remote': False, 'medical': True},
                {'name': 'Field Testing Site', 'remote': True, 'medical': False},
            ]
        
        for site_data in sites:
            WorkSite.objects.get_or_create(
                enterprise=enterprise,
                name=site_data['name'],
                defaults={
                    'address': f"{site_data['name']}, {enterprise.name}",
                    'site_manager': 'Site Manager',
                    'phone': '+243-971234567',
                    'worker_count': random.randint(50, 300),
                    'is_remote_site': site_data['remote'],
                    'has_medical_facility': site_data['medical'],
                }
            )

    def create_workers(self, enterprise, admin_user):
        """Create workers for enterprise with sector-specific roles"""
        
        # Sector-specific job roles
        sector_roles = {
            'mining': [
                ('underground_miner', 'Underground Miner'),
                ('equipment_operator', 'Equipment Operator'),
                ('blast_technician', 'Blast Technician'),
                ('processing_technician', 'Processing Technician'),
                ('maintenance_technician', 'Maintenance Technician'),
                ('safety_coordinator', 'Safety Coordinator'),
                ('admin_staff', 'Administrative Staff'),
            ],
            'construction': [
                ('site_engineer', 'Site Engineer'),
                ('foreman', 'Foreman'),
                ('laborer', 'Laborer'),
                ('carpenter', 'Carpenter'),
                ('welder', 'Welder'),
                ('electrician', 'Electrician'),
                ('equipment_operator', 'Equipment Operator'),
                ('safety_officer', 'Safety Officer'),
                ('admin_staff', 'Administrative Staff'),
            ],
            'banking_finance': [
                ('teller', 'Bank Teller'),
                ('officer', 'Bank Officer'),
                ('manager', 'Branch Manager'),
                ('security', 'Security Officer'),
                ('it_support', 'IT Support'),
                ('admin_staff', 'Administrative Staff'),
                ('hr', 'HR Officer'),
            ],
            'healthcare': [
                ('doctor', 'Doctor'),
                ('nurse', 'Nurse'),
                ('surgeon', 'Surgeon'),
                ('technician', 'Medical Technician'),
                ('admin', 'Administrative Staff'),
                ('cleaner', 'Cleaning Staff'),
                ('security', 'Security Officer'),
            ],
            'telecom_it': [
                ('technician', 'Field Technician'),
                ('engineer', 'Network Engineer'),
                ('developer', 'Software Developer'),
                ('admin', 'System Administrator'),
                ('support', 'Technical Support'),
                ('manager', 'Project Manager'),
                ('hr', 'HR Officer'),
            ],
            'manufacturing': [
                ('operator', 'Machine Operator'),
                ('technician', 'Maintenance Technician'),
                ('inspector', 'Quality Inspector'),
                ('lead', 'Team Lead'),
                ('supervisor', 'Supervisor'),
                ('laborer', 'Factory Laborer'),
                ('admin', 'Administrative Staff'),
            ],
        }
        
        roles = sector_roles.get(enterprise.sector, sector_roles['mining'])
        num_workers = random.randint(80, 150)
        
        first_names = ['Jean', 'Pierre', 'Marcel', 'Albert', 'Bernard', 'Paul', 'Philippe', 'André', 'Michel', 'François',
                       'Felix', 'Livingstone', 'Chanda', 'Bwalya', 'Mwilu', 'Nyemba', 'Mulenga', 'Kamwi', 'Kunda',
                       'Marie', 'Anne', 'Sophie', 'Diane', 'Catherine']
        last_names = ['Mukeba', 'Kalombo', 'Mwanza', 'Ndlovu', 'Tembo', 'Mulenga', 'Kabongo', 'Kasongo', 'Nyemba', 'Mbambi',
                      'Kamoi', 'Malama', 'Chatata', 'Muleya', 'Nkomo', 'Banda', 'Chanda', 'Mufushi', 'Katongo', 'Mwambila']
        
        for i in range(num_workers):
            first_name = random.choice(first_names)
            last_name = random.choice(last_names)
            job_category, job_title = random.choice(roles)
            
            employee_id = f"{enterprise.rccm[:3]}{i+1:05d}"
            hire_date = date.today() - timedelta(days=random.randint(30, 1460))  # 1 month to 4 years ago
            next_exam_due = hire_date + timedelta(days=365)  # Set next exam due date
            
            worker, created = Worker.objects.get_or_create(
                employee_id=employee_id,
                defaults={
                    'first_name': first_name,
                    'last_name': last_name,
                    'date_of_birth': date(random.randint(1965, 2000), random.randint(1, 12), random.randint(1, 28)),
                    'gender': random.choice(['male', 'male', 'male', 'female']),  # 75% male
                    'enterprise': enterprise,
                    'work_site': random.choice(enterprise.work_sites.all()),
                    'job_category': job_category,
                    'job_title': job_title,
                    'hire_date': hire_date,
                    'employment_status': random.choice(['active', 'active', 'active', 'on_leave']),  # 75% active
                    'phone': f"+243-97{random.randint(1000000, 9999999)}",
                    'email': f"{first_name.lower()}.{last_name.lower()}@domain.com",
                    'address': f"Worker Housing, {enterprise.name}",
                    'emergency_contact_name': f"{random.choice(first_names)} {random.choice(last_names)}",
                    'emergency_contact_phone': f"+243-97{random.randint(1000000, 9999999)}",
                    'exposure_risks': self._get_sector_exposures(enterprise.sector),
                    'ppe_required': self._get_sector_ppe(enterprise.sector),
                    'allergies': 'None' if random.random() > 0.1 else random.choice(['Penicillin', 'Latex', 'Dust', 'Metal']),
                    'chronic_conditions': '' if random.random() > 0.15 else random.choice(['Hypertension', 'Asthma', 'Diabetes', 'None']),
                    'current_fitness_status': random.choice(['fit', 'fit', 'fit', 'fit_with_restrictions']),  # 75% fit
                    'next_exam_due': next_exam_due,
                    'created_by': admin_user,
                }
            )
            
            if created and i < 5:  # Print first 5 creations
                self.stdout.write(f'  Created worker: {worker.full_name} ({worker.employee_id})')
        
        self.stdout.write(f'  Created {num_workers} workers for {enterprise.name}')
    
    def _get_sector_exposures(self, sector):
        """Get exposure risks by sector"""
        exposures = {
            'mining': ['silica_dust', 'noise', 'vibration', 'cobalt', 'heat', 'radiation'],
            'construction': ['noise', 'dust', 'asbestos', 'heat', 'falls', 'machinery'],
            'banking_finance': ['vdt_screen', 'sedentary', 'stress'],
            'healthcare': ['bloodborne_pathogens', 'chemical_vapors', 'radiation', 'stress'],
            'telecom_it': ['vdt_screen', 'sedentary', 'stress', 'radiation'],
            'manufacturing': ['noise', 'dust', 'machinery', 'heat', 'chemical_vapors', 'repetitive_motion'],
        }
        return exposures.get(sector, ['stress', 'sedentary'])
    
    def _get_sector_ppe(self, sector):
        """Get PPE requirements by sector"""
        ppe = {
            'mining': ['hard_hat', 'safety_glasses', 'respirator', 'steel_toe_boots', 'gloves', 'hearing_protection'],
            'construction': ['hard_hat', 'safety_glasses', 'harness', 'steel_toe_boots', 'gloves', 'reflective_vest'],
            'banking_finance': ['ergonomic_chair', 'wrist_rest'],
            'healthcare': ['gloves', 'face_mask', 'lab_coat', 'safety_glasses'],
            'telecom_it': ['safety_glasses', 'ergonomic_chair', 'wrist_rest'],
            'manufacturing': ['hard_hat', 'safety_glasses', 'respirator', 'steel_toe_boots', 'gloves', 'hearing_protection'],
        }
        return ppe.get(sector, ['safety_glasses', 'gloves'])

    def create_medical_examinations(self, enterprise, admin_user):
        """Create medical examinations and fitness certificates"""
        workers = enterprise.workers.all()[:50]  # Sample of 50 workers
        
        exam_types = ['pre_employment', 'periodic', 'return_to_work', 'post_incident']
        
        for worker in workers:
            # Create 1-3 exams per worker
            num_exams = random.randint(1, 3)
            for _ in range(num_exams):
                exam_date = date.today() - timedelta(days=random.randint(10, 365))
                exam_number = f"EXAM{enterprise.pk}{worker.pk}{random.randint(10000, 99999)}"
                
                exam, created = MedicalExamination.objects.get_or_create(
                    exam_number=exam_number,
                    defaults={
                        'worker': worker,
                        'exam_type': random.choice(exam_types),
                        'exam_date': exam_date,
                        'examining_doctor': admin_user,
                        'chief_complaint': random.choice(['Routine check', 'Follow-up', 'Post-incident check', '']),
                        'medical_history_review': f"Annual review for {worker.job_title}",
                        'examination_completed': True,
                        'results_summary': 'All tests within normal limits' if random.random() > 0.2 else 'Some abnormalities noted',
                        'recommendations': 'Continue normal duties' if random.random() > 0.3 else 'Workplace modifications recommended',
                        'next_periodic_exam': exam_date + timedelta(days=365),
                    }
                )
                
                if created:
                    # Create fitness certificate
                    try:
                        FitnessCertificate.objects.create(
                            examination=exam,
                            fitness_decision=random.choice(['fit', 'fit_with_restrictions', 'temporarily_unfit']),
                            decision_rationale='Fit for all mining duties' if random.random() > 0.3 else 'Medical restrictions apply',
                            work_limitations='No underground work' if random.random() > 0.8 else '',
                            issue_date=exam_date,
                            valid_until=exam_date + timedelta(days=365),
                            issued_by=admin_user,
                        )
                    except Exception as e:
                        # Skip duplicate certificate numbers
                        pass
                    
                    # Create some spirometry results (50% of exams)
                    if random.random() > 0.5:
                        SpirometryResult.objects.create(
                            examination=exam,
                            fvc_pre=round(random.uniform(3.0, 5.5), 2),
                            fev1_pre=round(random.uniform(2.5, 4.5), 2),
                            fev1_fvc_ratio_pre=round(random.uniform(72, 88), 1),
                            spirometry_interpretation=random.choice(['normal', 'restrictive', 'obstructive']),
                            tested_by=admin_user,
                        )
                    
                    # Create some audiometry results (60% of exams)
                    if random.random() > 0.4:
                        AudiometryResult.objects.create(
                            examination=exam,
                            right_ear_500hz=random.randint(5, 35),
                            right_ear_1000hz=random.randint(5, 35),
                            right_ear_2000hz=random.randint(10, 40),
                            right_ear_3000hz=random.randint(15, 45),
                            right_ear_4000hz=random.randint(20, 60),
                            right_ear_6000hz=random.randint(20, 60),
                            right_ear_8000hz=random.randint(20, 60),
                            left_ear_500hz=random.randint(5, 35),
                            left_ear_1000hz=random.randint(5, 35),
                            left_ear_2000hz=random.randint(10, 40),
                            left_ear_3000hz=random.randint(15, 45),
                            left_ear_4000hz=random.randint(20, 60),
                            left_ear_6000hz=random.randint(20, 60),
                            left_ear_8000hz=random.randint(20, 60),
                            hearing_loss_classification=random.choice(['normal', 'mild', 'moderate']),
                            noise_induced_probable=random.random() > 0.7,
                            tested_by=admin_user,
                        )
                    
                    # Create mental health screening (40% of exams)
                    if random.random() > 0.6:
                        MentalHealthScreening.objects.create(
                            examination=exam,
                            ghq12_score=random.randint(0, 36),
                            burnout_risk=random.choice(['low', 'moderate', 'high']),
                            work_overload=random.random() > 0.7,
                            sleep_quality=random.choice(['good', 'fair', 'poor']),
                            assessed_by=admin_user,
                        )
        
        self.stdout.write(f'  Created medical examinations for {enterprise.name}')

    def create_incidents(self, enterprise, admin_user):
        """Create workplace incidents with mining-specific categories"""
        work_sites = enterprise.work_sites.all()
        num_incidents = random.randint(5, 15)
        
        mining_categories = [
            ('lost_time_injury', 'Rock fall'),
            ('lost_time_injury', 'Equipment entrapment'),
            ('medical_treatment', 'Cut/laceration'),
            ('medical_treatment', 'Dust inhalation'),
            ('first_aid', 'Minor injury'),
            ('near_miss', 'Near equipment strike'),
            ('chemical_spill', 'Cobalt exposure'),
            ('fall_from_height', 'Fall from platform'),
            ('dangerous_occurrence', 'Gas detected'),
        ]
        
        for i in range(num_incidents):
            site = random.choice(work_sites)
            workers = list(enterprise.workers.all())[:5]  # Sample of workers
            category, description = random.choice(mining_categories)
            incident_date = date.today() - timedelta(days=random.randint(1, 180))
            incident_hour = random.randint(6, 18)
            incident_minute = random.randint(0, 59)
            
            try:
                incident = WorkplaceIncident.objects.create(
                    enterprise=enterprise,
                    work_site=site,
                    category=category,
                    severity=random.randint(1, 5),
                    incident_date=incident_date,
                    incident_time=time(incident_hour, incident_minute),
                    location_description=f"Location {description} at {site.name}",
                    description=f"{description} incident at {site.name}",
                    immediate_cause='Equipment failure' if random.random() > 0.5 else 'Human error',
                    body_parts_affected=['right_hand', 'left_hand', 'head', 'back', 'legs'],
                    first_aid_given=random.random() > 0.4,
                    medical_treatment_required=random.random() > 0.6,
                    work_days_lost=random.randint(0, 30),
                    investigated=random.random() > 0.3,
                    immediate_actions_taken='Work halted and area cordoned',
                    reported_by=admin_user,
                )
                
                # Add injured workers
                if workers:
                    incident.injured_workers.set(random.sample(workers, min(2, len(workers))))
            except Exception as e:
                # Skip duplicate or invalid incidents
                pass
        
        self.stdout.write(f'  Created incidents for {enterprise.name}')

    def create_hazard_identifications(self, enterprise, admin_user):
        """Create hazard identifications and risk assessments for mining activities"""
        work_sites = enterprise.work_sites.all()
        num_assessments = random.randint(5, 12)
        
        mining_hazards = [
            {
                'type': 'physical',
                'description': 'Rock fall and ground instability',
                'activities': 'Underground excavation and loading',
                'controls': 'Roof bolting, regular inspections, scaling operations'
            },
            {
                'type': 'chemical',
                'description': 'Cobalt dust exposure',
                'activities': 'Ore processing and milling',
                'controls': 'Local exhaust ventilation, respiratory protection'
            },
            {
                'type': 'biological',
                'description': 'Fungal respiratory infection (Q fever)',
                'activities': 'Work in ventilated areas',
                'controls': 'Respiratory protection, vaccination, monitoring'
            },
            {
                'type': 'safety',
                'description': 'Equipment entrapment and crushing',
                'activities': 'Operating heavy machinery',
                'controls': 'Machine guards, lockout/tagout, operator training'
            },
            {
                'type': 'ergonomic',
                'description': 'Repetitive strain injuries',
                'activities': 'Manual material handling',
                'controls': 'Ergonomic assessment, job rotation, mechanical aids'
            },
            {
                'type': 'psychosocial',
                'description': 'Stress and fatigue from shift work',
                'activities': '24/7 mining operations',
                'controls': 'Fatigue management, mental health support, counseling'
            },
        ]
        
        for i in range(num_assessments):
            site = random.choice(work_sites)
            workers = list(enterprise.workers.all())[:10]
            hazard = random.choice(mining_hazards)
            assessment_date = date.today() - timedelta(days=random.randint(1, 90))
            
            probability = random.randint(2, 5)  # 2-5
            severity = random.randint(2, 5)  # 2-5
            residual_probability = max(1, probability - 1)
            residual_severity = max(1, severity - 1)
            
            risk_score = probability * severity
            if risk_score <= 4:
                risk_level = 'low'
            elif risk_score <= 9:
                risk_level = 'medium'
            elif risk_score <= 15:
                risk_level = 'high'
            else:
                risk_level = 'critical'
            
            try:
                hazard_id = HazardIdentification.objects.create(
                    enterprise=enterprise,
                    work_site=site,
                    hazard_description=hazard['description'],
                    hazard_type=hazard['type'],
                    location=f"{site.name} - Mining area",
                    activities_affected=hazard['activities'],
                    probability=probability,
                    severity=severity,
                    existing_controls=hazard['controls'],
                    control_effectiveness=random.choice(['very_effective', 'effective', 'partially_effective']),
                    residual_probability=residual_probability,
                    residual_severity=residual_severity,
                    substitution_recommendations='Evaluate safer alternatives or equipment',
                    engineering_controls='Implement automated controls where possible',
                    administrative_controls='Implement work procedures and safety protocols',
                    ppe_recommendations=['hard_hat', 'safety_glasses', 'hearing_protection'],
                    risk_level=risk_level,
                    action_required=risk_level in ['high', 'critical'],
                    priority=random.choice(['low', 'medium', 'high', 'urgent']) if risk_level in ['high', 'critical'] else 'low',
                    assessment_date=assessment_date,
                    review_date=assessment_date + timedelta(days=30),
                    next_review_date=assessment_date + timedelta(days=90),
                    status=random.choice(['draft', 'approved', 'implemented', 'reviewed']),
                    assessed_by=admin_user,
                    approved_by=admin_user if random.random() > 0.4 else None,
                )
                
                # Add exposed workers
                if workers:
                    hazard_id.workers_exposed.set(random.sample(workers, min(5, len(workers))))
            except Exception as e:
                # Skip duplicates or errors
                pass
        
        self.stdout.write(f'  Created hazard identifications for {enterprise.name}')

    def create_occupational_diseases(self, enterprise, admin_user):
        """Create occupational disease cases"""
        workers = list(enterprise.workers.all())[:20]  # Sample of workers
        
        # Ensure disease types exist
        diseases_data = [
            {'name': 'Silicosis', 'category': 'respiratory'},
            {'name': 'Noise-Induced Hearing Loss (NIHL)', 'category': 'hearing'},
            {'name': 'Cobalt Lung', 'category': 'respiratory'},
            {'name': 'Carpal Tunnel Syndrome', 'category': 'musculoskeletal'},
            {'name': 'Vibration White Finger', 'category': 'neurological'},
        ]
        
        disease_types = []
        for disease_data in diseases_data:
            disease_type, _ = OccupationalDiseaseType.objects.get_or_create(
                name=disease_data['name'],
                defaults={
                    'category': disease_data['category'],
                    'description': f"Occupational disease: {disease_data['name']}",
                    'primary_sectors': ['mining'],
                    'associated_exposures': ['silica_dust', 'noise', 'vibration', 'cobalt'],
                }
            )
            disease_types.append(disease_type)
        
        for i, worker in enumerate(workers):
            if random.random() > 0.7:  # 30% of workers have occupational disease
                disease_type = random.choice(disease_types)
                diagnosis_date = date.today() - timedelta(days=random.randint(30, 730))
                
                try:
                    OccupationalDisease.objects.create(
                        worker=worker,
                        disease_type=disease_type,
                        diagnosis_date=diagnosis_date,
                        diagnosing_physician=admin_user,
                        exposure_start_date=diagnosis_date - timedelta(days=365*3),
                        exposure_duration_years=random.uniform(1, 10),
                        exposure_description=f"Occupational exposure related to {disease_type.name}",
                        causal_determination=random.choice(['definite', 'probable']),
                        causal_assessment_notes=f"Clear causal link established for {disease_type.name}",
                        symptoms='Persistent cough, fatigue' if disease_type.category == 'respiratory' else 'Pain and weakness',
                        clinical_findings='Abnormal test results',
                        severity_level=random.choice(['mild', 'moderate', 'severe']),
                        work_ability_impact='Reduced work capacity',
                        reported_by=admin_user,
                    )
                except Exception as e:
                    # Skip duplicate case numbers
                    pass
        
        self.stdout.write(f'  Created occupational diseases for {enterprise.name}')

    def create_ppe_items(self, enterprise, admin_user):
        """Create PPE items for workers"""
        workers = enterprise.workers.all()[:50]
        ppe_types = ['hard_hat', 'safety_glasses', 'respirator', 'steel_toe_boots', 'hearing_protection']
        
        for worker in workers:
            for ppe_type in ppe_types:
                PPEItem.objects.create(
                    worker=worker,
                    ppe_type=ppe_type,
                    issue_date=date.today() - timedelta(days=random.randint(30, 180)),
                    expiry_date=date.today() + timedelta(days=random.randint(30, 365)),
                    condition=random.choice(['new', 'good', 'worn']),
                    training_provided=random.random() > 0.3,
                    assigned_by=admin_user,
                )
        
        self.stdout.write(f'  Created PPE items for {enterprise.name}')
