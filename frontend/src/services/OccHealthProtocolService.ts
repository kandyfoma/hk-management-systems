// ═══════════════════════════════════════════════════════════════════════════
// OccHealthProtocolService
// ═══════════════════════════════════════════════════════════════════════════
// Intelligent query layer over the protocol/sector/department/position data.
//
// Usage:
//   const svc = OccHealthProtocolService.getInstance();
//
//   // Populate pickers in patient intake
//   const sectors = svc.getAllSectors();
//   const depts   = svc.getDepartmentsBySector('MIN');
//   const posts   = svc.getPositionsByDepartment('MIN_UNDER');
//
//   // Auto-generate checklist when patient visits
//   const result = svc.getProtocolForVisit('FOREUR', 'pre_employment');
//   result.requiredExams  → MedicalExamCatalogEntry[]
//   result.hasProtocol    → true/false
//
//   // Generate checklist tracking model
//   const checklist = svc.buildChecklist('PATIENT_001', 'FOREUR', 'pre_employment');
// ═══════════════════════════════════════════════════════════════════════════

import {
  OccSector,
  OccDepartment,
  OccPosition,
  MedicalExamCatalogEntry,
  ExamVisitProtocol,
  ProtocolQueryResult,
  VisitExamChecklist,
  ExamChecklistItem,
} from '../models/OccHealthProtocol';
import { ExamType } from '../models/OccupationalHealth';
import {
  OCC_SECTORS_DATA,
  SECTORS_BY_CODE,
  DEPARTMENTS_BY_CODE,
  POSITIONS_BY_CODE,
  EXAM_CATALOG_MAP,
  MEDICAL_EXAM_CATALOG,
} from '../data/occHealthProtocolData';

export class OccHealthProtocolService {
  // ─── Singleton ───────────────────────────────────────────────
  private static _instance: OccHealthProtocolService;
  static getInstance(): OccHealthProtocolService {
    if (!this._instance) this._instance = new OccHealthProtocolService();
    return this._instance;
  }

  // ═══════════════════════════════════════════════════════════════
  // SECTOR QUERIES
  // ═══════════════════════════════════════════════════════════════

  /** Returns all sectors sorted by name */
  getAllSectors(): OccSector[] {
    return [...OCC_SECTORS_DATA].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }

  /** Returns a single sector by code, or undefined */
  getSectorByCode(code: string): OccSector | undefined {
    return SECTORS_BY_CODE[code];
  }

  // ═══════════════════════════════════════════════════════════════
  // DEPARTMENT QUERIES
  // ═══════════════════════════════════════════════════════════════

  /** Returns all departments for a given sector code */
  getDepartmentsBySector(sectorCode: string): OccDepartment[] {
    const sector = SECTORS_BY_CODE[sectorCode];
    if (!sector) return [];
    return [...sector.departments].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }

  /** Returns a single department by its code */
  getDepartmentByCode(code: string): OccDepartment | undefined {
    return DEPARTMENTS_BY_CODE[code];
  }

  // ═══════════════════════════════════════════════════════════════
  // POSITION QUERIES
  // ═══════════════════════════════════════════════════════════════

  /** Returns all positions within a department */
  getPositionsByDepartment(departmentCode: string): OccPosition[] {
    const dept = DEPARTMENTS_BY_CODE[departmentCode];
    if (!dept) return [];
    return [...dept.positions].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }

  /** Returns a single position by code */
  getPositionByCode(positionCode: string): OccPosition | undefined {
    return POSITIONS_BY_CODE[positionCode];
  }

