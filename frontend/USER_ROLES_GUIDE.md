# User Roles and Permissions Guide

This guide provides a comprehensive overview of all user roles available in the Healthcare Management System and their associated permissions.

## Role Categories

### 🔧 System-wide Roles
Administrative roles that can access multiple modules and have system-level permissions.

#### System Administrator
- **Role Code**: `system_admin`
- **Access**: All modules and features
- **Description**: Super administrator with complete system access
- **Key Permissions**: All permissions across pharmacy, hospital, and occupational health modules

#### Organization Administrator  
- **Role Code**: `organization_admin`
- **Access**: Cross-module management
- **Description**: Administrator for entire healthcare organization
- **Key Permissions**: User management, reporting, compliance, and cross-module oversight

---

### 💊 Pharmacy Module Roles
Specialized roles for pharmacy operations and medication management.

#### Pharmacy Administrator
- **Role Code**: `pharmacy_admin`
- **Access**: Complete pharmacy module access
- **Description**: Manages pharmacy operations, staff, and inventory
- **Key Permissions**: User management, inventory, prescriptions, billing, compliance

#### Pharmacist
- **Role Code**: `pharmacist`
- **Access**: Clinical pharmacy functions
- **Description**: Licensed pharmacist with dispensing and clinical responsibilities
- **Key Permissions**: Dispense medication, manage prescriptions, inventory management, compliance

#### Pharmacy Supervisor
- **Role Code**: `pharmacy_supervisor`
- **Access**: Supervisory pharmacy functions
- **Description**: Supervises pharmacy operations and technicians
- **Key Permissions**: Dispensing, prescriptions, inventory, quality control, staff training

#### Pharmacy Technician
- **Role Code**: `pharmacy_tech`
- **Access**: Basic pharmacy operations
- **Description**: Assists pharmacists with medication preparation and inventory
- **Key Permissions**: Dispense medication, manage inventory, POS access, returns

#### Pharmacy Intern
- **Role Code**: `pharmacy_intern`
- **Access**: Limited supervised access
- **Description**: Pharmacy student or intern under supervision
- **Key Permissions**: Limited dispensing, inventory access, POS operations

#### Pharmacy Cashier
- **Role Code**: `pharmacy_cashier`
- **Access**: Point-of-sale operations
- **Description**: Handles pharmacy sales and payments
- **Key Permissions**: POS access, billing, payment processing

#### Inventory Manager
- **Role Code**: `inventory_manager`
- **Access**: Inventory and supply chain
- **Description**: Manages stock, suppliers, and inventory reports
- **Key Permissions**: Inventory management, supplier relations, reporting, analytics

---

### 🏥 Hospital Module Roles
Comprehensive roles for hospital operations and patient care.

#### Hospital Administrator
- **Role Code**: `hospital_admin`
- **Access**: Complete hospital module access
- **Description**: Manages hospital operations, departments, and staff
- **Key Permissions**: User management, patient care, medical records, billing, compliance

#### Medical Director
- **Role Code**: `medical_director`
- **Access**: Clinical leadership and oversight
- **Description**: Chief medical officer with clinical and administrative authority
- **Key Permissions**: Clinical oversight, prescribing, medical records, quality control, training

#### Department Head
- **Role Code**: `department_head`
- **Access**: Departmental management
- **Description**: Heads specific medical departments or units
- **Key Permissions**: Patient care, medical records, prescribing, procedures, staff training

#### Doctor
- **Role Code**: `doctor`
- **Access**: Clinical care and treatment
- **Description**: General physician with patient care responsibilities
- **Key Permissions**: Patient care, prescribing, medical records, appointments, lab orders, procedures

#### Specialist Doctor
- **Role Code**: `specialist_doctor`
- **Access**: Specialized medical care
- **Description**: Medical specialist in specific fields
- **Key Permissions**: Patient care, prescribing, medical records, specialized procedures, imaging

