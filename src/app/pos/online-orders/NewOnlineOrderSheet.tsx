'use client';
import { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirebase, useUser } from '@/firebase';
import { collection } from 'firebase/firestore';
import { addOnlineOrder } from '@/lib/orders-store';
import type { MenuItem, OrderItem, OnlinePlatform } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription } from '@/components/ui/sheet';
import { Plus, Minus, Trash2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { AnimatePresence, motion } from 'framer-motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface NewOnlineOrderSheetProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

export default function NewOnlineOrderSheet({ isOpen, onOpenChange }: NewOnlineOrderSheetProps) {
    const { toast } = useToast();
    const { firestore } = useFirebase();
    const { user } = useUser();
    
    const { data: allMenuItems } = useCollection<MenuItem>(collection(firestore, 'menuItems'));
    const { data: menuCategoriesData } = useCollection(collection(firestore, 'menuCategories'));
    const menuCategories = useMemo(() => menuCategoriesData?.map(c => c.name) || [], [menuCategoriesData]);
    
    const [selectedPlatform, setSelectedPlatform] = useState<OnlinePlatform | null>(null);
    const [platformOrderId, setPlatformOrderId] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerAddress, setCustomerAddress] = useState('');
    const [cart, setCart] = useState<Omit<OrderItem, 'kotStatus' | 'itemStatus' | 'kotId'>[]>([]);
    const [activeTab, setActiveTab] = useState(menuCategories[0]);
    
    useEffect(() => {
        if(isOpen) {
            setSelectedPlatform(null);
            setCart([]);
            setPlatformOrderId('');
            setCustomerName('');
            setCustomerPhone('');
            setCustomerAddress('');
            if (menuCategories.length > 0) {
               setActiveTab(menuCategories[0]);
            }
        }
    }, [isOpen, menuCategories]);

    const menuItems = useMemo(() => (allMenuItems || []).filter(item => item.available), [allMenuItems]);

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

    const placeOrder = () => {
        if (cart.length === 0 || !selectedPlatform || !customerName || !user) {
            toast({
                variant: 'destructive',
                title: 'Missing Information',
                description: 'Please select a platform, enter customer name, and add items to the cart.'
            });
            return;
        }

        addOnlineOrder(firestore, {
            onlinePlatform: selectedPlatform,
            platformOrderId,
            customerDetails: {
                name: customerName,
                phone: customerPhone,
                address: customerAddress,
            },
            items: cart,
            userId: user.uid,
        });
        toast({
            title: 'Order Created',
            description: `New online order from ${selectedPlatform} has been added.`
        });
        onOpenChange(false);
    };

    const filteredMenuItems = useMemo(() => menuItems.filter(item => item.category === activeTab), [activeTab, menuItems]);

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent className="w-full max-w-none sm:max-w-none md:max-w-3xl lg:max-w-5xl flex flex-col">
                <SheetHeader>
                    <SheetTitle>Create Online Order</SheetTitle>
                    <SheetDescription>Manually enter an order from a delivery platform.</SheetDescription>
                </SheetHeader>

                <div className="flex-1 grid grid-cols-3 gap-6 overflow-hidden pt-4">
                    {/* Menu Section */}
                    <div className="col-span-2 flex flex-col overflow-hidden">
                        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col overflow-hidden">
                            <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${menuCategories.length > 0 ? menuCategories.length : 1}, minmax(0, 1fr))`}}>
                            {menuCategories.map((cat) => (
                                <TabsTrigger key={cat} value={cat}>{cat}</TabsTrigger>
                            ))}
                            </TabsList>
                            <div className="flex-1 overflow-y-auto mt-4 pr-4">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={activeTab}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
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

                    {/* Order Details & Cart Section */}
                    <div className="col-span-1 flex flex-col bg-muted/50 rounded-lg overflow-hidden">
                        <div className="p-4 border-b">
                            <h3 className="font-bold text-lg">Order Details</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                             {/* Customer Details Form */}
                             <div className="space-y-4">
                                <div>
                                    <Label htmlFor="platform">Platform</Label>
                                    <Select onValueChange={(v) => setSelectedPlatform(v as OnlinePlatform)} value={selectedPlatform || undefined}>
                                        <SelectTrigger id="platform">
                                            <SelectValue placeholder="Select Platform..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Zomato">Zomato</SelectItem>
                                            <SelectItem value="Swiggy">Swiggy</SelectItem>
                                            <SelectItem value="Others">Others</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="platform-order-id">Platform Order ID</Label>
                                    <Input id="platform-order-id" value={platformOrderId} onChange={e => setPlatformOrderId(e.target.value)} />
                                </div>
                                <div>
                                    <Label htmlFor="customer-name">Customer Name</Label>
                                    <Input id="customer-name" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                                </div>
                                <div>
                                    <Label htmlFor="customer-phone">Customer Phone</Label>
                                    <Input id="customer-phone" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
                                </div>
                                <div>
                                    <Label htmlFor="customer-address">Address</Label>
                                    <Textarea id="customer-address" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} />
                                </div>
                            </div>

                            <Separator />

                            {/* Cart */}
                            <div>
                                <h4 className="font-semibold text-md mb-2">Cart</h4>
                                {cart.length === 0 ? (
                                    <p className="text-muted-foreground text-center pt-8 text-sm">Cart is empty.</p>
                                ) : (
                                    <div className="space-y-2">
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
                        </div>

                        {cart.length > 0 && (
                            <SheetFooter className="border-t p-4 bg-background mt-auto">
                                <div className="w-full space-y-3">
                                    <div className="flex justify-between font-bold text-lg">
                                        <span>Total</span>
                                        <span>₹{cartTotal.toFixed(2)}</span>
                                    </div>
                                    <Button size="lg" className="w-full" onClick={placeOrder} disabled={!user}>
                                        Create Order
                                    </Button>
                                </div>
                            </SheetFooter>
                        )}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
