/**
 * TestCatalogService — Single source of truth for medical test catalog
 * 
 * Loads the backend test catalog on app startup and provides a cached,
 * queryable interface for the doctor consultation and protocol screens.
 * This bridges the gap between:
 *   1. Backend MedicalExamCatalog (source)
 *   2. Protocol-based tests (filtered)
 *   3. Hardcoded test lists (replaced)
 */

import ApiService from './ApiService';

export interface CatalogEntry {
  id: number;
  code: string;
  label: string;
  category: string;
  description?: string;
  requiresSpecialist: boolean;
  isActive: boolean;
}

/**
 * Fallback catalog used when the backend DB hasn't been seeded yet
 * or when the exam-catalog endpoint is unavailable.
 * Must stay in sync with backend migration 0028_seed_exam_catalog.py.
 */
const FALLBACK_EXAM_CATALOG: CatalogEntry[] = [
  { id: -1,  code: 'AUDIOGRAMME',             label: 'Audiométrie',                       category: 'fonctionnel',     description: 'Audiogramme tonal — seuils auditifs OG et OD.',              requiresSpecialist: false, isActive: true },
  { id: -2,  code: 'SPIROMETRIE',             label: 'Spirométrie',                       category: 'fonctionnel',     description: 'Exploration fonctionnelle respiratoire (CVF, VEMS).',         requiresSpecialist: false, isActive: true },
  { id: -3,  code: 'TEST_VISION_COMPLETE',    label: 'Examen de Vision Complet',          category: 'ophtalmologie',   description: 'Acuité visuelle, vision des couleurs, champ visuel.',        requiresSpecialist: false, isActive: true },
  { id: -4,  code: 'TEST_VISION_NOCTURNE',    label: 'Vision Nocturne',                   category: 'ophtalmologie',   description: 'Vision en conditions de faible luminosité.',                 requiresSpecialist: false, isActive: true },
  { id: -5,  code: 'RADIO_THORAX',            label: 'Radiographie Thoracique',           category: 'imagerie',        description: 'Radiographie standard — pneumoconioses, tuberculose.',       requiresSpecialist: true,  isActive: true },
  { id: -6,  code: 'ECG_REPOS',               label: 'ECG de Repos',                      category: 'cardiologique',   description: 'Électrocardiogramme 12 dérivations au repos.',               requiresSpecialist: false, isActive: true },
  { id: -7,  code: 'TEST_EFFORT',             label: "Épreuve d'Effort",                  category: 'cardiologique',   description: 'ECG effort — évaluation capacité cardiaque.',               requiresSpecialist: true,  isActive: true },
  { id: -8,  code: 'PLOMBEMIE',               label: 'Plombémie',                         category: 'biologique',      description: 'Dosage du plomb sanguin.',                                   requiresSpecialist: false, isActive: true },
  { id: -9,  code: 'COBALTEMIE',              label: 'Cobaltémie',                        category: 'biologique',      description: 'Dosage du cobalt sanguin.',                                  requiresSpecialist: false, isActive: true },
  { id: -10, code: 'NFS',                     label: 'Numération Formule Sanguine (NFS)', category: 'biologique',      description: 'Hémogramme complet.',                                        requiresSpecialist: false, isActive: true },
  { id: -11, code: 'BILAN_HEPATIQUE',         label: 'Bilan Hépatique',                   category: 'biologique',      description: 'Transaminases, gamma-GT, bilirubine.',                       requiresSpecialist: false, isActive: true },
  { id: -12, code: 'TEST_ALCOOL_DROGUE',      label: 'Dépistage Alcool & Substances',     category: 'toxicologie',     description: 'Alcootest et recherche de substances psychoactives.',        requiresSpecialist: false, isActive: true },
  { id: -13, code: 'EVALUATION_STRESS',       label: 'Évaluation Risques Psychosociaux',  category: 'psychosocial',    description: 'Questionnaire burn-out, stress au travail.',                 requiresSpecialist: false, isActive: true },
  { id: -14, code: 'EVALUATION_PSYCHOTECHNIQUE', label: 'Bilan Psychotechnique',          category: 'psychotechnique', description: 'Tests aptitude cognitive pour postes à risque.',             requiresSpecialist: true,  isActive: true },
  { id: -15, code: 'HEPATITE_B',              label: 'Dépistage Hépatite B',              category: 'biologique',      description: 'AgHBs + Anti-HBs — statut vaccinal.',                       requiresSpecialist: false, isActive: true },
  { id: -16, code: 'DEPISTAGE_TB',            label: 'Dépistage Tuberculose',             category: 'clinique',        description: 'IDR / IGRA pour secteurs à risque.',                         requiresSpecialist: false, isActive: true },
  { id: -17, code: 'QUESTIONNAIRE_SANTE',     label: 'Dépistage Santé Général',           category: 'clinique',        description: 'Questionnaire antécédents, mode de vie, plaintes.',          requiresSpecialist: false, isActive: true },
];

