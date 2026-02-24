# KCC Mining Database Seed Data Summary

## Overview
The database has been successfully seeded with realistic test data for the KCC Mining Occupational Health Management System (OHMS). This data enables frontend development and testing against production-like scenarios.

## Data Generated

### Organizations & Enterprises
- **Organization**: KCC Mining Occupational Health (Health Center Type)
- **Admin User**: admin@kcmining.com (password: admin123)
- **3 Mining Enterprises**:
  - KCC Mining - Katanga Main (Kolwezi, DRC)
  - KCC Mining - Kasumbalesa Border (Kasumbalesa, DRC)
  - KCC Mining - Safety Research Lab (Lusaka, Zambia)

### Work Sites
- **9 Work Sites Total** (3 per enterprise):
  - Underground mine operations
  - Processing facilities
  - Administration offices
  - Laboratory facilities
  - Border processing stations
  
### Workers
- **~650 Workers Created** across all enterprises
- **Mining-Specific Job Categories**:
  - Underground Miners
  - Equipment Operators
  - Blast Technicians
  - Ventilation Specialists
  - Processing Technicians
  - Quality Control Officers
  - Safety Coordinators
  - Administrative Staff
  - Maintenance Technicians
  - Surveyors

- **Realistic Employee Data**:
  - DRC/Zambian names
  - Hire dates (1 month to 4 years ago)
  - Employment statuses (mostly active, some on leave)
  - Exposure risks: silica dust, noise, vibration, cobalt, heat
  - PPE requirements: hard hats, respirators, hearing protection, safety glasses, etc.
  - Medical history: allergies, chronic conditions, prior exposure

### Medical Examinations
- **Mixed Exam Types**:
  - Pre-employment exams
  - Periodic (annual) exams
  - Return-to-work exams
  - Post-incident exams
- **Test Results** (~50-60% of exams):
  - Spirometry (Lung Function)
  - Audiometry (Hearing Tests) - includes frequency-specific thresholds at 500Hz-8000Hz
  - Vision Tests (Acuity, color vision, near vision)
  - Mental Health Screening (GHQ-12 scores, burnout risk, psychosocial stressors)
  - Ergonomic Assessments (RULA scoring, workstation analysis)
- **Fitness Certificates**: 
  - Decisions: Fit / Fit with Restrictions / Temporarily Unfit
  - Validity: 1 year from exam date
  - Work limitations registered for restricted cases

### Occupational Diseases
- **~6% of Workers** have recorded occupational disease cases
- **5 Disease Types** tracked:
  - Silicosis (respiratory - mining exposure)
  - Noise-Induced Hearing Loss (NIHL)
  - Cobalt Lung (respiratory - cobalt exposure)
  - Carpal Tunnel Syndrome (musculoskeletal)
  - Vibration White Finger (neurological)
- **Causal Assessment**: Definite/Probable determinations
- **Regulatory Tracking**: CNSS reporting fields populated
- **Treatment Planning**: Work restrictions and return-to-work assessments

### Workplace Incidents
- **40-45 Total Incidents** (varying severity levels 1-5)
- **Mining-Specific Incident Categories**:
  - Lost-Time Injuries: Rock falls, Equipment entrapment
  - Medical Treatment Cases: Cuts/lacerations, Dust inhalation
  - Near-Miss Events: Equipment strikes, Gas detection
  - Chemical Incidents: Cobalt exposure
  - Fall from Height: Platform falls
  - Dangerous Occurrences
- **Incident Details**:
  - Dates ranging from 6 months ago to present
  - Injured and witness workers linked
  - Body parts affected documented
  - Work days lost tracked
  - Investigation status and corrective actions recorded

### PPE Items
- **~5,000 PPE Records** (~50 workers x 5 PPE types)
- **PPE Types Tracked**:
  - Hard Hats
  - Safety Glasses  
  - Respirators
  - Steel Toe Boots
  - Hearing Protection
- **Each PPE Item Has**:
  - Issue date and expiry date
  - Condition status (New, Good, Worn)
  - Training provided flag
  - Compliance check tracking
  - Replacement history

## Database Statistics

