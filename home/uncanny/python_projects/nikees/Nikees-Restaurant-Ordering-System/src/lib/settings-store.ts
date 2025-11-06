'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { UpiDetails } from './types';

interface SettingsState {
  location: {
    latitude: string | null;
    longitude: string | null;
  };
  upiDetails: UpiDetails;
  hydrated: boolean;
  setLocation: (latitude: string, longitude: string) => void;
  setUpiDetails: (details: UpiDetails) => void;
  setHydrated: (hydrated: boolean) => void;
}

export const useSettingsStore = create(
  persist<SettingsState>(
    (set) => ({
      location: {
        latitude: null,
        longitude: null,
      },
      upiDetails: {
        upiId: '',
        restaurantName: "PayPer-Suite",
      },
      hydrated: false,
      setLocation: (latitude, longitude) =>
        set(() => ({
          location: { latitude, longitude },
        })),
      setUpiDetails: (details) => 
        set((state) => ({
            upiDetails: { ...state.upiDetails, ...details }
        })),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => localStorage),
       onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHydrated(true);
        }
      }
    }
  )
);
