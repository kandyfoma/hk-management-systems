# Occupational Health Workflow Refactor - Doctor Assignment System

## Overview
This implementation refactors the occupational health workflow to implement a proper doctor-patient assignment system. Previously, patients were automatically navigated to the consultation form after vitals entry. Now, the workflow is:

1. **Vitals Entry Complete** → Show Doctor Assignment Modal
2. **Doctor Selected** → Patient added to waiting room for that doctor
3. **Doctor Selects Patient** → Starts consultation with only their assigned patients visible

## Changes Made

### Backend (Django)

#### 1. New Model: `OccConsultation` 
**File**: `apps/occupational_health/models.py`

This model represents the doctor-patient consultation relationship with complete tracking:

```python
class OccConsultation(models.Model):
    # Core relationships
    worker = ForeignKey(Worker)              # The patient/worker
    doctor = ForeignKey(User)                # Assigned doctor (can be null until assigned)
    
    # Consultation flow tracking
    status = CharField(choices=[              # waiting → in_consultation → completed
        'waiting',
        'in_consultation', 
        'completed',
        'archived'
    ])
    
    # Medical data
    vitals = JSONField()                      # BP, temp, O2 sat, etc.
    chief_complaint = TextField()
    medical_history = TextField()
    physical_examination_findings = TextField()
    exams_ordered = JSONField()               # List of exam codes
    
    # Fitness decision
    fitness_status = CharField(choices=[
        'fit',
        'fit_with_restrictions',
        'temporarily_unfit',
        'permanently_unfit',
        'pending'
    ])
    restrictions = JSONField()                # Job restrictions if applicable
    
    # Certificate tracking
    certificate_valid_from = DateField()
    certificate_valid_until = DateField()
    certificate_issued = BooleanField()
    
    # Follow-up
    followup_required = BooleanField()
    followup_date = DateField()
    
    # Timestamps
    created_at = DateTimeField(auto_now_add=True)
    started_at = DateTimeField()              # When doctor started consultation
    completed_at = DateTimeField()            # When doctor completed it
```

**Helper Methods**:
- `assign_to_doctor(doctor_user)` - Assigns consultation to a doctor
- `start_consultation()` - Marks as in-consultation
- `complete_consultation(fitness_status, notes)` - Marks as completed

**Database Migration**: `migrations/0002_occconsultation.py`
- Creates OccConsultation table
- Adds indexes on (worker, status), (doctor, status), and created_at

---

### Frontend - Intake Screen (OHPatientIntakeScreen.tsx)

#### 2. Updated `PendingConsultation` Interface
**Added field**: `assignedDoctor?: { id: string; name: string; email?: string }`

This stores which doctor is assigned to each patient.

#### 3. New Doctor Assignment Modal
**State variables added**:
```typescript
const [showDoctorModal, setShowDoctorModal] = useState(false);
const [doctors, setDoctors] = useState<{ id: string; name: string; email?: string }[]>([]);
const [selectedDoctor, setSelectedDoctor] = useState<...>(null);
const [loadingDoctors, setLoadingDoctors] = useState(false);
const [doctorSearch, setDoctorSearch] = useState('');
```

**New functions**:
- `loadDoctors()` - Fetches available doctors from API (currently mock data)
- `handleVitalsComplete()` - Shows doctor modal after vitals are entered
- `handleSaveWithDoctor()` - Saves consultation with assigned doctor

#### 4. Modified Vitals Completion Flow
**Before**: 
```
Vitals Complete → Alert asking "Go to Consultation or Add Next Patient"
```

**After**:
```
Vitals Complete → Doctor Selection Modal → Save → Return to Intake
```

The modal includes:
- Search box to find doctors by name/email
- List of available doctors with avatars
- Selection highlight
- Cancel/Assign buttons

#### 5. Doctor Modal Styles
New `styles` object added with complete styling for the modal:
- `doctorModalOverlay` - Semi-transparent background
- `doctorModal` - Modal container
- `doctorCard` - Doctor list item
- `doctorSearchBox` - Search input styling
- `doctorFooterBtn` - Button styling

