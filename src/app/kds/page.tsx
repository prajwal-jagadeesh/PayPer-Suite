'use client';
import { Suspense } from 'react';
import KDSView from './KDSView';
import { Skeleton } from '@/components/ui/skeleton';

export default function KDSPage() {
  return (
    <div className="flex-1">
      <header className="bg-card border-b">
        <div className="container mx-auto py-4">
          <h1 className="text-2xl font-bold font-headline">Kitchen Display System</h1>
        </div>
      </header>
      <main className="container mx-auto py-4">
        <Suspense fallback={<Skeleton className="h-[calc(100vh-12rem)] w-full" />}>
          <KDSView />
        </Suspense>
      </main>
    </div>
  );
}
