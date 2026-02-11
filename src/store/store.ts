import { configureStore } from '@reduxjs/toolkit';
import { authSlice } from './slices/authSlice';
import { pharmacySlice } from './slices/pharmacySlice';
import { hospitalSlice } from './slices/hospitalSlice';
import { settingsSlice } from './slices/settingsSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    pharmacy: pharmacySlice.reducer,
    hospital: hospitalSlice.reducer,
    settings: settingsSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;