import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Azeret_Mono as Geist_Mono } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { cn } from '@/libs/utils';
import './globals.css';

const geistSans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});
const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Code Migration App',
  description: 'Convert your old code to new code with ease',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={cn(
          geistSans.variable,
          geistMono.variable,
          'font-sans antialiased bg-gradient-to-br from-gray-900 via-black to-gray-800 min-h-screen'
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <div className="relative z-10 min-h-screen">
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
            <div className="relative z-20">{children}</div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
