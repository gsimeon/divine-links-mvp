import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ServiceCard } from "@/components/service-card";

function NetworkIllustration() {
  return (
    <div className="hero-orb relative mx-auto flex aspect-square w-full max-w-[490px] items-center justify-center overflow-hidden rounded-[2.5rem] border border-divine-border soft-grid">
      <div className="absolute left-[13%] top-[17%] h-16 w-16 rounded-3xl bg-white shadow-soft" />
      <div className="absolute right-[13%] top-[25%] h-12 w-12 rounded-2xl bg-divine-pale shadow-soft" />
      <div className="absolute bottom-[15%] left-[19%] h-12 w-12 rounded-2xl bg-divine-soft shadow-soft" />
      <svg viewBox="0 0 440 440" className="absolute inset-0 h-full w-full" fill="none" aria-hidden="true">
        <path d="M115 116L214 206L324 124M214 206L300 314L135 325M214 206L324 124M214 206L135 325" stroke="#A9CDE8" strokeWidth="2.5" strokeDasharray="5 8"/>
        <circle cx="115" cy="116" r="9" fill="#1676C8"/><circle cx="324" cy="124" r="9" fill="#13A89E"/><circle cx="135" cy="325" r="9" fill="#13A89E"/><circle cx="300" cy="314" r="9" fill="#1676C8"/>
      </svg>
      <div className="relative z-10 grid h-44 w-44 place-items-center rounded-[2.5rem] border border-white/80 bg-white/90 shadow-[0_24px_70px_rgba(22,118,200,.18)]">
        <div className="grid h-24 w-24 place-items-center rounded-[1.8rem] bg-divine-blue text-white">
          <svg viewBox="0 0 64 64" className="h-16 w-16" fill="none" aria-hidden="true">
            <path d="M16 23c4-4 10-4 14 0l4 4M48 41c-4 4-10 4-14 0l-4-4M22 42l20-20" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
            <path d="M18 32l-4-4a6 6 0 0 1 8-8l4 4M46 32l4 4a6 6 0 0 1-8 8l-4-4" stroke="#80E0D8" strokeWidth="4" strokeLinecap="round"/>
          </svg>
        </div>
      </div>
      <div className="absolute bottom-7 right-7 rounded-2xl border border-white bg-white/95 px-4 py-3 shadow-soft">
        <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-divine-teal"/><span className="text-sm font-bold text-divine-ink">Connected to what matters</span></div>
        <p className="mt-1 text-xs text-divine-muted">A plan shaped around you</p>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <section className="overflow-hidden bg-gradient-to-b from-divine-ice/80 to-white">
          <div className="container grid items-center gap-12 py-14 md:grid-cols-[1.03fr_.97fr] md:py-20 lg:gap-16 lg:py-24">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-divine-border bg-white px-4 py-2 text-xs font-bold text-divine-muted shadow-sm">
                <span className="h-2 w-2 rounded-full bg-divine-teal"/> CONNECTIONS THAT MOVE YOU FORWARD
              </div>
              <h1 className="max-w-xl text-5xl font-black leading-[1.05] tracking-[-.045em] text-divine-ink sm:text-6xl lg:text-[4.25rem]">
                Your world.<br/><span className="text-divine-blue">Better connected.</span>
              </h1>
              <p className="mt-6 max-w-lg text-lg leading-8 text-divine-muted">Discover telecom services and networking solutions for your home, your business, and the way you work.</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/enquire" className="inline-flex items-center justify-center gap-3 rounded-full bg-divine-blue px-7 py-4 font-bold text-white shadow-[0_12px_24px_rgba(22,118,200,.2)] transition hover:bg-divine-ink">Let’s get you connected <span>↗</span></Link>
                <Link href="#services" className="inline-flex items-center justify-center rounded-full border border-divine-border bg-white px-7 py-4 font-bold text-divine-ink transition hover:border-divine-blue hover:text-divine-blue">Explore services</Link>
              </div>
              <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-divine-muted">
                <span className="flex items-center gap-2"><span className="text-divine-teal">✓</span> Personalised guidance</span>
                <span className="flex items-center gap-2"><span className="text-divine-teal">✓</span> Clear next steps</span>
              </div>
            </div>
            <NetworkIllustration />
          </div>
        </section>

        <section className="border-y border-divine-border bg-white">
          <div className="container grid gap-5 py-7 sm:grid-cols-3 sm:gap-8">
            {[
              ["01", "Tell us what you need", "Share your goal, location and requirements."],
              ["02", "We review your options", "Our team checks what can be supported."],
              ["03", "Agree the next step", "We follow up with availability and a clear path forward."]
            ].map(([num, title, desc]) => (
              <div key={num} className="flex gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-divine-ice text-sm font-extrabold text-divine-blue">{num}</span>
                <div><h2 className="font-bold text-divine-ink">{title}</h2><p className="mt-1 text-sm leading-6 text-divine-muted">{desc}</p></div>
              </div>
            ))}
          </div>
        </section>

        <section id="services" className="container py-16 md:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">OUR SERVICES</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-divine-ink sm:text-4xl">The right connection starts with a conversation.</h2>
            <p className="mt-4 leading-7 text-divine-muted">Tell us what you’re trying to achieve. We’ll review your requirements and confirm the options available before anything is ordered or scheduled.</p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <ServiceCard number="01 / TELECOM" title="Telecom & data enquiries" description="Looking for mobile data, SIM-related services or connectivity options? Tell us what you need and we’ll review availability." items={["Data and telecom interest requests", "SIM-service enquiries", "Availability confirmed before purchase"]} tone="blue" service="telecom" />
            <ServiceCard number="02 / NETWORKING" title="Networking solutions" description="Plan a more reliable setup for your home, office or growing business with a tailored technical consultation." items={["Network setup and improvement", "Wi-Fi and connectivity assessment", "Installation and quotation requests"]} tone="teal" service="networking" />
          </div>
          <div className="mt-5 rounded-3xl border border-divine-border bg-divine-ice p-6 sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-8">
            <div><p className="eyebrow">BROADBAND & BUSINESS</p><h3 className="mt-2 text-2xl font-extrabold text-divine-ink">Connectivity for where you’re going.</h3><p className="mt-2 max-w-2xl leading-7 text-divine-muted">Ask about broadband options or business connectivity. Coverage and partner availability are checked individually; availability is not guaranteed.</p></div>
            <Link href="/enquire?service=broadband" className="mt-5 inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-6 py-3 font-bold text-divine-blue ring-1 ring-divine-border transition hover:ring-divine-blue sm:mt-0">Ask about broadband <span>→</span></Link>
          </div>
        </section>

        <section id="how-it-works" className="bg-divine-ice py-16 md:py-20">
          <div className="container grid items-center gap-10 md:grid-cols-2">
            <div>
              <p className="eyebrow">SIMPLE BY DESIGN</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-divine-ink sm:text-4xl">Helpful people. Clear next steps.</h2>
              <p className="mt-4 leading-7 text-divine-muted">The first step is a request, not a commitment. We’ll review your needs, follow up for any missing details and explain what we can support.</p>
              <Link href="/enquire" className="mt-7 inline-flex items-center gap-2 font-bold text-divine-blue">Start an enquiry <span>→</span></Link>
            </div>
            <div className="rounded-3xl border border-divine-border bg-white p-6 shadow-soft sm:p-8">
              {[
                ["01", "Send your requirements", "Choose a service and tell us a little about your needs."],
                ["02", "We review and follow up", "A team member checks the details and may contact you for clarification."],
                ["03", "Confirm before proceeding", "Any price, availability, partner or appointment is confirmed with you first."]
              ].map(([n, title, desc], i) => <div key={n} className={`flex gap-4 ${i ? "mt-7 border-t border-divine-border pt-7" : ""}`}><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-divine-pale font-extrabold text-divine-teal">{n}</span><div><h3 className="font-bold text-divine-ink">{title}</h3><p className="mt-1 text-sm leading-6 text-divine-muted">{desc}</p></div></div>)}
            </div>
          </div>
        </section>

        <section id="business" className="container py-16 md:py-24">
          <div className="relative overflow-hidden rounded-[2rem] bg-divine-ink px-7 py-10 text-white sm:px-12 sm:py-14">
            <div className="absolute -right-10 -top-24 h-72 w-72 rounded-full border-[36px] border-white/5" />
            <div className="relative max-w-2xl">
              <p className="text-xs font-extrabold tracking-[.16em] text-[#80E0D8]">FOR TEAMS & BUSINESSES</p>
              <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Your work depends on staying connected.</h2>
              <p className="mt-4 max-w-xl leading-7 text-white/75">Share your site, team size and networking goals. We’ll review your requirements and discuss a suitable next step.</p>
              <Link href="/enquire?service=networking&audience=business" className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 font-bold text-divine-ink transition hover:bg-divine-pale">Request a business consultation <span>↗</span></Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
