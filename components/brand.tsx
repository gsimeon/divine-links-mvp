import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-3" aria-label="Divine Links home">
      <span className="relative grid h-11 w-11 place-items-center rounded-2xl bg-divine-blue text-white shadow-soft">
        <svg viewBox="0 0 40 40" className="h-7 w-7" fill="none" aria-hidden="true">
          <path d="M10 12.5c2.6-2.7 6.8-2.7 9.4 0l2.1 2.1M30 27.5c-2.6 2.7-6.8 2.7-9.4 0l-2.1-2.1" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
          <path d="M14 25.5l12-12M11 20l-2.2-2.2a4.4 4.4 0 0 1 6.2-6.2l2.2 2.2M29 20l2.2 2.2a4.4 4.4 0 0 1-6.2 6.2l-2.2-2.2" stroke="#80E0D8" strokeWidth="3" strokeLinecap="round"/>
        </svg>
      </span>
      {!compact && <span className="leading-tight">
        <span className="block text-lg font-extrabold tracking-tight text-divine-ink">divine<span className="text-divine-blue">links</span></span>
        <span className="block text-[10px] font-semibold tracking-[.16em] text-divine-muted">RIGHT THERE, RIGHT NOW</span>
      </span>}
    </Link>
  );
}
