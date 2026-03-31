import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-6xl font-bold text-brand-700">404</h1>
      <p className="mt-4 text-xl font-semibold text-gray-900">
        Page Not Found
      </p>
      <p className="mt-2 max-w-md text-gray-500">
        The page you're looking for doesn't exist or has been moved.
        Maybe one of these deals caught your eye instead?
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/"
          className="rounded-lg bg-brand-700 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-brand-800"
        >
          Browse Deals
        </Link>
        <Link
          href="/contact"
          className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          Contact Us
        </Link>
      </div>
    </div>
  );
}