#### Resident Doctor
- **Role Code**: `resident_doctor`
- **Access**: Supervised clinical practice
- **Description**: Medical resident in training
- **Key Permissions**: Patient care, prescribing, medical records, appointments, lab access

#### Nurse Manager
- **Role Code**: `nurse_manager`
- **Access**: Nursing supervision and management
- **Description**: Manages nursing staff and patient care coordination
- **Key Permissions**: Patient care, medical records, admissions, ward management, training

#### Registered Nurse
- **Role Code**: `registered_nurse`
- **Access**: Clinical nursing care
- **Description**: Licensed RN with full nursing responsibilities
- **Key Permissions**: Patient care, medical records, appointments, admissions, ward management

#### Licensed Practical Nurse
- **Role Code**: `licensed_nurse`
- **Access**: Basic nursing care
- **Description**: LPN/LVN with supervised nursing duties
- **Key Permissions**: Patient care, medical records, appointments, ward assistance

#### Nursing Assistant
- **Role Code**: `nurse_aide`
- **Access**: Patient care assistance
- **Description**: CNA providing basic patient care support
- **Key Permissions**: Basic patient care, appointments, ward assistance

#### Laboratory Supervisor
- **Role Code**: `lab_supervisor`
- **Access**: Laboratory management
- **Description**: Supervises laboratory operations and quality
- **Key Permissions**: Lab results, lab orders, quality control, staff training

#### Lab Technician
- **Role Code**: `lab_technician`
- **Access**: Laboratory testing
- **Description**: Performs laboratory tests and analyses
- **Key Permissions**: Lab results, lab orders, patient viewing

#### Radiographer
- **Role Code**: `radiographer`
- **Access**: Medical imaging
- **Description**: Performs diagnostic imaging procedures
- **Key Permissions**: Medical imaging, patient viewing, appointments

#### Medical Receptionist
- **Role Code**: `medical_receptionist`
- **Access**: Front desk operations
- **Description**: Handles patient check-in and administrative tasks
- **Key Permissions**: Patient viewing, appointments, billing, payments

#### Medical Records Clerk
- **Role Code**: `medical_records`
- **Access**: Patient records management
- **Description**: Manages and maintains medical records
- **Key Permissions**: Medical records access and management, patient viewing, appointments

#### Billing Specialist
- **Role Code**: `billing_specialist`
- **Access**: Medical billing and claims
- **Description**: Handles medical billing and insurance claims
- **Key Permissions**: Billing, financial reports, insurance claims, payments

---

### ⚡ Occupational Health Module Roles
Specialized roles for workplace health and safety management.

#### Occupational Health Administrator
- **Role Code**: `occ_health_admin`
- **Access**: Complete occupational health module
- **Description**: Manages occupational health programs and compliance
- **Key Permissions**: All occupational health functions, user management, compliance, reporting

#### Occupational Health Physician
- **Role Code**: `occ_health_physician`
- **Access**: Clinical occupational medicine
- **Description**: Medical doctor specializing in workplace health
- **Key Permissions**: Medical exams, fitness certificates, risk assessments, surveillance programs

#### Occupational Health Nurse
- **Role Code**: `occ_health_nurse`
- **Access**: Occupational nursing care
- **Description**: Nurse specializing in workplace health services
- **Key Permissions**: Medical exams, health screenings, incident management, health education

#### Safety Officer
- **Role Code**: `safety_officer`
- **Access**: Workplace safety management
- **Description**: Manages workplace safety programs and compliance
- **Key Permissions**: Risk assessments, incident management, workplace inspections, compliance

#### Safety Coordinator
- **Role Code**: `safety_coordinator`
- **Access**: Safety program coordination
- **Description**: Coordinates safety initiatives and training
- **Key Permissions**: Risk assessments, incident management, inspections, health education

