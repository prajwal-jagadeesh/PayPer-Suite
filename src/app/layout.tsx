import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import PageHeader from '@/components/PageHeader';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from '@/firebase';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: "Nikee's Zara",
  description: 'A complete ordering system for Nikee\'s Zara Multicuisine Rooftop.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-body antialiased`}>
        <FirebaseClientProvider>
          <div className="relative flex min-h-screen w-full flex-col">
            <PageHeader />
            <main className="flex-1">{children}</main>
          </div>
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
