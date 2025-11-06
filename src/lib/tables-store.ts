'use client';
import { collection, doc, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import {
  addDocumentNonBlocking,
  deleteDocumentNonBlocking,
  updateDocumentNonBlocking,
} from '@/firebase';
import type { Table } from './types';

export const addTable = (firestore: any, name: string) => {
    if(!name.trim()) return;
    const tablesCollection = collection(firestore, 'tables');
    addDocumentNonBlocking(tablesCollection, { name: name.trim() });
};

export const deleteTable = (firestore: any, id: string) => {
    const tableRef = doc(firestore, 'tables', id);
    deleteDocumentNonBlocking(tableRef);
};

export const updateTable = (firestore: any, id: string, newName: string) => {
    if(!newName.trim()) return;
    const tableRef = doc(firestore, 'tables', id);
    updateDocumentNonBlocking(tableRef, { name: newName.trim() });
};
