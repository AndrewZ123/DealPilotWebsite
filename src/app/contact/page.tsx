import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with DealPilot. Reach out for partnership inquiries, affiliate opportunities, or general questions.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900">Contact Us</h1>
      <p className="mt-2 text-gray-500">
        Have a question, partnership inquiry, or just want to say hello? We'd
        love to hear from you.
      </p>

      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        {/* Email */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Email Us</h2>
          <p className="mt-2 text-sm text-gray-500">
            For the fastest response, send us an email directly.
          </p>
          <a
            href="mailto:hello@dealpilot.com"
            className="mt-4 inline-block rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-800"
          >
            hello@dealpilot.com
          </a>
        </div>

        {/* Partnerships */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Partnerships</h2>
          <p className="mt-2 text-sm text-gray-500">
            Are you a brand or affiliate network interested in working together?
            Reach out and let's talk.
          </p>
          <a
            href="mailto:partners@dealpilot.com"
            className="mt-4 inline-block rounded-lg border border-brand-700 px-5 py-2.5 text-sm font-medium text-brand-700 transition hover:bg-brand-50"
          >
            partners@dealpilot.com
          </a>
        </div>
      </div>

      {/* Simple contact form */}
      <div className="mt-10 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Send a Message</h2>
        <form
          action={`mailto:hello@dealpilot.com`}
          method="POST"
          encType="text/plain"
          className="mt-4 space-y-4"
        >
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="Your name"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700">
              Message
            </label>
            <textarea
              id="message"
              name="message"
              rows={4}
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="How can we help?"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-brand-700 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-brand-800"
          >
            Send Message
          </button>
        </form>
      </div>
    </div>
  );
}