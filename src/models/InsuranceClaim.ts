/**
 * Insurance Claim Model
 * 
 * Manages insurance claim submissions, tracking, and reimbursement
 * for hospital services.
 */

export interface InsuranceClaim {
  id: string;
  invoiceId: string;              // → HospitalInvoice
  encounterId: string;            // → Encounter
  patientId: string;              // → Patient
  organizationId: string;         // → Organization
  facilityId: string;             // → Hospital
  
  // Claim identification
  claimNumber: string;            // Internal: "CLM260001"
  externalClaimNumber?: string;   // Insurance company's claim number
  
  // Insurance information
  insuranceProvider: string;      // Insurance company name
  insuranceProviderId?: string;   // Insurance company ID
  policyNumber: string;           // Patient's policy number
  groupNumber?: string;           // Group/employer number
  memberId: string;               // Member ID on card
  subscriberName: string;         // Primary policyholder name
  subscriberRelation: SubscriberRelation; // Patient's relation to subscriber
  
  // Claim dates
  serviceFromDate: string;        // First date of service
  serviceToDate: string;          // Last date of service
  submissionDate?: string;        // When claim was submitted
  receivedDate?: string;          // When insurer received claim
  processedDate?: string;         // When insurer processed claim
  paymentDate?: string;           // When payment received
  
  // Claim amounts
  totalCharges: number;           // Total billed amount
  allowedAmount?: number;         // Amount insurance allows
  deductible?: number;            // Patient's deductible amount
  copay?: number;                 // Patient's copay
  coinsurance?: number;           // Patient's coinsurance amount
  claimAmount: number;            // Amount claimed from insurance
  approvedAmount?: number;        // Amount approved by insurance
  paidAmount?: number;            // Actual payment received
  patientResponsibility?: number; // What patient owes
  writeOffAmount?: number;        // Contractual adjustment
  currency: string;               // "CDF", "USD"
  
  // Claim details
  claimType: ClaimType;
  placeOfService: PlaceOfService;
  admissionType?: string;         // For inpatient claims
  dischargeStatus?: string;       // For inpatient claims
  
  // Clinical information
  principalDiagnosis: string;     // Main diagnosis description
  diagnosisCodes: DiagnosisCodeEntry[]; // ICD-10 codes
  procedureCodes?: ProcedureCodeEntry[]; // CPT/HCPCS codes
  
  // Service lines
  serviceLines: ClaimServiceLine[];
  
  // Prior authorization
  priorAuthRequired: boolean;
  priorAuthNumber?: string;       // Authorization number if obtained
  priorAuthDate?: string;         // When authorization was obtained
  
  // Status tracking
  status: ClaimStatus;
  substatus?: ClaimSubstatus;
  
  // Denial/rejection handling
  denialReason?: string;          // Reason for denial
  denialCode?: string;            // Standard denial code
  appealDeadline?: string;        // Last date to appeal
  appealSubmitted?: boolean;
  appealDate?: string;
  appealStatus?: AppealStatus;
  
  // Communication
  notes?: string;                 // Internal notes
  insurerNotes?: string;          // Notes from insurance
  
  // Documents
  attachedDocuments?: ClaimDocument[];
  
  // Staff tracking
  submittedBy?: string;           // → User
  submittedByName?: string;
  reviewedBy?: string;            // → User (for internal review)
  
  // Metadata
  createdAt: string;
  updatedAt?: string;
  metadata?: Record<string, any>;
}

export type SubscriberRelation = 
  | 'self'                        // Patient is the policyholder
  | 'spouse'                      // Spouse of policyholder
  | 'child'                       // Child of policyholder
  | 'dependent'                   // Other dependent
  | 'other';

export type ClaimType = 
  | 'professional'                // Physician services (CMS-1500)
  | 'institutional'               // Hospital services (UB-04)
  | 'dental'                      // Dental services
  | 'pharmacy'                    // Prescription drugs
  | 'vision'                      // Vision services
  | 'mental_health';              // Mental health services

