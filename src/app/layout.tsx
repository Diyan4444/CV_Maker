import type { Metadata } from 'next';
import { fraunces, dmSans } from '@/config/fonts';
import { PRODUCT_NAME } from '@/config/app';
import { ColorField } from '@/components/canvas/ColorField';
import './globals.css';

export const metadata: Metadata = {
  title: `${PRODUCT_NAME} — Master Profile, Resume & Academic CV Builder`,
  description: 'Build your Resume, Academic CV, and personal website from one reusable master profile.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${dmSans.variable}`}>
      <body className="antialiased min-h-screen relative">
        {/* Persistent Procedural ColorField Background */}
        <ColorField />
        {children}
      </body>
    </html>
  );
}
