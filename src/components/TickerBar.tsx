"use client";

import { useEffect, useState } from "react";

const TICKER_ITEMS = [
  "🔥 Sony WH-1000XM5 just dropped to $248 — 38% off!",
  "⚡ New: Robot Vacuum with mapping for $199 (was $399)",
  "🏷️ Flash Deal: AirPods Pro 2 at lowest price this month",
  "🛒 Someone just snagged a 4K TV for $297 — 52% off",
  "💡 Trending: Smart Home bundles up to 60% off",
  "🎯 Hot: Leather bags from $29, limited stock",
  "📦 Free shipping alert on orders $35+ at select stores",
  "🏆 DealPilot saved shoppers an average of $47 this week",
  "⏰ Ending soon: 50% off all fitness gear",
  "✨ Just in: Summer fashion deals starting at $12",
];

export default function TickerBar() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="bg-brand-800 text-white py-1.5 text-xs overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 text-center">
          🔥 Live deal alerts — savings updated every few minutes
        </div>
      </div>
    );
  }

  const items = [...TICKER_ITEMS, ...TICKER_ITEMS]; // duplicate for seamless loop

  return (
    <div className="bg-brand-800 text-white py-1.5 text-xs overflow-hidden relative">
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-brand-800 to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-brand-800 to-transparent z-10" />
      <div className="animate-ticker flex whitespace-nowrap">
        {items.map((item, i) => (
          <span key={i} className="mx-8 inline-block">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}