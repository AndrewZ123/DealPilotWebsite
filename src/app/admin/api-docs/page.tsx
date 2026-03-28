"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  Admin API Documentation Page                                      */
/*  Only visible behind token auth.                                   */
/* ------------------------------------------------------------------ */

const TOKEN_PLACEHOLDER = "YOUR_ADMIN_TOKEN";

const endpoints = [
  {
    id: "auth",
    title: "Authentication",
    method: "",
    path: "",
    description:
      "All admin API endpoints require a Bearer token in the Authorization header. Set your token in the ADMIN_TOKEN environment variable.",
    headers: `Authorization: Bearer ${TOKEN_PLACEHOLDER}`,
    params: [],
    bodyFields: [],
    example: `curl -H "Authorization: Bearer ${TOKEN_PLACEHOLDER}" \\
  http://localhost:3000/api/admin/deals`,
    response: `{
  "success": true,
  "data": [...]
}`,
    notes: [
      "If you omit the Authorization header or provide an incorrect token, you'll receive a 401 response.",
      "The token is the same one you use to access the admin dashboard UI.",
    ],
  },
  {
    id: "list-deals",
    title: "List Deals",
    method: "GET",
    path: "/api/admin/deals",
    description: "Retrieve a paginated, filterable list of all deals.",
    headers: `Authorization: Bearer ${TOKEN_PLACEHOLDER}`,
    params: [
      { name: "category", type: "string", required: false, desc: 'Filter by category (e.g. "Tech", "Home")' },
      { name: "active", type: "string", required: false, desc: 'Filter by status: "true" or "false"' },
      { name: "search", type: "string", required: false, desc: "Search title, description, or store (case-insensitive)" },
      { name: "limit", type: "number", required: false, desc: "Max results per page (default: 50, max: 200)" },
      { name: "offset", type: "number", required: false, desc: "Number of results to skip (default: 0)" },
    ],
    bodyFields: [],
    example: `curl -H "Authorization: Bearer ${TOKEN_PLACEHOLDER}" \\
  "http://localhost:3000/api/admin/deals?category=Tech&active=true&limit=10"`,
    response: `{
  "success": true,
  "data": [
    {
      "id": "clx...",
      "slug": "sony-wh-1000xm5-headphones",
      "title": "Sony WH-1000XM5 Headphones",
      "description": "Industry-leading noise cancelling",
      "store": "Amazon",
      "originalPrice": 399.99,
      "salePrice": 278.00,
      "discountPercent": 31,
      "category": "Tech",
      "imageUrl": "https://...",
      "finalUrl": "https://www.amazon.com/dp/...",
      "active": true,
      "clicks": 42,
      "createdAt": "2025-03-28T12:00:00.000Z",
      "updatedAt": "2025-03-28T12:00:00.000Z"
    }
  ],
  "meta": { "total": 35, "limit": 10, "offset": 0, "count": 10 }
}`,
    notes: [],
  },
  {
    id: "get-deal",
    title: "Get Single Deal",
    method: "GET",
    path: "/api/admin/deals/[id]",
    description: "Retrieve a single deal by its database ID.",
    headers: `Authorization: Bearer ${TOKEN_PLACEHOLDER}`,
    params: [{ name: "id", type: "string", required: true, desc: "The deal's unique database ID" }],
    bodyFields: [],
    example: `curl -H "Authorization: Bearer ${TOKEN_PLACEHOLDER}" \\
  "http://localhost:3000/api/admin/deals/clxabcdef1234"`,
    response: `{
  "success": true,
  "data": {
    "id": "clxabcdef1234",
    "slug": "sony-wh-1000xm5-headphones",
    "title": "Sony WH-1000XM5 Headphones",
    ...
  }
}`,
    notes: [],
  },
  {
    id: "create-deal",
    title: "Create a Deal",
    method: "POST",
    path: "/api/admin/deals",
    description: "Create a single new deal. The slug is auto-generated from the title if not provided. The discount percentage is auto-calculated from the prices.",
    headers: `Authorization: Bearer ${TOKEN_PLACEHOLDER}\nContent-Type: application/json`,
    params: [],
    bodyFields: [
      { name: "title", type: "string", required: true, desc: "Deal title" },
      { name: "store", type: "string", required: true, desc: "Merchant or store name" },
      { name: "originalPrice", type: "number", required: true, desc: "Original price (must be >= salePrice)" },
      { name: "salePrice", type: "number", required: true, desc: "Discounted sale price" },
      { name: "finalUrl", type: "string", required: true, desc: "Full HTTP(S) URL to the merchant product page" },
      { name: "category", type: "string", required: true, desc: 'One of: Tech, Home, Fashion, Toys, Misc' },
      { name: "description", type: "string", required: false, desc: "Deal description (1-2 sentences)" },
      { name: "imageUrl", type: "string", required: false, desc: "URL to product image" },
      { name: "active", type: "boolean", required: false, desc: "Whether deal is live (default: true)" },
      { name: "slug", type: "string", required: false, desc: "Custom URL slug (auto-generated if omitted)" },
    ],
    example: `curl -X POST http://localhost:3000/api/admin/deals \\
  -H "Authorization: Bearer ${TOKEN_PLACEHOLDER}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Sony WH-1000XM5 Headphones",
    "store": "Amazon",
    "originalPrice": 399.99,
    "salePrice": 278.00,
    "finalUrl": "https://www.amazon.com/dp/B09XS7JWHH",
    "category": "Tech",
    "description": "Industry-leading noise cancelling over-ear headphones",
    "imageUrl": "https://images.example.com/sony-xm5.jpg"
  }'`,
    response: `{
  "success": true,
  "data": {
    "id": "clx...",
    "slug": "sony-wh-1000xm5-headphones",
    "title": "Sony WH-1000XM5 Headphones",
    "store": "Amazon",
    "originalPrice": 399.99,
    "salePrice": 278.00,
    "discountPercent": 31,
    "category": "Tech",
    ...
  },
  "message": "Deal \\"Sony WH-1000XM5 Headphones\\" created with slug \\"sony-wh-1000xm5-headphones\\"."
}`,
    notes: [
      'If you provide a slug that already exists, a random suffix will be appended automatically.',
      "discountPercent is calculated automatically — do not send it.",
    ],
  },
  {
    id: "batch-create",
    title: "Batch Create Deals",
    method: "POST",
    path: "/api/admin/deals/batch",
    description: "Create up to 100 deals in a single request. Each deal is validated independently — partial success is supported.",
    headers: `Authorization: Bearer ${TOKEN_PLACEHOLDER}\nContent-Type: application/json`,
    params: [],
    bodyFields: [
      { name: "deals", type: "array", required: true, desc: "Array of deal objects (same fields as Create a Deal, max 100)" },
    ],
    example: `curl -X POST http://localhost:3000/api/admin/deals/batch \\
  -H "Authorization: Bearer ${TOKEN_PLACEHOLDER}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "deals": [
      {
        "title": "Dyson V15 Detect Vacuum",
        "store": "Best Buy",
        "originalPrice": 749.99,
        "salePrice": 549.99,
        "finalUrl": "https://www.bestbuy.com/site/dyson-v15",
        "category": "Home",
        "description": "Powerful cordless vacuum with laser dust detection"
      },
      {
        "title": "Nike Air Max 270",
        "store": "Nike",
        "originalPrice": 160.00,
        "salePrice": 99.97,
        "finalUrl": "https://www.nike.com/t/air-max-270",
        "category": "Fashion",
        "description": "Iconic Air Max cushioning in a lifestyle sneaker"
      }
    ]
  }'`,
    response: `{
  "success": true,
  "data": [
    { "id": "clx...", "slug": "dyson-v15-detect-vacuum", ... },
    { "id": "clx...", "slug": "nike-air-max-270", ... }
  ],
  "message": "Created 2 of 2 deals."
}`,
    notes: [
      "Returns HTTP 207 (Multi-Status) if some deals fail validation.",
      "The 'errors' array contains per-item failure details with the index of the failed deal.",
    ],
  },
  {
    id: "update-deal",
    title: "Update a Deal",
    method: "PUT",
    path: "/api/admin/deals/[id]",
    description: "Partially update a deal. Only include the fields you want to change. Discount percentage is recalculated if prices change.",
    headers: `Authorization: Bearer ${TOKEN_PLACEHOLDER}\nContent-Type: application/json`,
    params: [{ name: "id", type: "string", required: true, desc: "The deal's unique database ID" }],
    bodyFields: [
      { name: "title", type: "string", required: false, desc: "New title" },
      { name: "store", type: "string", required: false, desc: "New store name" },
      { name: "originalPrice", type: "number", required: false, desc: "New original price" },
      { name: "salePrice", type: "number", required: false, desc: "New sale price" },
      { name: "finalUrl", type: "string", required: false, desc: "New merchant URL" },
      { name: "category", type: "string", required: false, desc: "New category" },
      { name: "description", type: "string", required: false, desc: "New description" },
      { name: "imageUrl", type: "string", required: false, desc: "New image URL" },
      { name: "active", type: "boolean", required: false, desc: "Set false to archive/unpublish" },
      { name: "slug", type: "string", required: false, desc: "New URL slug" },
    ],
    example: `curl -X PUT http://localhost:3000/api/admin/deals/clxabcdef1234 \\
  -H "Authorization: Bearer ${TOKEN_PLACEHOLDER}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "salePrice": 249.00,
    "active": true
  }'`,
    response: `{
  "success": true,
  "data": { "id": "clxabcdef1234", "salePrice": 249.00, "discountPercent": 38, ... },
  "message": "Deal \\"Sony WH-1000XM5 Headphones\\" updated successfully."
}`,
    notes: [],
  },
  {
    id: "delete-deal",
    title: "Delete a Deal",
    method: "DELETE",
    path: "/api/admin/deals/[id]",
    description: "Permanently delete a deal. This cannot be undone.",
    headers: `Authorization: Bearer ${TOKEN_PLACEHOLDER}`,
    params: [{ name: "id", type: "string", required: true, desc: "The deal's unique database ID" }],
    bodyFields: [],
    example: `curl -X DELETE http://localhost:3000/api/admin/deals/clxabcdef1234 \\
  -H "Authorization: Bearer ${TOKEN_PLACEHOLDER}"`,
    response: `{
  "success": true,
  "message": "Deal \\"Sony WH-1000XM5 Headphones\\" deleted permanently."
}`,
    notes: [],
  },
  {
    id: "stats",
    title: "Dashboard Stats",
    method: "GET",
    path: "/api/admin/stats",
    description: "Get aggregated statistics: total deals, active/inactive counts, total clicks, category breakdown, and top deals.",
    headers: `Authorization: Bearer ${TOKEN_PLACEHOLDER}`,
    params: [],
    bodyFields: [],
    example: `curl -H "Authorization: Bearer ${TOKEN_PLACEHOLDER}" \\
  "http://localhost:3000/api/admin/stats"`,
    response: `{
  "success": true,
  "data": {
    "deals": { "total": 35, "active": 28, "inactive": 7 },
    "clicks": { "total": 1247 },
    "categories": [
      { "category": "Tech", "count": 12 },
      { "category": "Home", "count": 8 },
      { "category": "Fashion", "count": 6 },
      { "category": "Toys", "count": 5 },
      { "category": "Misc", "count": 4 }
    ],
    "recentDeals": [...],
    "topDealsByClicks": [...]
  }
}`,
    notes: [],
  },
  {
    id: "refresh",
    title: "Refresh / Auto-Generate Deals",
    method: "POST",
    path: "/api/refresh-deals",
    description: "Trigger the auto-deal generation script. Creates new realistic mock deals and archives deals older than 7 days. Can be called by cron or scheduled tasks.",
    headers: `Authorization: Bearer ${TOKEN_PLACEHOLDER}`,
    params: [],
    bodyFields: [],
    example: `curl -X POST http://localhost:3000/api/refresh-deals \\
  -H "Authorization: Bearer ${TOKEN_PLACEHOLDER}"`,
    response: `{
  "success": true,
  "message": "Generated 8 new deals, archived 3 expired deals."
}`,
    notes: [
      "This endpoint is also used by the Vercel Cron / scheduled job to keep the site populated.",
      "You can call it as often as you like — it won't create duplicates of the same deal title.",
    ],
  },
];

