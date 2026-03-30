"use client";

import { useEffect, useState, useCallback } from "react";

const FALLBACK_ITEMS = [
  "🔥 DealPilot — Best deals updated every 15 minutes",
  "⚡ New deals dropping constantly — refresh to see the latest",
  "🏷️ We track prices so you don't have to",
];

interface TickerItem {
  text: string;
  href?: string;
}

export default function TickerBar() {
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<TickerItem[]>([]);

  const fetchTicker = useCallback(async () => {
    try {
      const res = await fetch("/api/ticker");
      if (!res.ok) return;
      const data = await res.json();
      if (data.items && Array.isArray(data.items) && data.items.length > 0) {
        setItems(data.items.map((text: string) => ({ text })));
      }
    } catch {
      // Silently fail — fallback items remain
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    fetchTicker();

    // Auto-refresh every 3 hours to match the ticker deal window
    const interval = setInterval(fetchTicker, 3 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchTicker]);

  if (!mounted) {
    return (
      <div className="bg-brand-800 text-white py-1.5 text-xs overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 text-center">
          🔥 Live deal alerts — savings updated every few minutes
        </div>
      </div>
    );
  }

  const displayItems: TickerItem[] =
    items.length > 0 ? items : FALLBACK_ITEMS.map((text) => ({ text }));

  // Duplicate for seamless loop
  const loopItems = [...displayItems, ...displayItems];

  // Adjust animation duration based on item count for consistent speed
  const duration = Math.max(20, displayItems.length * 4);

  return (
    <div className="bg-brand-800 text-white py-1.5 text-xs overflow-hidden relative">
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-brand-800 to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-brand-800 to-transparent z-10" />
      <div
        className="animate-ticker flex whitespace-nowrap"
        style={{ animationDuration: `${duration}s` }}
      >
        {loopItems.map((item, i) => (
          <span key={i} className="mx-8 inline-block">
            {item.href ? (
              <a
                href={item.href}
                className="hover:underline hover:text-brand-200 transition-colors"
              >
                {item.text}
              </a>
            ) : (
              item.text
            )}
          </span>
        ))}
      </div>
    </div>
  );
}