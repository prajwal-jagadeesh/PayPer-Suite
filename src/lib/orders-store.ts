'use client';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  Timestamp,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import {
  setDocumentNonBlocking,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from '@/firebase';

import type { Order, OrderStatus, OrderItem, ItemStatus, DiscountType, PaymentMethod } from './types';
import { useFirestore } from '@/firebase/provider';


export const addOrder = async (
  firestore: any,
  order: Omit<Order, 'id' | 'total' | 'timestamp' | 'status' | 'orderType' | 'items'> & { items: Omit<OrderItem, 'kotStatus' | 'itemStatus' | 'kotId'>[], userId: string }
) => {
  const itemsWithStatus: OrderItem[] = order.items.flatMap(i => 
    Array.from({ length: i.quantity }, () => ({
      ...i,
      quantity: 1,
      itemStatus: 'Pending' as ItemStatus,
      kotStatus: 'New' as const,
      kotId: `temp-${Date.now()}-${i.menuItem.id}`,
    }))
  );

  const total = itemsWithStatus.reduce((acc, item) => acc + item.menuItem.price, 0);

  const newOrder: Omit<Order, 'id'> = {
    ...order,
    orderType: 'dine-in',
    items: itemsWithStatus,
    status: 'New',
    timestamp: Date.now(),
    total,
    kotCounter: 0,
    createdAt: serverTimestamp(),
  };

  const ordersCollection = collection(firestore, 'orders');
  addDocumentNonBlocking(ordersCollection, newOrder);
};

export const addOnlineOrder = async (
  firestore: any,
  order: Omit<Order, 'id' | 'total' | 'timestamp' | 'status' | 'orderType' | 'items' | 'userId'> & { items: Omit<OrderItem, 'kotStatus' | 'itemStatus' | 'kotId'>[], userId: string }
) => {
    const itemsWithStatus: OrderItem[] = order.items.map(i => ({...i, itemStatus: 'Pending', kotStatus: 'New', kotId: `temp-online-${Date.now()}-${i.menuItem.id}`}));
    const total = itemsWithStatus.reduce((acc, item) => acc + item.menuItem.price * item.quantity, 0);

    const newOrder: Omit<Order, 'id'> = {
        ...order,
        orderType: 'online',
        items: itemsWithStatus,
        status: 'New',
        timestamp: Date.now(),
        total,
        kotCounter: 0,
        createdAt: serverTimestamp(),
    };
    const ordersCollection = collection(firestore, 'orders');
    addDocumentNonBlocking(ordersCollection, newOrder);
}


export const updateOrderStatus = (firestore: any, orderId: string, status: OrderStatus, currentOrder?: Order) => {
    const orderRef = doc(firestore, 'orders', orderId);
    if(currentOrder && currentOrder.orderType === 'online' && status === 'Accepted') {
        const updatedItems = currentOrder.items.map(item => ({
            ...item,
            itemStatus: 'Pending' as const,
            kotStatus: 'Printed' as const,
            kotId: `KOT-${(currentOrder.kotCounter || 0) + 1}-${item.menuItem.id}`
        }));
        updateDocumentNonBlocking(orderRef, { status, items: updatedItems, kotCounter: (currentOrder.kotCounter || 0) + 1 });
    } else {
        updateDocumentNonBlocking(orderRef, { status });
    }
};

export const addItemsToOrder = (firestore: any, order: Order, newItems: Omit<OrderItem, 'kotStatus' | 'itemStatus' | 'kotId'>[]) => {
  const orderRef = doc(firestore, 'orders', order.id);
  const itemsWithStatus: OrderItem[] = newItems.flatMap(i => 
    Array.from({ length: i.quantity }, () => ({
      ...i,
      quantity: 1,
      itemStatus: 'Pending' as ItemStatus,
      kotStatus: 'New' as const,
      kotId: `temp-${Date.now()}-${i.menuItem.id}`,
    }))
  );

  const updatedItems = [...order.items, ...itemsWithStatus];
  const newTotal = updatedItems.reduce((acc, item) => acc + item.menuItem.price, 0);

  updateDocumentNonBlocking(orderRef, { 
    items: updatedItems,
    total: newTotal,
    originalTotal: newTotal, // Reset discount on adding new items
    discount: 0,
    status: 'New',
    timestamp: Date.now(),
  });
};

export const updateOrderItemsKotStatus = (firestore: any, order: Order) => {
  const orderRef = doc(firestore, 'orders', order.id);
  let newKotCounter = order.kotCounter || 0;

  const updatedItems = order.items.map(item => {
    if (item.kotStatus === 'New') {
      newKotCounter++;
      return {
        ...item,
        kotStatus: 'Printed' as const,
        itemStatus: 'Pending' as const,
        kotId: `KOT-${newKotCounter}`,
      };
    }
    return item;
  });

  updateDocumentNonBlocking(orderRef, {
    items: updatedItems,
    kotCounter: newKotCounter,
    status: 'Confirmed'
  });
};

export const updateOrderItemStatus = (firestore: any, orderId: string, kotId: string, newStatus: ItemStatus, currentItems: OrderItem[]) => {
    const orderRef = doc(firestore, 'orders', orderId);
    const updatedItems = currentItems.map(item => item.kotId === kotId ? { ...item, itemStatus: newStatus } : item);
    updateDocumentNonBlocking(orderRef, { items: updatedItems });
};

export const updateItemQuantity = (firestore: any, order: Order, menuItemId: string, newQuantity: number) => {
  const orderRef = doc(firestore, 'orders', order.id);

  const currentQuantity = order.items.filter(item => item.menuItem.id === menuItemId && item.kotStatus === 'New').length;
  const diff = newQuantity - currentQuantity;

  let updatedItems = [...order.items];

  if (diff > 0) { // Add items
    const itemToAdd = order.items.find(item => item.menuItem.id === menuItemId);
    if (itemToAdd) {
      for (let i = 0; i < diff; i++) {
        updatedItems.push({
          ...itemToAdd,
          quantity: 1,
          kotStatus: 'New',
          itemStatus: 'Pending',
          kotId: `temp-${Date.now()}-${menuItemId}-${i}`
        });
      }
    }
  } else if (diff < 0) { // Remove items
    const itemsToRemove = Math.abs(diff);
    let removedCount = 0;
    updatedItems = updatedItems.filter(item => {
      if (item.menuItem.id === menuItemId && item.kotStatus === 'New' && removedCount < itemsToRemove) {
        removedCount++;
        return false;
      }
      return true;
    });
  }
  
  const newTotal = updatedItems.reduce((acc, item) => acc + item.menuItem.price * item.quantity, 0);

  updateDocumentNonBlocking(orderRef, {
      items: updatedItems,
      total: newTotal,
      originalTotal: newTotal,
      discount: 0,
  });
};

export const removeItem = (firestore: any, orderId: string, menuItemId: string, currentItems: OrderItem[]) => {
    const orderRef = doc(firestore, 'orders', orderId);
    const updatedItems = currentItems.filter(item => !(item.menuItem.id === menuItemId && item.kotStatus === 'New'));
    const newTotal = updatedItems.reduce((acc, item) => acc + item.menuItem.price * item.quantity, 0);
    updateDocumentNonBlocking(orderRef, { 
        items: updatedItems,
        total: newTotal,
        originalTotal: newTotal,
        discount: 0,
    });
};

export const switchTable = (firestore: any, orderId: string, newTableId: string, currentTableId: string) => {
    const orderRef = doc(firestore, 'orders', orderId);
    updateDocumentNonBlocking(orderRef, { tableId: newTableId, switchedFrom: currentTableId });
};

export const clearSwitchedFrom = (firestore: any, orderId: string) => {
    const orderRef = doc(firestore, 'orders', orderId);
    updateDocumentNonBlocking(orderRef, { switchedFrom: null });
}

export const applyDiscount = (firestore: any, order: Order, value: number, type: DiscountType) => {
    const orderRef = doc(firestore, 'orders', order.id);
    const originalTotal = order.originalTotal || order.total + (order.discountType === 'amount' ? (order.discount || 0) : (order.total / (1 - (order.discount || 0)/100)) * ((order.discount || 0)/100));

    let discountAmount = 0;
    if (type === 'percentage') {
        discountAmount = (originalTotal * value) / 100;
    } else {
        discountAmount = value;
    }

    const newTotal = originalTotal - discountAmount;
    
    updateDocumentNonBlocking(orderRef, {
        total: newTotal > 0 ? newTotal : 0,
        originalTotal,
        discount: value,
        discountType: type,
    });
};

export const setPaymentMethod = (firestore: any, orderId: string, method: PaymentMethod | null) => {
    const orderRef = doc(firestore, 'orders', orderId);
    updateDocumentNonBlocking(orderRef, { paymentMethod: method });
};
