// FILE: apps/merchant/src/app/(merchant)/settings/verification/verify/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import Breadcrumb from "@/components/layout/Breadcrumb";
import Icon from "@/components/icon/Icon";
import Container from "@/components/layout/Container";

type VerificationStatus = "incomplete" | "pending" | "verified" | "rejected";

type VerificationValue = {
  status?: VerificationStatus;
  submitted_at?: string | null;

  entity_type?: "individual" | "company";

  owner?: {
    full_name?: string;
    id_number?: string;
    dob?: string; // YYYY-MM-DD
    phone?: string;
  };

  files?: {
    id_image_url?: string;
    cr_image_url?: string;
  };

  notes?: string;
};

async function uploadToR2(file: File, kind: string): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("kind", kind);

  const res = await fetch("/api/uploads/r2/put", { method: "POST", body: fd });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Upload failed");
  }
  const data = (await res.json()) as { publicUrl?: string };
  if (!data.publicUrl) throw new Error("Upload response missing publicUrl");
  return data.publicUrl;
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

function Pill({ icon, text }: { icon: string; text: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-zinc-500/15 bg-white/60 px-3 py-1 text-xs text-zinc-700 dark:bg-zinc-950/30 dark:text-zinc-200">
      <Icon icon={icon} className="inline -mt-0.5" />
      {text}
    </span>
  );
}

