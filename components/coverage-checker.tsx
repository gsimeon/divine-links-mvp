"use client";

import { useState } from "react";
import Link from "next/link";

type CoverageZone = {
  id: string;
  state: string;
  area: string;
  readiness: "verified" | "survey_required" | "rapid_deploy";
  turnaround: string;
  technologies: {
    name: string;
    icon: string;
    speedEstimate: string;
    description: string;
  }[];
  popularFor: string;
};

const ZONES: CoverageZone[] = [
  {
    id: "lagos-vi-lekki",
    state: "Lagos",
    area: "Victoria Island, Ikoyi & Lekki Phase 1",
    readiness: "verified",
    turnaround: "Same-Day Feasibility Check",
    popularFor: "Corporate Headquarters, Financial Firms & High-Density Offices",
    technologies: [
      { name: "Direct Metro Fibre Backhaul", icon: "⚡", speedEstimate: "Up to 10 Gbps", description: "Direct subsea-landing redundant fibre links with 99.9% uptime target." },
      { name: "Enterprise 5G FWA", icon: "📡", speedEstimate: "150 - 500 Mbps", description: "Low-latency fixed wireless for rapid business connectivity." },
      { name: "Redundant Backup LTE", icon: "📶", speedEstimate: "Failover Link", description: "Seamless automatic multi-carrier cellular backup." }
    ]
  },
  {
    id: "lagos-ikeja",
    state: "Lagos",
    area: "Ikeja (CBD, GRA & Industrial Estate)",
    readiness: "verified",
    turnaround: "Within 24 Hours",
    popularFor: "Industrial Manufacturing, Aviation Offices & Enterprise Tech Hubs",
    technologies: [
      { name: "Metro Commercial Fibre", icon: "⚡", speedEstimate: "100 Mbps - 1 Gbps", description: "Dedicated enterprise bandwidth with symmetrical upload and download." },
      { name: "High-Capacity Fixed Wireless", icon: "📡", speedEstimate: "100 - 300 Mbps", description: "Point-to-Multipoint licensed frequency wireless transmission." },
      { name: "Multi-SIM Failover Gateway", icon: "📶", speedEstimate: "Multi-Carrier", description: "Carrier-aggregated SIM data solutions for guaranteed continuity." }
    ]
  },
  {
    id: "lagos-yaba",
    state: "Lagos",
    area: "Yaba, Surulere & Mainland Hubs",
    readiness: "verified",
    turnaround: "Within 24 Hours",
    popularFor: "Technology Startups, Co-working Spaces & Creative Studios",
    technologies: [
      { name: "Tech Hub Fibre Access", icon: "⚡", speedEstimate: "50 - 500 Mbps", description: "Cost-effective high-throughput connection optimized for developers and teams." },
      { name: "Office Wi-Fi 6 Mesh", icon: "📶", speedEstimate: "Indoor / Campus", description: "Structured cabling and ceiling-mount access point installations." }
    ]
  },
  {
    id: "abuja-cbd",
    state: "Abuja (FCT)",
    area: "Central Business District, Maitama & Wuse 2",
    readiness: "verified",
    turnaround: "Same-Day Feasibility Check",
    popularFor: "Government Consultancies, Diplomatic Missions & Professional Firms",
    technologies: [
      { name: "Government & Enterprise Backbone", icon: "⚡", speedEstimate: "Up to 1 Gbps", description: "Secure, low-jitter dedicated lines for cloud workloads and video conferencing." },
      { name: "5G High-Performance FWA", icon: "📡", speedEstimate: "200 - 600 Mbps", description: "Ultra-fast deployment for instant office activation without digging." }
    ]
  },
  {
    id: "abuja-suburbs",
    state: "Abuja (FCT)",
    area: "Gwarinpa, Jabi, Utako & Airport Road",
    readiness: "survey_required",
    turnaround: "24 - 48 Hours",
    popularFor: "Residential Estates, Commercial Plazas & Logistics Warehouses",
    technologies: [
      { name: "Fixed Wireless Access (FWA)", icon: "📡", speedEstimate: "50 - 200 Mbps", description: "Direct line-of-sight wireless from local telecommunication masts." },
      { name: "4G LTE High-Gain Antenna", icon: "📶", speedEstimate: "Optimized Signal", description: "External directional rooftop antennas to maximize signal quality." }
    ]
  },
  {
    id: "ph-trans-amadi",
    state: "Rivers (Port Harcourt)",
    area: "Trans-Amadi Industrial Layout & Old GRA",
    readiness: "survey_required",
    turnaround: "24 - 48 Hours",
    popularFor: "Energy & Marine Contractors, Fabrication Yards & Regional Offices",
    technologies: [
      { name: "Dedicated Industrial Leased Line", icon: "⚡", speedEstimate: "Custom Bandwidth", description: "Robust point-to-point data connections built for demanding operational environments." },
      { name: "Microwave Wireless Link", icon: "📡", speedEstimate: "Up to 500 Mbps", description: "High-power line-of-sight microwave transmission." }
    ]
  },
  {
    id: "oyo-ibadan",
    state: "Oyo State",
    area: "Ibadan (Bodija, Ring Road & Dugbe)",
    readiness: "rapid_deploy",
    turnaround: "Within 24 Hours",
    popularFor: "Retail Hubs, Regional Branches & Growing Enterprises",
    technologies: [
      { name: "Commercial Broadband", icon: "⚡", speedEstimate: "30 - 200 Mbps", description: "Reliable internet for point-of-sale, inventory, and office workstations." },
      { name: "Managed SIM Connectivity", icon: "📶", speedEstimate: "Cellular Multi-Link", description: "Data bundle management and SIM routers for remote branch sites." }
    ]
  }
];

