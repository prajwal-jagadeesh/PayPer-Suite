'use client';
import { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirebase, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { collection, doc, query, where, orderBy } from 'firebase/firestore';
import {
  addTable,
  updateTable,
  deleteTable,
} from '@/lib/tables-store';
import {
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleMenuItemAvailability,
} from '@/lib/menu-store';
import {
  setLocation,
  setUpiDetails
} from '@/lib/settings-store';
import {
    updateOrderStatus,
    updateOrderItemsKotStatus,
    switchTable,
} from '@/lib/orders-store';
import type { Order, Table, MenuItem, OrderItem, UpiDetails } from '@/lib/types';
import OrderCard from '@/components/OrderCard';
import KOTPreviewSheet from './KOTPreviewSheet';
import BillPreviewSheet from './BillPreviewSheet';
import { Button } from '@/components/ui/button';
import { Printer, Eye, Plus, Trash2, Pen, Check, LayoutGrid, Settings, Utensils, ArrowRightLeft, BarChart2, Calendar as CalendarIcon, Clock, Truck, LocateFixed, IndianRupee, QrCode } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { groupBy } from 'lodash';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table as UiTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { addDays, format, startOfDay, endOfDay, startOfMonth, subDays } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from "@/hooks/use-toast";
import OnlineOrdersView from './online-orders/OnlineOrdersView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import QRCode from 'qrcode.react';


const naturalSort = (a: Table, b: Table) => {
    const numA = parseInt(a.name.match(/\d+/)?.[0] || '0', 10);
    const numB = parseInt(b.name.match(/\d+/)?.[0] || '0', 10);
    return numA - numB;
};

const LocationSettings = () => {
    const { toast } = useToast();
    const { firestore } = useFirebase();
    const { data: locationSettings } = useDoc(doc(firestore, 'settings', 'location'));
    
    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');

    useEffect(() => {
        if(locationSettings) {
            setLatitude(locationSettings.latitude || '');
            setLongitude(locationSettings.longitude || '');
        }
    }, [locationSettings]);

    const handleFetchLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLatitude(position.coords.latitude.toString());
                    setLongitude(position.coords.longitude.toString());
                    toast({
                        title: "Location Fetched",
                        description: "Coordinates have been updated.",
                    });
                },
                (error) => {
                    toast({
                        variant: 'destructive',
                        title: "Error Fetching Location",
                        description: error.message,
                    });
                }
            );
        } else {
            toast({
                variant: 'destructive',
                title: "Geolocation Not Supported",
                description: "Your browser does not support geolocation.",
            });
        }
    };
    
    const handleSave = () => {
        setLocation(firestore, latitude, longitude);
         toast({
            title: "Settings Saved",
            description: "Your location settings have been updated.",
        })
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Location Settings</CardTitle>
                <CardDescription>Set your restaurant's coordinates for mapping and other services.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="latitude">Latitude</Label>
                        <Input id="latitude" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="e.g. 12.9716" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="longitude">Longitude</Label>
                        <Input id="longitude" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="e.g. 77.5946" />
                    </div>
                </div>
                <Button variant="outline" onClick={handleFetchLocation}>
                    <LocateFixed className="mr-2 h-4 w-4" />
                    Fetch Automatically
                </Button>
            </CardContent>
            <CardFooter>
                <Button onClick={handleSave}>Save Location</Button>
            </CardFooter>
        </Card>
    )
}

const PaymentSettings = () => {
    const { toast } = useToast();
    const { firestore } = useFirebase();
    const { data: upiSettings } = useDoc(doc(firestore, 'settings', 'payment'));

    const [details, setDetails] = useState<UpiDetails>({ upiId: '', restaurantName: '' });

    useEffect(() => {
        if(upiSettings) {
            setDetails(upiSettings);
        }
    }, [upiSettings]);

    const handleSave = () => {
        setUpiDetails(firestore, details);
        toast({
            title: "Settings Saved",
            description: "Your payment settings have been updated.",
        });
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Payment Settings</CardTitle>
                <CardDescription>Configure UPI and other payment methods.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="upiId">UPI ID</Label>
                    <Input 
                        id="upiId" 
                        value={details.upiId || ''} 
                        onChange={(e) => setDetails(prev => ({...prev, upiId: e.target.value}))} 
                        placeholder="e.g. yourname@oksbi" 
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="restaurantName">Payee Name (for UPI)</Label>
                    <Input 
                        id="restaurantName" 
                        value={details.restaurantName || ''} 
                        onChange={(e) => setDetails(prev => ({...prev, restaurantName: e.target.value}))} 
                        placeholder="e.g. Nikee's Zara" 
                    />
                </div>
            </CardContent>
            <CardFooter>
                <Button onClick={handleSave}>Save Payment Settings</Button>
            </CardFooter>
        </Card>
    )
}


