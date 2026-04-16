'use client';

import { ChangeEvent, useRef, useState, useEffect } from 'react';
import { useReadContract, useAccount } from 'wagmi';
import { formatUnits } from 'viem';
import { TOKEN_LIST } from '@/lib/utils/constant';
import { ERC20_ABI } from '@/lib/contracts/abis';

export interface TokenOption {
  address: `0x${string}`;
  symbol: string;
  name: string;
  decimals: number;
}

interface TokenInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  selectedToken: TokenOption | null;
  onTokenChange: (token: TokenOption) => void;
  excludeAddress?: `0x${string}`;
  readOnly?: boolean;
  isLoading?: boolean;
}

export function TokenInput({
  label,
  value,
  onChange,
  selectedToken,
  onTokenChange,
  excludeAddress,
  readOnly = false,
  isLoading = false,
}: TokenInputProps) {
  const { address: userAddress } = useAccount();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const { data: balanceRaw } = useReadContract({
    address: selectedToken?.address,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!selectedToken && !!userAddress },
  });

  const formattedBalance =
    balanceRaw != null && selectedToken
      ? (() => {
          const n = Number(formatUnits(balanceRaw as bigint, selectedToken.decimals));
          if (n === 0) return '0';
          if (n < 0.0001) return '<0.0001';
          return n.toLocaleString('en-US', { maximumFractionDigits: 4 });
        })()
      : '—';

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/^\d*\.?\d*$/.test(val)) onChange(val);
  };

  const handleMax = () => {
    if (balanceRaw != null && selectedToken) {
      const maxVal = formatUnits(balanceRaw as bigint, selectedToken.decimals);
      onChange(maxVal);
    }
  };

  const tokenOptions = TOKEN_LIST.filter(
    (t) => t.address.toLowerCase() !== excludeAddress?.toLowerCase(),
  );

  return (
    <div className="rounded-2xl bg-gray-800 p-4 mb-1 border border-transparent hover:border-gray-700 transition-colors">
      <div className="flex justify-between text-sm text-gray-400 mb-2">
        <span>{label}</span>
        <div className="flex items-center gap-1">
          <span>
            Balance:{' '}
            <span className="text-gray-300 font-medium">{formattedBalance}</span>
          </span>
          {!readOnly && selectedToken && balanceRaw != null && (
            <button
              onClick={handleMax}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold ml-1 transition-colors"
            >
              MAX
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {isLoading ? (
          <div className="flex-1 h-8 rounded-lg bg-gray-700 animate-pulse" />
        ) : (
          <input
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={value}
            onChange={handleChange}
            readOnly={readOnly}
            className={`flex-1 bg-transparent text-2xl font-medium text-white placeholder-gray-600 outline-none min-w-0 ${
              readOnly ? 'cursor-default' : ''
            }`}
          />
        )}

        <div className="relative shrink-0" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-2 rounded-xl bg-gray-700 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-600 transition-colors"
          >
            {selectedToken ? (
              <>
                <span>{selectedToken.symbol}</span>
              </>
            ) : (
              <>
                <div className="h-5 w-5 rounded-full bg-gray-500 shrink-0" />
                <span className="text-gray-300">Select</span>
              </>
            )}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl bg-gray-900 border border-gray-700 shadow-xl z-50 overflow-hidden">
              <div className="p-2 text-xs text-gray-500 font-medium uppercase tracking-wider px-3 pt-3 pb-1">
                Select Token
              </div>
              <div className="max-h-52 overflow-y-auto">
                {tokenOptions.map((token) => {
                  const isSelected =
                    selectedToken?.address.toLowerCase() === token.address.toLowerCase();
                  return (
                    <button
                      key={token.address}
                      onClick={() => {
                        onTokenChange(token as TokenOption);
                        setDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-800 transition-colors text-left ${
                        isSelected ? 'bg-gray-800' : ''
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-white">
                          {token.symbol}
                        </div>
                        <div className="text-xs text-gray-500 truncate">{token.name}</div>
                      </div>
                      {isSelected && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          className="text-blue-400 shrink-0"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {value && (
        <div className="mt-1.5 text-xs text-gray-500">
          {selectedToken ? `${value} ${selectedToken.symbol}` : ''}
        </div>
      )}
    </div>
  );
}
