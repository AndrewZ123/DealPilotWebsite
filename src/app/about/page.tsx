import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About DealPilot",
  description:
    "Learn about DealPilot — a personal, curated deal radar run by an experienced deal hunter who tracks prices and compares offers across top retailers.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900">About DealPilot</h1>

      <div className="mt-6 space-y-5 text-gray-600 leading-relaxed">
        <p>
          DealPilot is a personal project born out of a simple frustration:
          finding genuinely good deals online shouldn't require hours of
          searching, comparing, and second-guessing. There are thousands of
          discounts happening at any given moment, but most people only see the
          ones backed by the biggest advertising budgets.
        </p>

        <p>
          That's where DealPilot comes in. Think of it as your personal
          deal radar — a curated, constantly-updated feed of the best
          discounts from across the web. We track prices at major retailers,
          compare offers, and surface only the deals that represent real savings.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 pt-2">
          What Makes Us Different
        </h2>

        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Human-curated.</strong> Every deal is evaluated for genuine
            value — not just flashy percentage signs. We look at real-world
            pricing history before recommending anything.
          </li>
          <li>
            <strong>Transparent.</strong> We clearly mark affiliate links and
            explain exactly how we earn money. No hidden agendas, no sneaky
            redirects.
          </li>
          <li>
            <strong>Broad coverage.</strong> From tech gadgets to home goods,
            fashion, toys, and beyond — we cast a wide net so you don't have
            to visit a dozen different sites.
          </li>
        </ul>

        <h2 className="text-xl font-semibold text-gray-900 pt-2">
          Our Commitment
        </h2>

        <p>
          We will never promote a deal we wouldn't consider buying
          ourselves. Our reputation depends on your trust, and we take that
          seriously. If a discount isn't genuinely good, it doesn't
          make the cut — plain and simple.
        </p>

        <p>
          Thank you for stopping by. Happy deal hunting!
        </p>
      </div>
    </div>
  );
}