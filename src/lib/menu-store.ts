'use client';
import { collection, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import {
  setDocumentNonBlocking,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from '@/firebase';
import type { MenuItem } from './types';

export const addMenuItem = (firestore: any, item: Omit<MenuItem, 'id' | 'available'>) => {
    const menuItemsCollection = collection(firestore, 'menuItems');
    addDocumentNonBlocking(menuItemsCollection, { ...item, available: true });
};

export const updateMenuItem = (firestore: any, item: MenuItem) => {
    const menuItemRef = doc(firestore, 'menuItems', item.id);
    updateDocumentNonBlocking(menuItemRef, item);
};

export const deleteMenuItem = (firestore: any, id: string) => {
    const menuItemRef = doc(firestore, 'menuItems', id);
    deleteDocumentNonBlocking(menuItemRef);
};

export const toggleMenuItemAvailability = (firestore: any, id: string, currentAvailability: boolean) => {
    const menuItemRef = doc(firestore, 'menuItems', id);
    updateDocumentNonBlocking(menuItemRef, { available: !currentAvailability });
};
