"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Deal {
  id: string;
  slug: string;
  title: string;
  store: string;
  category: string;
  originalPrice: number;
  salePrice: number;
  discountPercent: number;
  active: boolean;
  clicks: number;
  createdAt: string;
}

export default function AdminPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Read token from prompt on first load (simple approach)
  const getToken = () => {
    const stored = sessionStorage.getItem("admin_token");
    if (stored) return stored;
    const token = prompt("Enter admin token:");
    if (token) {
      sessionStorage.setItem("admin_token", token);
      return token;
    }
    return null;
  };

  const fetchDeals = async () => {
    const token = getToken();
    if (!token) {
      setError("No admin token provided.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/deals", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Unauthorized");
      const data = await res.json();
      setDeals(data.data);
    } catch {
      sessionStorage.removeItem("admin_token");
      setError("Authentication failed. Please reload and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleActive = async (id: string, current: boolean) => {
    const token = getToken();
    if (!token) return;
    await fetch(`/api/admin/deals/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ active: !current }),
    });
    fetchDeals();
  };

  const deleteDeal = async (id: string) => {
    if (!confirm("Delete this deal permanently?")) return;
    const token = getToken();
    if (!token) return;
    await fetch(`/api/admin/deals/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchDeals();
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 text-center text-gray-400">
        Loading deals...
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 text-center text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Admin — Deals</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/keys"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            🔑 API Keys
          </Link>
          <Link
            href="/admin/api-docs"
            className="rounded-lg border border-brand-700 px-4 py-2 text-sm font-medium text-brand-700 transition hover:bg-brand-50"
          >
            📚 API Docs
          </Link>
          <Link
            href="/admin/deals/new"
            className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-800"
          >
            + New Deal
          </Link>
        </div>
      </div>

      <p className="mt-2 text-sm text-gray-400">
        {deals.length} total deals · {deals.filter((d) => d.active).length} active
      </p>

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Deal
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Store
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Price
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Clicks
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {deals.map((deal) => (
              <tr key={deal.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900 text-sm">{deal.title}</div>
                  <div className="text-xs text-gray-400">{deal.category}</div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{deal.store}</td>
                <td className="px-4 py-3 text-sm">
                  <span className="font-medium text-gray-900">
                    ${deal.salePrice.toFixed(2)}
                  </span>
                  <span className="ml-1 text-xs text-gray-400 line-through">
                    ${deal.originalPrice.toFixed(2)}
                  </span>
                  <span className="ml-1 text-xs text-green-600">
                    -{deal.discountPercent}%
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{deal.clicks}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      deal.active
                        ? "bg-green-50 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {deal.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button
                    onClick={() => toggleActive(deal.id, deal.active)}
                    className="text-xs text-brand-700 hover:underline"
                  >
                    {deal.active ? "Archive" : "Activate"}
                  </button>
                  <button
                    onClick={() => deleteDeal(deal.id)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}