'use client';

import { ChangeEvent } from 'react';

interface TokenInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

export function TokenInput({ label, value, onChange, readOnly }: TokenInputProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // 只允许数字和小数点
    if (/^\d*\.?\d*$/.test(val)) {
      onChange(val);
    }
  };

  return (
    <div className="rounded-xl bg-gray-800 p-4 mb-1">
      <div className="flex justify-between text-sm text-gray-400 mb-2">
        <span>{label}</span>
        <span>Balance: 0.00</span>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="text"
          inputMode="decimal"
          placeholder="0"
          value={value}
          onChange={handleChange}
          readOnly={readOnly}
          className="flex-1 bg-transparent text-2xl font-medium text-white placeholder-gray-600 outline-none min-w-0"
        />
        {/* Token Selector Placeholder */}
        <button className="flex items-center gap-2 rounded-xl bg-gray-700 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-600 transition-colors shrink-0">
          <div className="h-5 w-5 rounded-full bg-gradient-to-br from-blue-400 to-purple-500" />
          <span>Select</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>
      {value && (
        <div className="mt-1.5 text-xs text-gray-500">≈ $0.00</div>
      )}
    </div>
  );
}
