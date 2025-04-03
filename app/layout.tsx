// import { useEffect } from 'react';
// import * as pdfjsLib from 'pdfjs-dist';
import { Toaster } from 'sonner';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';

import { ThemeProvider } from '@/components/theme-provider';
import { ClientLayoutWrapper } from '@/app/_components/client-layout-wrapper';
import { cn } from '@/lib/utils';

import './globals.css';

export const metadata: Metadata = {
  // metadataBase: new URL('https://chat.vercel.ai'),
  title: 'Scriptantino',
  description: 'Scriptantino',
};

export const viewport = {
  maximumScale: 1, // Disable auto-zoom on mobile Safari
};

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const LIGHT_THEME_COLOR = 'hsl(0 0% 100%)';
const DARK_THEME_COLOR = 'hsl(240deg 10% 3.92%)';
const THEME_COLOR_SCRIPT = `\
(function() {
  var html = document.documentElement;
  var meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  function updateThemeColor() {
    var isDark = html.classList.contains('dark');
    meta.setAttribute('content', isDark ? '${DARK_THEME_COLOR}' : '${LIGHT_THEME_COLOR}');
  }
  var observer = new MutationObserver(updateThemeColor);
  observer.observe(html, { attributes: true, attributeFilter: ['class'] });
  updateThemeColor();
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={cn(inter.variable)}>
      <head>
        <Script id="theme-color-script" strategy="beforeInteractive">
          {THEME_COLOR_SCRIPT}
        </Script>
      </head>
      <body className={cn('font-sans antialiased')}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ClientLayoutWrapper>
            {children}
            <Toaster position="top-center" />
          </ClientLayoutWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
