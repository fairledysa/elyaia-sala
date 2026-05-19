"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PLANS, PlanKey } from "./_components/plans";
import PlanCard from "./_components/plan-card";
import FeaturesView from "./_components/features-view";

export default function MarketplacePage() {
  const plans = useMemo(() => PLANS, []);
  const basic = plans.find((p) => p.key === "basic")!;
  const pro = plans.find((p) => p.key === "pro")!;

  const [active, setActive] = useState<PlanKey>("basic");
  const featuresRef = useRef<HTMLDivElement | null>(null);

  // ✅ يسجل الزيارة عشان المهمة تصير done في الرئيسية
  useEffect(() => {
    fetch("/api/onboarding/marketplace/visit", { method: "POST" }).catch(
      () => {}
    );
  }, []);

  return (
    <div className="mx-auto w-full max-w-[980px] px-5 py-10" dir="rtl">
      <div className="flex items-center justify-center mb-6">
        <button
          onClick={() =>
            featuresRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            })
          }
          className="rounded-xl px-4 py-2 text-sm font-semibold border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
        >
          اكتشف كل المزايا +
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PlanCard plan={basic} />
        <PlanCard plan={pro} />
      </div>

      <div ref={featuresRef} className="mt-10">
        <FeaturesView active={active} onChangeActive={setActive} />
      </div>
    </div>
  );
}