const SettingsManagement = () => {
    const { toast } = useToast();
    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <h2 className="text-3xl font-bold font-headline">Settings</h2>
            <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="payments">Payments</TabsTrigger>
                    <TabsTrigger value="printer">Printer</TabsTrigger>
                    <TabsTrigger value="location">Location</TabsTrigger>
                </TabsList>
                <TabsContent value="general" className="mt-6">
                    <div className="space-y-6">
                         <Card>
                            <CardHeader>
                                <CardTitle>Bill Customization</CardTitle>
                                <CardDescription>Customize the header, footer, and other elements of your printed bill.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="restaurant-name">Restaurant Name</Label>
                                    <Input id="restaurant-name" placeholder="e.g. Nikee's Zara" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="bill-header">Header Content</Label>
                                    <Textarea id="bill-header" placeholder="e.g. Address Line 1&#x0a;Phone: 123-456-7890" rows={3} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="bill-footer">Footer Content</Label>
                                    <Textarea id="bill-footer" placeholder="e.g. Thank you for visiting!&#x0a;WiFi: YourNetwork" rows={3} />
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                                        <div className="space-y-0.5">
                                            <Label htmlFor="show-gst">Show GST Number</Label>
                                            <CardDescription>Display your GSTIN on the bill.</CardDescription>
                                        </div>
                                        <Switch id="show-gst" />
                                    </div>
                                    <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                                        <div className="space-y-0.5">
                                            <Label htmlFor="show-fssai">Show FSSAI Number</Label>
                                            <CardDescription>Display your FSSAI license number.</CardDescription>
                                        </div>
                                        <Switch id="show-fssai" />
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button onClick={() => {
                                    toast({
                                        title: "Settings Saved",
                                        description: "Your bill customization settings have been updated.",
                                    })
                                }}>Save Bill Settings</Button>
                            </CardFooter>
                        </Card>
                         <Card>
                            <CardHeader>
                                <CardTitle>Template Design</CardTitle>
                                <CardDescription>Customize the look and feel of your printed KOTs and Bills. (Future Feature)</CardDescription>
                            </CardHeader>
                            <CardContent>
                            <div className="text-muted-foreground text-center py-8">
                                    Template customization options will be available here in a future update.
                            </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
                 <TabsContent value="payments" className="mt-6">
                    <PaymentSettings />
                </TabsContent>
                <TabsContent value="printer" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Printer Settings</CardTitle>
                            <CardDescription>Configure the default printer and page settings for KOTs and Bills.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="printer-select">Default Printer</Label>
                                <Select defaultValue="tvs-rp-3230">
                                    <SelectTrigger id="printer-select" className="w-full sm:w-[300px]">
                                        <SelectValue placeholder="Select a printer" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="tvs-rp-3230">TVS RP 3230 Thermal Printer</SelectItem>
                                        <SelectItem value="generic-80mm">Generic 80mm Thermal Printer</SelectItem>
                                        <SelectItem value="system">System Print Dialog</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Page Settings</Label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border rounded-md">
                                    <div className="space-y-2">
                                        <Label htmlFor="paper-width">Paper Width</Label>
                                        <Input id="paper-width" defaultValue="80mm" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="margin-top">Margin Top</Label>
                                        <Input id="margin-top" defaultValue="5mm" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="margin-bottom">Margin Bottom</Label>
                                        <Input id="margin-bottom" defaultValue="5mm" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="margin-sides">Margin Sides</Label>
                                        <Input id="margin-sides" defaultValue="3mm" />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button onClick={() => {
                                toast({
                                    title: "Settings Saved",
                                    description: "Your printer settings have been updated.",
                                })
                            }}>Save Printer Settings</Button>
                        </CardFooter>
                    </Card>
                </TabsContent>
                 <TabsContent value="location" className="mt-6">
                    <LocationSettings />
                </TabsContent>
            </Tabs>
        </div>
    );
};


