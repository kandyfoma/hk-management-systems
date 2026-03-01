"""
Initial Reports App Migration

This migration creates the SavedReport and ReportExport tables
for the comprehensive reporting system.

Run with:
    python manage.py migrate reports
"""

from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('organizations', '0001_initial'),  # Adjust based on your migrations
        ('accounts', '0001_initial'),  # Adjust based on your migrations
    ]

    operations = [
        migrations.CreateModel(
            name='SavedReport',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(help_text='Report name', max_length=200)),
                ('report_type', models.CharField(
                    choices=[
                        ('sales_daily', 'Daily Sales Summary'),
                        ('sales_period', 'Period Sales Analysis'),
                        ('inventory_health', 'Inventory Health'),
                        ('expiring_products', 'Products Expiring Soon'),
                        ('occupational_exams', 'Medical Examinations'),
                        ('incidents', 'Workplace Incidents'),
                        ('compliance_cnss', 'CNSS Compliance'),
                        ('patient_stats', 'Patient Statistics'),
                        ('audit_trail', 'Audit Summary'),
                    ],
                    max_length=50
                )),
                ('frequency', models.CharField(
                    choices=[
                        ('once', 'Once'),
                        ('daily', 'Daily'),
                        ('weekly', 'Weekly'),
                        ('monthly', 'Monthly'),
                        ('quarterly', 'Quarterly'),
                    ],
                    default='once',
                    max_length=20
                )),
                ('filters', models.JSONField(default=dict, help_text='Report filter parameters')),
                ('recipients', models.JSONField(default=list, help_text='Email recipients')),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='created_reports',
                    to='accounts.user'
                )),
                ('organization', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='saved_reports',
                    to='organizations.organization'
                )),
            ],
            options={
                'verbose_name': 'Saved Report',
                'verbose_name_plural': 'Saved Reports',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='ReportExport',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('export_format', models.CharField(
                    choices=[
                        ('pdf', 'PDF'),
                        ('excel', 'Excel (.xlsx)'),
                        ('csv', 'CSV'),
                        ('json', 'JSON'),
                    ],
                    max_length=20
                )),
                ('file_path', models.CharField(help_text='Path to exported file', max_length=500)),
                ('generated_at', models.DateTimeField(auto_now_add=True)),
                ('download_count', models.PositiveIntegerField(default=0)),
                ('expires_at', models.DateTimeField(blank=True, null=True)),
                ('generated_by', models.ForeignKey(
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    to='accounts.user'
                )),
                ('report', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='exports',
                    to='reports.savedreport'
                )),
            ],
            options={
                'verbose_name': 'Report Export',
                'verbose_name_plural': 'Report Exports',
                'ordering': ['-generated_at'],
            },
        ),
    ]
