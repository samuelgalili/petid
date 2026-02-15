/**
 * PetCoinPrice — Shows price in NIS + PetCoins equivalent.
 * Allows users to see their balance and apply coins at checkout.
 */

import { useMemo } from "react";
import { motion } from "framer-motion";

interface PetCoinPriceProps {
  priceNIS: number;
  compact?: boolean;
}

// 1 PetCoin = 0.10 NIS
const PETCOIN_VALUE = 0.10;

export function usePetCoins() {
  const balance = parseInt(localStorage.getItem("petid_coins") || "0", 10);
  
  const spendCoins = (amount: number) => {
    const current = parseInt(localStorage.getItem("petid_coins") || "0", 10);
    const newBalance = Math.max(0, current - amount);
    localStorage.setItem("petid_coins", String(newBalance));
    return newBalance;
  };

  const addCoins = (amount: number) => {
    const current = parseInt(localStorage.getItem("petid_coins") || "0", 10);
    localStorage.setItem("petid_coins", String(current + amount));
    return current + amount;
  };

  return { balance, spendCoins, addCoins };
}

export const PetCoinPrice = ({ priceNIS, compact = false }: PetCoinPriceProps) => {
  const { balance } = usePetCoins();
  
  const petCoinEquivalent = useMemo(() => Math.round(priceNIS / PETCOIN_VALUE), [priceNIS]);
  const discountFromCoins = useMemo(() => Math.min(balance * PETCOIN_VALUE, priceNIS * 0.2), [balance, priceNIS]); // Max 20% discount
  const coinsNeeded = useMemo(() => Math.round(discountFromCoins / PETCOIN_VALUE), [discountFromCoins]);

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-muted-foreground">🪙 {petCoinEquivalent}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-muted-foreground">או 🪙 {petCoinEquivalent} PetCoins</span>
      </div>
      {balance > 0 && discountFromCoins > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-1"
        >
          <span className="text-[10px] font-semibold text-primary">
            יש לך {balance} 🪙 — חסוך ₪{discountFromCoins.toFixed(0)}
          </span>
        </motion.div>
      )}
    </div>
  );
};