#### Industrial Hygienist
- **Role Code**: `industrial_hygienist`
- **Access**: Exposure assessment and control
- **Description**: Evaluates and controls workplace health hazards
- **Key Permissions**: Risk assessments, exposure records, surveillance programs, hazard communications

#### Ergonomist
- **Role Code**: `ergonomist`
- **Access**: Ergonomic assessments
- **Description**: Specializes in workplace ergonomics and injury prevention
- **Key Permissions**: Ergonomic assessments, risk assessments, health education

#### Toxicologist
- **Role Code**: `toxicologist`
- **Access**: Chemical hazard assessment
- **Description**: Evaluates chemical exposures and health risks
- **Key Permissions**: Risk assessments, exposure records, hazard communications, regulatory reporting

#### Audiometrist
- **Role Code**: `audiometrist`
- **Access**: Hearing testing and assessment
- **Description**: Conducts hearing tests and audiometric evaluations
- **Key Permissions**: Audiometry testing, medical records access, reporting

#### Spirometry Technician
- **Role Code**: `spirometry_tech`
- **Access**: Lung function testing
- **Description**: Performs pulmonary function tests
- **Key Permissions**: Spirometry testing, medical records access, reporting

#### Occupational Health Counselor
- **Role Code**: `occ_health_counselor`
- **Access**: Employee wellness and counseling
- **Description**: Provides wellness counseling and return-to-work support
- **Key Permissions**: Worker management, medical records, return-to-work programs, health education

#### Case Manager
- **Role Code**: `case_manager`
- **Access**: Workers compensation case management
- **Description**: Manages workers compensation cases and return-to-work programs
- **Key Permissions**: Case management, injury reports, return-to-work, insurance claims

#### Compliance Officer
- **Role Code**: `compliance_officer`
- **Access**: Regulatory compliance management
- **Description**: Ensures regulatory compliance and manages documentation
- **Key Permissions**: Regulatory reporting, compliance management, audit logs, documentation

#### Safety Inspector
- **Role Code**: `safety_inspector`
- **Access**: Workplace inspections and assessments
- **Description**: Conducts workplace safety inspections and assessments
- **Key Permissions**: Workplace inspections, risk assessments, incident management, compliance

#### Health Educator
- **Role Code**: `health_educator`
- **Access**: Health education and training
- **Description**: Develops and delivers health education programs
- **Key Permissions**: Health education, health programs, training coordination, reporting

---

### 🔧 Cross-Module Support Roles
Support roles that can work across multiple modules.

#### Data Analyst
- **Role Code**: `data_analyst`
- **Access**: Analytics and reporting across modules
- **Description**: Analyzes data and generates insights across the system
- **Key Permissions**: Reports, analytics, data export, dashboard management

#### Quality Assurance
- **Role Code**: `quality_assurance`
- **Access**: Quality control across modules
- **Description**: Ensures quality standards and compliance across operations
- **Key Permissions**: Quality control, compliance management, audit logs, reporting

#### IT Support
- **Role Code**: `it_support`
- **Access**: Technical support and system administration
- **Description**: Provides technical support and system maintenance
- **Key Permissions**: System settings, technical support, audit logs

#### Training Coordinator
- **Role Code**: `training_coordinator`
- **Access**: Training and education across modules
- **Description**: Coordinates training programs and educational initiatives
- **Key Permissions**: Training management, health education, documentation, reporting

#### Receptionist
- **Role Code**: `receptionist`
- **Access**: General reception duties
- **Description**: Handles general reception and administrative tasks
- **Key Permissions**: Patient viewing, appointments, billing, POS access

#### Cashier
- **Role Code**: `cashier`
- **Access**: Payment processing
- **Description**: Handles payments and basic billing functions
- **Key Permissions**: POS access, billing, patient viewing

---

## Permission Categories

### 👤 User & System Management
- `manage_users` - Create, edit, delete users
- `manage_system_settings` - Configure system settings
- `manage_licenses` - Manage software licenses
- `system_backup_restore` - Backup and restore system data

