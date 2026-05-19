"use client";

import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/icon/Icon";
import { PLANS, PlanKey } from "./plans";

export default function FeaturesView({
  active,
  onChangeActive,
}: {
  active: PlanKey;
  onChangeActive: (k: PlanKey) => void;
}) {
  const plans = useMemo(() => PLANS, []);
  const plan = plans.find((p) => p.key === active)!;

  const [openTitle, setOpenTitle] = useState<string | null>(plan.features[0]?.title ?? null);

  useEffect(() => {
    setOpenTitle(plan.features[0]?.title ?? null);
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
      <div className="p-5 flex items-center justify-end">
        <div className="inline-flex rounded-xl overflow-hidden border border-zinc-200">
          <button
            className={`px-5 py-2 text-sm font-semibold transition ${
              active === "basic"
                ? "bg-emerald-100 text-emerald-800"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
            }`}
            onClick={() => onChangeActive("basic")}
          >
            سلة بيس
          </button>
          <button
            className={`px-5 py-2 text-sm font-semibold transition ${
              active === "pro"
                ? "bg-emerald-100 text-emerald-800"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
            }`}
            onClick={() => onChangeActive("pro")}
          >
            سلة برو
          </button>
        </div>
      </div>

      <div className="px-6 pb-6 pt-1">
        <div className="flex items-start gap-6">
          <div className="shrink-0">
            <div className="h-28 w-28 rounded-2xl border border-zinc-200 bg-white flex items-center justify-center">
              <Icon icon="ShoppingBag02" size="text-6xl" />
            </div>
          </div>

          <div className="min-w-0 flex-1 text-center">
            <div className="text-2xl font-extrabold text-emerald-600">
              {plan.title}
            </div>
            <div className="mt-1 text-sm text-zinc-600">{plan.subtitle}</div>

            <div className="mt-4 text-sm text-zinc-600 leading-7 max-w-[720px] mx-auto">
              باقة تميز متجرك وتقدم لعملائك تنوع وسائل الدفع الإلكتروني، والربط مع
              أكبر شركات الشحن، والمزيد لبدء رحلة أرباحك.
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 pb-8">
        <div className="text-sm font-bold text-zinc-800 mb-3">مزايا الباقة</div>

        <div className="space-y-3">
          {plan.features.map((f) => {
            const isOpen = openTitle === f.title;

            return (
              <div
                key={f.title}
                className={`rounded-xl border overflow-hidden ${
                  isOpen ? "border-emerald-200 bg-emerald-50" : "border-zinc-200 bg-white"
                }`}
              >
                <button
                  type="button"
                  className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-zinc-50/50 transition"
                  onClick={() => setOpenTitle((x) => (x === f.title ? null : f.title))}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={isOpen ? "text-emerald-700" : "text-zinc-400"}>
                      <Icon icon="Star" size="text-xl" />
                    </div>
                    <div className="text-sm font-semibold text-zinc-900 truncate">
                      {f.title}
                    </div>
                  </div>

                  <Icon icon={isOpen ? "ArrowUp01" : "ArrowDown01"} size="text-xl" />
                </button>

                {isOpen ? (
                  <div className="px-4 pb-4 text-sm text-zinc-600 leading-7">
                    {f.desc}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