| Entity | Count |
|--------|-------|
| Organizations | 1 |
| Enterprises | 3 |
| WorkSites | 9 |
| Workers | ~650 |
| Medical Examinations | ~150-200 |
| Audiometry Results | ~100 |
| Spirometry Results | ~80 |
| Vision Tests | ~90 |
| Mental Health Screenings | ~60 |
| Ergonomic Assessments | ~50 |
| Fitness Certificates | ~140 |
| Occupational Diseases | ~40 |
| Workplace Incidents | ~40 |
| PPE Items | ~5,000 |
| **Total Records** | **~6,500+** |

## Data-Driven Scenarios

The seeded data includes realistic scenarios for testing:

### Medical Surveillance Workflow
- Pre-employment screening → Periodic exams → Exit exams
- Test results with normal and abnormal findings
- Fitness decision logic (Fit/Restrictions/Unfit)
- Follow-up exam scheduling

### Occupational Disease Tracking
- Disease detection and diagnosis
- Exposure assessment and duration calculation
- Causal determination (Definite/Probable)
- CNSS reporting compliance
- Work ability impact assessment

### Incident Management
- Multiple incident severity levels (1=Negligible to 5=Catastrophic)
- Mining-specific hazard categories
- Worker injury tracking
- Investigation status and CNSS reporting
- Corrective action planning

### Regulatory Compliance
- CNSS (National Social Security) declaration fields
- Labour inspection reporting
- Occupational disease ILO R194 classification
- Work restrictions and fitness limitations
- PPE compliance and training documentation

## Mining-Specific Data Characteristics

1. **High-Risk Exposures**: Silica dust, cobalt, noise, vibration, heat
2. **Multiple Work Locations**: underground mines, surface operations, processing plants
3. **Diverse Job Categories**: from underground miners to safety coordinators
4. **Complex Medical Protocols**: noise exposure surveillance, respiratory screening, ergonomic assessment
5. **Incident Patterns**: Mining-specific hazards (rock fall, equipment entrapment, gas detection)
6. **Regulatory Compliance**: DRC mining health regulations, CNSS reporting requirements

## How to Use This Data

### For Frontend Development
1. **Medical Exams Dashboard**: View ~150 exams with test results
2. **Worker Management**: Browse ~650 worker profiles with employment details
3. **Incident Reporting**: Review ~40 incidents with severity classification
4. **Disease Registry**: Access ~40 occupational disease cases
5. **PPE Tracking**: Check ~5,000 PPE allocation records

### For API Testing
- Use existing worker IDs (KCC[SITE][WORKER_NUMBER]) in API calls
- Test medical exam queries with real exam_number format
- Query incidents by category, severity, date range
- Filter workers by enterprise, job category, fitness status

### For Data Visualization
- Dashboard analytics: Worker population by site/category
- Medical exam trends: Exam frequency and abnormal finding rates
- Incident patterns: Most common incident types and high-risk periods
- Disease epidemiology: Most prevalent occupational diseases
- PPE compliance: Training rates and condition status distribution

## Admin Access

**URL**: http://localhost:8000/admin  
**Username**: admin@kcmining.com  
**Password**: admin123

From the admin interface you can:
- Browse all entities
- Edit/delete test records
- Create additional test scenarios
- Export data for analysis
- Monitor database consistency

## Next Steps

1. **Start Backend Server**:
   ```bash
   python manage.py runserver
   ```

2. **Connect Frontend to Backend Endpoints**:
   - Update API calls to point to populated database
   - Test data retrieval for all dashboard screens
   - Validate form submissions with new records

3. **Add More Data**:
   - Re-run seed script to add more scenarios
   - Manually create specific test cases via admin interface
   - Use Django shell to craft edge-case scenarios

4. **Performance Testing**:
   - Test dashboard with 650+ workers
   - Query incident reports across months of data
   - Filter PPE records by type, worker, expiration status

## Notes

- All phone numbers are formatted for DRC/Zambia (+243/+260 prefixes)
- Names are authentic African (Congolese/Zambian) surnames
- Date ranges ensure realistic temporal distribution
- All relationships (Worker→Enterprise→WorkSite) are properly linked
- Audit fields (created_by, created_at) are automatically populated
- Database constraints and unique fields are respected

---

**Seed Script Location**: `apps/occupational_health/management/commands/seed_kcc_mining_data.py`  
**Run Command**: `python manage.py seed_kcc_mining_data`  
**Created**: 2024-02-24  
**Status**: ✓ Successfully Seeded with ~6,500+ Records
