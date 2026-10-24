"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "divine_cookie_consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        // Small delay so it appears smoothly after page load
        const timer = setTimeout(() => setVisible(true), 600);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage may fail in restricted/private modes
    }
  }, []);

  function handleDismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "acknowledged");
    } catch {
      // Ignored
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <aside
      aria-label="Privacy and cookies notice"
      role="region"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-xl animate-in fade-in slide-in-from-bottom-5 duration-300 sm:bottom-6 sm:right-6 sm:mx-0"
    >
      <div className="rounded-2xl border border-divine-border/80 bg-white/95 p-5 shadow-[0_16px_40px_rgba(23,50,79,0.14)] backdrop-blur-md">
        <div className="flex items-start gap-3.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-divine-pale text-divine-teal">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
              <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-bold text-divine-ink">Your Privacy & Essential Data</h2>
            <p className="mt-1 text-xs leading-relaxed text-divine-muted">
              We respect your privacy under UK GDPR and NDPA. Divine Links uses only strictly necessary technical cookies and local storage to keep our site secure and maintain internal enquiry desks. We do not use third-party marketing or tracking pixels.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleDismiss}
                className="rounded-full bg-divine-blue px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-divine-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-divine-blue"
              >
                Acknowledge & Close
              </button>
              <Link
                href="/privacy"
                className="text-xs font-semibold text-divine-muted transition hover:text-divine-blue"
              >
                Privacy Notice
              </Link>
              <span className="text-xs text-divine-border">•</span>
              <Link
                href="/cookies"
                className="text-xs font-semibold text-divine-muted transition hover:text-divine-blue"
              >
                Cookie Details
              </Link>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
