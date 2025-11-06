import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, ChefHat, Terminal } from 'lucide-react';
import Link from 'next/link';

const apps = [
  { name: 'Customer View', href: '/customer', icon: <User />, description: "Customer-facing menu and ordering." },
  { name: 'Captain View', href: '/captain', icon: <User />, description: "Manage orders and tables." },
  { name: 'KDS', href: '/kds', icon: <ChefHat />, description: "Kitchen Display System for chefs." },
  { name: 'POS', href: '/pos', icon: <Terminal />, description: "Point of Sale and billing." },
];

export default function Home() {
  return (
    <div className="container mx-auto p-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl lg:text-5xl font-bold font-headline">Welcome to PayPer-Suite</h1>
        <p className="text-lg text-muted-foreground mt-2">Select an application to launch.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {apps.map((app) => (
          <Card key={app.href} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
              <div className="p-3 bg-primary/10 rounded-md text-primary">
                {app.icon}
              </div>
              <CardTitle>{app.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">{app.description}</p>
              <Button asChild className="w-full">
                <Link href={app.href}>Launch App</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
