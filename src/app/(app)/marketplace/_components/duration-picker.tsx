"use client";

import { PlanDuration, PlanDurationKey } from "./plans";

function fmtSAR(n: number) {
  return new Intl.NumberFormat("ar-SA").format(n);
}

export default function DurationPicker({
  value,
  onChange,
  durations,
}: {
  value: PlanDurationKey;
  onChange: (v: PlanDurationKey) => void;
  durations: PlanDuration[];
}) {
  return (
    <div className="mt-4">
      <div className="text-sm font-semibold text-zinc-700 mb-3">اختر المدة:</div>

      <div className="space-y-3">
        {durations.map((d) => {
          const checked = value === d.key;

          return (
            <label
              key={d.key}
              className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3 cursor-pointer transition ${
                checked
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-zinc-200 bg-white hover:bg-zinc-50"
              }`}
            >
              {/* Right */}
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                    checked ? "border-emerald-500" : "border-zinc-300"
                  }`}
                >
                  <span
                    className={`h-3 w-3 rounded-full ${
                      checked ? "bg-emerald-500" : "bg-transparent"
                    }`}
                  />
                </span>

                <div className="text-sm text-zinc-800">{d.label}</div>
              </div>

              {/* Left */}
              <div className="flex items-center gap-3">
                {typeof d.discountPercent === "number" ? (
                  <span className="rounded-full bg-red-500 text-white text-[11px] font-bold px-2 py-1">
                    خصم %{d.discountPercent}
                  </span>
                ) : null}

                {d.priceWas ? (
                  <span className="text-[12px] text-zinc-400 line-through">
                    {fmtSAR(d.priceWas)} ر.س
                  </span>
                ) : null}

                <span className="text-sm font-bold text-zinc-900">
                  {fmtSAR(d.priceNow)} ر.س
                </span>
              </div>

              <input
                className="sr-only"
                type="radio"
                name="duration"
                checked={checked}
                onChange={() => onChange(d.key)}
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}