const errorCodes = [
  { code: 200, meaning: "OK — Request succeeded." },
  { code: 201, meaning: "Created — Resource was created successfully." },
  { code: 207, meaning: "Multi-Status — Batch request partially succeeded (check errors array)." },
  { code: 400, meaning: "Bad Request — Missing or invalid fields. Error message will specify what's wrong." },
  { code: 401, meaning: "Unauthorized — Missing or invalid Authorization header." },
  { code: 404, meaning: "Not Found — Deal with the given ID/slug does not exist." },
  { code: 500, meaning: "Server Error — Unexpected internal error. Check server logs." },
];

const dealModel = [
  { field: "id", type: "string", desc: "Unique database ID (auto-generated)" },
  { field: "slug", type: "string", desc: "URL-friendly slug (auto-generated from title)" },
  { field: "title", type: "string", desc: "Deal title" },
  { field: "description", type: "string", desc: "Deal description" },
  { field: "store", type: "string", desc: "Merchant or store name" },
  { field: "originalPrice", type: "number", desc: "Original price before discount" },
  { field: "salePrice", type: "number", desc: "Current discounted sale price" },
  { field: "discountPercent", type: "number", desc: "Auto-calculated percentage off (integer)" },
  { field: "category", type: "string", desc: "One of: Tech, Home, Fashion, Toys, Misc" },
  { field: "imageUrl", type: "string", desc: "URL to product image" },
  { field: "finalUrl", type: "string", desc: "Target merchant URL (redirect destination)" },
  { field: "active", type: "boolean", desc: "Whether the deal is live and visible" },
  { field: "clicks", type: "number", desc: "Total clicks through the redirect system" },
  { field: "createdAt", type: "string", desc: "ISO 8601 creation timestamp" },
  { field: "updatedAt", type: "string", desc: "ISO 8601 last-updated timestamp" },
];

