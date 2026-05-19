"use client";

import { useMemo, useState } from "react";
import Icon from "@/components/icon/Icon";
import DurationPicker from "./duration-picker";
import { Plan, PlanDurationKey } from "./plans";

function fmtSAR(n: number) {
  return new Intl.NumberFormat("ar-SA").format(n);
}

export default function PlanCard({ plan }: { plan: Plan }) {
  const defaultDuration: PlanDurationKey = "m";
  const [duration, setDuration] = useState<PlanDurationKey>(defaultDuration);

  const selected = useMemo(() => {
    return plan.durations.find((d) => d.key === duration) ?? plan.durations[plan.durations.length - 1];
  }, [duration, plan.durations]);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
      {/* header */}
      <div className="p-6 text-center">
        <div className="flex items-center justify-center gap-2">
          <div className="text-lg font-extrabold text-zinc-900">{plan.title}</div>
          {plan.badge ? (
            <span className="text-[11px] font-bold rounded-full px-2 py-1 bg-orange-100 text-orange-700 border border-orange-200">
              {plan.badge}
            </span>
          ) : null}
        </div>

        <div className="mt-2 text-sm text-zinc-600">{plan.subtitle}</div>

        <div className="mt-4 text-lg font-extrabold text-zinc-900">
          {fmtSAR(plan.priceMonthly)} ر.س{" "}
          <span className="text-sm font-semibold text-zinc-500">/ شهريًا</span>
        </div>
      </div>

      {/* highlights */}
      <div className="border-t border-zinc-100 px-6 py-5">
        <div className="space-y-2">
          {plan.highlights.map((h, idx) => (
            <div key={idx} className="flex items-center justify-between gap-3 text-sm text-zinc-700">
              <div className="flex items-center gap-2 min-w-0">
                <span className="h-5 w-5 rounded-full bg-emerald-600/10 text-emerald-700 flex items-center justify-center">
                  ✓
                </span>
                <span className="truncate">{h}</span>
              </div>
              <span className="text-zinc-300">
                <Icon icon="ArrowLeft01" size="text-lg" />
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* reviews placeholder (خفيف مثل سلة) */}
      <div className="border-t border-zinc-100 px-6 py-5">
        <div className="text-sm font-semibold text-zinc-700 mb-2">ماذا يقول مستخدمو سلة؟</div>
        <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-4 text-sm text-zinc-600 leading-7">
          تجربة ممتازة وسهلة… (Placeholder) — نربطها لاحقًا من API
          <div className="mt-3 flex items-center justify-center gap-1 text-orange-400">
            <Icon icon="Star" size="text-lg" />
            <Icon icon="Star" size="text-lg" />
            <Icon icon="Star" size="text-lg" />
            <Icon icon="Star" size="text-lg" />
            <Icon icon="Star" size="text-lg" />
          </div>
        </div>
      </div>

      {/* duration */}
      <div className="border-t border-zinc-100 px-6 py-5">
        <DurationPicker value={duration} onChange={setDuration} durations={plan.durations} />

        <button className="mt-5 w-full rounded-xl border border-emerald-300 bg-white text-emerald-700 font-bold text-sm py-3 hover:bg-emerald-50 transition">
          اشترك الآن
        </button>

        <div className="mt-3 text-center text-xs text-zinc-500">
          تم اختيار: <span className="font-bold text-zinc-700">{selected.label}</span>
        </div>
      </div>
    </div>
  );
}
