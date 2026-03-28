// Auto-deal generation helpers.
//
// Generates realistic-looking mock deals so the site always appears active.
// Called by the /api/refresh-deals endpoint (which can be wired to cron).
//
// CRON WIRING OPTIONS:
//
// 1. Vercel Cron — add to vercel.json:
//    { "crons": [{ "path": "/api/refresh-deals", "schedule": "0 */6 * * *" }] }
//
// 2. GitHub Actions — scheduled workflow hits the endpoint with curl.
//
// 3. Server crontab:
//    0 */6 * * * curl -s -H "Authorization: Bearer $ADMIN_TOKEN" https://yourdomain.com/api/refresh-deals

import { prisma } from "./db";
import { CATEGORIES } from "./categories";
import slugify from "slugify";

// --- Mock data pools for generating varied deals ---

const PRODUCTS = [
  { name: "Wireless Bluetooth Earbuds Pro", store: "Amazon", cat: "Tech", base: 89.99 },
  { name: "4K Ultra HD Streaming Device", store: "BestBuy", cat: "Tech", base: 49.99 },
  { name: "Smart Home Security Camera 2-Pack", store: "Walmart", cat: "Tech", base: 79.99 },
  { name: "Portable Bluetooth Speaker Waterproof", store: "Target", cat: "Tech", base: 59.99 },
  { name: "USB-C Fast Charging Hub 7-Port", store: "Amazon", cat: "Tech", base: 44.99 },
  { name: "Robot Vacuum Cleaner with Mapping", store: "BestBuy", cat: "Home", base: 399.99 },
  { name: "Bamboo Cutting Board Set 3-Piece", store: "Amazon", cat: "Home", base: 34.99 },
  { name: "Memory Foam Orthopedic Pillow", store: "Walmart", cat: "Home", base: 49.99 },
  { name: "Stainless Steel Water Bottle 32oz", store: "Target", cat: "Home", base: 24.99 },
  { name: "LED Desk Lamp with Wireless Charger", store: "Amazon", cat: "Home", base: 39.99 },
  { name: "Canvas Low-Top Sneakers", store: "Nike", cat: "Fashion", base: 74.99 },
  { name: "Polarized Sport Sunglasses", store: "Amazon", cat: "Fashion", base: 39.99 },
  { name: "Leather Minimalist Bifold Wallet", store: "Macy's", cat: "Fashion", base: 54.99 },
  { name: "Performance Fleece Quarter-Zip Pullover", store: "Target", cat: "Fashion", base: 44.99 },
  { name: "Water-Resistant Hiking Backpack 40L", store: "REI", cat: "Fashion", base: 89.99 },
  { name: "Magnetic Building Tiles 120-Piece Set", store: "Amazon", cat: "Toys", base: 49.99 },
  { name: "Remote Control Stunt Car Rechargeable", store: "Walmart", cat: "Toys", base: 34.99 },
  { name: "Wooden Train Set with Track 50 Pieces", store: "Target", cat: "Toys", base: 39.99 },
  { name: "Interactive Learning Tablet for Kids", store: "Amazon", cat: "Toys", base: 59.99 },
  { name: "Art Supply Kit 150-Piece Deluxe Set", store: "Macy's", cat: "Toys", base: 29.99 },
  { name: "Electric Coffee Grinder with Settings", store: "Amazon", cat: "Misc", base: 39.99 },
  { name: "Yoga Mat Premium Non-Slip 6mm", store: "Target", cat: "Misc", base: 29.99 },
  { name: "Digital Luggage Scale with Thermometer", store: "Amazon", cat: "Misc", base: 14.99 },
  { name: "Reusable Silicone Food Storage Bags 10-Pack", store: "Walmart", cat: "Misc", base: 19.99 },
  { name: "Multitool Pocket Knife Stainless Steel", store: "Amazon", cat: "Misc", base: 24.99 },
];