class TestCatalogService {
  private static instance: TestCatalogService;
  private catalog: Map<string, CatalogEntry> = new Map();
  private isLoaded = false;
  private loadPromise: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): TestCatalogService {
    if (!TestCatalogService.instance) {
      TestCatalogService.instance = new TestCatalogService();
    }
    return TestCatalogService.instance;
  }

  /**
   * Load the full test catalog from backend.
   * Can be called multiple times safely — only loads once, others wait.
   */
  async loadCatalog(): Promise<void> {
    // If already loaded, return immediately
    if (this.isLoaded) return;

    // If currently loading, wait for that promise
    if (this.loadPromise) return this.loadPromise;

    // Start the load
    this.loadPromise = this._doLoad();
    await this.loadPromise;
  }

  private async _doLoad(): Promise<void> {
    try {
      const api = ApiService.getInstance();
      const res = await api.get('/occupational-health/protocols/exam-catalog/');

      if (!res.success || !res.data) {
        console.warn('Failed to load test catalog:', res.error?.message);
        return;
      }

      // Handle both array and paginated responses
      const items = Array.isArray(res.data) ? res.data : (res.data.results || []);

      items.forEach((entry: any) => {
        const catalogEntry: CatalogEntry = {
          id: entry.id,
          code: entry.code,
          label: entry.label,
          category: entry.category,
          description: entry.description || '',
          requiresSpecialist: entry.requires_specialist || false,
          isActive: entry.is_active !== false,
        };
        this.catalog.set(entry.code, catalogEntry);
      });

      this.isLoaded = true;
      console.log(`✓ Loaded test catalog: ${this.catalog.size} tests`);
    } catch (e) {
      console.error('Error loading test catalog:', e);
    }
  }

  /**
   * Get a single test by code
   */
  getTest(code: string): CatalogEntry | undefined {
    return this.catalog.get(code);
  }

  /**
   * Get test by code with fallback to backend lookup
   */
  async getTestWithFallback(code: string): Promise<CatalogEntry | undefined> {
    // First check cache
    if (this.catalog.has(code)) {
      return this.catalog.get(code);
    }

    // Try to fetch from backend
    try {
      const api = ApiService.getInstance();
      const res = await api.get(`/occupational-health/protocols/exam-catalog/by_code/?code=${code}`);

      if (res.success && res.data) {
        const entry: CatalogEntry = {
          id: res.data.id,
          code: res.data.code,
          label: res.data.label,
          category: res.data.category,
          description: res.data.description || '',
          requiresSpecialist: res.data.requires_specialist || false,
          isActive: res.data.is_active !== false,
        };
        this.catalog.set(code, entry);
        return entry;
      }
    } catch (e) {
      console.warn(`Could not fetch test ${code}`, e);
    }

    return undefined;
  }

  /**
   * Get all active tests. Returns fallback defaults when catalog is empty
   * (DB not seeded yet, or catalog endpoint unavailable).
   */
  getAllTests(): CatalogEntry[] {
    const live = Array.from(this.catalog.values()).filter(t => t.isActive);
    if (live.length > 0) return live;
    // Fallback — mirrors the 0028_seed_exam_catalog data migration
    return FALLBACK_EXAM_CATALOG;
  }

  /**
   * Get tests by category
   */
  getByCategory(category: string): CatalogEntry[] {
    return Array.from(this.catalog.values()).filter(t => t.category === category && t.isActive);
  }

  /**
   * Get multiple tests by codes
   */
  getMultiple(codes: string[]): CatalogEntry[] {
    return codes
      .map(code => this.catalog.get(code))
      .filter((test): test is CatalogEntry => test !== undefined && test.isActive);
  }

  /**
   * Search tests by label (partial match, case-insensitive)
   */
  search(query: string): CatalogEntry[] {
    const q = query.toLowerCase();
    return Array.from(this.catalog.values()).filter(
      t => t.isActive && (t.label.toLowerCase().includes(q) || t.code.toLowerCase().includes(q))
    );
  }

  /**
   * Get all unique categories
   */
  getAllCategories(): string[] {
    const categories = new Set(Array.from(this.catalog.values()).map(t => t.category));
    return Array.from(categories).sort();
  }

  /**
   * Force refresh the catalog
   */
  async refresh(): Promise<void> {
    this.isLoaded = false;
    this.loadPromise = null;
    this.catalog.clear();
    await this.loadCatalog();
  }

  /**
   * Check if catalog is loaded
   */
  isReady(): boolean {
    return this.isLoaded;
  }

  /**
   * Get catalog size
   */
  getSize(): number {
    return this.catalog.size;
  }
}

export default TestCatalogService.getInstance();
