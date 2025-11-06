'use client';
import { useMemo } from 'react';
import type { Order, OrderItem, DiscountType, PaymentMethod } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Clock, ChefHat, ArrowRightLeft, Pen, Trash2, Percent, BadgeIndianRupee, Printer, Wallet, CircleCheck, CreditCard, FileText, IndianRupee, QrCode } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import ItemStatusBadge from './ItemStatusBadge';
import { Button } from './ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { groupBy } from 'lodash';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { useFirebase } from '@/firebase';
import { applyDiscount, setPaymentMethod } from '@/lib/orders-store';


interface OrderCardProps {
  order: Order;
  children?: React.ReactNode;
  onServeItem?: (orderId: string, kotId: string) => void;
  showKotDetails?: boolean;
  tableName?: string;
  onSwitchTable?: () => void;
  onEditItems?: () => void;
  onCancelOrder?: () => void;
  showDiscountControls?: boolean;
  onReprintKot?: (kotId: string) => void;
}

const groupItemsForDisplay = (items: OrderItem[]) => {
    const grouped = new Map<string, OrderItem & { count: number }>();
    items.forEach(item => {
        const existing = grouped.get(item.menuItem.id);
        if (existing) {
            existing.count += 1;
        } else {
            grouped.set(item.menuItem.id, { ...item, count: 1 });
        }
    });
    return Array.from(grouped.values());
};


const ItemRow = ({ item, count, isNew }: { item: OrderItem; count: number; isNew: boolean }) => (
  <li className="flex justify-between items-center text-sm py-1">
    <span className="flex items-center">
      {count} x {item.menuItem.name}
    </span>
    {isNew 
      ? <Badge variant="outline" className="border-yellow-500 text-yellow-500 text-xs">New</Badge> 
      : <ItemStatusBadge status={item.itemStatus} />
    }
  </li>
);


