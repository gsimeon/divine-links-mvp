"use client";

import { FormEvent, useCallback, useEffect, useState, useMemo } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

type Enquiry = {
  id: string;
  reference: string;
  full_name: string;
  email: string;
  phone: string;
  location: string;
  service: string;
  audience: string;
  details: string;
  status: string;
  internal_notes: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at?: string;
};

type NotificationItem = {
  id: string;
  channel: string;
  recipient: string;
  subject?: string;
  body: string;
  simulated: boolean;
  timestamp: string;
};

const statuses = [
  "submitted",
  "under_review",
  "awaiting_customer",
  "awaiting_partner",
  "in_progress",
  "completed",
  "cancelled",
  "unable_to_fulfil"
];

function statusColor(status: string) {
  switch (status) {
    case "submitted":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "under_review":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    case "awaiting_customer":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "awaiting_partner":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "in_progress":
      return "bg-cyan-50 text-cyan-700 border-cyan-200";
    case "completed":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "cancelled":
      return "bg-slate-100 text-slate-700 border-slate-200";
    case "unable_to_fulfil":
      return "bg-rose-50 text-rose-700 border-rose-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

function browserClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? createClient(url, key) : null;
}

export default function AdminPage() {
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [items, setItems] = useState<Enquiry[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  // Notification stream drawer
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    const supabase = browserClient();
    setClient(supabase);
    if (!supabase) {
      setMessage("Admin configuration missing: Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your environment.");
      return;
    }

    supabase.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? ""));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setToken(session?.access_token ?? ""));
    return () => data.subscription.unsubscribe();
  }, []);

  const load = useCallback(async (currentToken = token) => {
    if (!currentToken) return;
    setBusy(true);
    setMessage("");

    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (serviceFilter !== "all") params.set("service", serviceFilter);
    if (searchQuery.trim()) params.set("search", searchQuery.trim());

    try {
      const url = `/api/admin/enquiries${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${currentToken}` },
        cache: "no-store"
      });
      const body = await res.json();
      if (!res.ok) {
        setItems([]);
        setMessage(body.error ?? "Unable to load enquiries.");
      } else {
        setItems(body.enquiries ?? []);
      }
    } catch {
      setMessage("Could not connect to the admin service.");
    } finally {
      setBusy(false);
    }
  }, [token, statusFilter, serviceFilter, searchQuery]);

  const loadNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/admin/notifications", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setNotifications(data.notifications ?? []);
      }
    } catch {
      // Ignored
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      const timeout = setTimeout(() => {
        void load(token);
      }, 250);
      return () => clearTimeout(timeout);
    }
  }, [token, load]);

  async function signIn(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!client) return;
    setBusy(true);
    setMessage("");
    const { error } = await client.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setMessage("Sign-in failed. Please verify credentials or confirm admin role assignment.");
    } else {
      setPassword("");
      setMessage("Authenticated. Verifying administrative authorization with server...");
    }
  }

  async function saveEnquiry(item: Enquiry, status: string, notes: string) {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/enquiries", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ id: item.id, status, internalNotes: notes })
      });
      const body = await res.json();
      if (!res.ok) {
        setMessage(body.error ?? "Unable to update enquiry.");
      } else {
        setMessage(`Updated ${item.reference} (${status.replaceAll("_", " ")}). Outbound notification queued.`);
        await load(token);
      }
    } catch {
      setMessage("Could not connect to the admin service.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGdprAnonymize(item: Enquiry) {
    const confirmed = window.confirm(
      `GDPR Right to Erasure: Are you sure you want to permanently anonymize all personal data for ${item.reference} (${item.full_name})? This cannot be undone.`
    );
    if (!confirmed) return;

    setBusy(true);
    try {
      const res = await fetch("/api/admin/enquiries/gdpr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ id: item.id, action: "anonymize" })
      });
      const body = await res.json();
      if (!res.ok) {
        setMessage(body.error ?? "Failed to anonymize enquiry.");
      } else {
        setMessage(body.message ?? "Enquiry anonymized.");
        await load(token);
      }
    } catch {
      setMessage("Could not connect to GDPR erasure service.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await client?.auth.signOut();
    setItems([]);
    setToken("");
    setMessage("Successfully signed out.");
  }

  function handleExportCSV() {
    if (items.length === 0) return;
    const headers = [
      "Reference",
      "Created At",
      "Status",
      "Full Name",
      "Email",
      "Phone",
      "Location",
      "Service",
      "Audience",
      "Internal Notes",
      "Details"
    ];

    const rows = items.map(item => [
      item.reference,
      item.created_at,
      item.status,
      `"${item.full_name.replace(/"/g, '""')}"`,
      item.email,
      `"${item.phone}"`,
      `"${item.location.replace(/"/g, '""')}"`,
      item.service,
      item.audience,
      `"${(item.internal_notes || "").replace(/"/g, '""')}"`,
      `"${(item.details || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `divine_links_enquiries_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const stats = useMemo(() => {
    return {
      total: items.length,
      submitted: items.filter(i => i.status === "submitted").length,
      underReview: items.filter(i => i.status === "under_review" || i.status === "in_progress").length,
      awaiting: items.filter(i => i.status.startsWith("awaiting_")).length,
      completed: items.filter(i => i.status === "completed").length
    };
  }, [items]);

  return (
    <>
      <Header />
      <main className="min-h-[75vh] bg-divine-ice/50 py-10 sm:py-14">
        <div className="container">
          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-divine-border bg-white px-3.5 py-1.5 text-xs font-bold text-divine-blue">
                <span>INTERNAL DESK</span>
              </div>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-divine-ink sm:text-5xl">
                Enquiry Operations
              </h1>
              <p className="mt-2 text-sm text-divine-muted">
                Review incoming requests, evaluate carrier feasibility, update statuses, and log internal notes.
              </p>
            </div>

            {token && (
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    void loadNotifications();
                    setNotificationsOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-divine-border bg-white px-4 py-2.5 text-xs font-bold text-divine-ink shadow-sm transition hover:border-divine-blue hover:text-divine-blue"
                >
                  <span>🔔</span> Outbound Log
                </button>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  disabled={items.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-full border border-divine-border bg-white px-4 py-2.5 text-xs font-bold text-divine-ink shadow-sm transition hover:border-divine-blue hover:text-divine-blue disabled:opacity-40"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export CSV
                </button>
                <button
                  type="button"
                  onClick={signOut}
                  className="rounded-full border border-divine-border bg-white px-4 py-2.5 text-xs font-bold text-rose-600 transition hover:bg-rose-50"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>

          {!token ? (
            <div className="mx-auto max-w-lg rounded-3xl border border-divine-border bg-white p-6 shadow-soft sm:p-9">
              <h2 className="text-2xl font-extrabold text-divine-ink">Staff Sign In</h2>
              <p className="mt-1 text-xs text-divine-muted">
                Server-side authorization is required. Accounts must possess <code className="rounded bg-divine-ice px-1 py-0.5">app_metadata.role = admin</code>.
              </p>

              <form onSubmit={signIn} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="admin-email" className="mb-1.5 block text-xs font-bold text-divine-ink">Staff Email</label>
                  <input
                    id="admin-email"
                    type="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="staff@divinelinks.co"
                    className="w-full rounded-xl border border-divine-border px-4 py-3 text-sm outline-none transition focus:border-divine-blue"
                  />
                </div>

                <div>
                  <label htmlFor="admin-password" className="mb-1.5 block text-xs font-bold text-divine-ink">Password</label>
                  <input
                    id="admin-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-divine-border px-4 py-3 text-sm outline-none transition focus:border-divine-blue"
                  />
                </div>

                <button
                  type="submit"
                  disabled={busy || !client}
                  className="w-full rounded-full bg-divine-blue px-6 py-3.5 text-sm font-bold text-white transition hover:bg-divine-ink disabled:opacity-50"
                >
                  {busy ? "Authenticating…" : "Sign in securely"}
                </button>
              </form>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Stats Bar */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <div className="rounded-2xl border border-divine-border bg-white p-4 shadow-sm">
                  <p className="text-xs font-bold text-divine-muted uppercase tracking-wider">Total Active</p>
                  <p className="mt-2 text-2xl font-black text-divine-ink">{stats.total}</p>
                </div>
                <div className="rounded-2xl border border-divine-border bg-white p-4 shadow-sm">
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">New (Submitted)</p>
                  <p className="mt-2 text-2xl font-black text-blue-700">{stats.submitted}</p>
                </div>
                <div className="rounded-2xl border border-divine-border bg-white p-4 shadow-sm">
                  <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">In Review</p>
                  <p className="mt-2 text-2xl font-black text-indigo-700">{stats.underReview}</p>
                </div>
                <div className="rounded-2xl border border-divine-border bg-white p-4 shadow-sm">
                  <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Awaiting Info</p>
                  <p className="mt-2 text-2xl font-black text-amber-700">{stats.awaiting}</p>
                </div>
                <div className="rounded-2xl border border-divine-border bg-white p-4 shadow-sm col-span-2 sm:col-span-1">
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Completed</p>
                  <p className="mt-2 text-2xl font-black text-emerald-700">{stats.completed}</p>
                </div>
              </div>

              {/* Filters and Search Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-divine-border bg-white p-4 shadow-sm">
                <div className="flex flex-1 flex-wrap items-center gap-3">
                  <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
                    <input
                      type="text"
                      placeholder="Search name, email, ref, area..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full rounded-xl border border-divine-border px-3.5 py-2 pl-9 text-xs outline-none focus:border-divine-blue"
                    />
                    <svg className="absolute left-3 top-2.5 h-4 w-4 text-divine-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>

                  <label className="flex items-center gap-2 text-xs font-bold text-divine-ink">
                    Status:
                    <select
                      value={statusFilter}
                      onChange={e => setStatusFilter(e.target.value)}
                      className="rounded-xl border border-divine-border bg-white px-2.5 py-2 text-xs font-medium"
                    >
                      <option value="all">All Statuses</option>
                      {statuses.map(s => (
                        <option key={s} value={s}>{s.replaceAll("_", " ")}</option>
                      ))}
                    </select>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-bold text-divine-ink">
                    Service:
                    <select
                      value={serviceFilter}
                      onChange={e => setServiceFilter(e.target.value)}
                      className="rounded-xl border border-divine-border bg-white px-2.5 py-2 text-xs font-medium"
                    >
                      <option value="all">All Services</option>
                      <option value="telecom">Telecom &amp; Data</option>
                      <option value="sim">SIM Services</option>
                      <option value="networking">Networking</option>
                      <option value="broadband">Broadband</option>
                      <option value="other">Other</option>
                    </select>
                  </label>
                </div>

                <button
                  type="button"
                  onClick={() => void load()}
                  disabled={busy}
                  className="rounded-full border border-divine-border bg-divine-ice px-4 py-2 text-xs font-bold text-divine-blue transition hover:bg-divine-soft"
                >
                  {busy ? "Loading…" : "Refresh"}
                </button>
              </div>

              {/* Enquiries Stream */}
              {items.length === 0 ? (
                <div className="rounded-3xl border border-divine-border bg-white p-12 text-center text-divine-muted shadow-soft">
                  <p className="text-base font-bold text-divine-ink">No enquiries match your filter.</p>
                  <p className="mt-1 text-xs">Try clearing the search query or changing the status filter.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map(item => (
                    <EnquiryCard
                      key={item.id}
                      item={item}
                      busy={busy}
                      onSave={saveEnquiry}
                      onAnonymize={handleGdprAnonymize}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {message && (
            <p role="status" aria-live="polite" className="mt-6 rounded-xl border border-divine-border bg-white p-4 text-xs font-semibold text-divine-muted shadow-sm">
              {message}
            </p>
          )}

          {/* Outbound Notifications Modal / Drawer */}
          {notificationsOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-divine-ink/50 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl border border-divine-border bg-white shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between border-b border-divine-border px-6 py-4">
                  <div>
                    <h2 className="text-lg font-black text-divine-ink">Outbound Notification Stream</h2>
                    <p className="text-xs text-divine-muted">Simulated / Dispatched customer confirmations &amp; staff alerts</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNotificationsOpen(false)}
                    className="grid h-8 w-8 place-items-center rounded-xl border border-divine-border text-divine-muted hover:text-divine-ink"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {notifications.length === 0 ? (
                    <p className="text-center text-xs text-divine-muted py-8">
                      No notifications logged in this server session yet. Submitting or updating an enquiry triggers outbound events.
                    </p>
                  ) : (
                    notifications.map(notif => (
                      <div key={notif.id} className="rounded-2xl border border-divine-border bg-divine-ice/40 p-4 text-xs">
                        <div className="flex items-center justify-between gap-2 border-b border-divine-border/60 pb-2 mb-2">
                          <span className="font-bold text-divine-blue uppercase">
                            {notif.channel} → {notif.recipient}
                          </span>
                          <span className="text-[11px] text-divine-muted">
                            {new Date(notif.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        {notif.subject && (
                          <p className="font-bold text-divine-ink mb-1.5">{notif.subject}</p>
                        )}
                        <pre className="whitespace-pre-wrap font-sans text-divine-muted text-[11px] leading-relaxed bg-white p-3 rounded-xl border border-divine-border/60">
                          {notif.body}
                        </pre>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

function EnquiryCard({
  item,
  busy,
  onSave,
  onAnonymize
}: {
  item: Enquiry;
  busy: boolean;
  onSave: (item: Enquiry, status: string, notes: string) => Promise<void>;
  onAnonymize: (item: Enquiry) => Promise<void>;
}) {
  const [status, setStatus] = useState(item.status);
  const [notes, setNotes] = useState(item.internal_notes ?? "");
  const [copiedRef, setCopiedRef] = useState(false);

  function copyRef() {
    navigator.clipboard.writeText(item.reference);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  }

  return (
    <article className="rounded-3xl border border-divine-border bg-white p-5 shadow-sm transition hover:shadow-soft sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-black tracking-wider text-divine-blue">{item.reference}</span>
            <button
              type="button"
              onClick={copyRef}
              className="text-[11px] font-bold text-divine-muted hover:text-divine-blue"
              title="Copy Reference"
            >
              {copiedRef ? "✓ Copied" : "[Copy]"}
            </button>
            <span className="text-xs text-divine-border">•</span>
            <span className="rounded-full bg-divine-ice px-2.5 py-0.5 text-[11px] font-bold uppercase text-divine-ink">
              {item.service}
            </span>
            <span className="rounded-full bg-divine-ice px-2.5 py-0.5 text-[11px] font-bold text-divine-muted">
              {item.audience}
            </span>
            <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase ${statusColor(item.status)}`}>
              {item.status.replaceAll("_", " ")}
            </span>
          </div>

          <h2 className="mt-2 text-xl font-extrabold text-divine-ink">{item.full_name}</h2>

          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-divine-muted">
            <a href={`mailto:${item.email}`} className="font-medium hover:text-divine-blue hover:underline">
              ✉ {item.email}
            </a>
            <a href={`tel:${item.phone}`} className="font-medium hover:text-divine-blue hover:underline">
              ☎ {item.phone}
            </a>
            <span>📍 {item.location}</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <time className="text-xs text-divine-muted">
            {new Date(item.created_at).toLocaleString()}
          </time>
          <button
            type="button"
            onClick={() => void onAnonymize(item)}
            className="text-[11px] font-semibold text-rose-600 hover:underline"
            title="Erase and anonymize personal information under UK GDPR Article 17"
          >
            🔒 Anonymize PII
          </button>
        </div>
      </div>

      <div className="my-5 rounded-2xl bg-divine-ice/80 p-4 text-xs leading-relaxed text-divine-ink border border-divine-border/60">
        <p className="font-bold text-[11px] uppercase tracking-wider text-divine-muted mb-1">Customer Requirements:</p>
        <p className="whitespace-pre-wrap">{item.details}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_2.5fr_auto] md:items-end">
        <div>
          <label className="mb-1.5 block text-xs font-bold text-divine-muted">Update Status</label>
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="w-full rounded-xl border border-divine-border bg-white px-3 py-2.5 text-xs font-medium outline-none focus:border-divine-blue"
          >
            {statuses.map(s => (
              <option key={s} value={s}>{s.replaceAll("_", " ")}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-xs font-bold text-divine-muted">Internal Staff Notes</label>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              🔒 Strictly Private to Staff
            </span>
          </div>
          <textarea
            rows={2}
            maxLength={4000}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Record feasibility check results, carrier quotes, or staff call notes..."
            className="w-full resize-y rounded-xl border border-divine-border bg-white px-3 py-2 text-xs outline-none focus:border-divine-blue"
          />
        </div>

        <button
          type="button"
          onClick={() => void onSave(item, status, notes)}
          disabled={busy}
          className="rounded-full bg-divine-blue px-5 py-2.5 text-xs font-bold text-white transition hover:bg-divine-ink disabled:opacity-50 shadow-sm"
        >
          Save Update
        </button>
      </div>
    </article>
  );
}