### 🏥 Patient/Worker Management
- `view_patients` - View patient information
- `manage_patients` - Create, edit patient records
- `view_workers` - View worker information
- `manage_workers` - Create, edit worker records
- `access_medical_records` - Access medical records
- `manage_medical_records` - Edit medical records

### 💊 Pharmacy Operations
- `dispense_medication` - Dispense medications
- `manage_prescriptions` - Handle prescriptions
- `prescribe_medication` - Write prescriptions
- `manage_inventory` - Inventory management
- `manage_suppliers` - Supplier relationships
- `access_pos` - Point-of-sale access
- `process_returns` - Handle medication returns
- `manage_drug_schedule` - Control scheduled drugs

### 🏥 Hospital Operations
- `manage_appointments` - Schedule appointments
- `manage_admissions` - Patient admissions
- `access_lab_results` - View lab results
- `manage_lab_orders` - Order laboratory tests
- `manage_wards` - Ward management
- `discharge_patients` - Discharge patients
- `access_imaging` - Medical imaging access
- `manage_procedures` - Medical procedures

### ⚡ Occupational Health Operations
- `conduct_medical_exams` - Perform medical examinations
- `issue_fitness_certificates` - Issue fitness certificates
- `manage_incidents` - Handle workplace incidents
- `conduct_risk_assessments` - Perform risk assessments
- `manage_surveillance_programs` - Health surveillance
- `conduct_audiometry` - Hearing tests
- `conduct_spirometry` - Lung function tests
- `manage_drug_screening` - Drug testing programs
- `manage_ppe_compliance` - Personal protective equipment
- `access_injury_reports` - Injury reporting
- `manage_return_to_work` - Return-to-work programs
- `conduct_workplace_inspections` - Safety inspections
- `manage_hazard_communications` - Hazard communication
- `access_exposure_records` - Exposure monitoring
- `manage_health_programs` - Health promotion programs
- `regulatory_reporting` - Regulatory compliance reporting
- `manage_ergonomic_assessments` - Ergonomic evaluations
- `conduct_health_education` - Health education programs
- `manage_vaccination_programs` - Vaccination management

### 💰 Financial Operations
- `manage_billing` - Billing operations
- `view_financial_reports` - Financial reporting
- `manage_insurance_claims` - Insurance processing
- `process_payments` - Payment processing

### 📊 Reporting & Analytics
- `view_reports` - View existing reports
- `generate_reports` - Create new reports
- `view_analytics` - Access analytics
- `export_data` - Export data
- `manage_dashboards` - Dashboard management

### 🛡️ Compliance & Quality
- `access_audit_logs` - View audit trails
- `manage_compliance` - Compliance management
- `quality_control` - Quality assurance
- `access_sensitive_data` - Sensitive data access

### 📚 Training & Support
- `manage_training` - Training program management
- `provide_support` - Technical support
- `manage_documentation` - Documentation management

---

## Role Implementation Notes

### Module Access Control
- **System Admins**: Full access to all modules
- **Module-Specific Roles**: Access limited to their respective modules
- **Support Roles**: May have cross-module access depending on function
- **Cross-Module Functions**: Some roles (like billing, IT support) work across modules

### Permission Inheritance
- Higher-level roles include permissions of lower-level roles in their hierarchy
- Administrative roles have broader permission sets
- Clinical roles focus on patient/worker care permissions
- Support roles have specialized permission sets for their functions

### Security Considerations
- Sensitive permissions (system admin, audit logs) are restricted to appropriate roles
- Medical records access is controlled based on clinical need
- Financial operations require specific permissions
- Compliance and regulatory functions are role-specific

### Best Practices
1. **Principle of Least Privilege**: Users should have minimum permissions needed for their role
2. **Regular Review**: Permissions should be reviewed periodically
3. **Role Segregation**: Separate roles for different functions to maintain security
4. **Documentation**: All role changes should be documented and audited