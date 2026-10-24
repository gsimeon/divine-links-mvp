"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

type Workload = {
  id: string;
  label: string;
  mbpsPerUser: number;
  icon: string;
};

const WORKLOADS: Workload[] = [
  { id: "video", label: "HD & 4K Video Meetings (Zoom, Teams)", mbpsPerUser: 5, icon: "📹" },
  { id: "cloud", label: "Cloud Sync & Large File Transfers", mbpsPerUser: 8, icon: "☁️" },
  { id: "voip", label: "VoIP Telephony & CRM Audio", mbpsPerUser: 2, icon: "📞" },
  { id: "vpn", label: "Remote Office VPN & Database Access", mbpsPerUser: 6, icon: "🔒" },
  { id: "guest", label: "Customer / Guest Wi-Fi Network", mbpsPerUser: 4, icon: "📶" }
];

export function SolutionCalculator() {
  const [users, setUsers] = useState<number>(15);
  const [selectedWorkloads, setSelectedWorkloads] = useState<string[]>(["video", "cloud"]);
  const [siteType, setSiteType] = useState<"single" | "multi_floor" | "multi_branch">("single");

  function toggleWorkload(id: string) {
    setSelectedWorkloads(prev =>
      prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]
    );
  }

  // Calculate estimated requirement
  const recommendation = useMemo(() => {
    const basePerUser = selectedWorkloads.reduce((acc, id) => {
      const match = WORKLOADS.find(w => w.id === id);
      return acc + (match?.mbpsPerUser ?? 3);
    }, 2);

    const calculatedMbps = Math.max(25, Math.round(users * basePerUser * 0.7)); // 0.7 concurrency factor

    let tier = "";
    let technology = "";
    let hardware = "";

    if (users <= 8 && calculatedMbps <= 60) {
      tier = "Essential Business / Prosumer";
      technology = "High-Capacity 5G Fixed Wireless (FWA) or Shared Fibre";
      hardware = "Wi-Fi 6 Router with Cellular Multi-SIM Gateway";
    } else if (users <= 30 && calculatedMbps <= 250) {
      tier = "Growing Corporate Team";
      technology = "Dedicated Symmetrical Metro Fibre (100–300 Mbps)";
      hardware = "Dual-WAN Failover Router, 24-Port Managed PoE Switch, 2x Ceiling Wi-Fi 6 APs";
    } else {
      tier = "Enterprise & High-Density Facility";
      technology = "Direct Metro Leased Line Fibre (500 Mbps – 1 Gbps) with Wireless Microwave Backup";
      hardware = "Enterprise Gateway, 48-Port Managed Switch, Structured CAT6 Cabling & Multiple Wi-Fi 6 APs";
    }

    if (siteType === "multi_branch") {
      technology += " + Encrypted Site-to-Site SD-WAN";
    }

    return {
      mbps: calculatedMbps,
      tier,
      technology,
      hardware
    };
  }, [users, selectedWorkloads, siteType]);

  const queryParams = new URLSearchParams({
    service: users > 20 ? "networking" : "broadband",
    audience: users > 5 ? "business" : "individual",
    details: `Estimated Solution: ${recommendation.tier}. Need approx ${recommendation.mbps} Mbps for ${users} users across ${siteType.replace("_", " ")} site.`
  });

  return (
    <section id="calculator" className="border-t border-divine-border bg-gradient-to-b from-white via-divine-ice/40 to-white py-16 sm:py-24">
      <div className="container max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">SOLUTION ADVISOR</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-divine-ink sm:text-4xl">
            Bandwidth &amp; Network Calculator
          </h2>
          <p className="mt-3 text-base text-divine-muted">
            Estimate your throughput requirements and recommended infrastructure setup in seconds.
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-start">
          {/* Controls Panel */}
          <div className="rounded-3xl border border-divine-border bg-white p-6 shadow-soft sm:p-8 space-y-7">
            {/* 1. Team Size */}
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="user-range" className="text-sm font-extrabold text-divine-ink">
                  1. Active Users / Connected Devices
                </label>
                <span className="font-mono text-lg font-black text-divine-blue">
                  {users} {users === 1 ? "user" : "users"}
                </span>
              </div>
              <input
                id="user-range"
                type="range"
                min={2}
                max={150}
                value={users}
                onChange={e => setUsers(Number(e.target.value))}
                className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-lg bg-divine-ice accent-divine-blue"
              />
              <div className="mt-2 flex justify-between text-[11px] font-bold text-divine-muted">
                <span>Small Studio (2)</span>
                <span>Branch Office (30)</span>
                <span>Enterprise (150+)</span>
              </div>
            </div>

            {/* 2. Workload Requirements */}
            <div>
              <p className="text-sm font-extrabold text-divine-ink mb-3">
                2. Key Workloads &amp; Network Usage
              </p>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {WORKLOADS.map(w => {
                  const isChecked = selectedWorkloads.includes(w.id);
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => toggleWorkload(w.id)}
                      className={`flex items-center gap-3 rounded-2xl p-3 text-left border transition text-xs font-bold ${
                        isChecked
                          ? "border-divine-blue bg-divine-pale/70 text-divine-ink ring-1 ring-divine-blue"
                          : "border-divine-border bg-white text-divine-muted hover:border-slate-300"
                      }`}
                    >
                      <span className="text-base">{w.icon}</span>
                      <span className="flex-1">{w.label}</span>
                      <span className={`h-4 w-4 rounded-full border grid place-items-center text-[10px] ${
                        isChecked ? "bg-divine-blue text-white border-divine-blue" : "border-divine-border bg-white"
                      }`}>
                        {isChecked && "✓"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Facility Type */}
            <div>
              <p className="text-sm font-extrabold text-divine-ink mb-3">
                3. Physical Site Architecture
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "single", label: "Single Floor / Suite" },
                  { id: "multi_floor", label: "Multi-Floor Facility" },
                  { id: "multi_branch", label: "Multi-Location WAN" }
                ].map(site => (
                  <button
                    key={site.id}
                    type="button"
                    onClick={() => setSiteType(site.id as typeof siteType)}
                    className={`rounded-2xl p-3 text-center border transition text-xs font-bold ${
                      siteType === site.id
                        ? "border-divine-blue bg-divine-blue text-white shadow-sm"
                        : "border-divine-border bg-white text-divine-ink hover:border-divine-blue"
                    }`}
                  >
                    {site.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Dynamic Recommendation Panel */}
          <div className="rounded-3xl border border-divine-border bg-gradient-to-b from-white to-divine-ice/60 p-6 shadow-soft sm:p-8 animate-in fade-in duration-300">
            <div className="inline-block rounded-full bg-divine-ice px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-divine-blue border border-divine-border">
              {recommendation.tier}
            </div>

            <div className="mt-4">
              <span className="text-xs font-bold text-divine-muted uppercase tracking-wider">Suggested Bandwidth</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-black text-divine-ink">
                  ~{recommendation.mbps}
                </span>
                <span className="text-lg font-extrabold text-divine-blue">Mbps</span>
              </div>
              <p className="mt-1 text-xs text-divine-muted">
                Symmetrical throughput with concurrent bandwidth headroom.
              </p>
            </div>

            <div className="mt-6 space-y-4 border-t border-divine-border pt-6">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-divine-muted">
                  Recommended Connection
                </span>
                <p className="mt-1 font-bold text-sm text-divine-ink leading-snug">
                  {recommendation.technology}
                </p>
              </div>

              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-divine-muted">
                  Suggested Equipment &amp; Cabling
                </span>
                <p className="mt-1 font-medium text-xs leading-relaxed text-divine-ink">
                  {recommendation.hardware}
                </p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-divine-border">
              <Link
                href={`/enquire?${queryParams.toString()}`}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-divine-blue px-6 py-4 font-bold text-white shadow-[0_10px_20px_rgba(22,118,200,0.2)] transition hover:bg-divine-ink text-sm"
              >
                Request Quotation for This Setup <span>→</span>
              </Link>
              <p className="mt-2.5 text-center text-[11px] text-divine-muted">
                No payment or commitment. All specifications are verified with you first.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
