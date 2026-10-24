"use client";

import { FormEvent, useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

type TimelineData = {
  step: number;
  title: string;
  description: string;
  nextAction: string;
};

type TrackResult = {
  reference: string;
  service: string;
  location: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  timeline: TimelineData;
};

const STEPS = [
  { step: 1, label: "Submitted" },
  { step: 2, label: "Technical Review" },
  { step: 3, label: "Carrier Feasibility" },
  { step: 4, label: "Quote Prepared" },
  { step: 5, label: "Completed" }
];

export default function TrackPage() {
  return (
    <Suspense fallback={<TrackFallback />}>
      <TrackContent />
    </Suspense>
  );
}

function TrackFallback() {
  return (
    <>
      <Header />
      <main className="min-h-[75vh] bg-divine-ice/40 py-12 sm:py-16">
        <div className="container max-w-xl text-center">
          <p className="text-sm text-divine-muted">Loading tracker...</p>
        </div>
      </main>
      <Footer />
    </>
  );
}

function TrackContent() {
  const searchParams = useSearchParams();
  const initialRef = searchParams.get("ref") ?? "";

  const [reference, setReference] = useState(initialRef);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<TrackResult | null>(null);

  useEffect(() => {
    if (initialRef) {
      setReference(initialRef.toUpperCase());
    }
  }, [initialRef]);

  async function handleLookup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErrorMsg("");
    setResult(null);

    try {
      const res = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: reference.trim().toUpperCase(), email: email.trim().toLowerCase() })
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Could not find a matching enquiry. Please verify both fields.");
      } else {
        setResult(data.enquiry);
      }
    } catch {
      setErrorMsg("Unable to reach the tracking service. Please check your internet connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Header />
      <main className="min-h-[75vh] bg-gradient-to-b from-divine-ice/60 via-white to-white py-12 sm:py-16">
        <div className="container max-w-2xl">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-divine-border bg-white px-3.5 py-1.5 text-xs font-bold text-divine-blue">
              <span>REAL-TIME LOOKUP</span>
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-divine-ink sm:text-4xl">
              Track Your Enquiry
            </h1>
            <p className="mt-2 text-sm text-divine-muted">
              Enter your unique enquiry reference number and registered email to check review status and next steps.
            </p>
          </div>

          {/* Lookup Form */}
          <form onSubmit={handleLookup} className="mt-8 rounded-3xl border border-divine-border bg-white p-6 shadow-soft sm:p-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="ref" className="mb-2 block text-xs font-bold uppercase tracking-wider text-divine-ink">
                  Enquiry Reference *
                </label>
                <input
                  id="ref"
                  type="text"
                  required
                  placeholder="e.g. DL-1A2B3C4D"
                  value={reference}
                  onChange={e => setReference(e.target.value.toUpperCase())}
                  className="w-full rounded-xl border border-divine-border px-4 py-3 font-mono text-sm uppercase outline-none transition focus:border-divine-blue"
                />
              </div>

              <div>
                <label htmlFor="lookup-email" className="mb-2 block text-xs font-bold uppercase tracking-wider text-divine-ink">
                  Registered Email Address *
                </label>
                <input
                  id="lookup-email"
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-divine-border px-4 py-3 text-sm outline-none transition focus:border-divine-blue"
                />
              </div>
            </div>

            {errorMsg && (
              <div role="alert" className="mt-4 rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-xs font-semibold text-rose-800">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-divine-blue px-6 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-divine-ink disabled:opacity-50"
            >
              {busy ? "Checking Status…" : "Check Status"} <span aria-hidden="true">→</span>
            </button>
          </form>

          {/* Result Card & Stepper */}
          {result && (
            <div className="mt-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="rounded-3xl border border-divine-border bg-white p-6 shadow-soft sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-divine-border pb-5">
                  <div>
                    <span className="font-mono text-xs font-black tracking-wider text-divine-blue">
                      {result.reference}
                    </span>
                    <h2 className="mt-1 text-2xl font-black text-divine-ink">
                      {result.timeline.title}
                    </h2>
                    <p className="mt-1 text-xs text-divine-muted">
                      Service: <strong className="uppercase text-divine-ink">{result.service}</strong> · Location: <strong>{result.location}</strong>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="block text-[11px] font-bold text-divine-muted uppercase">Submitted On</span>
                    <time className="text-xs font-semibold text-divine-ink">
                      {new Date(result.createdAt).toLocaleDateString()}
                    </time>
                  </div>
                </div>

                {/* Progress Stepper */}
                {result.timeline.step > 0 && (
                  <div className="mt-8">
                    <p className="mb-4 text-xs font-extrabold uppercase tracking-wider text-divine-muted">
                      Review Progress
                    </p>
                    <div className="relative flex justify-between">
                      {/* Stepper background track */}
                      <div className="absolute top-4 left-4 right-4 h-0.5 bg-divine-border -z-0" />
                      {STEPS.map(s => {
                        const isDone = s.step < result.timeline.step;
                        const isCurrent = s.step === result.timeline.step;
                        return (
                          <div key={s.step} className="relative z-10 flex flex-col items-center text-center">
                            <div
                              className={`grid h-8 w-8 place-items-center rounded-full text-xs font-black transition-colors ${
                                isDone
                                  ? "bg-divine-teal text-white"
                                  : isCurrent
                                  ? "bg-divine-blue text-white ring-4 ring-divine-pale"
                                  : "bg-white border-2 border-divine-border text-divine-muted"
                              }`}
                            >
                              {isDone ? "✓" : s.step}
                            </div>
                            <span
                              className={`mt-2 text-[10px] sm:text-xs font-bold max-w-[65px] sm:max-w-none ${
                                isCurrent
                                  ? "text-divine-blue"
                                  : isDone
                                  ? "text-divine-ink"
                                  : "text-divine-muted opacity-70"
                              }`}
                            >
                              {s.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Status Explanation */}
                <div className="mt-8 rounded-2xl bg-divine-ice/80 p-5 border border-divine-border">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-divine-muted">
                    Current Stage Status
                  </p>
                  <p className="mt-1 text-sm font-medium leading-relaxed text-divine-ink">
                    {result.timeline.description}
                  </p>
                  <div className="mt-3 pt-3 border-t border-divine-border/60 flex items-center gap-2 text-xs text-divine-muted">
                    <span className="font-bold text-divine-blue">Next Action:</span>
                    <span>{result.timeline.nextAction}</span>
                  </div>
                </div>

                {/* Follow up box */}
                <div className="mt-6 flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-divine-border text-xs text-divine-muted">
                  <p>
                    Need to provide new information? Email <a href="mailto:ops@divinelinks.co" className="font-bold text-divine-blue hover:underline">ops@divinelinks.co</a>
                  </p>
                  <Link
                    href="/privacy"
                    className="font-semibold hover:text-divine-blue"
                  >
                    Privacy Notice
                  </Link>
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
