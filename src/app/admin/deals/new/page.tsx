"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";

export default function NewDealPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const getToken = () => sessionStorage.getItem("admin_token");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const token = getToken();
    if (!token) {
      setError("No admin token. Go to /admin first.");
      setSaving(false);
      return;
    }

    const form = new FormData(e.currentTarget);
    const body = {
      title: form.get("title"),
      description: form.get("description"),
      store: form.get("store"),
      originalPrice: parseFloat(form.get("originalPrice") as string),
      salePrice: parseFloat(form.get("salePrice") as string),
      category: form.get("category"),
      imageUrl: form.get("imageUrl"),
      finalUrl: form.get("finalUrl"),
    };

    try {
      const res = await fetch("/api/admin/deals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create deal");
      }

      router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link href="/admin" className="text-sm text-brand-700 hover:underline">
          ← Back to Admin
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-900">Create New Deal</h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Title *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            required
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="e.g. Sony WH-1000XM5 Wireless Headphones"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="Short description of the deal..."
          />
        </div>

        {/* Store */}
        <div>
          <label htmlFor="store" className="block text-sm font-medium text-gray-700">
            Store / Merchant *
          </label>
          <input
            type="text"
            id="store"
            name="store"
            required
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="e.g. Amazon, Best Buy, Walmart"
          />
        </div>

        {/* Prices */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="originalPrice" className="block text-sm font-medium text-gray-700">
              Original Price ($) *
            </label>
            <input
              type="number"
              id="originalPrice"
              name="originalPrice"
              step="0.01"
              min="0"
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="99.99"
            />
          </div>
          <div>
            <label htmlFor="salePrice" className="block text-sm font-medium text-gray-700">
              Sale Price ($) *
            </label>
            <input
              type="number"
              id="salePrice"
              name="salePrice"
              step="0.01"
              min="0"
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="59.99"
            />
          </div>
        </div>

        {/* Category */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700">
            Category *
          </label>
          <select
            id="category"
            name="category"
            required
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">Select a category</option>
            {CATEGORIES.map((cat) => (
              <option key={cat.name} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Image URL */}
        <div>
          <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700">
            Image URL
          </label>
          <input
            type="url"
            id="imageUrl"
            name="imageUrl"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="https://example.com/product-image.jpg"
          />
        </div>

        {/* Final URL */}
        <div>
          <label htmlFor="finalUrl" className="block text-sm font-medium text-gray-700">
            Merchant Product URL (final redirect target) *
          </label>
          <input
            type="url"
            id="finalUrl"
            name="finalUrl"
            required
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="https://www.amazon.com/dp/B09XS7JWHH"
          />
        </div>

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-brand-700 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-brand-800 disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Deal"}
          </button>
          <Link
            href="/admin"
            className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}