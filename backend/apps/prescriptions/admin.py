from django.contrib import admin
from django.utils import timezone
from .models import (
    Prescription, PrescriptionItem, PrescriptionNote, PrescriptionImage
)


class PrescriptionItemInline(admin.TabularInline):
    model = PrescriptionItem
    extra = 0
    readonly_fields = ['quantity_dispensed', 'dispensed_by', 'dispensed_date']


class PrescriptionNoteInline(admin.StackedInline):
    model = PrescriptionNote
    extra = 0
    readonly_fields = ['created_by', 'created_at']


class PrescriptionImageInline(admin.TabularInline):
    model = PrescriptionImage
    extra = 0
    readonly_fields = ['uploaded_by', 'uploaded_at']


@admin.register(Prescription)
class PrescriptionAdmin(admin.ModelAdmin):
    list_display = ['prescription_number', 'patient', 'doctor', 'status', 'date', 'valid_until']
    list_filter = ['status', 'date', 'valid_until']
    search_fields = ['prescription_number', 'patient__first_name', 'patient__last_name', 'doctor__first_name', 'doctor__last_name']
    readonly_fields = ['prescription_number', 'created_by', 'created_at', 'updated_at']
    inlines = [PrescriptionItemInline, PrescriptionNoteInline, PrescriptionImageInline]
    date_hierarchy = 'date'
    
    fieldsets = (
        ('Informations de base', {
            'fields': ('prescription_number', 'patient', 'doctor', 'status')
        }),
        ('Dates', {
            'fields': ('date', 'valid_until')
        }),
        ('Détails médicaux', {
            'fields': ('diagnosis', 'instructions')
        }),
        ('Métadonnées', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    actions = ['mark_as_dispensed', 'mark_as_cancelled']
    
    def mark_as_dispensed(self, request, queryset):
        queryset.update(status='FULLY_DISPENSED')
    mark_as_dispensed.short_description = "Marquer comme entièrement dispensé"
    
    def mark_as_cancelled(self, request, queryset):
        queryset.update(status='CANCELLED')
    mark_as_cancelled.short_description = "Marquer comme annulé"


@admin.register(PrescriptionItem)
class PrescriptionItemAdmin(admin.ModelAdmin):
    list_display = ['prescription', 'medication_name', 'quantity', 'quantity_dispensed', 'status']
    list_filter = ['status', 'dispensed_date']
    search_fields = ['medication_name', 'prescription__prescription_number', 'product__name']
    readonly_fields = ['dispensed_by', 'dispensed_date']
    
    fieldsets = (
        ('Prescription', {
            'fields': ('prescription', 'product', 'medication_name')
        }),
        ('Posologie', {
            'fields': ('dosage', 'frequency', 'duration', 'unit', 'instructions')
        }),
        ('Quantités', {
            'fields': ('quantity', 'quantity_dispensed', 'status')
        }),
        ('Dispensation', {
            'fields': ('dispensed_by', 'dispensed_date', 'pharmacist_notes')
        })
    )


@admin.register(PrescriptionNote)
class PrescriptionNoteAdmin(admin.ModelAdmin):
    list_display = ['prescription', 'note_type', 'priority', 'created_by', 'created_at']
    list_filter = ['note_type', 'priority', 'created_at']
    search_fields = ['prescription__prescription_number', 'content', 'title']
    readonly_fields = ['created_by', 'created_at']


@admin.register(PrescriptionImage)
class PrescriptionImageAdmin(admin.ModelAdmin):
    list_display = ['prescription', 'description', 'uploaded_by', 'uploaded_at']
    list_filter = ['uploaded_at']
    search_fields = ['prescription__prescription_number', 'description']
    readonly_fields = ['uploaded_by', 'uploaded_at']