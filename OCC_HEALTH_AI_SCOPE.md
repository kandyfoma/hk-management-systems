# Scope of Work: KCC Occupational Health & AI Assistant

## 1. Project Objective (KCC Mining Focus)
To deliver a specialized Occupational Health Management System and AI-powered Knowledge Assistant (KCC Health-AI) tailored for KCC Mining operations. The platform is designed to address the unique health, safety, and compliance needs of mining environments, with deep integration of DRC mining legislation, ISO 45001, and KCC-specific procedures. The AI leverages mining-specific data agents to provide real-time insights and compliance support for KCC.

## 2. Integrated Functional Modules


### Module A: KCC Mining Occupational Health Management System (OHMS)
- **Mining Medical File Management:** Digital storage for annual, pre-employment, and exit exams, with mining-specific test panels (spirometry, audiometry, X-ray, heavy metals, drug/alcohol screening).
- **Fitness-for-Duty (FFD) Dashboard:** Real-time dashboard showing which KCC mining workers are "Fit", "Fit with Restrictions", or "Unfit" for specific mining tasks.
- **Exposure Monitoring (SEGs):** Grouping KCC mining workers by "Similar Exposure Groups" (SEGs) for silica, cobalt, dust, noise, vibration, and heat tracking, with automated alerts for overexposure.
- **Incident & Disease Management:** Reporting, investigation, and tracking of workplace incidents and occupational diseases, with mining-specific categories and compliance forms.
- **PPE & Risk Assessment:** Assignment and tracking of PPE, ISO 45001 risk matrix, and mining hazard controls.
- **Reporting & Compliance:** Automated generation of KCC/DRC regulatory reports, fitness certificates, and compliance dashboards.

### Module B: Health-AI Knowledge Assistant & Chatbot (Phase 2/Bonus)
- **Mining Knowledge Assistant:** (Planned) AI-powered search and Q&A for KCC mining health, safety, and compliance data.
- **Multi-Turn Conversation Memory:** (Planned) Session context for follow-up questions about KCC mining protocols, worker restrictions, or compliance.
- **Category-Based Filtering:** (Planned) Focused search on "KCC Medical Records," "Mining Hygiene Standards," or "DRC Mining Legislation".
- **Enhanced Citations:** (Planned) AI answers include links to original KCC sources (ISO 45001, KCC Mining Procedure, DRC mining law).
- **Mining-Specific Agents:** (Planned) Historian and Regulatory Agents for mining trends and compliance Q&A.


## 3. Technical Requirements & Performance (KCC Mining)
- **Response Speed:** AI must deliver answers in under 10 seconds, even with large KCC mining datasets.
- **Offline Capability:** Essential for underground and remote KCC mining operations; forms must allow data capture without a connection and sync once back on the surface.
- **Error Handling:** The system uses "fallback messages" to guide KCC users if information cannot be found, never hallucinating or crashing.


## 4. Data Pipeline & Governance (KCC Mining)
- **Data Scrubbing:** Automated pipeline to sanitize KCC mining medical data, ensuring personal identifiers are handled in compliance with DRC law, POPIA/GDPR, and KCC internal policies before AI processing.
- **Automated Ingestion:** A crawler will periodically scan KCC SharePoint and network drives to update the AI’s knowledge base with the latest KCC mining safety bulletins, procedures, and compliance documents.


## 5. Deployment & Support Strategy (KCC Mining)
- **KCC Mining Hypercare Model:**
  - **Phase 1: Pilot & UAT:** Testing with KCC mining SHE professionals and site managers to refine answer accuracy and UI layout for mining workflows.
  - **Phase 2: Production Deployment:** Launch to KCC mining production environment with full KCC Architecture Review (ARC) compliance.
  - **Phase 3: Hypercare:** 4 weeks of intensive support post-launch to monitor error logs and tune the AI’s prompt handling for KCC mining use cases.


## 6. Comparison Table: KCC Mining Basic vs. KCC Mining + AI Assistant

| Feature         | KCC Mining Basic                | KCC Mining + AI Assistant (Sasol Model)      |
|----------------|---------------------------------|----------------------------------------------|
| Search         | Keyword search (mining files)   | Natural language Q&A (mining context-aware)  |
| Data Flow      | Manual Upload                   | Automated "Scrubbing" Pipeline for KCC docs  |
| Compliance     | List of mining regulations      | Regulatory Agent (explains DRC/KCC mining law)|
| Support        | Standard IT Helpdesk            | 4-Week Hypercare + AI Handover (mining)      |


## 7. Current Implementation Status (KCC Mining, Feb 2026)

### Core Features Implemented
- **Mining Data Models:**
  - Worker, Enterprise, WorkSite, MedicalExamination, FitnessCertificate, WorkplaceIncident, OccupationalDisease, RiskAssessment, HazardIdentification, ErgonomicAssessment, MentalHealthScreening, CardiovascularScreening, MusculoskeletalComplaint, SectorProfile (KCC Mining)
- **Mining-Specific Logic:**
  - Risk profiles for KCC mining roles, job categories, and mining-specific exposure risks (silica, cobalt, noise, vibration, heat)
  - Helpers for mining risk profiling
- **UI Screens:**
  - Mining dashboard (KPIs for KCC)
- **APIs & Services:**
  - CRUD for KCC mining workers, incidents, diseases, certificates, surveillance programs, site metrics
  - Mining-adaptive medical exam logic (partial)
- **Metrics & Calculations:**
  - LTIFR, TRIFR, Severity Rate, absenteeism, compliance color coding for mining

### Features In Progress or Planned
- **Automatic mining risk profiling engine** (job → risks → tests → PPE)
- **Mining-adaptive test ordering** and exam templates
- **Certificate generation** (PDF, digital signature, expiry notifications)
- **Incident reporting workflow UI, root cause investigation, CAPA tracking (mining)**
- **ILO R194 classification UI, CNSS declaration forms, epidemiological analysis (mining)**
- **Graduated return-to-work plans, workplace adjustment engine, follow-up scheduling (mining)**
- **PPE inventory management, compliance dashboard, training records (mining)**
- **Risk assessment workflow UI, exposure measurement, hierarchy of controls engine, risk heatmap (mining)**
- **Psychosocial risk questionnaire UI, burnout detection, referral management (mining)**
- **Ergonomic assessment workflow UI, workstation config engine, RULA/REBA calculator (mining)**
- **Report generation (PDF/Excel), CNSS forms, ISO 45001 audit checklist, compliance dashboard (mining)**
- **Notification system, advanced analytics, KCC mining admin**

### AI Assistant & Knowledge Features
- **Planned:**
  - Health-AI Knowledge Assistant (Sasol model, mining-adapted) with multi-turn memory, category filtering, enhanced citations, historian/regulatory agents for KCC mining
  - Automated data scrubbing pipeline, KCC SharePoint/network crawler for mining knowledge ingestion
  - Fallback messaging for error handling, offline data capture/sync (mining)

---
**See also:** [OCCUPATIONAL_HEALTH_WORKFLOW.md](frontend/OCCUPATIONAL_HEALTH_WORKFLOW.md) for detailed workflow, phases, and entity status (multi-sector details are for reference; KCC Mining is the focus for this scope).
