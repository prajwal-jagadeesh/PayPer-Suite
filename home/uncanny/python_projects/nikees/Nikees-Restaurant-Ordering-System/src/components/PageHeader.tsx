'use client';
import Link from 'next/link';
import { UtensilsCrossed } from 'lucide-react';

export default function PageHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <UtensilsCrossed className="h-6 w-6 text-primary" />
          <span className="hidden font-bold sm:inline-block text-lg">
            PayPer-Suite
          </span>
        </Link>
      </div>
    </header>
  );
}
