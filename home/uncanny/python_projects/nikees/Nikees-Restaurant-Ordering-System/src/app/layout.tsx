import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import PageHeader from '@/components/PageHeader';
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: "PayPer-Suite",
  description: 'A complete ordering system for your restaurant.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-body antialiased`}>
        <div className="relative flex min-h-screen w-full flex-col">
          <PageHeader />
          <main className="flex-1">{children}</main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