  /**
   * Returns all positions that have a protocol for a specific visit type.
   * Useful for filtering positions available for a visit type.
   */
  getPositionsWithProtocol(departmentCode: string, visitType: ExamType): OccPosition[] {
    return this.getPositionsByDepartment(departmentCode).filter((p) =>
      p.protocols.some((pr) => pr.visitType === visitType)
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // PROTOCOL QUERIES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Core query: returns the full protocol context for a position + visit type.
   *
   * @param positionCode  e.g. "FOREUR"
   * @param visitType     e.g. "pre_employment"
   */
  getProtocolForVisit(
    positionCode: string,
    visitType: ExamType
  ): ProtocolQueryResult {
    const position = POSITIONS_BY_CODE[positionCode];
    const department = position ? DEPARTMENTS_BY_CODE[position.departmentCode] : undefined;
    const sector = position ? SECTORS_BY_CODE[position.sectorCode] : undefined;

    if (!position || !department || !sector) {
      return {
        sector: {} as OccSector,
        department: {} as OccDepartment,
        position: {} as OccPosition,
        protocol: null,
        requiredExams: [],
        recommendedExams: [],
        hasProtocol: false,
        availableVisitTypes: [],
      };
    }

    const protocol = position.protocols.find((p) => p.visitType === visitType) ?? null;

    const resolveExams = (codes: string[]): MedicalExamCatalogEntry[] =>
      codes
        .map((c) => EXAM_CATALOG_MAP[c])
        .filter((e): e is MedicalExamCatalogEntry => !!e);

    const availableVisitTypes = position.protocols.map((p) => p.visitType) as ExamType[];

    return {
      sector,
      department,
      position,
      protocol,
      requiredExams: protocol ? resolveExams(protocol.requiredExams) : [],
      recommendedExams:
        protocol && protocol.recommendedExams
          ? resolveExams(protocol.recommendedExams)
          : [],
      hasProtocol: !!protocol,
      availableVisitTypes,
    };
  }

  /**
   * Returns the visit protocol object directly (without full context).
   * Returns null if not found.
   */
  getVisitProtocol(positionCode: string, visitType: ExamType): ExamVisitProtocol | null {
    return (
      POSITIONS_BY_CODE[positionCode]?.protocols.find((p) => p.visitType === visitType) ?? null
    );
  }

  /**
   * Returns which visit types are available for a position.
   */
  getAvailableVisitTypes(positionCode: string): ExamType[] {
    return (POSITIONS_BY_CODE[positionCode]?.protocols.map((p) => p.visitType) ?? []) as ExamType[];
  }

  // ═══════════════════════════════════════════════════════════════
  // EXAM CATALOG QUERIES
  // ═══════════════════════════════════════════════════════════════

  /** Returns all exams in the catalog */
  getAllExams(): MedicalExamCatalogEntry[] {
    return MEDICAL_EXAM_CATALOG;
  }

  /** Returns a single exam by code */
  getExamByCode(code: string): MedicalExamCatalogEntry | undefined {
    return EXAM_CATALOG_MAP[code];
  }

  /** Returns exams grouped by category */
  getExamsByCategory(): Record<string, MedicalExamCatalogEntry[]> {
    const grouped: Record<string, MedicalExamCatalogEntry[]> = {};
    for (const exam of MEDICAL_EXAM_CATALOG) {
      if (!grouped[exam.category]) grouped[exam.category] = [];
      grouped[exam.category].push(exam);
    }
    return grouped;
  }

  // ═══════════════════════════════════════════════════════════════
  // CHECKLIST BUILDER
  // ═══════════════════════════════════════════════════════════════

  /**
   * Builds a VisitExamChecklist for tracking exam completion during a consultation.
   *
   * @param patientId      Patient ID
   * @param positionCode   e.g. "FOREUR"
   * @param visitType      e.g. "pre_employment"
   * @param completedCodes Optional set of already-completed exam codes (for loading drafts)
   */
  buildChecklist(
    patientId: string,
    positionCode: string,
    visitType: ExamType,
    completedCodes: string[] = []
  ): VisitExamChecklist {
    const result = this.getProtocolForVisit(positionCode, visitType);
    const completedSet = new Set(completedCodes);

    const requiredItems: ExamChecklistItem[] = result.requiredExams.map((exam) => ({
      exam,
      isRequired: true,
      isCompleted: completedSet.has(exam.code),
    }));

    const recommendedItems: ExamChecklistItem[] = result.recommendedExams.map((exam) => ({
      exam,
      isRequired: false,
      isCompleted: completedSet.has(exam.code),
    }));

    const allItems = [...requiredItems, ...recommendedItems];
    const requiredTotal = requiredItems.length;
    const requiredDone = requiredItems.filter((i) => i.isCompleted).length;

    return {
      patientId,
      visitType,
      positionCode,
      generatedAt: new Date().toISOString(),
      items: allItems,
      completionRate: requiredTotal === 0 ? 100 : Math.round((requiredDone / requiredTotal) * 100),
      allRequiredDone: requiredTotal === 0 ? true : requiredDone === requiredTotal,
    };
  }

  /**
   * Updates a checklist item's completion status.
   * Returns a new checklist with updated completionRate.
   */
  updateChecklistItem(
    checklist: VisitExamChecklist,
    examCode: string,
    completed: boolean,
    resultSummary?: string,
    isAbnormal?: boolean,
    notes?: string
  ): VisitExamChecklist {
    const updated = checklist.items.map((item) =>
      item.exam.code === examCode
        ? { ...item, isCompleted: completed, resultSummary, isAbnormal, notes }
        : item
    );

    const requiredItems = updated.filter((i) => i.isRequired);
    const requiredDone = requiredItems.filter((i) => i.isCompleted).length;

    return {
      ...checklist,
      items: updated,
      completionRate:
        requiredItems.length === 0
          ? 100
          : Math.round((requiredDone / requiredItems.length) * 100),
      allRequiredDone: requiredDone === requiredItems.length,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // SEARCH
  // ═══════════════════════════════════════════════════════════════

  /**
   * Full-text search across sectors, departments and positions.
   * Returns matching positions with their full path context.
   */
  searchPositions(query: string): Array<{
    sector: OccSector;
    department: OccDepartment;
    position: OccPosition;
    matchScore: number;
  }> {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const results: Array<{
      sector: OccSector;
      department: OccDepartment;
      position: OccPosition;
      matchScore: number;
    }> = [];

    for (const sector of OCC_SECTORS_DATA) {
      for (const department of sector.departments) {
        for (const position of department.positions) {
          let score = 0;
          if (position.name.toLowerCase().includes(q)) score += 3;
          if (position.code.toLowerCase().includes(q)) score += 2;
          if (department.name.toLowerCase().includes(q)) score += 1;
          if (sector.name.toLowerCase().includes(q)) score += 1;
          if (score > 0) {
            results.push({ sector, department, position, matchScore: score });
          }
        }
      }
    }

    return results.sort((a, b) => b.matchScore - a.matchScore);
  }

  // ═══════════════════════════════════════════════════════════════
  // UTILITY HELPERS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Returns a breadcrumb string for a position, e.g.:
   * "Minier → Mine Souterraine → Foreur / Dynamiteur"
   */
  getPositionBreadcrumb(positionCode: string): string {
    const position = POSITIONS_BY_CODE[positionCode];
    if (!position) return positionCode;
    const department = DEPARTMENTS_BY_CODE[position.departmentCode];
    const sector = SECTORS_BY_CODE[position.sectorCode];
    return [sector?.name, department?.name, position.name].filter(Boolean).join(' → ');
  }

  /**
   * Returns a summary of mandatory exams by category for a protocol.
   * Useful for dashboard stats.
   */
  getProtocolExamSummary(
    positionCode: string,
    visitType: ExamType
  ): Record<string, { count: number; exams: string[] }> {
    const result = this.getProtocolForVisit(positionCode, visitType);
    const summary: Record<string, { count: number; exams: string[] }> = {};

    for (const exam of result.requiredExams) {
      if (!summary[exam.category]) summary[exam.category] = { count: 0, exams: [] };
      summary[exam.category].count++;
      summary[exam.category].exams.push(exam.label);
    }

    return summary;
  }

  /**
   * Checks whether all required exams for a protocol have been completed,
   * given a list of done exam codes.
   */
  isProtocolComplete(positionCode: string, visitType: ExamType, doneCodes: string[]): boolean {
    const result = this.getProtocolForVisit(positionCode, visitType);
    if (!result.hasProtocol) return true;
    const doneSet = new Set(doneCodes);
    return result.requiredExams.every((e) => doneSet.has(e.code));
  }

  /**
   * Returns the next exam to complete (first required, not yet done).
   */
  getNextPendingExam(
    positionCode: string,
    visitType: ExamType,
    doneCodes: string[]
  ): MedicalExamCatalogEntry | null {
    const result = this.getProtocolForVisit(positionCode, visitType);
    const doneSet = new Set(doneCodes);
    return result.requiredExams.find((e) => !doneSet.has(e.code)) ?? null;
  }
}

// ─── Export singleton shortcut ────────────────────────────────
export const protocolService = OccHealthProtocolService.getInstance();