---

### Frontend - Consultation Screen (OccHealthConsultationScreen.tsx)

#### 6. Doctor Filtering in Waiting Room
**Modified `loadPendingQueue()` function**:

```typescript
// Get current logged-in doctor
const currentUser = useSelector((state: RootState) => state.auth.user);
const currentDoctorId = currentUser?.id;

// Filter patients by assigned doctor
const loadPendingQueue = useCallback(async () => {
  let filtered = list.filter(c => c.status === 'waiting');
  
  // Only show patients assigned to this doctor
  if (currentDoctorId) {
    filtered = filtered.filter(c => c.assignedDoctor?.id === currentDoctorId);
  }
  
  // ... rest of logic
}, [currentDoctorId]);
```

Now only patients assigned to the logged-in doctor appear in their waiting room.

#### 7. Access Control in `loadPendingConsultation()`
Added verification that patient is assigned to the current doctor:

```typescript
// Check if patient is assigned to current doctor
if (currentDoctorId && pending.assignedDoctor?.id !== currentDoctorId) {
  Alert.alert('Accès Refusé', 'Ce patient n\'est pas assigné à vous.');
  return;
}
```

#### 8. Doctor Assignment Display in Waiting Room
Added visual indication of assigned doctor in the queue list:

```typescript
{pending.assignedDoctor && (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
    <Ionicons name="person-circle" size={12} color={colors.primary} />
    <Text style={...}>Dr. {pending.assignedDoctor.name}</Text>
  </View>
)}
```

---

## Workflow Diagram

```
┌─────────────────────────────────────────────────┐
│  1. ACCUEIL PATIENT (Patient Intake)            │
│  - Search & select worker                       │
│  - Enter visit reason (exam type)               │
│  - Record vital signs                           │
│  - Click "Enregistrer" (Submit)                 │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│  2. DOCTOR ASSIGNMENT MODAL (NEW)               │
│  - Search for doctor by name or email           │
│  - Select from available doctors list           │
│  - Confirm assignment                           │
│  - Patient saved to waiting room                │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│  3. BACK TO INTAKE SCREEN                       │
│  - Success message shown                        │
│  - Form reset for next patient                  │
│  - Staff can queue multiple patients at once    │
└─────────────────────────────────────────────────┘
                     ↓
              [Later, Doctor logs in]
                     ↓
┌─────────────────────────────────────────────────┐
│  4. VISITE CHEZ LE MÉDECIN (Doctor Consultation)│
│  - Doctor sees ONLY their assigned patients     │
│  - Shows doctor name next to each patient       │
│  - Doctor selects patient to start consultation │
│  - Consultation form pre-populated with vitals  │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│  5. CONSULTATION WORKFLOW (Unchanged)          │
│  - Physical exam                                │
│  - Medical history evaluation                   │
│  - Tests ordered                                │
│  - Fitness decision                             │
│  - Certificate issued                           │
└─────────────────────────────────────────────────┘
```

---

## Data Flow

### Saving a Consultation with Doctor Assignment

```typescript
// Frontend: OHPatientIntakeScreen.tsx
const pending: PendingConsultation = {
  id: 'intake_...',
  patient: selectedPatient,
  examType: 'periodic',
  visitReason: 'Visite périodique',
  vitals: { temp: 36.7, bp: 120/80, ... },
  assignedDoctor: {           // ← NEW
    id: 'doc_1',
    name: 'Dr. Jean Mbeki',
    email: 'jean@hospital.com'
  },
  arrivalTime: '2025-02-26T10:30:00Z',
  status: 'waiting'
};

// Saved to AsyncStorage as JSON
await AsyncStorage.setItem(PENDING_CONSULTATIONS_KEY, JSON.stringify([...queue, pending]));
```

### Filtering in Doctor's Waiting Room

