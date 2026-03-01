"""
Reporting System Serializers
"""

from rest_framework import serializers
from .models import SavedReport, ReportExport


class SavedReportSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    
    class Meta:
        model = SavedReport
        fields = [
            'id', 'name', 'report_type', 'frequency', 'filters',
            'recipients', 'is_active', 'created_by', 'created_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ReportExportSerializer(serializers.ModelSerializer):
    generated_by_name = serializers.CharField(source='generated_by.full_name', read_only=True)
    report_name = serializers.CharField(source='report.name', read_only=True)
    
    class Meta:
        model = ReportExport
        fields = [
            'id', 'report', 'report_name', 'export_format', 'file_path',
            'generated_by', 'generated_by_name', 'generated_at',
            'download_count', 'expires_at'
        ]
        read_only_fields = ['id', 'generated_at', 'download_count']
