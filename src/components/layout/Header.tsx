'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { cn } from '../ui/utils';

const navItems = [
  { label: 'Swap', href: '/' },
  { label: 'Pool', href: '/pool' },
  { label: 'Positions', href: '/positions' },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-800/50 bg-black/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-pink-500 to-purple-600">
            <span className="text-sm font-bold text-white">M</span>
          </div>
          <span className="text-lg font-bold text-white">MetaNodeSwap</span>
        </Link>

        <nav className="flex items-center gap-1 rounded-xl bg-gray-900 p-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'rounded-lg px-4 py-1.5 text-sm font-medium transition-all',
                pathname === item.href
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-white'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <ConnectButton/>
      </div>
    </header>
  );
}