function PrimaryButton({
  onClick,
  children,
  disabled,
  loading,
}: {
  onClick?: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={[
        "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold",
        "bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        "active:translate-y-[1px]",
      ].join(" ")}
    >
      {loading ? <Icon icon="Loading03" className="animate-spin" /> : null}
      {children}
    </button>
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
        "active:translate-y-[1px]",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

function TextInput({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
  hint,
  disabled,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <label className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">{label}</span>
        {required ? <span className="text-xs text-red-600">*</span> : null}
      </div>
      <input
        name={name}
        type={type}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={[
          "h-11 w-full rounded-2xl border border-zinc-500/15 bg-white/60 px-4 text-sm outline-none",
          "focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15",
          "dark:bg-zinc-950/30",
          disabled ? "opacity-70 cursor-not-allowed" : "",
        ].join(" ")}
      />
      {hint ? <div className="text-xs text-zinc-500">{hint}</div> : null}
    </label>
  );
}

export default function VerificationVerifyPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [uploadingId, setUploadingId] = useState(false);
  const [uploadingCr, setUploadingCr] = useState(false);

  const [editMode, setEditMode] = useState(false); // ✅ يسمح بالتعديل فقط لو verified + طلب تعديل
  const [showPendingPopup, setShowPendingPopup] = useState(false);

  const [value, setValue] = useState<VerificationValue>({
    status: "incomplete",
    entity_type: "individual",
    owner: { full_name: "", id_number: "", dob: "", phone: "" },
    files: { id_image_url: "", cr_image_url: "" },
    notes: "",
  });

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const r = await fetch("/api/settings/store/verification/get", { cache: "no-store" });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j?.ok) throw new Error(j?.error || "LOAD_FAILED");

        const v = j.verification || {};
        if (!mounted) return;

        const idImg = v?.owner?.id_image_url || "";
        const crImg = v?.cr?.cr_image_url || "";

        const nextStatus = (v.status || "incomplete") as VerificationStatus;

        // ✅ التحكم في وضع التعديل حسب الحالة
        if (nextStatus === "pending") {
          setEditMode(false);
          setShowPendingPopup(true);
        } else if (nextStatus === "verified") {
          setEditMode(false);
          setShowPendingPopup(false);
        } else {
          setEditMode(true);
          setShowPendingPopup(false);
        }

        setValue((prev) => ({
          ...prev,
          status: nextStatus,
          submitted_at: v.submitted_at ?? prev.submitted_at,

          entity_type: (v?.owner?.entity_type || prev.entity_type || "individual") as any,

          owner: {
            ...prev.owner,
            full_name: v?.owner?.full_name ?? prev.owner?.full_name,
            phone: v?.owner?.phone ?? prev.owner?.phone,
            id_number: v?.owner?.id_number ?? prev.owner?.id_number,
            dob: v?.owner?.dob ?? prev.owner?.dob,
          },

          files: {
            ...prev.files,
            id_image_url: idImg || prev.files?.id_image_url,
            cr_image_url: crImg || prev.files?.cr_image_url,
          },

          notes: v?.notes ?? prev.notes,
        }));
      } catch {
        // ignore
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const status = (value.status || "incomplete") as VerificationStatus;
  const isPending = status === "pending";
  const isVerified = status === "verified";

  const ownerDone = !!(value.owner?.full_name && value.owner?.id_number && value.owner?.dob);
  const idDone = !!value.files?.id_image_url;
  const crDone = !!value.files?.cr_image_url;

  const completed = Number(ownerDone) + Number(idDone) + Number(crDone);
  const progressPct = Math.round((completed / 3) * 100);

  const canSubmit = ownerDone && idDone;

  const busy = loading || saving || submitting || uploadingId || uploadingCr;

  // ✅ canEdit: pending ممنوع — verified ممنوع إلا لو editMode=true
  const canEdit = !busy && !isPending && (!isVerified || editMode);

  async function onPickId(file?: File | null) {
    if (!file) return;
    if (!canEdit) return;
    setUploadingId(true);
    try {
      const url = await uploadToR2(file, "verification/id");
      setValue((p) => ({ ...p, files: { ...(p.files || {}), id_image_url: url } }));
    } finally {
      setUploadingId(false);
    }
  }

  async function onPickCr(file?: File | null) {
    if (!file) return;
    if (!canEdit) return;
    setUploadingCr(true);
    try {
      const url = await uploadToR2(file, "verification/cr");
      setValue((p) => ({ ...p, files: { ...(p.files || {}), cr_image_url: url } }));
    } finally {
      setUploadingCr(false);
    }
  }

  async function saveDraft() {
    if (!canEdit) return;
    setSaving(true);
    try {
      const r = await fetch("/api/settings/store/verification/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "save",
          patch: {
            owner: {
              entity_type: value.entity_type || "individual",
              full_name: value.owner?.full_name || "",
              phone: value.owner?.phone || "",
              id_number: value.owner?.id_number || "",
              dob: value.owner?.dob || "",
              id_image_url: value.files?.id_image_url || "",
            },
            cr: {
              cr_number: "",
              cr_image_url: value.files?.cr_image_url || "",
            },
            notes: value.notes || "",
          },
        }),
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) throw new Error(j?.error || "SAVE_FAILED");

      // ✅ بعد الحفظ، رجعه لصفحة التوثيق
      window.location.href = "/settings/verification";
    } catch (e: any) {
      alert(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  async function submitForReview() {
    if (!canEdit) return;

    if (!canSubmit) {
      alert("كمّل بيانات المالك + ارفع صورة الهوية أول.");
      return;
    }

    setSubmitting(true);
    try {
      const r = await fetch("/api/settings/store/verification/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "submit",
          patch: {
            owner: {
              entity_type: value.entity_type || "individual",
              full_name: value.owner?.full_name || "",
              phone: value.owner?.phone || "",
              id_number: value.owner?.id_number || "",
              dob: value.owner?.dob || "",
              id_image_url: value.files?.id_image_url || "",
            },
            cr: {
              cr_number: "",
              cr_image_url: value.files?.cr_image_url || "",
            },
            notes: value.notes || "",
          },
        }),
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) throw new Error(j?.error || "SUBMIT_FAILED");

      window.location.href = "/settings/verification";
    } catch (e: any) {
      alert(String(e?.message || e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Container>
      <div className="min-h-[calc(100vh-140px)] pb-10">
        {/* Pending Popup */}
        {showPendingPopup ? (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-3xl border border-zinc-500/15 bg-white p-6 shadow-xl dark:bg-zinc-950">
              <div className="flex items-center justify-between">
                <div className="text-lg font-extrabold">طلبك قيد المراجعة</div>
                <button
                  type="button"
                  className="rounded-xl border border-zinc-500/15 px-3 py-1 text-sm"
                  onClick={() => setShowPendingPopup(false)}
                >
                  إغلاق
                </button>
              </div>
              <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300 leading-7">
                تجنّب تعديل البيانات أثناء المراجعة. إذا احتجنا أي مستند إضافي بنعلمك.
              </div>
              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                  onClick={() => setShowPendingPopup(false)}
                >
                  تمام
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Top / breadcrumb */}
        <div className="mb-6 flex flex-col gap-3">
          <Breadcrumb
            list={[
              { text: "الإعدادات", to: "/settings" },
              { text: "توثيق المتجر", to: "/settings/verification" },
              { text: "رفع طلب توثيق", to: "/settings/verification/verify" },
            ]}
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl border border-zinc-500/15 bg-white/70 backdrop-blur dark:bg-zinc-950/40">
                <Icon icon="IdVerification" size="text-xl" />
              </div>

              <div className="flex flex-col">
                <div className="text-2xl font-extrabold">رفع طلب توثيق</div>
                <div className="text-sm text-zinc-500">
                  {isVerified
                    ? "متجرك موثّق ✅. تقدر تطلب تعديل البيانات إذا احتجت."
                    : isPending
                      ? "طلبك قيد المراجعة — التعديل مقفل حالياً."
                      : "بيانات المالك + صورة الهوية إلزامي."}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <SecondaryButton href="/settings/verification" disabled={busy}>
                <Icon icon="ArrowRight02" />
                رجوع
              </SecondaryButton>

              {isVerified ? (
                <PrimaryButton
                  onClick={() => setEditMode(true)}
                  disabled={busy || editMode}
                  loading={false}
                >
                  <Icon icon="Edit02" />
                  طلب تعديل بيانات
                </PrimaryButton>
              ) : null}

              <PrimaryButton onClick={saveDraft} disabled={busy || !canEdit} loading={saving}>
                <Icon icon="SaveEnergy01" />
                حفظ
              </PrimaryButton>

              <PrimaryButton
                onClick={submitForReview}
                disabled={busy || !canEdit || !canSubmit}
                loading={submitting}
              >
                <Icon icon="SendToMobile" />
                إرسال للتحقق
              </PrimaryButton>
            </div>
          </div>

          {/* Big status banners */}
          {isPending ? (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-200">
              <div className="font-bold mb-1">طلبك قيد المراجعة</div>
              <div className="text-xs leading-6">
                التعديل مقفل أثناء المراجعة. تجنّب تغيير البيانات حاليًا.
              </div>
            </div>
          ) : null}

          {isVerified && !editMode ? (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-900 dark:text-emerald-200">
              <div className="font-bold mb-1">متجرك موثّق ✅</div>
              <div className="text-xs leading-6">
                إذا تبغى تغيّر بيانات التوثيق اضغط "طلب تعديل بيانات". وبعد الإرسال يرجع للمراجعة.
              </div>
            </div>
          ) : null}

          {isVerified && editMode ? (
            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-900 dark:text-blue-200">
              <div className="font-bold mb-1">وضع التعديل مفعل</div>
              <div className="text-xs leading-6">
                بعد الحفظ أو الإرسال، طلب التعديل بيروح للمراجعة مرة ثانية.
              </div>
            </div>
          ) : null}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hero mini */}
            <GlassCard className="relative overflow-hidden">
              <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
              <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

              <div className="relative">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-col">
                    <div className="text-lg font-bold">متطلبات التوثيق</div>
                    <div className="mt-1 text-sm text-zinc-500">
                      خلّها بسيطة: كمّل البيانات وارفع الهوية. انتهينا.
                    </div>
                  </div>

                  <div className="text-xs text-zinc-500">
                    اكتمال: <b className="text-zinc-700 dark:text-zinc-100">{completed}/3</b>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Pill icon="User02" text="بيانات المالك" />
                  <Pill icon="Identification" text="صورة الهوية (إجباري)" />
                  <Pill icon="Certificate01" text="سجل تجاري (اختياري)" />
                </div>

                <div className="mt-5">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200/70 dark:bg-zinc-800/70">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Entity type */}
            <GlassCard>
              <div className="flex items-center justify-between">
                <div className="text-lg font-bold">نوع الحساب</div>
                <span className="text-xs text-zinc-500">اختيار سريع</span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => setValue((p) => ({ ...p, entity_type: "individual" }))}
                  className={[
                    "rounded-2xl border p-4 text-right transition",
                    value.entity_type !== "individual"
                      ? "border-zinc-500/15 bg-white/50 hover:bg-white/70 dark:bg-zinc-950/20 dark:hover:bg-zinc-950/30"
                      : "border-blue-500/30 bg-blue-500/10",
                    !canEdit ? "opacity-70 cursor-not-allowed" : "",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-bold">فرد</div>
                    {value.entity_type === "individual" ? <Icon icon="Tick02" /> : <Icon icon="Circle" />}
                  </div>
                  <div className="mt-1 text-sm text-zinc-500">توثيق بالهوية</div>
                </button>

                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => setValue((p) => ({ ...p, entity_type: "company" }))}
                  className={[
                    "rounded-2xl border p-4 text-right transition",
                    value.entity_type !== "company"
                      ? "border-zinc-500/15 bg-white/50 hover:bg-white/70 dark:bg-zinc-950/20 dark:hover:bg-zinc-950/30"
                      : "border-blue-500/30 bg-blue-500/10",
                    !canEdit ? "opacity-70 cursor-not-allowed" : "",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-bold">منشأة</div>
                    {value.entity_type === "company" ? <Icon icon="Tick02" /> : <Icon icon="Circle" />}
                  </div>
                  <div className="mt-1 text-sm text-zinc-500">الهوية إلزامية + السجل اختياري</div>
                </button>
              </div>
            </GlassCard>

            {/* Owner */}
            <GlassCard>
              <div className="flex items-center justify-between">
                <div className="text-lg font-bold">بيانات المالك</div>
                <span className="text-xs text-red-600">* إلزامي</span>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <TextInput
                  label="الاسم الكامل"
                  name="owner_full_name"
                  value={value.owner?.full_name || ""}
                  onChange={(v) => setValue((p) => ({ ...p, owner: { ...(p.owner || {}), full_name: v } }))}
                  placeholder="مثال: محمد أحمد"
                  required
                  disabled={!canEdit}
                />

                <TextInput
                  label="رقم الهوية"
                  name="owner_id_number"
                  value={value.owner?.id_number || ""}
                  onChange={(v) => setValue((p) => ({ ...p, owner: { ...(p.owner || {}), id_number: v } }))}
                  placeholder="10 أرقام"
                  required
                  disabled={!canEdit}
                />

                <TextInput
                  label="تاريخ الميلاد"
                  name="owner_dob"
                  type="date"
                  value={value.owner?.dob || ""}
                  onChange={(v) => setValue((p) => ({ ...p, owner: { ...(p.owner || {}), dob: v } }))}
                  required
                  disabled={!canEdit}
                />

                <TextInput
                  label="الجوال"
                  name="owner_phone"
                  value={value.owner?.phone || ""}
                  onChange={(v) => setValue((p) => ({ ...p, owner: { ...(p.owner || {}), phone: v } }))}
                  placeholder="اختياري"
                  disabled={!canEdit}
                />
              </div>
            </GlassCard>

            {/* Uploads */}
            <GlassCard>
              <div className="flex items-center justify-between">
                <div className="text-lg font-bold">الملفات</div>
                <span className="text-xs text-zinc-500">JPG / PNG / PDF</span>
              </div>

              {/* ID */}
              <div className="mt-4 rounded-2xl border border-zinc-500/15 bg-white/40 p-4 dark:bg-zinc-950/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon icon="Identification" />
                    <div className="font-semibold">صورة الهوية</div>
                    <span className="text-xs text-red-600">*</span>
                  </div>

                  {idDone ? (
                    <span className="inline-flex items-center gap-2 text-xs text-emerald-700">
                      <Icon icon="Tick02" /> تم الرفع
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-500">مطلوب</span>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    disabled={!canEdit}
                    onChange={(e) => onPickId(e.target.files?.[0])}
                  />

                  {uploadingId ? (
                    <span className="inline-flex items-center gap-2 text-sm text-zinc-500">
                      <Icon icon="Loading03" className="animate-spin" />
                      جاري رفع الهوية...
                    </span>
                  ) : null}

                  {value.files?.id_image_url ? (
                    <a
                      className="inline-flex items-center gap-2 rounded-xl border border-zinc-500/15 px-3 py-2 text-xs font-semibold hover:bg-white/60 transition dark:hover:bg-zinc-950/30"
                      href={value.files.id_image_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Icon icon="View" />
                      عرض الملف
                    </a>
                  ) : null}
                </div>
              </div>

              {/* CR */}
              <div className="mt-4 rounded-2xl border border-zinc-500/15 bg-white/40 p-4 dark:bg-zinc-950/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon icon="Certificate01" />
                    <div className="font-semibold">السجل التجاري</div>
                    <span className="text-xs text-zinc-500">(اختياري)</span>
                  </div>

                  {crDone ? (
                    <span className="inline-flex items-center gap-2 text-xs text-emerald-700">
                      <Icon icon="Tick02" /> تم الرفع
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-500">اختياري</span>
                  )}
                </div>

                <div className="mt-2 text-xs text-zinc-500 leading-6">
                  إذا عندك سجل تجاري: موثوقية أعلى + ممكن دعم إعلاني.
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    disabled={!canEdit}
                    onChange={(e) => onPickCr(e.target.files?.[0])}
                  />

                  {uploadingCr ? (
                    <span className="inline-flex items-center gap-2 text-sm text-zinc-500">
                      <Icon icon="Loading03" className="animate-spin" />
                      جاري رفع السجل...
                    </span>
                  ) : null}

                  {value.files?.cr_image_url ? (
                    <a
                      className="inline-flex items-center gap-2 rounded-xl border border-zinc-500/15 px-3 py-2 text-xs font-semibold hover:bg-white/60 transition dark:hover:bg-zinc-950/30"
                      href={value.files.cr_image_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Icon icon="View" />
                      عرض الملف
                    </a>
                  ) : null}
                </div>
              </div>
            </GlassCard>

            {/* Notes */}
            <GlassCard>
              <div className="flex items-center justify-between">
                <div className="text-lg font-bold">ملاحظات</div>
                <span className="text-xs text-zinc-500">اختياري</span>
              </div>

              <textarea
                className={[
                  "mt-4 min-h-[120px] w-full rounded-2xl border border-zinc-500/15 bg-white/60 p-4 text-sm outline-none",
                  "focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15",
                  "dark:bg-zinc-950/30",
                  !canEdit ? "opacity-70 cursor-not-allowed" : "",
                ].join(" ")}
                placeholder="أي توضيح إضافي…"
                value={value.notes || ""}
                onChange={(e) => setValue((p) => ({ ...p, notes: e.target.value }))}
                disabled={!canEdit}
              />
            </GlassCard>
          </div>

          {/* Right: checklist */}
          <div className="lg:col-span-1 space-y-6">
            <GlassCard>
              <div className="flex items-center justify-between">
                <div className="text-lg font-bold">التحقق قبل الإرسال</div>
                <span className="text-xs text-zinc-500">{Math.min(100, progressPct)}%</span>
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between text-zinc-500">
                  <span>بيانات المالك</span>
                  <Icon icon={ownerDone ? "Tick02" : "CancelCircle"} />
                </div>

                <div className="flex items-center justify-between text-zinc-500">
                  <span>صورة الهوية</span>
                  <Icon icon={idDone ? "Tick02" : "CancelCircle"} />
                </div>

                <div className="flex items-center justify-between text-zinc-500">
                  <span>السجل التجاري</span>
                  <Icon icon={crDone ? "Tick02" : "MinusSignCircle"} />
                </div>
              </div>

              <div className="mt-5">
                <PrimaryButton onClick={submitForReview} disabled={busy || !canEdit || !canSubmit} loading={submitting}>
                  <Icon icon="SendToMobile" />
                  إرسال للتحقق
                </PrimaryButton>

                {!canSubmit ? (
                  <div className="mt-2 text-xs text-zinc-500 leading-6">
                    لازم تكمل بيانات المالك وترفع صورة الهوية عشان يتفعّل الإرسال.
                  </div>
                ) : null}
              </div>

              {isPending ? (
                <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-800 dark:text-amber-200">
                  طلبك قيد المراجعة. تجنّب تعديل البيانات أثناء المراجعة.
                </div>
              ) : null}

              {isVerified ? (
                <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs text-emerald-800 dark:text-emerald-200">
                  متجرك موثّق ✅
                </div>
              ) : null}
            </GlassCard>

            <GlassCard>
              <div className="text-lg font-bold">معلومة سريعة</div>
              <div className="mt-2 text-sm text-zinc-500 leading-7">
                الهوية وصورة الهوية إلزامية. السجل التجاري اختياري لكنه يرفع موثوقية المتجر.
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </Container>
  );
}