export default function OrderCard({ 
    order, 
    children, 
    onServeItem, 
    showKotDetails = true, 
    tableName,
    onSwitchTable,
    onEditItems,
    onCancelOrder,
    showDiscountControls = false,
    onReprintKot,
}: OrderCardProps) {
  const { firestore } = useFirebase();
  
  const handleDiscountTypeChange = (type: DiscountType) => {
    applyDiscount(firestore, order, order.discount || 0, type);
  }
  
  const handleDiscountValueChange = (value: number) => {
     applyDiscount(firestore, order, value, order.discountType || 'percentage');
  }
  
  const handleSetPaymentMethod = (method: PaymentMethod | null) => {
    setPaymentMethod(firestore, order.id, method);
  }

  const newItems = groupItemsForDisplay(order.items.filter(i => i.kotStatus === 'New'));
  const printedItems = order.items.filter(i => i.kotStatus === 'Printed');
  
  const readyItems = onServeItem ? printedItems.filter(i => i.itemStatus === 'Ready') : [];
  
  const itemsForDisplay = !showKotDetails 
    ? groupItemsForDisplay(printedItems.filter(i => i.itemStatus !== 'Ready'))
    : [];
  
  const groupedPrintedItems = groupBy(printedItems, 'kotId');

  const showOrderDetailsHeader = !showKotDetails && itemsForDisplay.length > 0;
  const displayName = tableName || (order.onlinePlatform ? `${order.onlinePlatform} #${order.platformOrderId}`: `Table ${order.tableId}`);

  const subtotal = order.originalTotal || order.items.reduce((acc, item) => acc + item.menuItem.price * item.quantity, 0);

  const discountAmount = useMemo(() => {
    if (!order || !order.discount) return 0;
    const currentSubtotal = order.originalTotal || subtotal;
    if (order.discountType === 'percentage') {
        return (currentSubtotal * order.discount) / 100;
    }
    return order.discount;
  }, [subtotal, order]);


  return (
    <Card className="flex flex-col h-full shadow-md hover:shadow-lg transition-shadow duration-300 relative">
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div>
            <CardTitle className="text-lg font-headline">{displayName}</CardTitle>
             <div className="flex items-center text-sm text-muted-foreground mt-1">
                <Clock className="h-4 w-4 mr-1.5" />
                <span>{formatDistanceToNow(new Date(order.timestamp), { addSuffix: true })}</span>
            </div>
            <p className="text-xs text-muted-foreground font-semibold mt-1">ID: {order.id}</p>
        </div>
        <div className="flex gap-1">
          <TooltipProvider>
            {onSwitchTable && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onSwitchTable}><ArrowRightLeft className="h-4 w-4"/></Button>
                </TooltipTrigger>
                <TooltipContent><p>Switch Table</p></TooltipContent>
              </Tooltip>
            )}
             {onEditItems && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEditItems}><Pen className="h-4 w-4"/></Button>
                </TooltipTrigger>
                <TooltipContent><p>Edit New Items</p></TooltipContent>
              </Tooltip>
            )}
             {onCancelOrder && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onCancelOrder}><Trash2 className="h-4 w-4"/></Button>
                </TooltipTrigger>
                <TooltipContent><p>Cancel Order</p></TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-2 pt-2">
        {order.paymentMethod === 'cash_qr' && (
          <div className="bg-yellow-100 dark:bg-yellow-900/40 border border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-300 p-3 rounded-md mb-2">
              <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                      <QrCode className="h-5 w-5"/>
                      <p className="font-bold">Cash/QR Payment</p>
                  </div>
                  <Button size="sm" className="h-7" onClick={() => handleSetPaymentMethod(null)}>
                      <CircleCheck className="h-4 w-4 mr-1" />
                      Acknowledge
                  </Button>
              </div>
          </div>
        )}

        {order.paymentMethod === 'card' && (
          <div className="bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-300 p-3 rounded-md mb-2">
              <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5"/>
                      <p className="font-bold">Card Payment Requested</p>
                  </div>
                  <Button size="sm" className="h-7" onClick={() => handleSetPaymentMethod(null)}>
                      <CircleCheck className="h-4 w-4 mr-1" />
                      Acknowledge
                  </Button>
              </div>
          </div>
        )}

        {newItems.length > 0 && (
          <>
            <Separator />
            <h4 className="text-sm font-semibold text-center text-muted-foreground pt-2">New Items</h4>
            <ul className="space-y-1 text-sm divide-y">
              {newItems.map((item) => (
                <ItemRow key={item.menuItem.id} item={item} count={item.count} isNew={true} />
              ))}
            </ul>
          </>
        )}

        {showKotDetails && Object.keys(groupedPrintedItems).length > 0 && (
          <>
          <Separator />
          <Accordion type="single" collapsible className="w-full" defaultValue={Object.keys(groupedPrintedItems).length > 0 ? `item-${Object.keys(groupedPrintedItems)[0]}` : undefined}>
            <AccordionItem value="printed-kots" className="border-none">
              <AccordionTrigger className="text-sm font-semibold text-center text-muted-foreground justify-center py-2 hover:no-underline">
                Show Printed KOTs
              </AccordionTrigger>
              <AccordionContent>
                {Object.entries(groupedPrintedItems).map(([kotId, items]) => (
                  <div key={kotId} className="mb-4">
                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground mb-1">
                      <div className="flex items-center">
                        <ChefHat className="h-3 w-3 mr-1" /> {kotId}
                      </div>
                       {onReprintKot && (
                        <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => onReprintKot(kotId)}>
                          <Printer className="h-3 w-3 mr-1" />
                          Reprint
                        </Button>
                      )}
                    </div>
                    <ul className="space-y-1 text-sm divide-y border rounded-md p-2">
                       {groupItemsForDisplay(items).map((item) => (
                          <ItemRow key={item.menuItem.id} item={item} count={item.count} isNew={false}/>
                       ))}
                    </ul>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          </>
        )}
        
        {showOrderDetailsHeader && (
            <>
                <Separator />
                <h4 className="text-sm font-semibold text-center text-muted-foreground pt-2">Order Details</h4>
                <ul className="space-y-1 text-sm divide-y">
                    {itemsForDisplay.map((item) => (
                        <ItemRow key={item.menuItem.id} item={item} count={item.count} isNew={false} />
                    ))}
                </ul>
            </>
        )}

        {readyItems.length > 0 && onServeItem && (
          <>
            <Separator />
            <div className="space-y-2">
                <h4 className="text-sm font-semibold text-center text-muted-foreground pt-2">Ready to Serve</h4>
                <ul className="space-y-2">
                  {readyItems.map(item => (
                    <li key={item.kotId} className="flex justify-between items-center bg-green-50 dark:bg-green-900/20 p-2 rounded-md">
                      <span className="font-medium text-sm">{item.quantity} x {item.menuItem.name}</span>
                       <Button size="sm" className="h-8" onClick={() => onServeItem(order.id, item.kotId!)}>
                        Mark Served
                      </Button>
                    </li>
                  ))}
                </ul>
            </div>
          </>
        )}
      </CardContent>
      <CardFooter className="flex flex-col items-start pt-4 border-t">
        {showDiscountControls && (
          <div className="w-full mb-4">
              <Separator className="mb-4"/>
              <Label className="text-base font-semibold">Apply Discount</Label>
              <div className="flex gap-4 mt-2">
                  <RadioGroup defaultValue={order.discountType || 'percentage'} onValueChange={(v) => handleDiscountTypeChange(v as DiscountType)} className="flex items-center">
                      <div className="flex items-center space-x-2">
                          <RadioGroupItem value="percentage" id={`r1-${order.id}`} />
                          <Label htmlFor={`r1-${order.id}`} className="flex items-center gap-1"><Percent className="h-4 w-4"/> Percentage</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                          <RadioGroupItem value="amount" id={`r2-${order.id}`} />
                          <Label htmlFor={`r2-${order.id}`} className="flex items-center gap-1"><BadgeIndianRupee className="h-4 w-4"/> Amount</Label>
                      </div>
                  </RadioGroup>
                  <Input 
                      type="number" 
                      value={order.discount || 0}
                      onChange={(e) => handleDiscountValueChange(parseFloat(e.target.value) || 0)}
                      className="max-w-[120px] font-mono text-base h-9"
                      min={0}
                  />
              </div>
          </div>
        )}
        {(order.discount || 0) > 0 && (
          <div className="w-full space-y-1 text-sm">
            <div className='w-full flex justify-between text-muted-foreground'>
              <span>Subtotal</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
             <div className='w-full flex justify-between text-muted-foreground'>
                <span>Discount ({order.discountType === 'percentage' ? `${order.discount}%` : `₹${order.discount}`})</span>
                <span>- ₹{discountAmount.toFixed(2)}</span>
            </div>
          </div>
        )}
        <div className="w-full flex justify-between font-bold text-md mt-1 mb-4">
          <span>Total</span>
          <span>₹{order.total.toFixed(2)}</span>
        </div>
        {children && <div className="w-full">{children}</div>}
      </CardFooter>
    </Card>
  );
}