export type PlaceOfService = 
  | 'outpatient_hospital'         // 22
  | 'inpatient_hospital'          // 21
  | 'emergency_room'              // 23
  | 'office'                      // 11
  | 'home'                        // 12
  | 'ambulatory_surgery'          // 24
  | 'skilled_nursing'             // 31
  | 'pharmacy'                    // 01
  | 'laboratory'                  // 81
  | 'radiology'                   // 24
  | 'other';

export type ClaimStatus = 
  | 'draft'                       // Being prepared
  | 'pending_submission'          // Ready to submit
  | 'submitted'                   // Sent to insurer
  | 'acknowledged'                // Insurer acknowledged receipt
  | 'in_process'                  // Under review
  | 'pending_info'                // Waiting for additional info
  | 'approved'                    // Claim approved
  | 'partially_approved'          // Partial approval
  | 'denied'                      // Claim denied
  | 'paid'                        // Payment received
  | 'closed'                      // Claim finalized
  | 'appealed'                    // Under appeal
  | 'void';                       // Claim voided

export type ClaimSubstatus = 
  | 'missing_documentation'       // Need more docs
  | 'coding_review'               // Under coding review
  | 'medical_review'              // Under medical necessity review
  | 'awaiting_authorization'      // Waiting for prior auth
  | 'duplicate_check'             // Checking for duplicate
  | 'coordination_of_benefits'    // COB check
  | 'patient_info_needed'         // Need patient info
  | 'provider_info_needed';       // Need provider info

export type AppealStatus = 
  | 'pending'                     // Appeal submitted, awaiting
  | 'in_review'                   // Under appeal review
  | 'approved'                    // Appeal successful
  | 'denied'                      // Appeal denied
  | 'escalated';                  // Escalated to higher level

export interface DiagnosisCodeEntry {
  sequence: number;               // Order (1 = principal)
  code: string;                   // ICD-10 code
  description: string;            // Code description
  type: 'principal' | 'secondary' | 'admitting';
  presentOnAdmission?: 'yes' | 'no' | 'unknown' | 'not_applicable';
}

export interface ProcedureCodeEntry {
  sequence: number;
  code: string;                   // CPT/HCPCS code
  description: string;
  modifiers?: string[];           // Modifier codes
  quantity: number;
  serviceDate: string;
}

export interface ClaimServiceLine {
  id: string;
  lineNumber: number;
  serviceDate: string;            // Date service was provided
  procedureCode: string;          // CPT/HCPCS code
  procedureDescription: string;
  modifiers?: string[];           // CPT modifiers
  quantity: number;
  unitType: string;               // "units", "days", "hours"
  charges: number;                // Billed amount for this line
  allowedAmount?: number;         // Insurance allowed amount
  paidAmount?: number;            // Amount paid for this line
  denialReason?: string;          // If line was denied
  // Links
  invoiceItemId?: string;         // → InvoiceItem
  revenueCode?: string;           // Hospital revenue code
  // Status
  status: 'pending' | 'approved' | 'denied' | 'paid';
}

export interface ClaimDocument {
  id: string;
  claimId: string;
  documentType: ClaimDocumentType;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
  uploadedBy: string;
  description?: string;
}

export type ClaimDocumentType = 
  | 'medical_records'             // Clinical documentation
  | 'lab_results'                 // Laboratory reports
  | 'imaging_reports'             // Radiology reports
  | 'operative_notes'             // Surgery notes
  | 'discharge_summary'           // Discharge documentation
  | 'prior_authorization'         // Pre-auth documentation
  | 'referral'                    // Referral documentation
  | 'itemized_bill'               // Detailed invoice
  | 'appeal_letter'               // Appeal documentation
  | 'other';

// CRUD interfaces
export interface InsuranceClaimCreate extends Omit<InsuranceClaim, 'id' | 'claimNumber' | 'createdAt'> {
  id?: string;
  claimNumber?: string;
  createdAt?: string;
}

export interface InsuranceClaimUpdate extends Partial<Omit<InsuranceClaim, 'id' | 'claimNumber' | 'patientId' | 'invoiceId' | 'encounterId' | 'createdAt'>> {
  updatedAt?: string;
}

