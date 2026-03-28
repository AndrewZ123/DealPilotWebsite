/**
 * Seed script — populates the database with realistic sample deals.
 *
 * Run with:  npx tsx prisma/seed.ts
 *
 * This inserts a curated set of deals across multiple categories so the site
 * looks active immediately after first deployment. Existing deals are NOT
 * overwritten (upsert by slug).
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface SeedDeal {
  slug: string;
  title: string;
  description: string;
  store: string;
  originalPrice: number;
  salePrice: number;
  discountPercent: number;
  category: string;
  imageUrl: string;
  finalUrl: string;
}

const deals: SeedDeal[] = [
  {
    slug: "sony-wh-1000xm5-headphones",
    title: "Sony WH-1000XM5 Wireless Noise-Cancelling Headphones",
    description: "Industry-leading noise cancellation with Auto NC Optimizer. Crystal-clear hands-free calling with 4 beamforming microphones.",
    store: "BestBuy",
    originalPrice: 399.99,
    salePrice: 248.0,
    discountPercent: 38,
    category: "Tech",
    imageUrl: "https://placehold.co/600x400/1e40af/ffffff?text=Sony+XM5",
    finalUrl: "https://www.bestbuy.com/site/sony-wh-1000xm5",
  },
  {
    slug: "apple-ipad-air-m2",
    title: "Apple iPad Air 13-inch M2 Chip 256GB",
    description: "Supercharged by Apple M2 chip. Stunning 13-inch Liquid Retina display. All-day battery life.",
    store: "Amazon",
    originalPrice: 799.0,
    salePrice: 549.0,
    discountPercent: 31,
    category: "Tech",
    imageUrl: "https://placehold.co/600x400/1e40af/ffffff?text=iPad+Air",
    finalUrl: "https://www.amazon.com/dp/B0D2BFXRMQ",
  },
  {
    slug: "dyson-v15-detect-vacuum",
    title: "Dyson V15 Detect Absolute Cordless Vacuum",
    description: "Laser reveals microscopic dust. Piezo sensor counts and sizes particles. Up to 60 minutes of run time.",
    store: "Walmart",
    originalPrice: 749.99,
    salePrice: 449.99,
    discountPercent: 40,
    category: "Home",
    imageUrl: "https://placehold.co/600x400/1e40af/ffffff?text=Dyson+V15",
    finalUrl: "https://www.walmart.com/ip/dyson-v15-detect",
  },
  {
    slug: "ninja-air-fryer-xl",
    title: "Ninja AF161 Max XL Air Fryer 5.5 Quart",
    description: "Crisps, roasts, broils, bakes, reheats, and dehydrates. 7-in-1 functionality with ceramic-coated basket.",
    store: "Target",
    originalPrice: 149.99,
    salePrice: 79.99,
    discountPercent: 47,
    category: "Home",
    imageUrl: "https://placehold.co/600x400/1e40af/ffffff?text=Ninja+Fryer",
    finalUrl: "https://www.target.com/s/ninja+air+fryer+xl",
  },
  {
    slug: "levi-511-slim-jeans",
    title: "Levi's Men's 511 Slim Fit Jeans — Select Styles",
    description: "A modern slim with room to move. Sits below the waist with a slim fit from hip to ankle.",
    store: "Macy's",
    originalPrice: 69.50,
    salePrice: 29.99,
    discountPercent: 57,
    category: "Fashion",
    imageUrl: "https://placehold.co/600x400/1e40af/ffffff?text=Levis+511",
    finalUrl: "https://www.macys.com/shop/product/levis-mens-511-slim-fit-jeans",
  },
  {
    slug: "nike-pegasus-41",
    title: "Nike Air Zoom Pegasus 41 Men's Running Shoes",
    description: "Responsive React X foam delivers a smooth, snappy ride for everyday runs. Engineered mesh upper.",
    store: "Nike",
    originalPrice: 140.0,
    salePrice: 89.97,
    discountPercent: 36,
    category: "Fashion",
    imageUrl: "https://placehold.co/600x400/1e40af/ffffff?text=Nike+Pegasus",
    finalUrl: "https://www.nike.com/t/air-zoom-pegasus-41",
  },
  {
    slug: "lego-technic-porsche-gt3",
    title: "LEGO Technic Porsche 911 GT3 RS 1:8 Scale",
    description: "Detailed replica with 2,704 pieces. Features flat-6 engine with moving pistons, working steering, and opening doors.",
    store: "Amazon",
    originalPrice: 329.99,
    salePrice: 219.99,
    discountPercent: 33,
    category: "Toys",
    imageUrl: "https://placehold.co/600x400/1e40af/ffffff?text=LEGO+Porsche",
    finalUrl: "https://www.amazon.com/dp/B08T1ZNLJL",
  },
  {
    slug: "barbie-dreamhouse-2024",
    title: "Barbie DreamHouse 2024 Edition with Pool & Slide",
    description: "3-story dollhouse with 10 indoor and outdoor play areas, working elevator, pool with slide, and 75+ accessories.",
    store: "Walmart",
    originalPrice: 199.0,
    salePrice: 119.0,
    discountPercent: 40,
    category: "Toys",
    imageUrl: "https://placehold.co/600x400/1e40af/ffffff?text=Barbie+DreamHouse",
    finalUrl: "https://www.walmart.com/ip/barbie-dreamhouse-2024",
  },
  {
    slug: "samsung-65-inch-qled-4k",
    title: "Samsung 65-Inch Class QLED 4K Q80C Smart TV",
    description: "Quantum Dot technology for brilliant color. Direct Full Array backlighting. Built-in streaming apps.",
    store: "BestBuy",
    originalPrice: 1299.99,
    salePrice: 699.99,
    discountPercent: 46,
    category: "Tech",
    imageUrl: "https://placehold.co/600x400/1e40af/ffffff?text=Samsung+65+QLED",
    finalUrl: "https://www.bestbuy.com/site/samsung-65-class-qled-4k",
  },
  {
    slug: "instant-pot-pro-plus",
    title: "Instant Pot Pro Plus 6-Quart 9-in-1 Wi-Fi Smart Cooker",
    description: "9 appliances in 1. Wi-Fi enabled for remote monitoring. Includes sterilizer, sous vide, and yogurt maker.",
    store: "Amazon",
    originalPrice: 169.99,
    salePrice: 89.95,
    discountPercent: 47,
    category: "Home",
    imageUrl: "https://placehold.co/600x400/1e40af/ffffff?text=Instant+Pot",
    finalUrl: "https://www.amazon.com/dp/B09QJYGFHY",
  },
  {
    slug: "ray-ban-aviator-classic",
    title: "Ray-Ban Classic Aviator Sunglasses — Gold/Green",
    description: "Iconic teardrop shape with crystal green G-15 lenses. Adjustable nose pads for a custom fit.",
    store: "Sunglass Hut",
    originalPrice: 163.0,
    salePrice: 109.99,
    discountPercent: 32,
    category: "Fashion",
    imageUrl: "https://placehold.co/600x400/1e40af/ffffff?text=Ray-Ban+Aviator",
    finalUrl: "https://www.sunglasshut.com/ray-ban-aviator-classic",
  },
  {
    slug: "melissa-doug-wooden-blocks",
    title: "Melissa & Doug 100-Piece Wooden Building Blocks Set",
    description: "Classic solid wood blocks in 4 bright colors and 9 shapes. Encourages creative play and motor skills.",
    store: "Target",
    originalPrice: 24.99,
    salePrice: 14.99,
    discountPercent: 40,
    category: "Toys",
    imageUrl: "https://placehold.co/600x400/1e40af/ffffff?text=Wooden+Blocks",
    finalUrl: "https://www.target.com/s/melissa+doug+wooden+blocks",
  },
  {
    slug: "logitech-mx-master-3s",
    title: "Logitech MX Master 3S Wireless Performance Mouse",
    description: "8K DPI track-anywhere sensor. MagSpeed electromagnetic scrolling. Ergonomic design with quiet clicks.",
    store: "Amazon",
    originalPrice: 99.99,
    salePrice: 69.99,
    discountPercent: 30,
    category: "Tech",
    imageUrl: "https://placehold.co/600x400/1e40af/ffffff?text=MX+Master+3S",
    finalUrl: "https://www.amazon.com/dp/B09HM94VDS",
  },
  {
    slug: "kitchenaid-stand-mixer",
    title: "KitchenAid Artisan Series 5-Quart Tilt-Head Stand Mixer",
    description: "10 optimized speeds and a powerful motor. Compatible with 10+ optional hub-powered attachments.",
    store: "Macy's",
    originalPrice: 449.99,
    salePrice: 299.99,
    discountPercent: 33,
    category: "Home",
    imageUrl: "https://placehold.co/600x400/1e40af/ffffff?text=KitchenAid+Mixer",
    finalUrl: "https://www.macys.com/shop/product/kitchenaid-artisan-5-qt-stand-mixer",
  },
  {
    slug: "crocs-classic-clog",
    title: "Crocs Classic Unisex Clog — Select Colors",
    description: "Lightweight Iconic Crocs Comfort. Ventilation ports add breathability and help shed water and debris.",
    store: "Crocs",
    originalPrice: 49.99,
    salePrice: 29.99,
    discountPercent: 40,
    category: "Fashion",
    imageUrl: "https://placehold.co/600x400/1e40af/ffffff?text=Crocs+Classic",
    finalUrl: "https://www.crocs.com/classic-clog",
  },
  {
    slug: "playstation-5-console-bundle",
    title: "PlayStation 5 Console (Disc) + DualSense + 2 Games Bundle",
    description: "Includes PS5 console with 4K Blu-ray drive, extra DualSense controller, and two hit game titles.",
    store: "GameStop",
    originalPrice: 559.99,
    salePrice: 449.99,
    discountPercent: 20,
    category: "Tech",
    imageUrl: "https://placehold.co/600x400/1e40af/ffffff?text=PS5+Bundle",
    finalUrl: "https://www.gamestop.com/ps5-console-bundle",
  },
];

async function main() {
  console.log("🌱 Seeding deals…");

  for (const deal of deals) {
    await prisma.deal.upsert({
      where: { slug: deal.slug },
      update: {},
      create: deal,
    });
  }

  console.log(`✅ Seeded ${deals.length} deals.`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });