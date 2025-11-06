'use client';
import { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirebase, useUser } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { addOrder, addItemsToOrder } from '@/lib/orders-store';
import type { MenuItem, OrderItem, Table, Order } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription } from '@/components/ui/sheet';
import { Plus, Minus, Trash2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { AnimatePresence, motion } from 'framer-motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import ItemStatusBadge from '@/components/ItemStatusBadge';

interface NewOrderSheetProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

const naturalSort = (a: Table, b: Table) => {
    const numA = parseInt(a.name.match(/\d+/)?.[0] || '0', 10);
    const numB = parseInt(b.name.match(/\d+/)?.[0] || '0', 10);
    return numA - numB;
};

const groupItemsForDisplay = (items: OrderItem[]) => {
    const grouped = new Map<string, OrderItem>();
    items.forEach(item => {
        const existing = grouped.get(item.menuItem.id);
        if (existing) {
            existing.quantity += item.quantity;
        } else {
            grouped.set(item.menuItem.id, { ...item, quantity: item.quantity });
        }
    });
    return Array.from(grouped.values());
};

export default function NewOrderSheet({ isOpen, onOpenChange }: NewOrderSheetProps) {
    const { firestore } = useFirebase();
    const { user } = useUser();
    
    const { data: allOrders } = useCollection<Order>(collection(firestore, 'orders'));
    const { data: tables } = useCollection<Table>(collection(firestore, 'tables'));
    const { data: allMenuItems } = useCollection<MenuItem>(collection(firestore, 'menuItems'));
    const { data: menuCategoriesData } = useCollection(collection(firestore, 'menuCategories'));
    
    const menuCategories = useMemo(() => menuCategoriesData?.map(c => c.name) || [], [menuCategoriesData]);

    const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
    const [cart, setCart] = useState<Omit<OrderItem, 'kotStatus' | 'itemStatus' | 'kotId'>[]>([]);
    const [activeTab, setActiveTab] = useState(menuCategories[0]);
    
    useEffect(() => {
        if(isOpen) {
            setSelectedTableId(null);
            setCart([]);
            if (menuCategories.length > 0) {
               setActiveTab(menuCategories[0]);
            }
        }
    }, [isOpen, menuCategories]);
    
    const sortedTables = useMemo(() => [...(tables || [])].sort(naturalSort), [tables]);
    const menuItems = useMemo(() => (allMenuItems || []).filter(item => item.available), [allMenuItems]);

    const activeOrder = useMemo(() => {
      if (!selectedTableId || !allOrders) return null;
      return allOrders.find(o => o.tableId === selectedTableId && o.status !== 'Paid' && o.status !== 'Cancelled');
    }, [allOrders, selectedTableId]);

    const addToCart = (item: MenuItem) => {
        setCart((prev) => {
            const existing = prev.find((i) => i.menuItem.id === item.id);
            if (existing) {
                return prev.map((i) =>
                    i.menuItem.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
                );
            }
            return [...prev, { menuItem: item, quantity: 1 }];
        });
    };

    const updateQuantity = (itemId: string, quantity: number) => {
        setCart((prev) => {
            if (quantity <= 0) {
                return prev.filter((i) => i.menuItem.id !== itemId);
            }
            return prev.map((i) =>
                i.menuItem.id === itemId ? { ...i, quantity } : i
            );
        });
    };

    const removeItemFromCart = (itemId: string) => {
        setCart(prev => prev.filter(i => i.menuItem.id !== itemId));
    };

    const cartTotal = useMemo(() => {
        return cart.reduce((acc, item) => acc + item.menuItem.price * item.quantity, 0);
    }, [cart]);

    const placeOrUpdateOrder = () => {
        if (cart.length === 0 || !selectedTableId || !user) return;

        if (activeOrder) {
            addItemsToOrder(firestore, activeOrder, cart);
        } else {
            addOrder(firestore, {
                tableId: selectedTableId,
                items: cart,
                userId: user.uid,
            });
        }
        onOpenChange(false);
    };

    const filteredMenuItems = useMemo(() => menuItems.filter(item => item.category === activeTab), [activeTab, menuItems]);
    const selectedTable = useMemo(() => tables?.find(t => t.id === selectedTableId), [tables, selectedTableId]);


    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent className="w-full max-w-none sm:max-w-none md:max-w-3xl lg:max-w-5xl flex flex-col">
                <SheetHeader>
                    <SheetTitle>Create or Add to Order</SheetTitle>
                    <SheetDescription>Select a table, add items, and send it to the kitchen.</SheetDescription>
                </SheetHeader>

                {!selectedTableId ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                        <h3 className="text-xl font-semibold mb-4">Select a Table to Begin</h3>
                        <p className="text-muted-foreground mb-6">Choose any table to start a new order or add to an existing one.</p>
                        <Select onValueChange={setSelectedTableId}>
                            <SelectTrigger className="w-[280px]">
                                <SelectValue placeholder="Choose a table..." />
                            </SelectTrigger>
                            <SelectContent>
                                {sortedTables.map(table => (
                                    <SelectItem key={table.id} value={table.id}>
                                        {table.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                ) : (
                    <div className="flex-1 grid grid-cols-3 gap-6 overflow-hidden pt-4">
                        {/* Menu Section */}
                        <div className="col-span-2 flex flex-col overflow-hidden">
                             <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col overflow-hidden">
                                <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${menuCategories.length > 0 ? menuCategories.length : 1}, minmax(0, 1fr))`}}>
                                {menuCategories.map((cat) => (
                                    <TabsTrigger key={cat} value={cat}>{cat}</TabsTrigger>
                                ))}
                                </TabsList>
                                 <div className="flex-1 overflow-y-auto mt-4">
                                     <AnimatePresence mode="wait">
                                        <motion.div
                                            key={activeTab}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ duration: 0.2 }}
                                            className="pr-4"
                                        >
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {filteredMenuItems.map((item) => (
                                                    <Card key={item.id} className="h-full flex flex-col overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
                                                        <CardHeader className="p-3 pb-0">
                                                            <CardTitle className="text-base">{item.name}</CardTitle>
                                                        </CardHeader>
                                                        <CardContent className="flex-1 p-3">
                                                        <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                                                        </CardContent>
                                                        <CardFooter className="flex justify-between items-center mt-auto p-3 bg-muted/50">
                                                        <span className="font-semibold text-sm">₹{item.price.toFixed(2)}</span>
                                                        <Button size="sm" onClick={() => addToCart(item)}>Add</Button>
                                                        </CardFooter>
                                                    </Card>
                                                ))}
                                            </div>
                                        </motion.div>
                                    </AnimatePresence>
                                </div>
                            </Tabs>
                        </div>
                        {/* Cart Section */}
                        <div className="col-span-1 flex flex-col bg-muted/50 rounded-lg overflow-hidden">
                             <div className="p-4 border-b">
                                <h3 className="font-bold text-lg">
                                   {activeOrder ? `Order for ${selectedTable?.name}` : `New Order (${selectedTable?.name})`}
                                </h3>
                                 <Button variant="link" className="p-0 h-auto text-xs" onClick={() => setSelectedTableId(null)}>Change table</Button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 divide-y">
                                {activeOrder && (
                                  <div className="pt-2">
                                    <h4 className="font-semibold text-md mb-2">Current Items</h4>
                                    <div className="space-y-2 text-sm">
                                      {groupItemsForDisplay(activeOrder.items).map((item, index) => (
                                          <div key={index} className="flex justify-between items-center">
                                              <span className="flex-1">{item.quantity} x {item.menuItem.name}</span>
                                              <ItemStatusBadge status={item.itemStatus} className="mx-2" />
                                          </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {cart.length === 0 ? (
                                    <p className="text-muted-foreground text-center pt-8 text-sm">{activeOrder ? 'Add more items from the menu.' : 'Cart is empty.'}</p>
                                ) : (
                                    <div className="pt-4">
                                      <h4 className="font-semibold text-md mb-2">{activeOrder ? 'New Items' : 'Cart'}</h4>
                                      {cart.map(item => (
                                          <div key={item.menuItem.id} className="flex items-start gap-3 py-2">
                                              <div className="flex-1">
                                                  <p className="font-semibold text-sm">{item.menuItem.name}</p>
                                                  <div className="flex items-center gap-2 mt-1">
                                                      <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateQuantity(item.menuItem.id, item.quantity - 1)}><Minus className="h-3 w-3" /></Button>
                                                      <span className="w-5 text-center">{item.quantity}</span>
                                                      <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateQuantity(item.menuItem.id, item.quantity + 1)}><Plus className="h-3 w-3" /></Button>
                                                  </div>
                                              </div>
                                              <div className="text-right">
                                                  <p className="font-semibold text-sm">₹{(item.menuItem.price * item.quantity).toFixed(2)}</p>
                                                   <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => removeItemFromCart(item.menuItem.id)}><Trash2 className="h-4 w-4"/></Button>
                                              </div>
                                          </div>
                                      ))}
                                    </div>
                                )}
                            </div>
                            {cart.length > 0 && (
                                <SheetFooter className="border-t p-4 bg-background mt-auto">
                                    <div className="w-full space-y-3">
                                        <div className="flex justify-between font-bold text-lg">
                                            <span>New Items Total</span>
                                            <span>₹{cartTotal.toFixed(2)}</span>
                                        </div>
                                         {activeOrder && (
                                          <div className="flex justify-between font-bold text-xl">
                                            <span>New Grand Total</span>
                                            <span>₹{(activeOrder.total + cartTotal).toFixed(2)}</span>
                                          </div>
                                        )}
                                        <Button size="lg" className="w-full" onClick={placeOrUpdateOrder} disabled={!user}>
                                            {activeOrder ? 'Add to Order' : 'Place New Order'}
                                        </Button>
                                    </div>
                                </SheetFooter>
                            )}
                        </div>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