function methodColor(m: string) {
  switch (m) {
    case "GET": return "bg-emerald-100 text-emerald-800";
    case "POST": return "bg-blue-100 text-blue-800";
    case "PUT": return "bg-amber-100 text-amber-800";
    case "DELETE": return "bg-red-100 text-red-800";
    default: return "bg-gray-100 text-gray-800";
  }
}

export default function ApiDocsPage() {
  const [token, setToken] = useState<string>("");
  const [authorized, setAuthorized] = useState(false);
  const [authError, setAuthError] = useState("");
  const [activeSection, setActiveSection] = useState("auth");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("admin_token");
    if (stored) {
      setToken(stored);
      verify(stored);
    }
  }, []);

  const verify = async (t: string) => {
    try {
      const res = await fetch("/api/admin/stats", {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) {
        setAuthorized(true);
        sessionStorage.setItem("admin_token", t);
      } else {
        setAuthError("Invalid token. Please try again.");
      }
    } catch {
      setAuthError("Could not connect to API.");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    verify(token);
  };

  const copySnippet = (id: string, text: string) => {
    // Replace placeholder with actual token if available
    const realText = text.replace(new RegExp(TOKEN_PLACEHOLDER, "g"), token || TOKEN_PLACEHOLDER);
    navigator.clipboard.writeText(realText);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Auth gate
  if (!authorized) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md items-center px-4">
        <form onSubmit={handleSubmit} className="w-full space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">🔑 API Documentation Access</h2>
          <p className="text-sm text-gray-500">
            Enter your admin token to view the API documentation.
          </p>
          {authError && <p className="text-sm text-red-500">{authError}</p>}
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Admin token"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none focus:ring-1 focus:ring-brand-700"
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 transition"
          >
            Unlock Docs
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Documentation</h1>
          <p className="mt-1 text-sm text-gray-500">
            Complete reference for the DealPilot Admin API. Use these endpoints to create and manage deals programmatically.
          </p>
        </div>
        <Link
          href="/admin"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
        >
          ← Back to Dashboard
        </Link>
      </div>

      <div className="flex gap-8">
        {/* Sidebar nav */}
        <nav className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-8 space-y-1">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Endpoints
            </p>
            {endpoints.map((ep) => (
              <button
                key={ep.id}
                onClick={() => {
                  setActiveSection(ep.id);
                  document.getElementById(ep.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className={`block w-full rounded-md px-3 py-1.5 text-left text-sm transition ${
                  activeSection === ep.id
                    ? "bg-brand-50 font-medium text-brand-800"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {ep.method && (
                  <span
                    className={`mr-1.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${methodColor(ep.method)}`}
                  >
                    {ep.method}
                  </span>
                )}
                {ep.title}
              </button>
            ))}
            <div className="pt-4">
              <button
                onClick={() => document.getElementById("models")?.scrollIntoView({ behavior: "smooth" })}
                className="block w-full rounded-md px-3 py-1.5 text-left text-sm text-gray-600 hover:bg-gray-50"
              >
                📦 Data Models
              </button>
              <button
                onClick={() => document.getElementById("errors")?.scrollIntoView({ behavior: "smooth" })}
                className="block w-full rounded-md px-3 py-1.5 text-left text-sm text-gray-600 hover:bg-gray-50"
              >
                ⚠️ Error Codes
              </button>
            </div>
          </div>
        </nav>

        {/* Main content */}
        <main className="min-w-0 flex-1 space-y-10">
          {/* Quick start */}
          <div className="rounded-xl border border-brand-200 bg-brand-50 p-6">
            <h2 className="text-lg font-bold text-brand-900">⚡ Quick Start</h2>
            <p className="mt-2 text-sm text-brand-800">
              Create your first deal with a single curl command:
            </p>
            <div className="relative mt-3">
              <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-green-400">
{`curl -X POST http://localhost:3000/api/admin/deals \\
  -H "Authorization: Bearer ${token}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "My First Deal",
    "store": "Example Store",
    "originalPrice": 100.00,
    "salePrice": 59.99,
    "finalUrl": "https://example.com/product",
    "category": "Tech",
    "description": "A great deal on an amazing product"
  }'`}
              </pre>
              <button
                onClick={() => copySnippet("quickstart", `curl -X POST http://localhost:3000/api/admin/deals -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" -d '{"title":"My First Deal","store":"Example Store","originalPrice":100.00,"salePrice":59.99,"finalUrl":"https://example.com/product","category":"Tech","description":"A great deal"}'`)}
                className="absolute right-2 top-2 rounded-md bg-gray-700 px-2 py-1 text-xs text-gray-300 hover:bg-gray-600"
              >
                {copiedId === "quickstart" ? "✓ Copied" : "Copy"}
              </button>
            </div>
            <p className="mt-3 text-xs text-brand-700">
              <strong>Base URL:</strong> <code className="rounded bg-white/60 px-1.5 py-0.5">http://localhost:3000</code> (or your production domain)
            </p>
          </div>

          {/* Endpoint sections */}
          {endpoints.map((ep) => (
            <section key={ep.id} id={ep.id} className="scroll-mt-8">
              <div className="flex items-center gap-3 border-b border-gray-200 pb-3">
                {ep.method && (
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-bold ${methodColor(ep.method)}`}
                  >
                    {ep.method}
                  </span>
                )}
                <h3 className="text-lg font-bold text-gray-900">{ep.title}</h3>
              </div>

              {ep.path && (
                <p className="mt-2 font-mono text-sm text-gray-600">{ep.path}</p>
              )}

              <p className="mt-2 text-sm text-gray-700">{ep.description}</p>

              {/* Headers */}
              {ep.headers && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Headers</p>
                  <pre className="mt-1 rounded-lg bg-gray-50 p-3 text-xs text-gray-700">{ep.headers}</pre>
                </div>
              )}

              {/* Params */}
              {ep.params.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Parameters</p>
                  <div className="mt-1 overflow-hidden rounded-lg border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Name</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Type</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Required</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {ep.params.map((p) => (
                          <tr key={p.name}>
                            <td className="px-3 py-2 font-mono text-xs text-gray-900">{p.name}</td>
                            <td className="px-3 py-2 text-xs text-gray-600">{p.type}</td>
                            <td className="px-3 py-2 text-xs">
                              {p.required ? (
                                <span className="text-red-600 font-medium">Yes</span>
                              ) : (
                                <span className="text-gray-400">No</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-600">{p.desc}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Body fields */}
              {ep.bodyFields.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Request Body Fields</p>
                  <div className="mt-1 overflow-hidden rounded-lg border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Field</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Type</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Required</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {ep.bodyFields.map((f) => (
                          <tr key={f.name}>
                            <td className="px-3 py-2 font-mono text-xs text-gray-900">{f.name}</td>
                            <td className="px-3 py-2 text-xs text-gray-600">{f.type}</td>
                            <td className="px-3 py-2 text-xs">
                              {f.required ? (
                                <span className="text-red-600 font-medium">Yes</span>
                              ) : (
                                <span className="text-gray-400">No</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-600">{f.desc}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Example */}
              {ep.example && (
                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Example Request</p>
                    <button
                      onClick={() => copySnippet(`${ep.id}-example`, ep.example)}
                      className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200"
                    >
                      {copiedId === `${ep.id}-example` ? "✓ Copied" : "Copy curl"}
                    </button>
                  </div>
                  <pre className="mt-1 overflow-x-auto rounded-lg bg-gray-900 p-4 text-xs text-green-400">
                    {ep.example}
                  </pre>
                </div>
              )}

              {/* Response */}
              {ep.response && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Response</p>
                  <pre className="mt-1 overflow-x-auto rounded-lg bg-gray-50 p-4 text-xs text-gray-700">
                    {ep.response}
                  </pre>
                </div>
              )}

              {/* Notes */}
              {ep.notes.length > 0 && (
                <div className="mt-4 rounded-lg bg-amber-50 p-4">
                  <p className="text-xs font-semibold text-amber-800">Notes</p>
                  <ul className="mt-1 list-inside list-disc space-y-1 text-xs text-amber-700">
                    {ep.notes.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          ))}

          {/* Data model */}
          <section id="models" className="scroll-mt-8">
            <h3 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-3">📦 Deal Data Model</h3>
            <p className="mt-2 text-sm text-gray-700">
              Every deal returned by the API follows this structure:
            </p>
            <div className="mt-3 overflow-hidden rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Field</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Type</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {dealModel.map((f) => (
                    <tr key={f.field}>
                      <td className="px-3 py-2 font-mono text-xs text-gray-900">{f.field}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">{f.type}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">{f.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Error codes */}
          <section id="errors" className="scroll-mt-8">
            <h3 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-3">⚠️ Error Codes</h3>
            <div className="mt-3 overflow-hidden rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Code</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Meaning</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {errorCodes.map((e) => (
                    <tr key={e.code}>
                      <td className="px-3 py-2 font-mono text-xs font-bold text-gray-900">{e.code}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">{e.meaning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 rounded-lg bg-gray-50 p-4">
              <p className="text-xs font-semibold text-gray-700">Standard Error Response Format</p>
              <pre className="mt-2 overflow-x-auto text-xs text-gray-700">
{`{
  "success": false,
  "error": "Descriptive error message explaining what went wrong."
}`}
              </pre>
            </div>
          </section>

          {/* AI Agent notes */}
          <section className="rounded-xl border border-blue-200 bg-blue-50 p-6">
            <h3 className="text-lg font-bold text-blue-900">🤖 Notes for AI Agents</h3>
            <ul className="mt-3 space-y-2 text-sm text-blue-800">
              <li>• Always include the <code className="rounded bg-white/60 px-1">Authorization: Bearer {"<token>"}</code> header on every request.</li>
              <li>• Use <strong>POST /api/admin/deals</strong> for single deals, <strong>POST /api/admin/deals/batch</strong> for multiple (up to 100).</li>
              <li>• The <code className="rounded bg-white/60 px-1">slug</code> and <code className="rounded bg-white/60 px-1">discountPercent</code> fields are auto-generated — do not send them.</li>
              <li>• Category must be exactly one of: <code className="rounded bg-white/60 px-1">Tech</code>, <code className="rounded bg-white/60 px-1">Home</code>, <code className="rounded bg-white/60 px-1">Fashion</code>, <code className="rounded bg-white/60 px-1">Toys</code>, <code className="rounded bg-white/60 px-1">Misc</code>.</li>
              <li>• All errors return descriptive messages — read the <code className="rounded bg-white/60 px-1">error</code> field to understand what to fix.</li>
              <li>• The <code className="rounded bg-white/60 px-1">finalUrl</code> must be a valid, complete HTTP or HTTPS URL.</li>
              <li>• Set <code className="rounded bg-white/60 px-1">active: false</code> to create a deal in draft/inactive state.</li>
            </ul>
          </section>
        </main>
      </div>
    </div>
  );
}