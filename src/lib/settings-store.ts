'use client';
import { doc, setDoc } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase';
import type { UpiDetails } from './types';

export const setLocation = (firestore: any, latitude: string, longitude: string) => {
    const settingsRef = doc(firestore, 'settings', 'location');
    setDocumentNonBlocking(settingsRef, { latitude, longitude }, { merge: true });
};

export const setUpiDetails = (firestore: any, details: UpiDetails) => {
    const settingsRef = doc(firestore, 'settings', 'payment');
    setDocumentNonBlocking(settingsRef, details, { merge: true });
};
