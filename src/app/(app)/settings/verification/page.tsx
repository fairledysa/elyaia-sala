// FILE: apps/merchant/src/app/(merchant)/settings/verification/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import Breadcrumb from "@/components/layout/Breadcrumb";
import Icon from "@/components/icon/Icon";
import Container from "@/components/layout/Container";

type VerificationStatus = "incomplete" | "pending" | "verified" | "rejected";

type VerificationValue = {
  status?: VerificationStatus;
  submitted_at?: string | null;

  owner?: {
    full_name?: string;
    id_number?: string;
    dob?: string;
  };

  files?: {
    id_image_url?: string;
    cr_image_url?: string;
  };
};

type GetResponse =
  | { ok: true; verification?: any }
  | { ok: false; error?: string };

async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { method: "GET", cache: "no-store" });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

function fmtDate(input?: string | null) {
  if (!input) return "—";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ar-SA");
}

function StatusPill({ status }: { status: VerificationStatus }) {
  const cfg = useMemo(() => {
    switch (status) {
      case "verified":
        return {
          label: "موثّق",
          icon: "CheckmarkCircle02",
          cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
        };
      case "pending":
        return {
          label: "قيد المراجعة",
          icon: "TimeSchedule",
          cls: "bg-amber-500/10 text-amber-700 border-amber-500/20",
        };
      case "rejected":
        return {
          label: "مرفوض",
          icon: "CancelCircle",
          cls: "bg-red-500/10 text-red-700 border-red-500/20",
        };
      default:
        return {
          label: "غير مكتمل",
          icon: "AlertCircle",
          cls: "bg-blue-500/10 text-blue-700 border-blue-500/20",
        };
    }
  }, [status]);

  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
        "backdrop-blur",
        cfg.cls,
      ].join(" ")}
    >
      <Icon icon={cfg.icon} />
      {cfg.label}
    </span>
  );
}

function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "rounded-3xl border border-zinc-500/15 bg-white/60 p-6 shadow-sm backdrop-blur",
        "dark:bg-zinc-950/40",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function PrimaryButton({
  href,
  children,
  disabled,
}: {
  href: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <span
        className={[
          "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold",
          "bg-zinc-200 text-zinc-500 cursor-not-allowed",
          "dark:bg-zinc-800 dark:text-zinc-400",
        ].join(" ")}
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={[
        "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold",
        "bg-blue-600 text-white hover:bg-blue-700 transition",
        "shadow-sm active:translate-y-[1px]",
      ].join(" ")}
    >
      {children}
      <Icon icon="ArrowLeft01" className="rotate-180" />
    </Link>
  );
}

