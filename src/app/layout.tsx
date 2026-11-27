import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { fraunces, dmSans } from '@/config/fonts';
import { PRODUCT_NAME } from '@/config/app';
import { TopoBackground } from '@/components/canvas/TopoBackground';
import { NavigationProgressBar } from '@/components/navigation/NavigationProgressBar';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { MotionInitializer } from '@/components/ui/MotionInitializer';
import { OverscrollController } from '@/components/ui/OverscrollController';
import { WARM_CSS_VARIABLES } from '@/styles/tokens';
import { getInterfaceBootScript } from '@/lib/preferences/interface';
import './globals.css';

export const metadata: Metadata = {
  title: `${PRODUCT_NAME} — Master Profile, Resume & Academic CV Builder`,
  description: 'Build your Resume and Academic CV from one reusable master profile.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${dmSans.variable}`}
      style={WARM_CSS_VARIABLES as React.CSSProperties}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: getInterfaceBootScript() }} />
      </head>
      <body className="antialiased min-h-screen relative">
        <MotionInitializer />
        {/* Navigation Top Progress Bar */}
        <Suspense fallback={null}>
          <NavigationProgressBar />
        </Suspense>
        {/* Persistent Topographic Canvas & Icon Layer */}
        <TopoBackground />
        <OverscrollController>
          <ToastProvider>{children}</ToastProvider>
        </OverscrollController>
      </body>
    </html>
  );
}
