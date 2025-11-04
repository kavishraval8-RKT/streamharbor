import type { Metadata } from "next";
import "./globals.css";
import DebugThumbnails from '@/components/DebugThumbnails';
import NetflixNav from '@/components/NetflixNav';

export const metadata: Metadata = {
  title: "StreamHarbor",
  description: "Your self-hosted video platform",
  icons: {
    icon: '/favicon.svg',
  },
};

import { AuthProvider } from './providers';
import { inter, montserrat } from './fonts';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${montserrat.variable}`}> 
      <body className="font-sans bg-[#141414] text-white min-h-screen" style={{ fontFamily: 'var(--font-inter), ui-sans-serif, system-ui' }}>
        <AuthProvider>
          {/* Netflix-style floating nav with scroll effect */}
          <NetflixNav />
          <main>
            {children}
            <DebugThumbnails />
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}