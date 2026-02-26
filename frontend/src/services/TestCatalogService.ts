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
   * Get all active tests
   */
  getAllTests(): CatalogEntry[] {
    return Array.from(this.catalog.values()).filter(t => t.isActive);
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
