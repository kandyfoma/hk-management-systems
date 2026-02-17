export interface Drug {
  id: string;
  name: string;
  genericName?: string;
  brandName?: string;
  manufacturer?: string;
  dosageForm: string; // tablet, syrup, injection, etc.
  strength: string;
  description?: string;
  indication?: string;
  contraindication?: string;
  sideEffects?: string;
  dosageInstructions?: string;
  activeIngredients: string[];
  category?: string;
  requiresPrescription: boolean;
  isControlled: boolean;
  unitPrice?: number;
  barcode?: string;
  createdAt: string; // ISO string
  updatedAt?: string; // ISO string
  metadata?: Record<string, any>;
}

export interface DrugCreate extends Omit<Drug, 'id' | 'createdAt'> {
  id?: string;
  createdAt?: string;
}

export interface DrugUpdate extends Partial<Omit<Drug, 'id' | 'createdAt'>> {
  updatedAt?: string;
}

export class DrugUtils {
  static getDisplayName(drug: Drug): string {
    return drug.brandName?.trim() || drug.name;
  }

  static getFullDescription(drug: Drug): string {
    const parts: string[] = [];
    parts.push(this.getDisplayName(drug));
    if (drug.strength) parts.push(drug.strength);
    if (drug.dosageForm) parts.push(drug.dosageForm);
    return parts.join(' ');
  }

  static hasActiveIngredients(drug: Drug): boolean {
    return drug.activeIngredients.length > 0;
  }

  static createDrug(data: DrugCreate): Drug {
    const now = new Date().toISOString();
    return {
      ...data,
      id: data.id || generateUUID(),
      createdAt: data.createdAt || now,
      updatedAt: now,
      activeIngredients: data.activeIngredients || [],
      requiresPrescription: data.requiresPrescription ?? false,
      isControlled: data.isControlled ?? false,
    };
  }

  static updateDrug(drug: Drug, updates: DrugUpdate): Drug {
    return {
      ...drug,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
  }
}

// Simple UUID generator for React Native
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}