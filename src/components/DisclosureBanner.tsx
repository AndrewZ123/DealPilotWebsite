import Link from "next/link";

export default function DisclosureBanner() {
  return (
    <div className="rounded-lg bg-gray-100 px-4 py-3 text-center text-xs text-gray-500">
      Disclosure: Some links on this page may be affiliate links. We may earn a
      commission if you purchase through them — at no extra cost to you.{" "}
      <Link href="/disclosure" className="underline hover:text-brand-700">
        Learn more
      </Link>
    </div>
  );
}