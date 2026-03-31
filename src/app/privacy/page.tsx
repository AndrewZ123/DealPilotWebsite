import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "DealPilot privacy policy. Learn how we collect, use, and protect your data.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8 prose prose-gray prose-sm">
      <h1 className="text-3xl font-bold text-gray-900 prose-headings:text-gray-900">
        Privacy Policy
      </h1>
      <p className="text-gray-500">Last updated: March 31, 2026</p>

      <h2>1. Information We Collect</h2>
      <p>
        DealPilot operates as a deal aggregation service. We collect minimal
        personal information:
      </p>
      <ul>
        <li>
          <strong>Usage Data:</strong> We collect anonymous analytics data
          (page views, click-through rates) to improve our service. This is
          handled by Vercel Analytics and does not include personally
          identifiable information.
        </li>
        <li>
          <strong>Contact Submissions:</strong> If you contact us via our
          contact form, we collect the information you provide (name, email,
          message content) solely to respond to your inquiry.
        </li>
        <li>
          <strong>API Keys:</strong> If you use our admin API, we store hashed
          API keys for authentication purposes.
        </li>
      </ul>

      <h2>2. How We Use Your Information</h2>
      <p>We use collected information to:</p>
      <ul>
        <li>Operate and improve our deal aggregation service</li>
        <li>Respond to contact inquiries</li>
        <li>Monitor and analyze usage patterns to improve user experience</li>
        <li>Authenticate authorized API requests</li>
      </ul>

      <h2>3. Affiliate Links & Cookies</h2>
      <p>
        DealPilot uses affiliate links from retailers. When you click a deal
        link, you may be redirected through our tracking system (go.dealpilot.org)
        which sets a temporary cookie to track the referral. These cookies are:
      </p>
      <ul>
        <li>Set only when you click an outbound deal link</li>
        <li>Used solely for affiliate tracking with our retail partners</li>
        <li>Not used for advertising or cross-site tracking</li>
      </ul>

      <h2>4. Third-Party Services</h2>
      <p>We use the following third-party services:</p>
      <ul>
        <li>
          <strong>Supabase:</strong> Database hosting for deal data storage
        </li>
        <li>
          <strong>Vercel:</strong> Application hosting and analytics
        </li>
        <li>
          <strong>Retail Partners:</strong> Affiliate networks (Amazon, etc.)
          that may set their own cookies per their own privacy policies
        </li>
      </ul>

      <h2>5. Data Retention</h2>
      <p>
        Contact form submissions are retained for up to 90 days and then
        deleted. Analytics data is aggregated and anonymized. API keys are
        retained until deleted by an administrator.
      </p>

      <h2>6. Your Rights</h2>
      <p>
        You have the right to request access to, correction of, or deletion
        of any personal data we hold about you. To exercise these rights,
        contact us at{" "}
        <a href="mailto:hello@dealpilot.org" className="text-brand-700 hover:underline">
          hello@dealpilot.org
        </a>
        .
      </p>

      <h2>7. Security</h2>
      <p>
        We implement reasonable security measures to protect your data,
        including encrypted connections (HTTPS), secure API key storage, and
        access controls on administrative functions.
      </p>

      <h2>8. Changes to This Policy</h2>
      <p>
        We may update this privacy policy from time to time. Changes will be
        reflected by the "Last updated" date at the top of this page.
      </p>

      <h2>9. Contact</h2>
      <p>
        For privacy-related inquiries, contact us at{" "}
        <a href="mailto:hello@dealpilot.org" className="text-brand-700 hover:underline">
          hello@dealpilot.org
        </a>
        .
      </p>
    </div>
  );
}