function SecondaryButton({
  href,
  children,
  disabled,
}: {
  href: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <span
        className={[
          "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold",
          "border border-zinc-500/15 bg-white/30 text-zinc-400 cursor-not-allowed",
          "dark:bg-zinc-950/20",
        ].join(" ")}
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={[
        "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold",
        "border border-zinc-500/20 bg-white/40 hover:bg-white/70 transition",
        "dark:bg-zinc-950/30 dark:hover:bg-zinc-950/50",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="relative mb-5">
        <div className="absolute -inset-6 rounded-full bg-blue-500/10 blur-2xl" />
        <div className="relative grid h-16 w-16 place-items-center rounded-2xl border border-zinc-500/15 bg-white/70 backdrop-blur dark:bg-zinc-950/40">
          <Icon icon="IdVerification" size="text-3xl" />
        </div>
      </div>

      <div className="text-lg font-bold">لا توجد طلبات توثيق</div>
      <div className="mt-2 max-w-md text-sm text-zinc-500 leading-7">
        ارفع طلب التوثيق لتفعيل المدفوعات وسحب الرصيد.
      </div>

      <div className="mt-6">
        <PrimaryButton href="/settings/verification/verify">
          رفع طلب توثيق
          <Icon icon="AddCircle" />
        </PrimaryButton>
      </div>
    </div>
  );
}

function statusProcessText(status: VerificationStatus) {
  if (status === "pending") return "طلبك تحت المعالجة";
  if (status === "verified") return "تمت المعالجة";
  if (status === "rejected") return "تم رفض الطلب";
  return "—";
}

function summaryStateText(status: VerificationStatus, submittedAt?: string | null) {
  if (status === "pending") return `طلبك تحت المعالجة${submittedAt ? ` — ${fmtDate(submittedAt)}` : ""}`;
  if (status === "verified") return `تمت الموافقة${submittedAt ? ` — ${fmtDate(submittedAt)}` : ""}`;
  if (status === "rejected") return `مرفوض${submittedAt ? ` — ${fmtDate(submittedAt)}` : ""}`;
  return "لا يوجد طلب مُرسل";
}

export default function VerificationPage() {
  const [loading, setLoading] = useState(true);
  const [value, setValue] = useState<VerificationValue>({ status: "incomplete" });

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const data = await apiGet<GetResponse>("/api/settings/store/verification/get");
        if (!mounted) return;

        if (!data || (data as any).ok !== true) {
          setValue({ status: "incomplete" });
          return;
        }

        const v = (data as any).verification || {};
        const status = (v.status || "incomplete") as VerificationStatus;

        const idImg = v?.owner?.id_image_url || "";
        const crImg = v?.cr?.cr_image_url || "";

        setValue({
          status,
          submitted_at: v?.submitted_at ?? null,
          owner: {
            full_name: v?.owner?.full_name || "",
            id_number: v?.owner?.id_number || "",
            dob: v?.owner?.dob || "",
          },
          files: {
            id_image_url: idImg || "",
            cr_image_url: crImg || "",
          },
        });
      } catch {
        if (!mounted) return;
        setValue({ status: "incomplete" });
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const status = (value.status || "incomplete") as VerificationStatus;
  const isIncomplete = status === "incomplete" || status === "rejected";
  const isPending = status === "pending";
  const isVerified = status === "verified";

  const heroText = useMemo(() => {
    if (loading) return "جاري تحميل حالة التوثيق...";
    if (status === "verified") return "تم توثيق المتجر ويمكنك الاستفادة من جميع مزايا المنصة.";
    if (status === "pending") return "طلب التوثيق قيد المراجعة. سيتم إشعارك عند تحديث الحالة.";
    if (status === "rejected") return "تم رفض الطلب. عدّل البيانات وارفع الطلب من جديد.";
    return "أكمل بيانات المالك وصورة الهوية لرفع طلب التوثيق.";
  }, [loading, status]);

  const progressOwnerDone = !!(value.owner?.full_name && value.owner?.id_number && value.owner?.dob);
  const progressIdDone = !!value.files?.id_image_url;
  const progressCrDone = !!value.files?.cr_image_url;

  const completed = Number(progressOwnerDone) + Number(progressIdDone) + Number(progressCrDone);
  const progressPct = Math.round((completed / 3) * 100);

  // ✅ "ابدأ الآن" يتقفل إذا فيه طلب (pending/verified)
  const summaryCtaText = isPending || isVerified ? "لديك طلب" : "ابدأ الآن";
  const summaryCtaDisabled = loading || isPending || isVerified;

  return (
    <Container>
      <div className="min-h-[calc(100vh-140px)] pb-10">
        <div className="mb-6 flex flex-col gap-3">
          <Breadcrumb
            list={[
              { text: "الإعدادات", to: "/settings" },
              { text: "توثيق المتجر", to: "/settings/verification" },
            ]}
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl border border-zinc-500/15 bg-white/70 backdrop-blur dark:bg-zinc-950/40">
                <Icon icon="ShieldUser" size="text-xl" />
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-extrabold">توثيق المتجر</div>
                  {!loading ? <StatusPill status={status} /> : null}
                </div>
                <div className="text-sm text-zinc-500"> لضمان مصداقية المتجر وتعزيز ثقة المتسوقين</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <SecondaryButton href="/settings/payment" disabled={loading}>
                <Icon icon="Payment01" />
                المدفوعات
              </SecondaryButton>

              <PrimaryButton href="/settings/verification/verify" disabled={loading}>
                {isPending ? "فتح الطلب" : isIncomplete ? "رفع طلب توثيق" : "تحديث البيانات"}
                <Icon icon={isPending ? "Edit02" : isIncomplete ? "AddCircle" : "Edit02"} />
              </PrimaryButton>
            </div>
          </div>
        </div>

        <GlassCard className="relative overflow-hidden">
          <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

          <div className="relative grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="text-lg font-bold">وش المطلوب؟</div>

              <div className="mt-2 text-sm text-zinc-500 leading-7">
                نحتاج بيانات المالك + صورة الهوية <b>(إجباري)</b>. السجل التجاري <b>اختياري</b>،
                لكنه يعطيك <b>موثوقية أعلى</b> وقد يفتح فرص دعم إعلاني.
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full border border-zinc-500/15 bg-white/60 px-3 py-1 text-xs text-zinc-700 dark:bg-zinc-950/30 dark:text-zinc-200">
                  <Icon icon="Identification" className="inline -mt-0.5" /> هوية + صورة هوية
                </span>
                <span className="rounded-full border border-zinc-500/15 bg-white/60 px-3 py-1 text-xs text-zinc-700 dark:bg-zinc-950/30 dark:text-zinc-200">
                  <Icon icon="Certificate01" className="inline -mt-0.5" /> سجل تجاري (اختياري)
                </span>
                <span className="rounded-full border border-zinc-500/15 bg-white/60 px-3 py-1 text-xs text-zinc-700 dark:bg-zinc-950/30 dark:text-zinc-200">
                  <Icon icon="TimeSchedule" className="inline -mt-0.5" /> مراجعة سريعة
                </span>
              </div>

              <div className="mt-5 rounded-2xl border border-zinc-500/15 bg-white/50 p-4 text-sm text-zinc-600 dark:bg-zinc-950/20 dark:text-zinc-300">
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Icon icon="Loading03" className="animate-spin" /> {heroText}
                  </span>
                ) : (
                  heroText
                )}
              </div>
            </div>

            {/* Summary */}
            <div className="lg:col-span-1">
              <div className="rounded-3xl border border-zinc-500/15 bg-white/60 p-5 dark:bg-zinc-950/30">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold">ملخص التوثيق</div>
                  {loading ? <span className="text-xs text-zinc-500">...</span> : <StatusPill status={status} />}
                </div>

                {/* ✅ يوضح "وش حصل" */}
                <div className="mt-3 rounded-2xl border border-zinc-500/15 bg-white/40 p-3 text-xs text-zinc-600 dark:bg-zinc-950/20 dark:text-zinc-300">
                  {loading ? "..." : summaryStateText(status, value.submitted_at)}
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between text-zinc-500">
                    <span>بيانات المالك</span>
                    <Icon icon={progressOwnerDone ? "Tick02" : "CancelCircle"} />
                  </div>
                  <div className="flex items-center justify-between text-zinc-500">
                    <span>صورة الهوية</span>
                    <Icon icon={progressIdDone ? "Tick02" : "CancelCircle"} />
                  </div>
                  <div className="flex items-center justify-between text-zinc-500">
                    <span>السجل التجاري</span>
                    <Icon icon={progressCrDone ? "Tick02" : "MinusSignCircle"} />
                  </div>
                </div>

                <div className="mt-5">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200/70 dark:bg-zinc-800/70">
                    <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${progressPct}%` }} />
                  </div>
                  <div className="mt-2 text-xs text-zinc-500">
                    اكتمال البيانات: {completed} / 3
                  </div>
                </div>

                <div className="mt-5">
                  <PrimaryButton href="/settings/verification/verify" disabled={summaryCtaDisabled}>
                    {summaryCtaText}
                    <Icon icon={summaryCtaDisabled ? "Lock" : "ArrowRight02"} />
                  </PrimaryButton>

                  {isPending ? (
                    <div className="mt-3 text-xs text-zinc-500 leading-6">
                      طلبك تحت المعالجة — التعديل مقفل أثناء المراجعة.
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* History */}
        <div className="mt-6">
          <GlassCard>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Icon icon="ListView" />
                <div className="text-lg font-bold">سجل طلبات التوثيق</div>
              </div>

              <div className="text-xs text-zinc-500">
                {loading ? "..." : "آخر تحديث حسب بيانات المتجر"}
              </div>
            </div>

            <div className="mt-4">
              {!value.submitted_at ? (
                <EmptyState />
              ) : (
                <div className="overflow-hidden rounded-2xl border border-zinc-500/15">
                  <div className="grid grid-cols-12 bg-zinc-50 px-4 py-3 text-xs font-semibold text-zinc-500 dark:bg-zinc-950/30">
                    <div className="col-span-4">التاريخ</div>
                    <div className="col-span-4">الحالة</div>
                    <div className="col-span-4">المعالجة</div>
                  </div>

                  <div className="grid grid-cols-12 items-center px-4 py-4 text-sm">
                    <div className="col-span-4 text-zinc-700 dark:text-zinc-200">
                      {fmtDate(value.submitted_at)}
                    </div>
                    <div className="col-span-4">
                      <StatusPill status={status} />
                    </div>
                    <div className="col-span-4">
                      <span
                        className={[
                          "inline-flex items-center gap-2 rounded-xl border border-zinc-500/15 px-3 py-2 text-xs font-semibold",
                          "bg-white/40 dark:bg-zinc-950/20",
                        ].join(" ")}
                      >
                        <Icon
                          icon={
                            status === "pending"
                              ? "TimeSchedule"
                              : status === "verified"
                                ? "CheckmarkCircle02"
                                : status === "rejected"
                                  ? "CancelCircle"
                                  : "AlertCircle"
                          }
                        />
                        {statusProcessText(status)}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-zinc-500/10 px-4 py-3 text-xs text-zinc-500 flex items-center justify-between gap-3">
                    <span>فتح الطلب للاطلاع</span>
                    <Link
                      href="/settings/verification/verify"
                      className="inline-flex items-center gap-2 rounded-xl border border-zinc-500/15 px-3 py-2 text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-950/40 transition"
                    >
                      <Icon icon="View" />
                      فتح الطلب
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </Container>
  );
}