const DESCRIPTIONS: Record<string, string[]> = {
  Tech: [
    "Top-rated by thousands of shoppers. Limited-time price drop — grab it before the sale ends.",
    "Feature-packed and highly reviewed. One of the best deals we've seen this month.",
    "Customer favorite with 4.5+ star rating. Excellent value at this price point.",
    "Premium specs at a mid-range price. This discount rarely lasts long.",
  ],
  Home: [
    "Upgrade your space with this highly rated essential, now at its lowest price in weeks.",
    "A practical and stylish addition to any home. Hurry — limited stock at this price.",
    "Shoppers love this for everyday use. Snap up the savings while they last.",
    "Combines quality and value. This is a doorbuster-level discount on a household staple.",
  ],
  Fashion: [
    "A wardrobe essential at an unbeatable price. Free shipping on orders over $35.",
    "On-trend and versatile — perfect for everyday wear. Sizes are going fast.",
    "Premium materials meet an accessible price tag. One of our top fashion picks this week.",
    "Styled for comfort and durability. Grab your size before they sell out.",
  ],
  Toys: [
    "Kids and parents alike love this pick. Great for birthdays, holidays, or just because.",
    "Encourages creative, screen-free play. Marked down to one of the best prices we've tracked.",
    "A best-seller in its category. Ages 4+ recommended — hours of entertainment.",
    "Top toy pick with excellent reviews. Act fast — these deals don't stick around.",
  ],
  Misc: [
    "A handy everyday item at a seriously discounted price. Perfect for gifting or keeping.",
    "Highly rated by thousands of customers. Add-to-cart worthy at this price.",
    "Practical, well-made, and affordable — a triple threat deal you don't want to miss.",
    "A great value find. Limited-time markdown on a popular everyday essential.",
  ],
};

const STORE_DOMAINS: Record<string, string> = {
  Amazon: "https://www.amazon.com",
  BestBuy: "https://www.bestbuy.com",
  Walmart: "https://www.walmart.com",
  Target: "https://www.target.com",
  "Macy's": "https://www.macys.com",
  Nike: "https://www.nike.com",
  REI: "https://www.rei.com",
};

/** Pick a random element from an array */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Random integer between min and max (inclusive) */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Random discount between 30% and 70% */
function randomDiscount(): number {
  return randInt(30, 70);
}

/**
 * Generate and insert N new mock deals into the database.
 * Deals that already exist (by slug) are skipped.
 */
export async function generateDeals(count: number = 5): Promise<number> {
  let created = 0;

  for (let i = 0; i < count; i++) {
    const product = pick(PRODUCTS);
    const discount = randomDiscount();
    const salePrice = Math.round(product.base * (1 - discount / 100) * 100) / 100;
    const descs = DESCRIPTIONS[product.cat] || DESCRIPTIONS["Misc"];
    const description = pick(descs);
    const domain = STORE_DOMAINS[product.store] || "https://www.example.com";

    // Add a random suffix to avoid slug collisions for repeated products
    const suffix = randInt(100, 9999);
    const slug = slugify(`${product.name}-${suffix}`, { lower: true, strict: true });

    try {
      await prisma.deal.create({
        data: {
          slug,
          title: product.name,
          description,
          store: product.store,
          originalPrice: product.base,
          salePrice,
          discountPercent: discount,
          category: product.cat,
          imageUrl: `https://placehold.co/600x400/1e40af/ffffff?text=${encodeURIComponent(product.name.split(" ").slice(0, 2).join("+"))}`,
          finalUrl: `${domain}/search?q=${encodeURIComponent(product.name)}`,
          active: true,
        },
      });
      created++;
    } catch {
      // Unique constraint violation — slug exists, skip silently
    }
  }

  return created;
}

/**
 * Archive (soft-delete) deals older than `olderThanDays` days.
 * Archived deals have active = false and won't appear on the public site.
 */
export async function archiveOldDeals(olderThanDays: number = 30): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - olderThanDays);

  const result = await prisma.deal.updateMany({
    where: {
      active: true,
      createdAt: { lt: cutoff },
    },
    data: { active: false },
  });

  return result.count;
}