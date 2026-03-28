"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  Admin API Keys Management Dashboard                                */
/* ------------------------------------------------------------------ */

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  active: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface NewKeyResult extends ApiKey {
  key: string; // Full key — only available on creation
}

export default function AdminKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);

  // New key reveal state
  const [revealedKey, setRevealedKey] = useState<{ id: string; fullKey: string } | null>(null);

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

  const fetchKeys = async () => {
    const token = getToken();
    if (!token) {
      setError("No admin token provided.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/keys", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Unauthorized");
      const data = await res.json();
      setKeys(data.data);
    } catch {
      sessionStorage.removeItem("admin_token");
      setError("Authentication failed. Please reload and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newKeyName.trim();
    if (!name) return;

    const token = getToken();
    if (!token) return;
    setCreating(true);

    try {
      const res = await fetch("/api/admin/keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to create key.");
        return;
      }

      const data = await res.json();
      const result: NewKeyResult = data.data;

      setNewKeyName("");
      setRevealedKey({ id: result.id, fullKey: result.key });
      fetchKeys();
    } catch {
      alert("Failed to create key.");
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    const token = getToken();
    if (!token) return;

    await fetch(`/api/admin/keys/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ active: !current }),
    });
    fetchKeys();
  };

  const deleteKey = async (id: string, name: string) => {
    if (!confirm(`Delete API key "${name}" permanently? Any integrations using this key will stop working immediately.`)) return;
    const token = getToken();
    if (!token) return;

    await fetch(`/api/admin/keys/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchKeys();
  };

  const regenerateKey = async (id: string, name: string) => {
    if (!confirm(`Regenerate API key "${name}"? The old key will immediately stop working.`)) return;
    const token = getToken();
    if (!token) return;

    try {
      const res = await fetch(`/api/admin/keys/${id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        alert("Failed to regenerate key.");
        return;
      }

      const data = await res.json();
      setRevealedKey({ id: data.data.id, fullKey: data.data.key });
      fetchKeys();
    } catch {
      alert("Failed to regenerate key.");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center text-gray-400">
        Loading API keys...
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage API keys for programmatic access to the DealPilot admin endpoints.
          </p>
        </div>
        <Link
          href="/admin"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          ← Dashboard
        </Link>
      </div>

      {/* New key revealed banner */}
      {revealedKey && (
        <div className="mt-6 rounded-xl border-2 border-emerald-300 bg-emerald-50 p-5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold text-emerald-900">🔑 New API Key Created</h3>
              <p className="mt-1 text-sm text-emerald-700">
                Copy this key now — you won't be able to see it again.
              </p>
            </div>
            <button
              onClick={() => setRevealedKey(null)}
              className="text-emerald-400 hover:text-emerald-600 text-lg leading-none"
            >
              ✕
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-emerald-900 px-4 py-3 text-sm text-emerald-100 font-mono break-all select-all">
              {revealedKey.fullKey}
            </code>
            <button
              onClick={() => copyToClipboard(revealedKey.fullKey)}
              className="shrink-0 rounded-lg bg-emerald-700 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-800 transition"
            >
              Copy
            </button>
          </div>
          <p className="mt-2 text-xs text-emerald-600">
            Use this in the Authorization header: <code className="bg-white/60 rounded px-1">Authorization: Bearer {revealedKey.fullKey}</code>
          </p>
        </div>
      )}

      {/* Create new key form */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold text-gray-900">Create New API Key</h2>
        <form onSubmit={createKey} className="mt-3 flex gap-3">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Key name (e.g. 'CI Pipeline', 'Auto-poster')"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none focus:ring-1 focus:ring-brand-700"
            disabled={creating}
          />
          <button
            type="submit"
            disabled={creating || !newKeyName.trim()}
            className="rounded-lg bg-brand-700 px-5 py-2 text-sm font-medium text-white transition hover:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? "Creating..." : "Create Key"}
          </button>
        </form>
      </div>

      {/* Keys list */}
      <div className="mt-6">
        <p className="text-sm text-gray-500 mb-3">
          {keys.length} total key{keys.length !== 1 ? "s" : ""} · {keys.filter((k) => k.active).length} active
        </p>

        {keys.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
            <p className="text-gray-400 text-sm">No API keys yet. Create one above to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {keys.map((k) => (
              <div
                key={k.id}
                className={`rounded-xl border bg-white p-4 transition ${
                  k.active ? "border-gray-200" : "border-gray-200 opacity-60"
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900 truncate">{k.name}</h3>
                      <span
                        className={`shrink-0 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          k.active
                            ? "bg-green-50 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {k.active ? "Active" : "Revoked"}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                      <span className="font-mono">{k.prefix}{"••••••••••••••••••••"}</span>
                      <span>Created {new Date(k.createdAt).toLocaleDateString()}</span>
                      {k.lastUsedAt && (
                        <span>Last used {new Date(k.lastUsedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleActive(k.id, k.active)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                        k.active
                          ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                          : "border-green-200 text-green-700 hover:bg-green-50"
                      }`}
                    >
                      {k.active ? "Revoke" : "Activate"}
                    </button>
                    <button
                      onClick={() => regenerateKey(k.id, k.name)}
                      className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-50"
                    >
                      Regenerate
                    </button>
                    <button
                      onClick={() => deleteKey(k.id, k.name)}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info box */}
      <div className="mt-8 rounded-xl border border-blue-200 bg-blue-50 p-5">
        <h3 className="text-sm font-bold text-blue-900">How API Keys Work</h3>
        <ul className="mt-2 space-y-1 text-xs text-blue-800">
          <li>• API keys are an alternative to the admin token for authenticating API requests.</li>
          <li>• Use them in the <code className="rounded bg-white/60 px-1">Authorization: Bearer dp_...</code> header.</li>
          <li>• Each key grants full admin access — revoke keys you no longer use.</li>
          <li>• Regenerating a key immediately invalidates the old one.</li>
          <li>• The full key is only shown once at creation or regeneration — store it safely.</li>
        </ul>
      </div>
    </div>
  );
}