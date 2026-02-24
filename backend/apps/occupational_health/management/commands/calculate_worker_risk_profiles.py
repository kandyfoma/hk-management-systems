"""
Management command to initialize and recalculate worker risk profiles
Usage: python manage.py calculate_worker_risk_profiles [--recalculate-all]
"""

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from occupational_health.models import Worker, WorkplaceIncident, OccupationalDisease, PPEItem, PPEComplianceRecord
from occupational_health.models_extended import WorkerRiskProfile
from datetime import date, timedelta


class Command(BaseCommand):
    help = 'Calculate worker risk profiles based on health, exposure, and compliance factors'

    def add_arguments(self, parser):
        parser.add_argument(
            '--recalculate-all',
            action='store_true',
            dest='recalculate_all',
            help='Recalculate risk profiles for all workers',
        )
        parser.add_argument(
            '--worker-id',
            type=int,
            dest='worker_id',
            help='Calculate risk profile for specific worker ID',
        )
        parser.add_argument(
            '--enterprise-id',
            type=int,
            dest='enterprise_id',
            help='Calculate risk profiles for all workers in enterprise',
        )

    def handle(self, *args, **options):
        recalculate_all = options['recalculate_all']
        worker_id = options.get('worker_id')
        enterprise_id = options.get('enterprise_id')

        if worker_id:
            self.process_single_worker(worker_id)
        elif enterprise_id:
            self.process_enterprise(enterprise_id)
        elif recalculate_all:
            self.process_all_workers()
        else:
            # Default: create profiles for workers without one
            self.create_new_profiles()

    def create_new_profiles(self):
        """Create risk profiles for workers without one"""
        workers = Worker.objects.filter(workerriskprofile__isnull=True)
        count = 0
        
        for worker in workers:
            profile = WorkerRiskProfile.objects.create(worker=worker)
            self.calculate_profile(profile)
            count += 1
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully created {count} new risk profiles')
        )

    def process_single_worker(self, worker_id):
        """Process risk profile for single worker"""
        try:
            worker = Worker.objects.get(id=worker_id)
            profile, created = WorkerRiskProfile.objects.get_or_create(worker=worker)
            self.calculate_profile(profile)
            status = 'created' if created else 'updated'
            self.stdout.write(
                self.style.SUCCESS(f'Risk profile {status} for worker {worker.full_name}')
            )
        except Worker.DoesNotExist:
            raise CommandError(f'Worker with ID {worker_id} does not exist')

    def process_enterprise(self, enterprise_id):
        """Process risk profiles for all workers in enterprise"""
        from occupational_health.models import Enterprise
        try:
            enterprise = Enterprise.objects.get(id=enterprise_id)
            workers = Worker.objects.filter(enterprise=enterprise)
            count = 0
            
            for worker in workers:
                profile, created = WorkerRiskProfile.objects.get_or_create(worker=worker)
                self.calculate_profile(profile)
                count += 1
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully processed {count} workers in {enterprise.name}'
                )
            )
        except Exception as e:
            raise CommandError(f'Error processing enterprise: {str(e)}')

    def process_all_workers(self):
        """Recalculate risk profiles for all workers"""
        profiles = WorkerRiskProfile.objects.all()
        count = 0
        
        for profile in profiles:
            self.calculate_profile(profile)
            count += 1
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully recalculated {count} risk profiles')
        )

    def calculate_profile(self, profile):
        """Calculate and save risk profile"""
        worker = profile.worker
        
        # Calculate health risk score (0-100)
        health_score = self._calculate_health_risk(worker)
        
        # Calculate exposure risk score (0-100)
        exposure_score = self._calculate_exposure_risk(worker)
        
        # Calculate compliance risk score (0-100)
        compliance_score = self._calculate_compliance_risk(worker)
        
        # Update profile
        profile.health_risk_score = health_score
        profile.exposure_risk_score = exposure_score
        profile.compliance_risk_score = compliance_score
        
        # Calculate overall risk
        profile.calculate_overall_risk()
        
        # Determine intervention need
        profile.intervention_required = profile.overall_risk_score >= 60
        profile.last_calculated = timezone.now()
        
        profile.save()

    def _calculate_health_risk(self, worker):
        """Calculate health-based risk score"""
        score = 0
        
        # Age factor
        if worker.age < 25:
            score += 10
            profile.age_risk_factor = 10
        elif worker.age < 35:
            score += 15
            profile.age_risk_factor = 15
        elif worker.age < 45:
            score += 20
            profile.age_risk_factor = 20
        elif worker.age < 55:
            score += 30
            profile.age_risk_factor = 30
        else:
            score += 40
            profile.age_risk_factor = 40
        
        # Fitness status
        if worker.current_fitness_status == 'permanently_unfit':
            score += 35
            profile.fitness_status_factor = 35
        elif worker.current_fitness_status == 'temporarily_unfit':
            score += 25
            profile.fitness_status_factor = 25
        elif worker.current_fitness_status == 'fit_with_restrictions':
            score += 15
            profile.fitness_status_factor = 15
        else:
            profile.fitness_status_factor = 0
        
        # Medical conditions
        if worker.chronic_conditions:
            score += 15
            profile.medical_history_factor = 15
        else:
            profile.medical_history_factor = 0
        
        # Allergies
        if worker.allergies and worker.allergies.upper() != 'NONE':
            score += 5
        
        return min(score, 100)

    def _calculate_exposure_risk(self, worker):
        """Calculate exposure-based risk score"""
        score = 0
        
        # Number of exposure risks
        try:
            num_exposures = len(worker.exposure_risks) if worker.exposure_risks else 0
            score += min(num_exposures * 8, 25)
        except:
            pass
        
        # Years of exposure
        if worker.hire_date:
            years_employed = (date.today() - worker.hire_date).days / 365.25
            if years_employed > 10:
                score += 25
            elif years_employed > 5:
                score += 15
            elif years_employed > 2:
                score += 10
        
        # High-risk mining exposures
        high_risk_exposures = ['silica_dust', 'noise', 'cobalt', 'radiation']
        try:
            if any(exp in worker.exposure_risks for exp in high_risk_exposures):
                score += 20
        except:
            pass
        
        # PPE compliance - check recent compliance records
        recent_non_compliant = PPEComplianceRecord.objects.filter(
            ppe_item__worker=worker,
            check_date__gte=date.today() - timedelta(days=30),
            is_compliant=False
        ).count()
        score += min(recent_non_compliant * 5, 15)
        
        return min(score, 100)

    def _calculate_compliance_risk(self, worker):
        """Calculate compliance-based risk score"""
        score = 0
        
        # Overdue examinations
        if worker.next_exam_due and worker.next_exam_due < date.today():
            days_overdue = (date.today() - worker.next_exam_due).days
            score += min(days_overdue, 30)
        
        # Incident history (last 12 months)
        twelve_months_ago = date.today() - timedelta(days=365)
        try:
            incidents_12m = WorkplaceIncident.objects.filter(
                injured_workers=worker,
                incident_date__gte=twelve_months_ago
            ).count()
            score += min(incidents_12m * 10, 30)
        except:
            pass
        
        # Occupational diseases
        try:
            diseases = OccupationalDisease.objects.filter(
                worker=worker,
                case_status__in=['active', 'chronic']
            ).count()
            score += min(diseases * 15, 25)
        except:
            pass
        
        # PPE compliance
        recent_compliances = PPEComplianceRecord.objects.filter(
            ppe_item__worker=worker,
            check_date__gte=date.today() - timedelta(days=30),
            is_compliant=False
        ).count()
        score += min(recent_compliances * 5, 20)
        
        return min(score, 100)
