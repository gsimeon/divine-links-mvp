import Link from "next/link";

type Props = { number: string; title: string; description: string; items: string[]; tone: "blue" | "teal"; service: string };

export function ServiceCard({ number, title, description, items, tone, service }: Props) {
  const toneClass = tone === "teal" ? "bg-divine-pale text-divine-teal" : "bg-divine-soft text-divine-blue";
  return (
    <article className="group flex h-full flex-col rounded-3xl border border-divine-border bg-white p-7 shadow-[0_6px_24px_rgba(23,50,79,.035)] transition hover:-translate-y-1 hover:shadow-soft sm:p-8">
      <div className="flex items-center justify-between">
        <span className={`grid h-12 w-12 place-items-center rounded-2xl ${toneClass}`}>
          {tone === "teal" ? (
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 9a10 10 0 0 1 14 0M8 12a6 6 0 0 1 8 0m-5 3a2 2 0 0 1 2 0M12 19h.01"/></svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 9h8M8 13h5M8 17h8"/></svg>
          )}
        </span>
        <span className="text-xs font-bold tracking-[.12em] text-slate-400">{number}</span>
      </div>
      <h3 className="mt-6 text-2xl font-extrabold tracking-tight text-divine-ink">{title}</h3>
      <p className="mt-3 leading-7 text-divine-muted">{description}</p>
      <ul className="mt-5 space-y-3 text-sm text-divine-ink">
        {items.map((item) => <li key={item} className="flex gap-3"><span className="mt-0.5 text-divine-teal">✓</span><span>{item}</span></li>)}
      </ul>
      <div className="mt-auto pt-7">
        <Link href={`/enquire?service=${encodeURIComponent(service)}`} className="inline-flex items-center gap-2 font-bold text-divine-blue group-hover:gap-3">
          Discuss your needs <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}
