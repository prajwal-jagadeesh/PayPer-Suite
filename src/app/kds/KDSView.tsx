'use client';
import { useMemo } from 'react';
import { useCollection, useFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { updateOrderItemStatus } from '@/lib/orders-store';
import type { OrderItem, ItemStatus, Order, Table } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import ItemStatusBadge from '@/components/ItemStatusBadge';
import { Utensils, Truck } from 'lucide-react';
import { groupBy } from 'lodash';

const itemStatusActions: Record<ItemStatus, { next: ItemStatus; label: string } | null> = {
  'Pending': { next: 'Preparing', label: 'Start Preparing' },
  'Preparing': { next: 'Ready', label: 'Mark as Ready' },
  'Ready': null,
  'Served': null,
};

type GroupedKitchenItem = {
    menuItemId: string;
    name: string;
    quantity: number;
    items: (OrderItem & { originalOrderId: string })[];
}

type GroupedOrder = {
  orderId: string;
  orderType: 'dine-in' | 'online';
  tableId?: string;
  tableName?: string;
  platform?: string;
  platformOrderId?: string;
  orderTimestamp: number;
  items: GroupedKitchenItem[];
}

export default function KDSView() {
  const { firestore } = useFirebase();

  const ordersQuery = useMemo(() => query(
      collection(firestore, "orders"),
      where("status", "in", ['Confirmed', 'Preparing', 'Ready', 'Billed', 'Accepted', 'Food Ready']),
      orderBy("timestamp", "asc")
    ), [firestore]);

  const { data: allOrders, isLoading: isLoadingOrders } = useCollection<Order>(ordersQuery);
  const { data: tables, isLoading: isLoadingTables } = useCollection<Table>(collection(firestore, 'tables'));

  const tableMap = useMemo(() => new Map(tables?.map(t => [t.id, t.name])), [tables]);
  
  const kdsOrders = useMemo((): GroupedOrder[] => {
    if (!allOrders) return [];
    const activeKitchenOrders = allOrders.filter(order => {
        const relevantStatuses = ['Confirmed', 'Preparing', 'Ready', 'Billed', 'Accepted', 'Food Ready'];
        return relevantStatuses.includes(order.status);
    });

    const combinedOrders = activeKitchenOrders.map(order => {
        const kitchenItems = order.items
            .filter(item => item.kotStatus === 'Printed')
            .map(item => ({ ...item, originalOrderId: order.id }));
        
        const groupedByItem = groupBy(kitchenItems, 'menuItem.id');

        const groupedItems: GroupedKitchenItem[] = Object.entries(groupedByItem).map(([menuItemId, items]) => ({
            menuItemId,
            name: items[0].menuItem.name,
            quantity: items.length,
            items: items
        }));

        return {
            orderId: order.id,
            orderType: order.orderType,
            tableId: order.tableId,
            tableName: order.tableId ? tableMap.get(order.tableId) : undefined,
            platform: order.onlinePlatform,
            platformOrderId: order.platformOrderId,
            orderTimestamp: order.timestamp,
            items: groupedItems,
        };
    });

    return combinedOrders.filter(o => o.items.length > 0).sort((a,b) => a.orderTimestamp - b.orderTimestamp);

  }, [allOrders, tableMap]);

  const handleAction = (orderId: string, kotId: string, currentStatus: ItemStatus, currentItems: OrderItem[]) => {
    const action = itemStatusActions[currentStatus];
    if (action) {
      updateOrderItemStatus(firestore, orderId, kotId, action.next, currentItems);
    }
  };

  if (isLoadingOrders || isLoadingTables) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-[400px] w-full" />
        ))}
      </div>
    );
  }

  return (
     <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
      <AnimatePresence>
        {kdsOrders.length === 0 ? (
          <div className="col-span-full text-center py-24">
            <p className="text-muted-foreground text-lg">No active items in the kitchen.</p>
          </div>
        ) : (
          kdsOrders.map((order) => (
             <motion.div
              key={order.orderId}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }}
            >
              <Card className="h-full flex flex-col">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        {order.orderType === 'dine-in' ? <Utensils /> : <Truck />}
                        <div>
                            <CardTitle>{order.orderType === 'dine-in' ? order.tableName : `${order.platform} #${order.platformOrderId}`}</CardTitle>
                            <span className="text-xs font-normal text-muted-foreground -mt-1">
                                {formatDistanceToNow(new Date(order.orderTimestamp), { addSuffix: true })}
                            </span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-sm">
                      <div className="flex items-center font-semibold text-muted-foreground border-b pb-2">
                          <div className="flex-1">Item</div>
                          <div className="w-12 text-center">Qty</div>
                      </div>
                      <ul className="divide-y">
                        {order.items
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((groupedItem) => (
                          <li key={groupedItem.menuItemId} className="flex flex-col py-3">
                            <div className="flex items-center">
                                <div className="flex-1 font-medium">{groupedItem.name}</div>
                                <div className="w-12 text-center font-bold">{groupedItem.quantity}</div>
                            </div>
                            <div className="pl-4 mt-2 space-y-2">
                                {groupedItem.items.map(item => (
                                    <div key={item.kotId} className="flex items-center gap-2">
                                        <div className="w-24">
                                            <ItemStatusBadge status={item.itemStatus} />
                                        </div>
                                        <div className="flex-1">
                                          {itemStatusActions[item.itemStatus] && (
                                              <Button
                                                size="sm"
                                                onClick={() => {
                                                    const originalOrder = allOrders?.find(o => o.id === item.originalOrderId);
                                                    if(originalOrder) {
                                                      handleAction(item.originalOrderId, item.kotId!, item.itemStatus, originalOrder.items)
                                                    }
                                                  }
                                                }
                                                className="w-full h-7"
                                              >
                                                {itemStatusActions[item.itemStatus]?.label}
                                              </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
       </AnimatePresence>
    </div>
  );
}
