"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/components/icon/Icon";

// ✅ مودال تحديد موقع الاستلام
import PickupLocationModal, {
  type PickupLocationValue,
} from "@/app/(app)/settings/shipping/_components/PickupLocationModal";

function StepRing({
  done,
  total,
  size = 44,
}: {
  done: number;
  total: number;
  size?: number;
}) {
  const t = Math.max(1, total);
  const d = Math.max(0, Math.min(t, done));
  const percent = Math.round((d / t) * 100);

  return (
    <div
      className="relative grid place-items-center rounded-full"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(#10b981 ${percent}%, rgba(16,185,129,0.12) 0)`,
      }}
      aria-label={`التقدم ${d}/${t}`}
      title={`${d}/${t}`}
    >
      <div className="absolute rounded-full bg-white" style={{ inset: 8 }} />
      <div className="relative z-10 flex flex-col items-center justify-center leading-none">
        <div className="text-[11px] font-bold text-zinc-800" dir="ltr">
          {d}/{t}
        </div>
        <div className="mt-0.5 text-[9px] text-zinc-500">خطوة</div>
      </div>
    </div>
  );
}

export default function HomeChecklist({
  progress,
  tasks,
}: {
  progress: { done: number; total: number; percent: number };
  tasks: Array<{
    key: string;
    title: string;
    desc: string;
    href: string;
    done: boolean;

    stepsTotal: number;
    stepsDone: number;
    steps: Array<{
      title: string;
      done: boolean;
      href?: string;
      actionLabel?: string;
    }>;
  }>;
}) {
  const router = useRouter();

  const [openKey, setOpenKey] = useState<string | null>(null);

  // ✅ popup state
  const [openPickupModal, setOpenPickupModal] = useState(false);
  const [pickupBusy, setPickupBusy] = useState(false);
  const [pickupDraft, setPickupDraft] = useState<PickupLocationValue | null>(null);

  const iconByKey = useMemo<Record<string, string>>(
    () => ({
      store_info: "Note01",
      first_product: "ShoppingBasketAdd01",
      shipping: "ShippingTruck01",
      payments: "CreditCard",
      theme: "LayoutGrid",
      plans: "Crown",
      verification: "IdVerification",
    }),
    []
  );

  // ✅ API: load/save pickup location
  async function loadPickupLocation(): Promise<PickupLocationValue | null> {
    const r = await fetch("/api/settings/store/shipping/pickup-location/get", {
      cache: "no-store",
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j?.ok) return null;
    return (j.value || null) as PickupLocationValue | null;
  }

  async function savePickupLocation(v: PickupLocationValue): Promise<PickupLocationValue> {
    const r = await fetch("/api/settings/store/shipping/pickup-location/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(v),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j?.ok) throw new Error(j?.error || "SAVE_FAILED");
    return (j.value || v) as PickupLocationValue;
  }

  // ✅ أول ما تنفتح الصفحة: جيب المحفوظ (عشان initialValue)
  useEffect(() => {
    let mounted = true;
    (async () => {
      const saved = await loadPickupLocation();
      if (!mounted) return;
      setPickupDraft(saved);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // ✅ فتح المودال من خطوة الشحن (تحديد الموقع)
  function maybeOpenShippingPopup(taskKey: string, stepTitle: string) {
    const isShipping = taskKey === "shipping";
    const isPickupStep =
      stepTitle.includes("موقع") ||
      stepTitle.includes("استلام") ||
      stepTitle.includes("حدد") ||
      stepTitle.includes("تحديد");

    if (isShipping && isPickupStep) {
      setOpenPickupModal(true);
      return true;
    }
    return false;
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white" dir="rtl">
      {/* ✅ مودال تحديد موقع الاستلام */}
      <PickupLocationModal
        open={openPickupModal}
        busy={pickupBusy}
        initialValue={pickupDraft || undefined}
        onClose={() => {
          if (pickupBusy) return;
          setOpenPickupModal(false);
        }}
        onConfirm={async (v) => {
          try {
            setPickupBusy(true);

            // ✅ حفظ فعلي في DB
            const saved = await savePickupLocation(v);

            // ✅ حفظ محلي للعرض
            setPickupDraft(saved);

            // ✅ اقفل المودال
            setOpenPickupModal(false);

            // ✅ تحديث checklist من DB
            router.refresh();
          } catch (e: any) {
            alert(e?.message || "فشل حفظ موقع الاستلام");
          } finally {
            setPickupBusy(false);
          }
        }}
      />

      {/* Header */}
      <div className="border-b border-zinc-100 px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-lg font-bold text-zinc-900">قائمة التأسيس</div>
            <div className="mt-1 text-sm text-zinc-600">
              {progress.done}/{progress.total} خطوات مكتملة
            </div>
          </div>

          <div className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700">
            {progress.percent}%
          </div>
        </div>

        <div className="mt-4 h-2 w-full rounded-full bg-zinc-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-400 transition-all"
            style={{ width: `${progress.percent}%` }}
          />
        </div>

        <div className="mt-3 text-sm text-zinc-600">
          متبقي لك خطوات بسيطة لتدشين متجرك وبدء رحلتك في التجارة.
        </div>
      </div>

      {/* Cards */}
      <div className="p-5 space-y-4">
        {tasks.map((t) => {
          const hasSteps = t.stepsTotal > 0 && t.steps.length > 0;
          const isOpen = hasSteps && openKey === t.key;

          const iconName = iconByKey[t.key] || "CheckList";
          const stepsDone = Math.max(0, Math.min(t.stepsTotal, t.stepsDone));
          const stepsTotal = Math.max(0, t.stepsTotal);

          // ✅ الكروت اللي بدون قوائم = الكرت كله لينك
          if (!hasSteps) {
            return (
              <Link
                key={t.key}
                href={t.href}
                className="block rounded-2xl border border-zinc-200 bg-white overflow-hidden hover:bg-zinc-50 transition"
              >
                <div className="px-5 py-4 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex items-center gap-3 flex-1">
                    <div className="relative h-11 w-11 rounded-xl border border-emerald-200 bg-white flex items-center justify-center text-emerald-700 shrink-0">
                      <Icon icon={iconName} size="text-2xl" />
                      {t.done ? (
                        <span className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[12px] shadow-sm">
                          ✓
                        </span>
                      ) : null}
                    </div>

                    <div className="min-w-0">
                      <div className="text-base font-bold text-zinc-900 truncate">
                        {t.title}
                      </div>
                      <div className="mt-1 text-sm text-zinc-500 truncate">
                        {t.desc}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <Icon icon="ArrowLeft01" size="text-xl" />
                  </div>
                </div>
              </Link>
            );
          }

          // ✅ الكروت اللي فيها قوائم
          return (
            <div
              key={t.key}
              className="rounded-2xl border border-zinc-200 bg-white overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setOpenKey((x) => (x === t.key ? null : t.key))}
                className="w-full px-5 py-4 flex items-center justify-between gap-4 hover:bg-zinc-50 transition text-right"
              >
                <div className="min-w-0 flex items-center gap-3 flex-1">
                  <div className="relative h-11 w-11 rounded-xl border border-emerald-200 bg-white flex items-center justify-center text-emerald-700 shrink-0">
                    <Icon icon={iconName} size="text-2xl" />
                    {t.done ? (
                      <span className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[12px] shadow-sm">
                        ✓
                      </span>
                    ) : null}
                  </div>

                  <div className="min-w-0">
                    <div className="text-base font-bold text-zinc-900 truncate">
                      {t.title}
                    </div>
                    <div className="mt-1 text-sm text-zinc-500 truncate">
                      {t.desc}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-3">
                  <StepRing done={stepsDone} total={stepsTotal} />
                  <Icon
                    icon={isOpen ? "ArrowUp01" : "ArrowDown01"}
                    size="text-xl"
                  />
                </div>
              </button>

              {isOpen ? (
                <div className="border-t border-zinc-100 px-5 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    <div className="md:col-span-8 space-y-4">
                      {t.steps.map((s, idx) => (
                        <div
                          key={`${t.key}-step-${idx}`}
                          className="flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-9 w-9 rounded-full border border-zinc-200 bg-white flex items-center justify-center text-sm font-bold text-zinc-700">
                              {idx + 1}
                            </div>

                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-zinc-900 truncate">
                                {s.title}
                              </div>
                            </div>
                          </div>

                          {s.done ? (
                            <span className="h-10 w-10 rounded-full bg-emerald-600/10 text-emerald-700 flex items-center justify-center shadow-sm">
                              ✓
                            </span>
                          ) : (
                            <span className="h-10 w-10 rounded-full bg-zinc-100 text-zinc-500 flex items-center justify-center">
                              •
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="md:col-span-4 flex flex-col gap-3">
                      {t.steps
                        .filter((s) => s.href)
                        .map((s, i) => (
                          <button
                            key={`${t.key}-action-${i}`}
                            type="button"
                            onClick={() => {
                              const opened = maybeOpenShippingPopup(t.key, s.title);
                              if (!opened) {
                                window.location.href = s.href!;
                              }
                            }}
                            className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                          >
                            {s.actionLabel || "ابدأ"}
                          </button>
                        ))}

                      {t.steps.filter((s) => s.href).length === 0 ? (
                        <Link
                          href={t.href}
                          className={`inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold ${
                            t.done
                              ? "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                              : "bg-emerald-600 text-white hover:bg-emerald-700"
                          }`}
                        >
                          {t.done ? "عرض" : "ابدأ"}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
