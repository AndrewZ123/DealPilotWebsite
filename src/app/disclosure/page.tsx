import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Affiliate Disclosure",
  description:
    "Read DealPilot's affiliate disclosure. Learn how we use affiliate links, how we earn commissions, and our commitment to transparency.",
};

export default function DisclosurePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900">Affiliate Disclosure</h1>
      <p className="mt-2 text-sm text-gray-400">Last updated: March 2026</p>

      <div className="mt-6 space-y-5 text-gray-600 leading-relaxed">
        <p>
          DealPilot is an independent deal-curation website. Some of the links
          on our site are affiliate links. That means if you click on one of
          those links and make a purchase, we may receive a small commission
          from the retailer or marketplace — at absolutely no additional cost to
          you.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 pt-2">
          How Affiliate Links Work
        </h2>
        <p>
          When you click a "View Deal" or "Go to Deal" button on DealPilot,
          you are first directed through our tracking system (the{" "}
          <code className="rounded bg-gray-100 px-1 text-sm">/go/</code> path
          in the URL). This lets us count clicks so we can measure which deals
          are most popular. After that, you are redirected to the retailer's
          website where you can complete your purchase as normal.
        </p>
        <p>
          In some cases, the link includes a tracking parameter that tells the
          retailer you came from DealPilot. If you buy something during that
          session, the retailer may pay us a referral fee. This is a common
          practice across deal sites, review sites, and comparison tools.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 pt-2">
          What This Means for You
        </h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>You never pay more.</strong> The price you see on the
            retailer's site is exactly the same whether you came from
            DealPilot or went there directly.
          </li>
          <li>
            <strong>We only recommend deals we think are good.</strong> Our
            editorial process is independent. A merchant paying us a commission
            does not influence whether we list a deal or where it appears.
          </li>
          <li>
            <strong>Prices and availability can change.</strong> We do our best
            to keep deals up to date, but retailers change prices frequently.
            Always verify the final price on the retailer's site before
            purchasing.
          </li>
        </ul>

        <h2 className="text-xl font-semibold text-gray-900 pt-2">
          Our Relationships with Retailers
        </h2>
        <p>
          DealPilot may participate in affiliate programs operated by various
          networks including, but not limited to, Amazon Associates, CJ
          Affiliate, Impact, ShareASale, and Rakuten. Each of these programs is
          designed to provide a means for sites to earn advertising fees by
          linking to products.
        </p>
        <p>
          As an Amazon Associate, DealPilot may earn from qualifying purchases
          made through Amazon affiliate links.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 pt-2">
          Our Commitment to Honesty
        </h2>
        <p>
          We believe trust is earned. We will always be upfront about how we
          make money. If you ever have questions about our practices, please
          don't hesitate to reach out through our{" "}
          <a href="/contact" className="text-brand-700 underline hover:text-brand-800">
            contact page
          </a>
          .
        </p>
      </div>
    </div>
  );
}