/**
 * Insurance Claim Statistics
 */
export interface ClaimStats {
  totalClaims: number;
  totalSubmitted: number;
  totalApproved: number;
  totalDenied: number;
  totalPaid: number;
  byStatus: Record<ClaimStatus, number>;
  totalCharges: number;
  totalPaidAmount: number;
  totalDeniedAmount: number;
  averageDaysToPayment: number;
  approvalRate: number;           // Percentage
  denialRate: number;             // Percentage
  collectionRate: number;         // Paid vs Charged
}

/**
 * Insurance Provider Configuration
 */
export interface InsuranceProviderConfig {
  id: string;
  name: string;                   // Company name
  code: string;                   // Internal code
  payerId: string;                // Electronic payer ID
  claimSubmissionMethod: 'electronic' | 'paper' | 'portal';
  portalUrl?: string;             // Web portal URL
  phone?: string;                 // Claims phone number
  fax?: string;                   // Claims fax number
  address?: string;               // Mailing address
  averagePaymentDays: number;     // Typical payment turnaround
  notes?: string;                 // Internal notes
  isActive: boolean;
  contractedRates?: boolean;      // Do we have contracted rates?
  // Contact information
  providerRelationsPhone?: string;
  providerRelationsEmail?: string;
}

export class InsuranceClaimUtils {
  /**
   * Generate claim number: CLM{YY}{DDDDD}
   */
  static generateClaimNumber(): string {
    const year = new Date().getFullYear().toString().slice(-2);
    const sequence = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    return `CLM${year}${sequence}`;
  }

  /**
   * Create claim with defaults
   */
  static createClaim(data: InsuranceClaimCreate): InsuranceClaim {
    const now = new Date().toISOString();
    return {
      ...data,
      id: data.id || generateUUID(),
      claimNumber: data.claimNumber || this.generateClaimNumber(),
      status: data.status || 'draft',
      serviceLines: data.serviceLines || [],
      diagnosisCodes: data.diagnosisCodes || [],
      createdAt: data.createdAt || now,
      updatedAt: now,
    };
  }

  /**
   * Submit claim
   */
  static submitClaim(claim: InsuranceClaim, submittedBy: string, submittedByName: string): InsuranceClaim {
    const now = new Date().toISOString();
    return {
      ...claim,
      status: 'submitted',
      submissionDate: now,
      submittedBy,
      submittedByName,
      updatedAt: now,
    };
  }

  /**
   * Record claim approval
   */
  static approveClaim(
    claim: InsuranceClaim,
    approvedAmount: number,
    allowedAmount?: number,
    notes?: string
  ): InsuranceClaim {
    const now = new Date().toISOString();
    return {
      ...claim,
      status: 'approved',
      approvedAmount,
      allowedAmount: allowedAmount || approvedAmount,
      processedDate: now,
      insurerNotes: notes,
      updatedAt: now,
    };
  }

  /**
   * Record claim denial
   */
  static denyClaim(
    claim: InsuranceClaim,
    denialReason: string,
    denialCode?: string,
    appealDeadline?: string
  ): InsuranceClaim {
    const now = new Date().toISOString();
    return {
      ...claim,
      status: 'denied',
      denialReason,
      denialCode,
      appealDeadline,
      processedDate: now,
      updatedAt: now,
    };
  }

  /**
   * Record payment received
   */
  static recordPayment(
    claim: InsuranceClaim,
    paidAmount: number,
    paymentDate?: string
  ): InsuranceClaim {
    const now = new Date().toISOString();
    const patientResponsibility = claim.claimAmount - paidAmount - (claim.writeOffAmount || 0);
    
    return {
      ...claim,
      status: 'paid',
      paidAmount,
      paymentDate: paymentDate || now,
      patientResponsibility: Math.max(0, patientResponsibility),
      updatedAt: now,
    };
  }

