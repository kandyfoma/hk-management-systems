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
import { OccHealthApiService } from './OccHealthApiService';

export class OccHealthProtocolService {
  // ─── Singleton ───────────────────────────────────────────────
  private static _instance: OccHealthProtocolService;

  // ─── Live API cache ──────────────────────────────────────────
  private _sectors: OccSector[] = OCC_SECTORS_DATA;
  private _sectorsByCode: Record<string, OccSector> = SECTORS_BY_CODE;
  private _deptsByCode: Record<string, OccDepartment> = DEPARTMENTS_BY_CODE;
  private _positionsByCode: Record<string, OccPosition> = POSITIONS_BY_CODE;
  private _examCatalogMap: Record<string, MedicalExamCatalogEntry> = EXAM_CATALOG_MAP;
  private _examCatalog: MedicalExamCatalogEntry[] = MEDICAL_EXAM_CATALOG;
  private _loaded = false;

  static getInstance(): OccHealthProtocolService {
    if (!this._instance) this._instance = new OccHealthProtocolService();
    return this._instance;
  }

  // ═══════════════════════════════════════════════════════════════
  // BOOTSTRAP — call once at app start or when doctor updates data
  // ═══════════════════════════════════════════════════════════════

  /**
   * Pulls the full sector tree + exam catalog from the backend and
   * rebuilds all lookup maps.  Silently falls back to static data on error.
   */
  async loadFromApi(): Promise<{ loaded: boolean; error?: string }> {
    const api = OccHealthApiService.getInstance();

    const [treeResult, catalogResult] = await Promise.all([
      api.getSectorTree(),
      api.listExamCatalog({ is_active: true }),
    ]);

    if (treeResult.error && catalogResult.error) {
      // Backend unreachable — keep static fallback
      console.warn('[OccHealthProtocolService] API unavailable, using static data:', treeResult.error);
      return { loaded: false, error: treeResult.error };
    }

    // ── Rebuild sector/dept/position indexes ──────────────────
    if (!treeResult.error && treeResult.data.length > 0) {
      this._sectors = treeResult.data;
      this._sectorsByCode = {};
      this._deptsByCode = {};
      this._positionsByCode = {};

      for (const sector of this._sectors) {
        this._sectorsByCode[sector.code] = sector;
        for (const dept of sector.departments) {
          this._deptsByCode[dept.code] = dept;
          for (const pos of dept.positions) {
            this._positionsByCode[pos.code] = pos;
          }
        }
      }
    }

    // ── Rebuild exam catalog map ──────────────────────────────
    if (!catalogResult.error && catalogResult.data.length > 0) {
      this._examCatalog = catalogResult.data;
      this._examCatalogMap = {};
      for (const exam of this._examCatalog) {
        this._examCatalogMap[exam.code] = exam;
      }
    }

    this._loaded = true;
    return { loaded: true };
  }

  /** True after a successful loadFromApi() call */
  get isLoadedFromApi(): boolean { return this._loaded; }

  // ═══════════════════════════════════════════════════════════════
  // SECTOR QUERIES
  // ═══════════════════════════════════════════════════════════════

  /** Returns all sectors sorted by name */
  getAllSectors(): OccSector[] {
    return [...this._sectors].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }

  /** Returns a single sector by code, or undefined */
  getSectorByCode(code: string): OccSector | undefined {
    return this._sectorsByCode[code];
  }

  // ═══════════════════════════════════════════════════════════════
  // DEPARTMENT QUERIES
  // ═══════════════════════════════════════════════════════════════

  /** Returns all departments for a given sector code */
  getDepartmentsBySector(sectorCode: string): OccDepartment[] {
    const sector = this._sectorsByCode[sectorCode];
    if (!sector) return [];
    return [...sector.departments].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }

  /** Returns a single department by its code */
  getDepartmentByCode(code: string): OccDepartment | undefined {
    return this._deptsByCode[code];
  }

  // ═══════════════════════════════════════════════════════════════
  // POSITION QUERIES
  // ═══════════════════════════════════════════════════════════════

  /** Returns all positions within a department */
  getPositionsByDepartment(departmentCode: string): OccPosition[] {
    const dept = this._deptsByCode[departmentCode];
    if (!dept) return [];
    return [...dept.positions].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }

  /** Returns a single position by code */
  getPositionByCode(positionCode: string): OccPosition | undefined {
    return this._positionsByCode[positionCode];
  }

  /**
   * Returns all positions that have a protocol for a specific visit type.
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
    const position = this._positionsByCode[positionCode];
    const department = position ? this._deptsByCode[position.departmentCode] : undefined;
    const sector = position ? this._sectorsByCode[position.sectorCode] : undefined;

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
        .map((c) => this._examCatalogMap[c])
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
      this._positionsByCode[positionCode]?.protocols.find((p) => p.visitType === visitType) ?? null
    );
  }

  getAvailableVisitTypes(positionCode: string): ExamType[] {
    return (this._positionsByCode[positionCode]?.protocols.map((p) => p.visitType) ?? []) as ExamType[];
  }

  // ═══════════════════════════════════════════════════════════════
  // EXAM CATALOG QUERIES
  // ═══════════════════════════════════════════════════════════════

  /** Returns all exams in the catalog */
  getAllExams(): MedicalExamCatalogEntry[] {
    return this._examCatalog;
  }

  /** Returns a single exam by code */
  getExamByCode(code: string): MedicalExamCatalogEntry | undefined {
    return this._examCatalogMap[code];
  }

  /** Returns exams grouped by category */
  getExamsByCategory(): Record<string, MedicalExamCatalogEntry[]> {
    const grouped: Record<string, MedicalExamCatalogEntry[]> = {};
    for (const exam of this._examCatalog) {
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

    for (const sector of this._sectors) {
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
    const position = this._positionsByCode[positionCode];
    if (!position) return positionCode;
    const department = this._deptsByCode[position.departmentCode];
    const sector = this._sectorsByCode[position.sectorCode];
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
