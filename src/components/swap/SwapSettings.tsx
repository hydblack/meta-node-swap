'use client';

import { useState } from 'react';

interface SwapSettingsProps {
  slippage: number;
  onSlippageChange: (value: number) => void;
}

const PRESET_SLIPPAGES = [0.1, 0.5, 1.0];

export function SwapSettings({ slippage, onSlippageChange }: SwapSettingsProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-lg p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        title="Settings"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
          <path d="M12 1v3m0 16v3M4.22 4.22l2.12 2.12m11.32 11.32 2.12 2.12M1 12h3m16 0h3M4.22 19.78l2.12-2.12m11.32-11.32 2.12-2.12" />
        </svg>
        <span className="text-xs font-medium">{slippage}%</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-xl bg-gray-900 border border-gray-700/50 shadow-xl p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Transaction Settings</h3>
            <div className="mb-2">
              <p className="text-xs text-gray-400 mb-2">Slippage Tolerance</p>
              <div className="flex gap-2">
                {PRESET_SLIPPAGES.map((s) => (
                  <button
                    key={s}
                    onClick={() => { onSlippageChange(s); setOpen(false); }}
                    className={`flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors ${
                      slippage === s
                        ? 'bg-pink-500 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {s}%
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