```typescript
// Frontend: OccHealthConsultationScreen.tsx
const currentDoctorId = useSelector(state => state.auth.user?.id);  // e.g., 'doc_1'

const filtered = list.filter(c => 
  c.status === 'waiting' &&
  c.assignedDoctor?.id === currentDoctorId  // Only this doctor's patients
);

// Result: Only patients where assignedDoctor.id matches currentDoctorId
```

---

## Key Implementation Details

### 1. Doctor List Source
Currently using mock data in `loadDoctors()`:
```typescript
const [doctors] = useState([
  { id: 'doc_1', name: 'Dr. Jean Mbeki', email: '...' },
  { id: 'doc_2', name: 'Dr. Marie Dupont', email: '...' },
  ...
]);
```

**TODO**: Replace with API call:
```typescript
const res = await occHealthApi.getDoctors();
setDoctors(res.data);
```

### 2. Doctor Identification
Uses Redux `state.auth.user.id` which should match the doctor ID in the system.

**Depends on**: Proper user authentication with doctor role/ID.

### 3. AsyncStorage Keys
- `@occ_pending_consultations` - Stores all pending consultations
- Each consultation now includes `assignedDoctor` field

---

## Migration Steps

### 1. Backend
```bash
cd backend
python manage.py makemigrations occupational_health
python manage.py migrate occupational_health
```

### 2. Frontend (No extra steps)
Changes are already integrated into the screens.

---

## Testing Checklist

- [ ] **Intake Flow**
  - [ ] Search and select a patient
  - [ ] Enter visit reason and vital signs
  - [ ] Click "Enregistrer"
  - [ ] Doctor selection modal appears
  - [ ] Can search for doctors
  - [ ] Can select a doctor
  - [ ] Form resets after saving

- [ ] **Waiting Room (Doctor Side)**
  - [ ] Log in as Doctor 1
  - [ ] See only patients assigned to Doctor 1
  - [ ] Doctor name shown next to patient name
  - [ ] Can click "Consulter" to start consultation
  - [ ] Form pre-filled with vitals

- [ ] **Access Control**
  - [ ] Log in as Doctor 2
  - [ ] See only patients assigned to Doctor 2
  - [ ] Cannot access patients assigned to Doctor 1
  - [ ] "Accès Refusé" alert appears if trying to select another doctor's patient

- [ ] **Data Persistence**
  - [ ] Close app after assigning patient
  - [ ] Reopen and log in as doctor
  - [ ] Patient still appears in waiting room
  - [ ] All data (vitals, assignment) preserved

---

## Future Enhancements

1. **Backend Integration**
   - Save consultations to database (OccConsultation model)
   - Sync AsyncStorage with backend periodically
   - Enable multi-device support

2. **Doctor Management**
   - Admin interface to manage doctor list
   - Fetch doctors from API instead of mock data
   - Add doctor availability status

3. **Queue Management**
   - Priority sorting (urgent cases first)
   - Doctor workload balancing
   - Auto-assignment based on specialties

4. **Reporting**
   - Doctor consultation statistics
   - Patient throughput metrics
   - Waiting time analytics

---

## Files Modified

1. **Backend**
   - `apps/occupational_health/models.py` - Added OccConsultation model
   - `apps/occupational_health/migrations/0002_occconsultation.py` - Database migration

2. **Frontend**
   - `modules/occupational-health/screens/OHPatientIntakeScreen.tsx` - Added doctor assignment modal and workflow
   - `modules/occupational-health/screens/OccHealthConsultationScreen.tsx` - Added doctor filtering and access control

---

## Summary

This refactor establishes a proper doctor-patient consultation workflow:
- **Before**: Patients auto-navigated to consultation after vitals
- **After**: Patients are assigned to specific doctors and only that doctor can see them in their waiting room

Benefits:
✅ Better workflow organization
✅ Clear doctor responsibilities
✅ Patient continuity of care
✅ Access control and privacy
✅ Scalable to multiple doctors