const AnalyticsView = () => {
    const { firestore } = useFirebase();
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: subDays(new Date(), 6),
        to: new Date(),
    });

    const paidOrdersQuery = useMemoFirebase(() => {
        if (!dateRange?.from) return null;
        return query(
            collection(firestore, "orders"),
            where("status", "in", ["Paid", "Delivered"]),
            where("timestamp", ">=", startOfDay(dateRange.from).getTime()),
            where("timestamp", "<=", endOfDay(dateRange.to || dateRange.from).getTime())
        )
    }, [firestore, dateRange]);

    const { data: paidOrders } = useCollection<Order>(paidOrdersQuery);

    const totalRevenue = useMemo(() => (paidOrders || []).reduce((acc, order) => acc + order.total, 0), [paidOrders]);
    const totalOrders = paidOrders?.length || 0;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const itemSales = useMemo(() => {
        const sales: Record<string, { name: string; quantity: number; revenue: number }> = {};
        (paidOrders || []).forEach(order => {
            order.items.forEach(item => {
                if (!sales[item.menuItem.id]) {
                    sales[item.menuItem.id] = { name: item.menuItem.name, quantity: 0, revenue: 0 };
                }
                sales[item.menuItem.id].quantity += item.quantity;
                sales[item.menuItem.id].revenue += item.quantity * item.menuItem.price;
            });
        });
        return Object.values(sales).sort((a, b) => b.quantity - a.quantity);
    }, [paidOrders]);

    const top5ItemsByRevenue = useMemo(() => {
        return [...itemSales].sort((a,b) => b.revenue - a.revenue).slice(0, 5);
    }, [itemSales]);
    
    const chartConfig: ChartConfig = {};
    top5ItemsByRevenue.forEach((item, index) => {
        chartConfig[item.name] = {
            label: item.name,
            color: `hsl(var(--chart-${(index + 1) as 1 | 2 | 3 | 4 | 5}))`,
        };
    });

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Sales Analytics</CardTitle>
                    <CardDescription>Metrics based on completed and paid orders within the selected date range.</CardDescription>
                </CardHeader>
                <CardContent>
                   <div className="flex flex-wrap items-center gap-4">
                        <Popover>
                            <PopoverTrigger asChild>
                            <Button
                                id="date"
                                variant={"outline"}
                                className={cn(
                                "w-full sm:w-[300px] justify-start text-left font-normal",
                                !dateRange && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange?.from ? (
                                dateRange.to ? (
                                    <>
                                    {format(dateRange.from, "LLL dd, y")} -{" "}
                                    {format(dateRange.to, "LLL dd, y")}
                                    </>
                                ) : (
                                    format(dateRange.from, "LLL dd, y")
                                )
                                ) : (
                                <span>Pick a date</span>
                                )}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={dateRange?.from}
                                    selected={dateRange}
                                    onSelect={setDateRange}
                                    numberOfMonths={2}
                                />
                            </PopoverContent>
                        </Popover>
                         <div className="flex items-center gap-2">
                            <Button variant="outline" onClick={() => setDateRange({ from: new Date(), to: new Date() })}>Today</Button>
                            <Button variant="outline" onClick={() => setDateRange({ from: subDays(new Date(), 6), to: new Date() })}>Last 7 Days</Button>
                            <Button variant="outline" onClick={() => setDateRange({ from: startOfMonth(new Date()), to: endOfDay(new Date()) })}>This Month</Button>
                        </div>
                   </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Total Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">₹{totalRevenue.toFixed(2)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Total Orders</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{totalOrders}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Average Order Value</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">₹{averageOrderValue.toFixed(2)}</p>
                    </CardContent>
                </Card>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Top Selling Items</CardTitle>
                         <CardDescription>By quantity sold in the selected period.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <UiTable>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item</TableHead>
                                    <TableHead className="text-right">Quantity Sold</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {itemSales.slice(0,10).map(item => (
                                    <TableRow key={item.name}>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell className="text-right font-bold">{item.quantity}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </UiTable>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Top 5 Items by Revenue</CardTitle>
                         <CardDescription>By revenue generated in the selected period.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
                           <BarChart accessibilityLayer data={top5ItemsByRevenue}>
                             <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => value.slice(0, 3)} />
                              <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                             <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent />} />
                             <Bar dataKey="revenue" radius={4}>
                               {top5ItemsByRevenue.map((entry, index) => (
                                   <rect key={`cell-${index}`} fill={chartConfig[entry.name]?.color} />
                               ))}
                             </Bar>
                           </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

const MenuManagement = () => {
    const { firestore } = useFirebase();
    const { data: menuItems } = useCollection<MenuItem>(collection(firestore, 'menuItems'));
    const { data: menuCategoriesData } = useCollection(collection(firestore, 'menuCategories'));
    const menuCategories = useMemo(() => menuCategoriesData?.map(c => c.name) || [], [menuCategoriesData]);
    
    const [isFormOpen, setFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

    const groupedItems = useMemo(() => groupBy(menuItems, 'category'), [menuItems]);
    
    const openEditForm = (item: MenuItem) => {
        setEditingItem(item);
        setFormOpen(true);
    };

    const openAddForm = () => {
        setEditingItem(null);
        setFormOpen(true);
    };
    
    const handleSubmit = (formData: Omit<MenuItem, 'id' | 'available'>) => {
      if (editingItem) {
        updateMenuItem(firestore, { ...editingItem, ...formData });
      } else {
        addMenuItem(firestore, formData);
      }
      setFormOpen(false);
      setEditingItem(null);
    }
    
    return (
        <div className="max-w-7xl mx-auto">
             <Card>
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <CardTitle>Manage Menu</CardTitle>
                     <Button onClick={openAddForm}>
                        <Plus className="mr-2 h-4 w-4" /> Add Menu Item
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="space-y-8">
                        {(menuCategories || []).map(category => (
                            <div key={category}>
                                <h3 className="text-xl font-semibold mb-4 font-headline">{category}</h3>
                                <div className="border rounded-lg overflow-x-auto">
                                  <UiTable>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[40%] min-w-[200px]">Item</TableHead>
                                            <TableHead className="w-[15%]">Price</TableHead>
                                            <TableHead className="w-[20%]">Availability</TableHead>
                                            <TableHead className="text-right w-[25%]">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                     {(groupedItems[category] || []).map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <div className="font-medium">{item.name}</div>
                                                <div className="text-xs text-muted-foreground line-clamp-1">{item.description}</div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="font-mono">₹{item.price.toFixed(2)}</span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center space-x-2">
                                                    <Switch 
                                                        id={`available-${item.id}`} 
                                                        checked={item.available}
                                                        onCheckedChange={() => toggleMenuItemAvailability(firestore, item.id, item.available)}
                                                    />
                                                    <Label htmlFor={`available-${item.id}`} className="text-sm">
                                                        {item.available ? 'Available' : 'Unavailable'}
                                                    </Label>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex gap-2 justify-end">
                                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => openEditForm(item)}>
                                                        <Pen className="h-4 w-4"/>
                                                    </Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="destructive" size="icon" className="h-8 w-8">
                                                                <Trash2 className="h-4 w-4"/>
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                                <AlertDialogDescription>This will permanently delete '{item.name}'. This action cannot be undone.</AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => deleteMenuItem(firestore, item.id)}>Delete</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                     ))}
                                    </TableBody>
                                  </UiTable>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
            <MenuItemForm
                isOpen={isFormOpen}
                onOpenChange={setFormOpen}
                onSubmit={handleSubmit}
                item={editingItem}
                categories={menuCategories || []}
            />
        </div>
    )
};


const MenuItemForm = ({ isOpen, onOpenChange, onSubmit, item, categories }: { 
    isOpen: boolean; 
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: Omit<MenuItem, 'id' | 'available'>) => void;
    item: MenuItem | null;
    categories: string[];
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(0);
  const [category, setCategory] = useState('');

  useEffect(() => {
    if (item) {
      setName(item.name);
      setDescription(item.description);
      setPrice(item.price);
      setCategory(item.category);
    } else {
      setName('');
      setDescription('');
      setPrice(0);
      setCategory(categories[0] || '');
    }
  }, [item, categories, isOpen]);

  const handleFormSubmit = () => {
    if (name && category && price > 0) {
      onSubmit({ name, description, price, category });
    } else {
      // Basic validation feedback
      alert('Please fill in all required fields.');
    }
  };

  return (
     <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{item ? 'Edit Menu Item' : 'Add Menu Item'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">Description</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="price" className="text-right">Price</Label>
              <Input id="price" type="number" value={price} onChange={(e) => setPrice(parseFloat(e.target.value) || 0)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="text-right">Category</Label>
              <Select onValueChange={setCategory} value={category}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleFormSubmit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  )
};


const TableManagement = () => {
    const { firestore } = useFirebase();
    const { data: tables } = useCollection<Table>(collection(firestore, 'tables'));

    const [isAddDialogOpen, setAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setEditDialogOpen] = useState(false);
    const [isQRCodeDialogOpen, setQRCodeDialogOpen] = useState(false);
    
    const [tableName, setTableName] = useState('');
    
    const [tableToEdit, setTableToEdit] = useState<Table | null>(null);
    const [tableForQRCode, setTableForQRCode] = useState<Table | null>(null);

    const sortedTables = useMemo(() => [...(tables || [])].sort(naturalSort), [tables]);
    
    const [baseUrl, setBaseUrl] = useState('');
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setBaseUrl(window.location.origin);
        }
    }, []);

    const handleAddTable = () => {
        addTable(firestore, tableName);
        setTableName('');
        setAddDialogOpen(false);
    };

    const handleUpdateTable = () => {
        if (tableToEdit) {
            updateTable(firestore, tableToEdit.id, tableName);
            setTableName('');
            setEditDialogOpen(false);
            setTableToEdit(null);
        }
    };
    
    const openEditDialog = (table: Table) => {
      setTableToEdit(table);
      setTableName(table.name);
      setEditDialogOpen(true);
    }
    
    const openAddDialog = () => {
        setTableName('');
        setAddDialogOpen(true);
    }

    const openQRCodeDialog = (table: Table) => {
        setTableForQRCode(table);
        setQRCodeDialogOpen(true);
    };


    return (
        <div className="max-w-4xl mx-auto">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Manage Tables</CardTitle>
                    <Dialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={openAddDialog}>
                                <Plus className="mr-2 h-4 w-4" /> Add Table
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Add New Table</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="name" className="text-right">Name</Label>
                                    <Input id="name" value={tableName} onChange={(e) => setTableName(e.target.value)} className="col-span-3" autoFocus />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" onClick={handleAddTable}>Save Table</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {sortedTables.map(table => (
                            <Card key={table.id} className="flex flex-col h-28 transition-all duration-300 rounded-lg border-2 shadow-sm">
                              <CardHeader className="p-2 pb-0">
                                <CardTitle className="text-sm font-semibold">{table.name}</CardTitle>
                              </CardHeader>
                              <CardContent className="flex flex-col justify-end flex-1 p-2 text-xs text-muted-foreground" />
                              <CardFooter className="p-2 border-t flex gap-2">
                                  <Button variant="outline" size="icon" className="h-8 w-8 flex-1" onClick={() => openEditDialog(table)}>
                                    <Pen className="h-4 w-4" />
                                  </Button>
                                  <Button variant="outline" size="icon" className="h-8 w-8 flex-1" onClick={() => openQRCodeDialog(table)}>
                                    <QrCode className="h-4 w-4" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="destructive" size="icon" className="h-8 w-8 flex-1">
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>This will permanently delete '{table.name}'. This action cannot be undone.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => deleteTable(firestore, table.id)}>Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                              </CardFooter>
                            </Card>
                        ))}
                    </div>
                </CardContent>
            </Card>
            
             <Dialog open={isEditDialogOpen} onOpenChange={(isOpen) => {
                if (!isOpen) setTableToEdit(null);
                setEditDialogOpen(isOpen);
             }}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Edit Table</DialogTitle>
                        <DialogDescription>Update the details for this table.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                       <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-name" className="text-right">Name</Label>
                            <Input id="edit-name" value={tableName} onChange={(e) => setTableName(e.target.value)} className="col-span-3" autoFocus />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" onClick={handleUpdateTable}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

             <Dialog open={isQRCodeDialogOpen} onOpenChange={setQRCodeDialogOpen}>
                <DialogContent className="sm:max-w-xs">
                    <DialogHeader>
                        <DialogTitle>QR Code for {tableForQRCode?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="flex items-center justify-center p-4">
                        {tableForQRCode && baseUrl && (
                            <QRCode 
                                value={`${baseUrl}/customer?table=${tableForQRCode.name.replace(/\D/g, '')}`} 
                                size={200}
                                level={"H"}
                                includeMargin={true}
                            />
                        )}
                    </div>
                     <DialogFooter>
                      <Button variant="secondary" onClick={() => setQRCodeDialogOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

const useElapsedTime = (timestamp: number) => {
    const [elapsed, setElapsed] = useState('');

    useEffect(() => {
        const update = () => {
            const now = Date.now();
            const diff = now - timestamp;
            const minutes = Math.floor(diff / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            setElapsed(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
        };

        update();
        const interval = setInterval(update, 1000);

        return () => clearInterval(interval);
    }, [timestamp]);

    return elapsed;
};

const TableCard = ({ 
    table, 
    order, 
    onSelect, 
    onSwitch,
    onPrintAction
}: { 
    table: Table; 
    order?: Order; 
    onSelect: () => void; 
    onSwitch: () => void;
    onPrintAction?: () => void;
}) => {
    const elapsed = useElapsedTime(order?.timestamp || 0);

    const getStatus = () => {
        if (!order) return 'Vacant';
        if (order.status === 'Billed') return 'Billed';
        if (order.items.some(i => i.kotStatus === 'Printed')) return 'KOT Printed';
        return 'Running';
    };

    const status = getStatus();

    const statusStyles = {
        'Vacant': 'bg-card border-input',
        'Running': 'bg-[hsl(var(--status-running))] border-transparent',
        'KOT Printed': 'bg-[hsl(var(--status-kot))] border-transparent',
        'Billed': 'bg-[hsl(var(--status-billed))] border-transparent',
    };
    
    const hasPrintedKot = order?.items.some(i => i.kotStatus === 'Printed');

    return (
        <Card
            className={cn(
                "flex flex-col h-32 w-full transition-all duration-300 rounded-lg border-2 shadow-sm relative",
                order ? 'cursor-pointer hover:shadow-lg' : 'cursor-default',
                statusStyles[status]
            )}
        >
             <div className="absolute top-1 right-1 z-10 flex flex-col items-center gap-1">
                {order && (
                     <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-muted-foreground"
                        onClick={(e) => {
                            e.stopPropagation();
                            onSwitch();
                        }}
                    >
                        <ArrowRightLeft className="h-4 w-4" />
                    </Button>
                )}
            </div>
            <div onClick={onSelect} className="flex flex-col flex-1 h-full w-full p-2">
              <CardHeader className="p-0 text-center flex-initial">
                  <CardTitle className="text-base font-bold">{table.name}</CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 flex flex-col justify-center items-center text-center">
                  {status === 'Billed' && <p className="font-bold text-sm">Billed</p>}
                  {(status === 'Running' || status === 'KOT Printed') && (
                       <p className="text-xs font-semibold">{elapsed}</p>
                  )}
                   {order && <p className="text-sm font-bold mt-1">₹{order.total.toFixed(0)}</p>}
                   {!order && <div className="flex-1" />}
              </CardContent>
               <CardFooter className="p-0 flex justify-end items-center h-7">
                  {onPrintAction ? (
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-muted-foreground"
                        onClick={(e) => {
                            e.stopPropagation();
                            onPrintAction();
                        }}
                    >
                        <Printer className="h-4 w-4" />
                    </Button>
                  ) : (
                    hasPrintedKot && status !== 'Billed' && <Printer className="h-4 w-4 text-muted-foreground" />
                  )}
              </CardFooter>
            </div>
        </Card>
    );
};


const TableGridView = () => {
    const { firestore } = useFirebase();
    const { data: allOrders, isLoading: isLoadingOrders } = useCollection<Order>(collection(firestore, 'orders'));
    const { data: tables, isLoading: isLoadingTables } = useCollection<Table>(collection(firestore, 'tables'));

    const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
    const [switchingOrder, setSwitchingOrder] = useState<Order | null>(null);

    const [kotPreviewOrder, setKotPreviewOrder] = useState<Order | null>(null);
    const [billPreviewOrder, setBillPreviewOrder] = useState<Order | null>(null);
    const [kotPreviewMode, setKotPreviewMode] = useState<'new' | 'reprint'>('new');
    const [kotReprintId, setKotReprintId] = useState<string | null>(null);

    const ordersByTable = useMemo(() => (allOrders || []).reduce((acc, order) => {
      if (order.orderType === 'dine-in' && order.tableId) {
          const table = tables?.find(t => t.id === order.tableId);
          if (table && order.status !== 'Paid' && order.status !== 'Cancelled') {
          acc[table.id] = order;
          }
      }
      return acc;
    }, {} as Record<string, Order>), [allOrders, tables]);
    
    const sortedTables = useMemo(() => [...(tables || [])].sort(naturalSort), [tables]);

    const selectedOrder = selectedTableId ? ordersByTable[selectedTableId] : null;
    const selectedTable = selectedTableId ? tables?.find(t => t.id === selectedTableId) : null;
    
    const kotPreviewTable = kotPreviewOrder ? tables?.find(t => t.id === kotPreviewOrder.tableId) : null;
    const billPreviewTable = billPreviewOrder ? tables?.find(t => t.id === billPreviewOrder.tableId) : null;
    
    const needsKotPrint = (order: Order) => {
      return order.status === 'Confirmed' && order.items.some(item => item.kotStatus === 'New');
    }

    const canGenerateBill = (order: Order) => {
       const hasNewItems = order.items.some(i => i.kotStatus === 'New');
       if (hasNewItems) return false;
       const printedItems = order.items.filter(i => i.kotStatus === 'Printed');
       if (printedItems.length === 0 && order.status !== 'Billed') return false;
       if (order.status !== 'Billed') {
          return printedItems.every(item => item.itemStatus === 'Served');
       }
       return true;
    }

    const occupiedTableIds = useMemo(() => {
        const occupiedIds = new Set<string>();
        (allOrders || []).forEach(order => {
            if (switchingOrder && order.id === switchingOrder.id) return;
            if (order.orderType === 'dine-in' && order.tableId && order.status !== 'Paid' && order.status !== 'Cancelled') {
              occupiedIds.add(order.tableId);
            }
        });
        return occupiedIds;
    }, [allOrders, switchingOrder]);

    const vacantTables = useMemo(() => {
        return sortedTables.filter(t => !occupiedTableIds.has(t.id));
    }, [sortedTables, occupiedTableIds]);

    const handleSwitchTable = (newTableId: string) => {
        if (switchingOrder && switchingOrder.tableId) {
            switchTable(firestore, switchingOrder.id, newTableId, switchingOrder.tableId);
            setSwitchingOrder(null);
            setSelectedTableId(null);
        }
    };

    const handleConfirmKot = (order: Order) => {
        if (kotPreviewMode === 'new') {
            updateOrderItemsKotStatus(firestore, order);
        }
        setKotPreviewOrder(null);
        setKotReprintId(null);
    }

    const handleConfirmBill = (orderId: string) => {
        const order = allOrders?.find(o => o.id === orderId);
        if(order && order.status !== 'Billed') {
          updateOrderStatus(firestore, orderId, 'Billed');
        }
        setBillPreviewOrder(null);
    }

    const openKotPreview = (order: Order, mode: 'new' | 'reprint', kotId: string | null = null) => {
        setKotPreviewMode(mode);
        setKotPreviewOrder(order);
        setKotReprintId(kotId);
    }

  if (isLoadingOrders || isLoadingTables) {
    return (
        <div className="space-y-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8 2xl:grid-cols-9 gap-4">
                {[...Array(22)].map((_, j) => (
                  <Skeleton key={j} className="h-32" />
                ))}
            </div>
        </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8 2xl:grid-cols-9 gap-4">
        <AnimatePresence>
          {sortedTables.map((table) => {
            const order = ordersByTable[table.id];
            
            let printAction;
            if (order) {
              if (needsKotPrint(order)) {
                printAction = () => openKotPreview(order, 'new');
              } else if (canGenerateBill(order)) {
                printAction = () => setBillPreviewOrder(order);
              } else if (order.status === 'Billed') {
                printAction = () => setBillPreviewOrder(order);
              }
            }

            return (
              <motion.div
                key={table.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              >
               <TableCard 
                  table={table} 
                  order={order} 
                  onSelect={() => order && setSelectedTableId(table.id)}
                  onSwitch={() => order && setSwitchingOrder(order)}
                  onPrintAction={printAction}
               />
              </motion.div>
            )
          })}
         </AnimatePresence>
      </div>
      <Sheet open={!!selectedOrder} onOpenChange={(isOpen) => !isOpen && setSelectedTableId(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
           {selectedOrder && selectedTable && (
             <>
              <SheetHeader>
                <SheetTitle>Details for {selectedTable.name}</SheetTitle>
              </SheetHeader>
               <div className="py-4">
                  <OrderCard 
                    order={selectedOrder} 
                    tableName={selectedTable.name}
                    showDiscountControls={true}
                    onReprintKot={(kotId) => openKotPreview(selectedOrder, 'reprint', kotId)}
                  >
                    <div className="mt-4 flex flex-col space-y-2">
                      {needsKotPrint(selectedOrder) && (
                        <Button
                          variant="outline"
                          onClick={() => openKotPreview(selectedOrder, 'new')}
                          className="w-full"
                        >
                          <Printer className="mr-2 h-4 w-4" />
                          Print KOT
                        </Button>
                      )}
                      {canGenerateBill(selectedOrder) && (
                        <Button onClick={() => setBillPreviewOrder(selectedOrder)} className="w-full">
                          <Printer className="mr-2 h-4 w-4" />
                          {selectedOrder.status === 'Billed' ? 'Print Duplicate Bill' : 'Generate & Print Bill'}
                        </Button>
                      )}
                    </div>
                  </OrderCard>
               </div>
             </>
           )}
        </SheetContent>
      </Sheet>

      <Dialog open={!!switchingOrder} onOpenChange={(isOpen) => {
        if (!isOpen) setSwitchingOrder(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Switch from {switchingOrder && tables ? tables.find(t => t.id === switchingOrder.tableId)?.name : ''}</DialogTitle>
            <DialogDescription>
              Select a vacant table to move this order to.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
            {vacantTables.length > 0 ? (
                vacantTables.map(table => (
                <Button
                  key={table.id}
                  variant="outline"
                  onClick={() => handleSwitchTable(table.id)}
                >
                  {table.name}
                </Button>
              ))
            ) : (
              <p className="col-span-full text-center text-muted-foreground">No vacant tables available.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <KOTPreviewSheet
        order={kotPreviewOrder}
        table={kotPreviewTable}
        onClose={() => { setKotPreviewOrder(null); setKotReprintId(null); }}
        onConfirm={handleConfirmKot}
        mode={kotPreviewMode}
        kotId={kotReprintId}
      />
      <BillPreviewSheet
        order={billPreviewOrder}
        table={billPreviewTable}
        onClose={() => setBillPreviewOrder(null)}
        onConfirm={handleConfirmBill}
      />
    </>
  );
}


export default function POSView({
  isSidebarOpen,
  setSidebarOpen,
}: {
  isSidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}) {
  const { isUserLoading } = useUser();
  const [activeView, setActiveView] = useState('orders');

  if (isUserLoading) {
    return (
      <main className="flex-1 p-6">
         <Skeleton className="h-12 w-48 mb-6" />
          <div className="space-y-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8 2xl:grid-cols-9 gap-4">
                {[...Array(22)].map((_, j) => (
                  <Skeleton key={j} className="h-32" />
                ))}
            </div>
          </div>
      </main>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-theme(height.16))]">
      <Sheet open={isSidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-60 p-0 pt-8">
            <div className="flex h-full flex-col gap-4 py-4">
                <div className="grid items-start gap-2 px-4">
                    <h2 className="text-lg font-semibold">Navigation</h2>
                </div>
                <nav className="grid gap-2 px-4">
                    <Button
                        variant={activeView === 'orders' ? 'secondary' : 'ghost'}
                        className="w-full justify-start"
                        onClick={() => {
                          setActiveView('orders');
                          setSidebarOpen(false);
                        }}
                    >
                        <LayoutGrid className="h-5 w-5" />
                        <span className="ml-4">Active Orders</span>
                    </Button>
                    <Button
                        variant={activeView === 'onlineOrders' ? 'secondary' : 'ghost'}
                        className="w-full justify-start"
                        onClick={() => {
                          setActiveView('onlineOrders');
                          setSidebarOpen(false);
                        }}
                    >
                        <Truck className="h-5 w-5" />
                        <span className="ml-4">Online Orders</span>
                    </Button>
                    <Button
                        variant={activeView === 'menu' ? 'secondary' : 'ghost'}
                        className="w-full justify-start"
                        onClick={() => {
                          setActiveView('menu');
                          setSidebarOpen(false);
                        }}
                    >
                        <Utensils className="h-5 w-5" />
                        <span className="ml-4">Menu Management</span>
                    </Button>
                    <Button
                        variant={activeView === 'tables' ? 'secondary' : 'ghost'}
                        className="w-full justify-start"
                        onClick={() => {
                          setActiveView('tables');
                          setSidebarOpen(false);
                        }}
                    >
                        <Settings className="h-5 w-5" />
                        <span className="ml-4">Table Management</span>
                    </Button>
                     <Button
                        variant={activeView === 'analytics' ? 'secondary' : 'ghost'}
                        className="w-full justify-start"
                        onClick={() => {
                          setActiveView('analytics');
                          setSidebarOpen(false);
                        }}
                    >
                        <BarChart2 className="h-5 w-5" />
                        <span className="ml-4">Analytics</span>
                    </Button>
                     <Button
                        variant={activeView === 'settings' ? 'secondary' : 'ghost'}
                        className="w-full justify-start"
                        onClick={() => {
                          setActiveView('settings');
                          setSidebarOpen(false);
                        }}
                    >
                        <Printer className="h-5 w-5" />
                        <span className="ml-4">Settings</span>
                    </Button>
                </nav>
            </div>
        </SheetContent>
      </Sheet>

      <main className="flex-1 p-4 sm:p-6">
        {activeView === 'orders' && <TableGridView />}
        {activeView === 'onlineOrders' && <OnlineOrdersView />}
        {activeView === 'menu' && <MenuManagement />}
        {activeView === 'tables' && <TableManagement />}
        {activeView === 'analytics' && <AnalyticsView />}
        {activeView === 'settings' && <SettingsManagement />}
      </main>
    </div>
  );
}
