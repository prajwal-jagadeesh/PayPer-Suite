'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useAuth, useFirebase } from '@/firebase';
import { useEffect } from 'react';
import { signInAnonymously } from 'firebase/auth';

interface SessionState {
  tableId: string | null;
  startTime: number | null;
  isValid: boolean;
  startSession: (tableId: string) => void;
  endSession: () => void;
}

const useSessionStoreInternal = create(
  persist<SessionState>(
    (set) => ({
      tableId: null,
      startTime: null,
      isValid: false,
      startSession: (tableId) => {
        const startTime = Date.now();
        set({
          tableId,
          startTime,
          isValid: true,
        });
      },
      endSession: () => {
        set({
          sessionId: null,
          tableId: null,
          startTime: null,
          isValid: false,
        });
      },
    }),
    {
      name: 'session-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export const useSessionStore = () => {
    const { auth, user, isUserLoading } = useFirebase();
    const { tableId, startTime, isValid, startSession, endSession } = useSessionStoreInternal();
    
    useEffect(() => {
        if (!isUserLoading && !user) {
            signInAnonymously(auth);
        }
    }, [isUserLoading, user, auth]);

    return { tableId, startTime, isValid, startSession, endSession, user };
}
