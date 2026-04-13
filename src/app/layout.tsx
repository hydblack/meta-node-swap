import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@rainbow-me/rainbowkit/styles.css';
import '../styles/globals.css';
import { Providers } from './providers';
import Header from '../components/layout/Header';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MetaNode Swap',
  description: 'Decentralized Exchange powered by Uniswap V3',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen bg-black text-white flex flex-col`}>
        <Providers>
          <Header />
          <main className="flex-1 flex flex-col items-center justify-start py-8 px-4">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
