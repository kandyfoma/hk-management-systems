from django.core.management.base import BaseCommand
from django.db.models import Count, Q
from django.utils import timezone
from datetime import date, timedelta
from apps.audit.models import AuditLog, AuditLogSummary, AuditActionType, AuditSeverity
from apps.organizations.models import Organization


class Command(BaseCommand):
    help = 'Generate daily audit log summaries'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--date',
            type=str,
            help='Date to generate summary for (YYYY-MM-DD format). Defaults to yesterday.',
        )
        parser.add_argument(
            '--organization',
            type=int,
            help='Organization ID to generate summary for. If not provided, generates for all organizations.',
        )
    
    def handle(self, *args, **options):
        # Determine the date
        if options['date']:
            try:
                summary_date = datetime.strptime(options['date'], '%Y-%m-%d').date()
            except ValueError:
                self.stdout.write(
                    self.style.ERROR('Invalid date format. Use YYYY-MM-DD')
                )
                return
        else:
            summary_date = timezone.now().date() - timedelta(days=1)
        
        # Get organizations to process
        if options['organization']:
            try:
                organizations = [Organization.objects.get(id=options['organization'])]
            except Organization.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'Organization with ID {options["organization"]} does not exist')
                )
                return
        else:
            organizations = Organization.objects.all()
        
        self.stdout.write(f'Generating audit summaries for {summary_date}...')
        
        for organization in organizations:
            self.generate_summary_for_organization(organization, summary_date)
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully generated audit summaries for {len(organizations)} organization(s)'
            )
        )
    
    def generate_summary_for_organization(self, organization, summary_date):
        """Generate audit summary for a specific organization and date"""
        
        # Get all audit logs for the organization on the specified date
        audit_logs = AuditLog.objects.filter(
            organization=organization,
            timestamp__date=summary_date
        )
        
        if not audit_logs.exists():
            self.stdout.write(
                f'No audit logs found for {organization.name} on {summary_date}'
            )
            return
        
        # Calculate summary statistics
        total_actions = audit_logs.count()
        
        # Login statistics
        login_count = audit_logs.filter(action=AuditActionType.LOGIN).count()
        failed_login_count = audit_logs.filter(action=AuditActionType.LOGIN_FAILED).count()
        
        # Business activity statistics
        sales_count = audit_logs.filter(
            action__in=[AuditActionType.SALE, AuditActionType.CREATE],
            module='sales'
        ).count()
        
        prescriptions_dispensed = audit_logs.filter(
            action=AuditActionType.DISPENSE
        ).count()
        
        inventory_changes = audit_logs.filter(
            action__in=[
                AuditActionType.STOCK_ADJUSTMENT,
                AuditActionType.INVENTORY_COUNT,
                AuditActionType.CREATE,
                AuditActionType.UPDATE
            ],
            module='inventory'
        ).count()
        
        # Severity statistics
        critical_actions = audit_logs.filter(severity=AuditSeverity.CRITICAL).count()
        high_severity_actions = audit_logs.filter(severity=AuditSeverity.HIGH).count()
        failed_actions = audit_logs.filter(success=False).count()
        
        # User activity statistics
        active_users_count = audit_logs.values('user').distinct().count()
        unique_ips_count = audit_logs.values('ip_address').distinct().count()
        
        # Create or update the summary
        summary, created = AuditLogSummary.objects.update_or_create(
            date=summary_date,
            organization=organization,
            defaults={
                'total_actions': total_actions,
                'login_count': login_count,
                'failed_login_count': failed_login_count,
                'sales_count': sales_count,
                'prescriptions_dispensed': prescriptions_dispensed,
                'inventory_changes': inventory_changes,
                'critical_actions': critical_actions,
                'high_severity_actions': high_severity_actions,
                'failed_actions': failed_actions,
                'active_users_count': active_users_count,
                'unique_ips_count': unique_ips_count,
            }
        )
        
        action = "Created" if created else "Updated"
        self.stdout.write(
            f'{action} summary for {organization.name}: '
            f'{total_actions} actions, {active_users_count} users, '
            f'{critical_actions} critical actions'
        )