  /**
   * Submit appeal
   */
  static submitAppeal(claim: InsuranceClaim): InsuranceClaim {
    const now = new Date().toISOString();
    return {
      ...claim,
      status: 'appealed',
      appealSubmitted: true,
      appealDate: now,
      appealStatus: 'pending',
      updatedAt: now,
    };
  }

  /**
   * Calculate patient responsibility
   */
  static calculatePatientResponsibility(claim: InsuranceClaim): number {
    const deductible = claim.deductible || 0;
    const copay = claim.copay || 0;
    const coinsurance = claim.coinsurance || 0;
    const deniedAmount = claim.claimAmount - (claim.approvedAmount || 0);
    
    return deductible + copay + coinsurance + deniedAmount;
  }

  /**
   * Calculate days since submission
   */
  static getDaysSinceSubmission(claim: InsuranceClaim): number | null {
    if (!claim.submissionDate) return null;
    
    const submitted = new Date(claim.submissionDate);
    const now = new Date();
    return Math.floor((now.getTime() - submitted.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if claim is actionable
   */
  static canSubmit(claim: InsuranceClaim): boolean {
    return claim.status === 'draft' || claim.status === 'pending_submission';
  }

  /**
   * Check if claim can be appealed
   */
  static canAppeal(claim: InsuranceClaim): boolean {
    if (claim.status !== 'denied') return false;
    if (!claim.appealDeadline) return true;
    
    return new Date(claim.appealDeadline) > new Date();
  }

  /**
   * Get status color
   */
  static getStatusColor(status: ClaimStatus): string {
    switch (status) {
      case 'draft': return '#6B7280';             // Gray
      case 'pending_submission': return '#8B5CF6'; // Purple
      case 'submitted': return '#3B82F6';         // Blue
      case 'acknowledged': return '#0891B2';      // Cyan
      case 'in_process': return '#6366F1';        // Indigo
      case 'pending_info': return '#F59E0B';      // Amber
      case 'approved': return '#10B981';          // Green
      case 'partially_approved': return '#22C55E'; // Light green
      case 'denied': return '#EF4444';            // Red
      case 'paid': return '#059669';              // Emerald
      case 'closed': return '#1F2937';            // Dark gray
      case 'appealed': return '#EC4899';          // Pink
      case 'void': return '#DC2626';              // Dark red
      default: return '#6B7280';
    }
  }

  /**
   * Get claim type label
   */
  static getClaimTypeLabel(type: ClaimType): string {
    switch (type) {
      case 'professional': return 'Professional (Physician)';
      case 'institutional': return 'Institutional (Hospital)';
      case 'dental': return 'Dental';
      case 'pharmacy': return 'Pharmacy';
      case 'vision': return 'Vision';
      case 'mental_health': return 'Mental Health';
      default: return type;
    }
  }

  /**
   * Validate claim before submission
   */
  static validateForSubmission(claim: InsuranceClaim): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!claim.insuranceProvider) errors.push('Insurance provider is required');
    if (!claim.policyNumber) errors.push('Policy number is required');
    if (!claim.memberId) errors.push('Member ID is required');
    if (!claim.subscriberName) errors.push('Subscriber name is required');
    if (claim.diagnosisCodes.length === 0) errors.push('At least one diagnosis code is required');
    if (claim.serviceLines.length === 0) errors.push('At least one service line is required');
    if (claim.claimAmount <= 0) errors.push('Claim amount must be greater than 0');
    if (claim.priorAuthRequired && !claim.priorAuthNumber) {
      errors.push('Prior authorization number is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Calculate claim age in days
   */
  static getClaimAge(claim: InsuranceClaim): number {
    const created = new Date(claim.createdAt);
    const now = new Date();
    return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Format amount for display
   */
  static formatAmount(amount: number, currency: string): string {
    const formatter = new Intl.NumberFormat('fr-CD', {
      style: 'currency',
      currency: currency === 'CDF' ? 'CDF' : 'USD',
      minimumFractionDigits: currency === 'CDF' ? 0 : 2,
    });
    return formatter.format(amount);
  }
}

// Simple UUID generator
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}