export function CoverageChecker() {
  const [selectedState, setSelectedState] = useState<string>("All");
  const [selectedZoneId, setSelectedZoneId] = useState<string>(ZONES[0].id);

  const states = ["All", ...Array.from(new Set(ZONES.map(z => z.state)))];

  const filteredZones = selectedState === "All"
    ? ZONES
    : ZONES.filter(z => z.state === selectedState);

  const activeZone = ZONES.find(z => z.id === selectedZoneId) ?? filteredZones[0];

  function getBadge(readiness: CoverageZone["readiness"]) {
    switch (readiness) {
      case "verified":
        return {
          text: "Infrastructure Verified",
          classes: "bg-emerald-50 text-emerald-800 border-emerald-200"
        };
      case "survey_required":
        return {
          text: "Site Survey Recommended",
          classes: "bg-amber-50 text-amber-800 border-amber-200"
        };
      case "rapid_deploy":
        return {
          text: "Rapid Deployment Available",
          classes: "bg-cyan-50 text-cyan-800 border-cyan-200"
        };
    }
  }

  const badge = getBadge(activeZone.readiness);

  return (
    <section id="coverage" className="border-t border-divine-border bg-gradient-to-b from-white via-divine-ice/40 to-white py-16 sm:py-24">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">REGIONAL NETWORK REACH</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-divine-ink sm:text-4xl">
            Service Coverage &amp; Infrastructure
          </h2>
          <p className="mt-3 text-base text-divine-muted">
            Explore connectivity options across major commercial corridors and residential hubs in Nigeria. Feasibility is confirmed with carrier partners before quotation approval.
          </p>
        </div>

        {/* State Filter Tabs */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
          {states.map(state => (
            <button
              key={state}
              type="button"
              onClick={() => {
                setSelectedState(state);
                const firstInState = state === "All" ? ZONES[0] : ZONES.find(z => z.state === state);
                if (firstInState) setSelectedZoneId(firstInState.id);
              }}
              className={`rounded-full px-5 py-2.5 text-xs font-bold transition ${
                selectedState === state
                  ? "bg-divine-blue text-white shadow-[0_4px_14px_rgba(22,118,200,0.25)]"
                  : "border border-divine-border bg-white text-divine-ink hover:border-divine-blue"
              }`}
            >
              {state === "All" ? "All Locations" : state}
            </button>
          ))}
        </div>

        {/* Main Coverage Grid */}
        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:items-start">
          {/* Zone Selector List */}
          <div className="space-y-3">
            <p className="text-xs font-extrabold uppercase tracking-wider text-divine-muted">
              Select District or Hub ({filteredZones.length})
            </p>
            <div className="space-y-2.5">
              {filteredZones.map(zone => {
                const isSelected = zone.id === activeZone.id;
                return (
                  <button
                    key={zone.id}
                    type="button"
                    onClick={() => setSelectedZoneId(zone.id)}
                    className={`w-full text-left rounded-2xl p-4 transition border ${
                      isSelected
                        ? "border-divine-blue bg-white shadow-soft ring-1 ring-divine-blue"
                        : "border-divine-border bg-white/70 hover:bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-divine-blue uppercase">
                        {zone.state}
                      </span>
                      <span className="text-[11px] text-divine-muted font-medium">
                        {zone.turnaround}
                      </span>
                    </div>
                    <p className="mt-1 font-bold text-divine-ink text-sm sm:text-base">
                      {zone.area}
                    </p>
                    <p className="mt-1 text-xs text-divine-muted line-clamp-1">
                      {zone.popularFor}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Zone Detail Showcase */}
          <div className="rounded-3xl border border-divine-border bg-white p-6 shadow-soft sm:p-8 animate-in fade-in duration-300">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-divine-border pb-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-divine-blue">
                    {activeZone.state} Corridor
                  </span>
                  <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${badge.classes}`}>
                    {badge.text}
                  </span>
                </div>
                <h3 className="mt-1 text-2xl font-black text-divine-ink sm:text-3xl">
                  {activeZone.area}
                </h3>
                <p className="mt-1 text-xs text-divine-muted">
                  Commonly deployed for: <span className="font-semibold text-divine-ink">{activeZone.popularFor}</span>
                </p>
              </div>

              <div className="rounded-2xl bg-divine-ice px-4 py-2.5 text-right">
                <span className="block text-[11px] font-bold uppercase text-divine-muted">Response SLA</span>
                <span className="text-xs font-black text-divine-blue">{activeZone.turnaround}</span>
              </div>
            </div>

            {/* Technologies Supported in this zone */}
            <div className="mt-6 space-y-4">
              <p className="text-xs font-extrabold uppercase tracking-wider text-divine-muted">
                Available Connection Technologies:
              </p>

              <div className="space-y-3">
                {activeZone.technologies.map(tech => (
                  <div
                    key={tech.name}
                    className="flex items-start gap-4 rounded-2xl border border-divine-border bg-divine-ice/40 p-4 transition hover:bg-divine-ice/70"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-lg shadow-sm">
                      {tech.icon}
                    </span>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="font-extrabold text-divine-ink text-sm sm:text-base">
                          {tech.name}
                        </h4>
                        <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-mono font-bold text-divine-blue border border-divine-border">
                          {tech.speedEstimate}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-divine-muted">
                        {tech.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Call to Action pre-populated for this area */}
            <div className="mt-8 rounded-2xl bg-divine-pale/80 p-5 border border-teal-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="font-extrabold text-teal-950 text-sm">
                  Ready to confirm options for your address?
                </p>
                <p className="mt-0.5 text-xs text-teal-800">
                  We will evaluate direct carrier pathing and send a tailored quotation.
                </p>
              </div>
              <Link
                href={`/enquire?location=${encodeURIComponent(activeZone.area)}&service=broadband`}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-divine-blue px-5 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-divine-ink"
              >
                Check My Exact Address <span>↗</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
