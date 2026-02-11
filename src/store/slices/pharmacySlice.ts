import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Drug } from '../../models/Drug';

interface InventoryItem {
  id: string;
  drugId: string;
  batchNumber: string;
  quantityInStock: number;
  unitCost?: number;
  sellingPrice?: number;
  supplier?: string;
  manufactureDate?: string;
  expiryDate?: string;
  reorderLevel: number;
  location?: string;
  status: 'active' | 'expired' | 'recalled';
  createdAt: string;
  updatedAt?: string;
}

interface PharmacyState {
  drugs: Drug[];
  inventory: InventoryItem[];
  selectedDrug: Drug | null;
  isLoading: boolean;
  error: string | null;
  filters: {
    searchTerm: string;
    category?: string;
    requiresPrescription?: boolean;
    isControlled?: boolean;
  };
  sortBy: 'name' | 'category' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}

const initialState: PharmacyState = {
  drugs: [],
  inventory: [],
  selectedDrug: null,
  isLoading: false,
  error: null,
  filters: {
    searchTerm: '',
  },
  sortBy: 'name',
  sortOrder: 'asc',
};

export const pharmacySlice = createSlice({
  name: 'pharmacy',
  initialState,
  reducers: {
    // Drug management
    setDrugs: (state, action: PayloadAction<Drug[]>) => {
      state.drugs = action.payload;
    },
    addDrug: (state, action: PayloadAction<Drug>) => {
      state.drugs.push(action.payload);
    },
    updateDrug: (state, action: PayloadAction<Drug>) => {
      const index = state.drugs.findIndex(drug => drug.id === action.payload.id);
      if (index !== -1) {
        state.drugs[index] = action.payload;
      }
    },
    removeDrug: (state, action: PayloadAction<string>) => {
      state.drugs = state.drugs.filter(drug => drug.id !== action.payload);
    },
    selectDrug: (state, action: PayloadAction<Drug | null>) => {
      state.selectedDrug = action.payload;
    },
    
    // Inventory management
    setInventory: (state, action: PayloadAction<InventoryItem[]>) => {
      state.inventory = action.payload;
    },
    addInventoryItem: (state, action: PayloadAction<InventoryItem>) => {
      state.inventory.push(action.payload);
    },
    updateInventoryItem: (state, action: PayloadAction<InventoryItem>) => {
      const index = state.inventory.findIndex(item => item.id === action.payload.id);
      if (index !== -1) {
        state.inventory[index] = action.payload;
      }
    },
    removeInventoryItem: (state, action: PayloadAction<string>) => {
      state.inventory = state.inventory.filter(item => item.id !== action.payload);
    },
    
    // UI state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    
    // Filters and sorting
    setFilters: (state, action: PayloadAction<Partial<PharmacyState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {
        searchTerm: '',
      };
    },
    setSorting: (state, action: PayloadAction<{ sortBy: PharmacyState['sortBy']; sortOrder: PharmacyState['sortOrder'] }>) => {
      state.sortBy = action.payload.sortBy;
      state.sortOrder = action.payload.sortOrder;
    },
  },
});

export const {
  setDrugs,
  addDrug,
  updateDrug,
  removeDrug,
  selectDrug,
  setInventory,
  addInventoryItem,
  updateInventoryItem,
  removeInventoryItem,
  setLoading,
  setError,
  clearError,
  setFilters,
  clearFilters,
  setSorting,
} = pharmacySlice.actions;