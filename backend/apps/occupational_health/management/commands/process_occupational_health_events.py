"""
Management command to generate overexposure alerts and regulatory reports
Usage: python manage.py process_occupational_health_events
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date, timedelta
from decimal import Decimal

from occupational_health.models import (
    MedicalExamination, WorkplaceIncident, OccupationalDisease,
    AudiometryResult, SpirometryResult, Worker, Enterprise
)
from occupational_health.models_extended import (
    OverexposureAlert, RegulatoryCNSSReport, DRCRegulatoryReport,
    WorkerRiskProfile
)


class Command(BaseCommand):
    help = 'Process occupational health events and generate alerts and reports'

    # Occupational Exposure Thresholds (mg/m³ or dB for noise)
    EXPOSURE_THRESHOLDS = {
        'silica_dust': Decimal('0.025'),      # Professional exposure limit
        'cobalt': Decimal('0.02'),             # 8-hour TWA
        'lead': Decimal('0.05'),               # 8-hour TWA
        'asbestos': Decimal('0.0001'),         # Fibers/cm³
        'noise': Decimal('85'),                # 8-hour TWA (dB)
    }

    def add_arguments(self, parser):
        parser.add_argument(
            '--check-recent-exams',
            action='store_true',
            dest='check_recent_exams',
            help='Check recent medical exams for abnormal findings',
        )
        parser.add_argument(
            '--generate-cnss-reports',
            action='store_true',
            dest='generate_cnss_reports',
            help='Generate CNSS reports for recent incidents and diseases',
        )
        parser.add_argument(
            '--generate-drc-reports',
            action='store_true',
            dest='generate_drc_reports',
            help='Generate DRC ministry reports',
        )
        parser.add_argument(
            '--process-all',
            action='store_true',
            dest='process_all',
            help='Process all occupational health events',
        )

    def handle(self, *args, **options):
        check_recent_exams = options['check_recent_exams']
        generate_cnss_reports = options['generate_cnss_reports']
        generate_drc_reports = options['generate_drc_reports']
        process_all = options['process_all']

        if process_all:
            check_recent_exams = True
            generate_cnss_reports = True
            generate_drc_reports = True

        if check_recent_exams or process_all:
            self.check_medical_exams()

        if generate_cnss_reports or process_all:
            self.generate_cnss_reports()

        if generate_drc_reports or process_all:
            self.generate_drc_reports()

        self.stdout.write(
            self.style.SUCCESS('Occupational health events processed successfully')
        )

    def check_medical_exams(self):
        """Check recent medical exams for abnormal findings and generate alerts"""
        seven_days_ago = timezone.now() - timedelta(days=7)
        recent_exams = MedicalExamination.objects.filter(
            exam_date__gte=seven_days_ago,
            exam_status='completed'
        ).select_related('worker')

        alerts_created = 0

        for exam in recent_exams:
            worker = exam.worker
            
            # Check audiometry results (noise exposure)
            if exam.audiometry_done:
                try:
                    audio = AudiometryResult.objects.get(examination=exam)
                    if audio.hearing_loss_detected:
                        alert, created = OverexposureAlert.objects.get_or_create(
                            worker=worker,
                            exposure_type='noise',
                            status='active',
                            defaults={
                                'exposure_level': Decimal(str(audio.noise_level or 85)),
                                'threshold': self.EXPOSURE_THRESHOLDS['noise'],
                                'measurement_unit': 'dB',
                                'severity': 'warning' if audio.noise_level < 90 else 'critical',
                                'recommended_action': 'Schedule audiology referral for detailed assessment',
                            }
                        )
                        if created:
                            alerts_created += 1
                except AudiometryResult.DoesNotExist:
                    pass

            # Check spirometry results (respiratory/dust exposure)
            if exam.spirometry_done:
                try:
                    spiro = SpirometryResult.objects.get(examination=exam)
                    if spiro.fev1_reduced or spiro.fvc_reduced:
                        alert, created = OverexposureAlert.objects.get_or_create(
                            worker=worker,
                            exposure_type='silica_dust',
                            status='active',
                            defaults={
                                'exposure_level': Decimal('0.3'),  # Placeholder
                                'threshold': self.EXPOSURE_THRESHOLDS['silica_dust'],
                                'measurement_unit': 'mg/m³',
                                'severity': 'warning',
                                'recommended_action': 'Lung function tests indicate exposure effect. Reduce exposure and retest in 6 months.',
                            }
                        )
                        if created:
                            alerts_created += 1
                except SpirometryResult.DoesNotExist:
                    pass

        self.stdout.write(
            self.style.SUCCESS(f'Created {alerts_created} new overexposure alerts')
        )

    def generate_cnss_reports(self):
        """Generate CNSS regulatory reports for recent incidents and diseases"""
        seven_days_ago = date.today() - timedelta(days=7)
        
        # Get unreported incidents
        unreported_incidents = WorkplaceIncident.objects.filter(
            incident_date__gte=seven_days_ago,
            cnss_report__isnull=True
        )

        reports_created = 0

        for incident in unreported_incidents:
            try:
                # Get first injured worker's enterprise
                if incident.injured_workers.exists():
                    worker = incident.injured_workers.first()
                    enterprise = worker.enterprise
                    
                    # Determine severity and report type
                    if incident.severity == 'fatal':
                        report_type = 'fatality'
                    elif incident.days_lost >= 3:
                        report_type = 'incident'
                    else:
                        report_type = 'incident'
                    
                    # Create CNSS report
                    report_content = {
                        'incident_type': incident.get_type_display(),
                        'date': incident.incident_date.isoformat(),
                        'location': str(incident.location),
                        'injured_workers': incident.injured_workers.count(),
                        'severity': incident.severity,
                        'root_cause': incident.root_cause or 'Under investigation',
                    }
                    
                    report = RegulatoryCNSSReport.objects.create(
                        enterprise=enterprise,
                        reference_number=f"CNSS-{enterprise.id}-{date.today().isoformat()}-{incident.id}",
                        report_type=report_type,
                        report_period_start=incident.incident_date,
                        report_period_end=incident.incident_date,
                        content_json=report_content,
                        related_incident=incident,
                        prepared_by_id=1,  # Default admin user (should be configured)
                        status='ready_for_submission',
                    )
                    reports_created += 1
            except Exception as e:
                self.stdout.write(
                    self.style.WARNING(f'Error creating CNSS report for incident {incident.id}: {str(e)}')
                )

        # Get unreported diseases
        unreported_diseases = OccupationalDisease.objects.filter(
            reported_date__isnull=True,
            detection_date__gte=seven_days_ago,
            case_status__in=['active', 'chronic']
        )

        for disease in unreported_diseases:
            try:
                worker = disease.worker
                enterprise = worker.enterprise
                
                report_content = {
                    'disease_type': disease.disease_type.disease_name,
                    'diagnosis_date': disease.detection_date.isoformat(),
                    'worker_id': worker.employee_id,
                    'exposure_type': disease.presumed_exposure_factor or 'Unknown',
                    'severity': disease.severity,
                }
                
                report = RegulatoryCNSSReport.objects.create(
                    enterprise=enterprise,
                    reference_number=f"CNSS-DISEASE-{enterprise.id}-{date.today().isoformat()}-{disease.id}",
                    report_type='disease',
                    report_period_start=disease.detection_date,
                    report_period_end=disease.detection_date,
                    content_json=report_content,
                    related_disease=disease,
                    prepared_by_id=1,  # Default admin user
                    status='ready_for_submission',
                )
                reports_created += 1
            except Exception as e:
                self.stdout.write(
                    self.style.WARNING(f'Error creating CNSS report for disease {disease.id}: {str(e)}')
                )

        self.stdout.write(
            self.style.SUCCESS(f'Created {reports_created} CNSS reports')
        )

    def generate_drc_reports(self):
        """Generate DRC labour ministry reports"""
        seven_days_ago = date.today() - timedelta(days=7)
        
        # Get fatal incidents for immediate reporting (within 24 hours)
        fatal_incidents = WorkplaceIncident.objects.filter(
            incident_date__gte=date.today() - timedelta(days=1),
            severity='fatal'
        )

        reports_created = 0

        for incident in fatal_incidents:
            try:
                if incident.injured_workers.exists():
                    worker = incident.injured_workers.first()
                    enterprise = worker.enterprise
                    
                    # Check if report already exists
                    existing = DRCRegulatoryReport.objects.filter(
                        related_incidents=incident,
                        report_type='fatal_incident'
                    ).exists()
                    
                    if not existing:
                        report = DRCRegulatoryReport.objects.create(
                            enterprise=enterprise,
                            reference_number=f"DRC-FATAL-{enterprise.id}-{date.today().isoformat()}-{incident.id}",
                            report_type='fatal_incident',
                            report_period_start=incident.incident_date,
                            report_period_end=incident.incident_date,
                            status='draft',
                            submission_recipient='Ministère du Travail - Police',
                        )
                        report.related_incidents.add(incident)
                        reports_created += 1
            except Exception as e:
                self.stdout.write(
                    self.style.WARNING(f'Error creating DRC fatal incident report: {str(e)}')
                )

        # Get severe incidents (3+ days lost)
        severe_incidents = WorkplaceIncident.objects.filter(
            incident_date__gte=seven_days_ago,
            days_lost__gte=3,
            severity__in=['serious', 'very_serious']
        )

        for incident in severe_incidents:
            try:
                if incident.injured_workers.exists():
                    worker = incident.injured_workers.first()
                    enterprise = worker.enterprise
                    
                    existing = DRCRegulatoryReport.objects.filter(
                        related_incidents=incident,
                        report_type='severe_incident'
                    ).exists()
                    
                    if not existing:
                        report = DRCRegulatoryReport.objects.create(
                            enterprise=enterprise,
                            reference_number=f"DRC-SEVERE-{enterprise.id}-{date.today().isoformat()}-{incident.id}",
                            report_type='severe_incident',
                            report_period_start=incident.incident_date,
                            report_period_end=incident.incident_date,
                            status='draft',
                            submission_recipient='Ministère du Travail',
                        )
                        report.related_incidents.add(incident)
                        reports_created += 1
            except Exception as e:
                self.stdout.write(
                    self.style.WARNING(f'Error creating DRC severe incident report: {str(e)}')
                )

        self.stdout.write(
            self.style.SUCCESS(f'Created {reports_created} DRC reports')
        )
