"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

type Props = { initialService: string; initialAudience: string };

const services = [
  { value: "telecom", label: "Telecom or data enquiry" },
  { value: "sim", label: "SIM-related service enquiry" },
  { value: "networking", label: "Networking consultation / quote" },
  { value: "broadband", label: "Broadband availability enquiry" },
  { value: "other", label: "Something else" }
];

export function EnquiryForm({ initialService, initialAudience }: Props) {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [reference, setReference] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setMessage("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = Object.fromEntries(data.entries());

    try {
      const response = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok) {
        setStatus("error");
        setMessage(result.error ?? "We couldn’t submit your enquiry. Please try again later.");
        return;
      }
      setReference(result.reference ?? "");
      setStatus("success");
      setMessage("Your enquiry has been received and logged into our review queue.");
      form.reset();
    } catch {
      setStatus("error");
      setMessage("We couldn’t reach the enquiry service. Please check your internet connection and try again.");
    }
  }

  function handleCopyReference() {
    if (!reference) return;
    navigator.clipboard.writeText(reference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleReset() {
    setStatus("idle");
    setMessage("");
    setReference("");
  }

  if (status === "success" && reference) {
    return (
      <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-divine-pale text-divine-teal shadow-soft">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-7 w-7" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div>
          <span className="inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
            ENQUIRY LOGGED
          </span>
          <h2 className="mt-3 text-3xl font-black text-divine-ink">Thank you. We have received your request.</h2>
          <p className="mt-2 text-sm leading-relaxed text-divine-muted">
            Our team will review your specifications and verify partner coverage before replying.
          </p>
        </div>

        <div className="rounded-2xl border border-divine-border bg-divine-ice/80 p-5">
          <p className="text-xs font-extrabold uppercase tracking-wider text-divine-muted">Your Enquiry Reference</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="font-mono text-2xl font-black tracking-wide text-divine-ink">{reference}</span>
            <button
              type="button"
              onClick={handleCopyReference}
              className="inline-flex items-center gap-1.5 rounded-xl border border-divine-border bg-white px-3.5 py-2 text-xs font-bold text-divine-ink shadow-sm transition hover:border-divine-blue hover:text-divine-blue"
            >
              {copied ? (
                <>
                  <span className="text-emerald-600">✓</span> Copied
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>
          <p className="mt-3 text-xs leading-5 text-divine-muted">
            Please quote this reference in any follow-up emails or calls with Divine Links.
          </p>
        </div>

        <div className="space-y-3 rounded-2xl border border-divine-border bg-white p-5 text-sm">
          <p className="font-bold text-divine-ink">What happens next?</p>
          <ul className="space-y-2 text-xs leading-relaxed text-divine-muted">
            <li className="flex items-start gap-2">
              <span className="font-bold text-divine-teal">1.</span>
              <span>Our staff reviews your requirements against carrier maps and technical feasibility.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-divine-teal">2.</span>
              <span>We reach out to you via email or phone to confirm options and quotation pricing.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-divine-teal">3.</span>
              <span>No fees are charged until you explicitly approve a proposed plan or schedule.</span>
            </li>
          </ul>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="inline-flex w-full items-center justify-center rounded-full border border-divine-border bg-white px-6 py-3.5 text-sm font-bold text-divine-ink shadow-sm transition hover:border-divine-blue hover:text-divine-blue"
        >
          Submit another enquiry
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold text-divine-ink">Enquiry details</h2>
        <p className="mt-1 text-sm text-divine-muted">Fields marked * are required.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name *" name="fullName" required autoComplete="name" placeholder="e.g. Jane Doe" />
        <Field label="Email address *" name="email" type="email" required autoComplete="email" placeholder="jane@example.com" />
        <Field label="Phone number *" name="phone" type="tel" required autoComplete="tel" placeholder="+234 800 000 0000" />
        <Field label="City or area *" name="location" required autoComplete="address-level2" placeholder="e.g. Ikeja, Lagos" />
      </div>

      <div>
        <label htmlFor="service" className="mb-2 block text-sm font-bold text-divine-ink">
          What can we help with? *
        </label>
        <select
          id="service"
          name="service"
          required
          defaultValue={services.some(s => s.value === initialService) ? initialService : ""}
          className="w-full rounded-xl border border-divine-border bg-white px-4 py-3.5 text-divine-ink outline-none transition focus:border-divine-blue"
        >
          <option value="" disabled>Select a service category</option>
          {services.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      <div>
        <label htmlFor="audience" className="mb-2 block text-sm font-bold text-divine-ink">
          You’re enquiring as
        </label>
        <select
          id="audience"
          name="audience"
          defaultValue={initialAudience === "business" ? "business" : "individual"}
          className="w-full rounded-xl border border-divine-border bg-white px-4 py-3.5 text-divine-ink outline-none transition focus:border-divine-blue"
        >
          <option value="individual">An individual / household</option>
          <option value="business">A business / organisation</option>
        </select>
      </div>

      <div>
        <label htmlFor="details" className="mb-2 block text-sm font-bold text-divine-ink">
          Tell us a little more *
        </label>
        <textarea
          id="details"
          name="details"
          required
          minLength={10}
          maxLength={2000}
          rows={5}
          placeholder="What are you trying to achieve? Describe your requirements, preferred speeds, or setup goals. Please do NOT include passwords or payment cards."
          className="w-full resize-y rounded-xl border border-divine-border bg-white px-4 py-3.5 text-divine-ink outline-none transition placeholder:text-slate-400 focus:border-divine-blue"
        />
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-divine-border/80 bg-divine-ice/40 p-3.5">
        <input
          id="consent"
          name="consent"
          type="checkbox"
          value="yes"
          required
          className="mt-1 h-4 w-4 shrink-0 rounded accent-divine-blue focus:ring-divine-blue"
        />
        <label htmlFor="consent" className="text-xs leading-relaxed text-divine-muted">
          I consent to Divine Links processing my details in accordance with its{" "}
          <Link href="/privacy" target="_blank" className="font-bold text-divine-blue hover:underline">
            Privacy Notice
          </Link>{" "}
          to review and respond to this enquiry. * (Not for emergency telecom services)
        </label>
      </div>

      {/* Anti-spam honeypot */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[10000px] h-px w-px opacity-0" />

      {message && status === "error" && (
        <div role="status" aria-live="polite" className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm leading-6 text-rose-800">
          <div className="flex items-center gap-2">
            <span className="font-bold">Error:</span> {message}
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-divine-blue px-6 py-4 font-bold text-white transition hover:bg-divine-ink disabled:cursor-wait disabled:opacity-60 shadow-[0_10px_20px_rgba(22,118,200,0.18)]"
      >
        {status === "sending" ? "Submitting enquiry…" : "Submit enquiry"} <span aria-hidden="true">→</span>
      </button>

      <p className="text-center text-xs leading-5 text-divine-muted">
        Submitting this form does not confirm a service, order, price or appointment.
      </p>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
  autoComplete,
  placeholder
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-2 block text-sm font-bold text-divine-ink">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        maxLength={160}
        className="w-full rounded-xl border border-divine-border bg-white px-4 py-3.5 text-divine-ink outline-none transition placeholder:text-slate-400 focus:border-divine-blue"
      />
    </div>
  );
}
