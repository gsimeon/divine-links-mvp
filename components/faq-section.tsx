"use client";

import { useState } from "react";
import Link from "next/link";

type FAQItem = {
  question: string;
  answer: string;
  category: "general" | "feasibility" | "hardware" | "privacy";
};

const FAQS: FAQItem[] = [
  {
    category: "general",
    question: "How does the Divine Links enquiry process work?",
    answer: "You start by describing your connectivity, broadband, or networking needs through our enquiry form. Our technical operations desk reviews your location against regional telecommunications infrastructure maps. A specialist then contacts you directly to explain feasible options, carrier availability, and a clear next step—before any purchase or installation is committed."
  },
  {
    category: "general",
    question: "Why are fixed prices and instant bundles not advertised online?",
    answer: "Telecommunications and enterprise broadband in Nigeria depend heavily on physical location, distance from subsea cable landing backhauls, line-of-sight to radio masts, and local building ducting. Advertising flat prices without checking actual route availability would risk unmet expectations. We ensure every quotation is verified with carrier partners first."
  },
  {
    category: "general",
    question: "Does submitting an enquiry commit me to paying or signing a contract?",
    answer: "No. Submitting an enquiry is completely free and creates no legal or financial obligation. It is simply a request for feasibility review and consultation. You only enter into a formal contract once a detailed solution proposal is mutually agreed upon in writing."
  },
  {
    category: "feasibility",
    question: "How long does a feasibility check take?",
    answer: "Most urban areas (such as Ikeja, Victoria Island, Lekki, and Abuja CBD) are evaluated within 24 hours. For suburban or remote installations where physical radio line-of-sight or fibre junction testing is needed, verification typically concludes within 24 to 48 hours."
  },
  {
    category: "feasibility",
    question: "Can you provide connectivity for multi-site companies or branch offices?",
    answer: "Yes. We consult on multi-office WAN (Wide Area Network) setups, linking regional offices (e.g. Lagos, Abuja, and Port Harcourt) via redundant leased lines, encrypted VPN tunnels, and multi-SIM cellular failover gateways."
  },
  {
    category: "feasibility",
    question: "What if our building experiences poor mobile carrier reception?",
    answer: "We offer specialized solutions including high-gain directional external rooftop antennas, cellular signal repeaters, and fixed wireless microwave links that bypass congested terrestrial mobile basestations directly."
  },
  {
    category: "hardware",
    question: "Do you supply and configure routers, switches, and structured cabling?",
    answer: "Yes. Our networking solutions include enterprise Wi-Fi 6 access points, managed PoE switches, rack cabinets, CAT6/CAT7 structured cabling, and multi-WAN failover routers configured for load balancing."
  },
  {
    category: "hardware",
    question: "What happens if our connection goes down?",
    answer: "For mission-critical business setups, we design redundant active-failover architectures pairing primary fibre backhaul with an automated wireless or cellular backup link, ensuring your team stays online even during carrier maintenance."
  },
  {
    category: "privacy",
    question: "How is my personal and business enquiry data protected?",
    answer: "We adhere to strict UK GDPR and NDPA standards. Personal information is stored in encrypted databases with restricted server-only access. We do not sell your data or share it with unsolicited marketing brokers. Full details can be reviewed in our Privacy Notice."
  },
  {
    category: "privacy",
    question: "How can I request that my records be updated or deleted?",
    answer: "Under UK GDPR and NDPA, you have the right to request access, correction, or complete erasure of your data at any time. Simply email privacy@divinelinks.co quoting your enquiry reference number, and our team will process your request within 30 days without fee."
  }
];

export function FAQSection() {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [openIndices, setOpenIndices] = useState<number[]>([0]);

  const categories = [
    { id: "all", label: "All Questions" },
    { id: "general", label: "Enquiries & Pricing" },
    { id: "feasibility", label: "Coverage & Feasibility" },
    { id: "hardware", label: "Hardware & Setup" },
    { id: "privacy", label: "Privacy & Rights" }
  ];

  const filteredFaqs = activeCategory === "all"
    ? FAQS
    : FAQS.filter(f => f.category === activeCategory);

  function toggleQuestion(index: number) {
    setOpenIndices(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  }

  return (
    <section id="faq" className="border-t border-divine-border bg-white py-16 sm:py-24">
      <div className="container max-w-4xl">
        <div className="text-center">
          <p className="eyebrow">COMMON QUESTIONS</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-divine-ink sm:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="mt-3 text-base text-divine-muted">
            Everything you need to know about our enquiry model, coverage evaluation, and service terms.
          </p>
        </div>

        {/* Category Filter Pills */}
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {categories.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                activeCategory === cat.id
                  ? "bg-divine-ink text-white shadow-sm"
                  : "border border-divine-border bg-divine-ice/60 text-divine-muted hover:text-divine-ink hover:border-slate-300"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* FAQ Accordion List */}
        <div className="mt-10 space-y-3.5">
          {filteredFaqs.map((faq, idx) => {
            const isOpen = openIndices.includes(idx);
            return (
              <div
                key={faq.question}
                className="rounded-2xl border border-divine-border bg-white transition hover:border-divine-blue/60 shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => toggleQuestion(idx)}
                  className="flex w-full items-center justify-between gap-4 p-5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-divine-blue"
                  aria-expanded={isOpen}
                >
                  <span className="font-extrabold text-divine-ink text-sm sm:text-base">
                    {faq.question}
                  </span>
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-divine-ice font-bold text-divine-blue transition-transform duration-200 ${
                      isOpen ? "rotate-180 bg-divine-pale text-divine-teal" : ""
                    }`}
                    aria-hidden="true"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-divine-border/60 px-5 pb-5 pt-3 animate-in fade-in duration-200">
                    <p className="text-xs sm:text-sm leading-relaxed text-divine-muted">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Still Have Questions Box */}
        <div className="mt-12 rounded-3xl border border-divine-border bg-divine-ice p-6 sm:p-8 text-center">
          <h3 className="text-lg font-black text-divine-ink">Have a specific or complex technical requirement?</h3>
          <p className="mt-2 text-xs sm:text-sm text-divine-muted max-w-lg mx-auto">
            Our engineers can review site plans, multi-location WAN routing, or specialized carrier redundancy requirements.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href="/enquire"
              className="inline-flex items-center gap-2 rounded-full bg-divine-blue px-6 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-divine-ink"
            >
              Start an Enquiry <span>→</span>
            </Link>
            <Link
              href="/privacy"
              className="inline-flex items-center gap-1.5 rounded-full border border-divine-border bg-white px-5 py-3 text-xs font-bold text-divine-ink transition hover:border-divine-blue hover:text-divine-blue"
            >
              Review Privacy Standards
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
