// FILE: apps/merchant/src/app/(app)/customers/[id]/CustomerDetails.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type OrderRow = {
  id: string;
  order_number?: number | string | null;
  total_amount?: number | null;
  status?: string | null;
  created_at?: string | null;
  shipping_address?: any;
  address_text?: string | null;
};

type CustomerData = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  phone_e164?: string | null;
  gender?: string | null;
  birth_date?: string | null;
  city_id?: string | null;
  created_at?: string | null;
  total_orders?: number | null;
  total_spent?: number | null;
  last_order_at?: string | null;
  store_customers?: Array<{
    store_id?: string;
    first_seen_at?: string | null;
    last_seen_at?: string | null;
  }>;
};

type ApiResponse = {
  customer: CustomerData;
  orders: OrderRow[];
  ordersCount: number;
  hasMoreOrders: boolean;
  nextOffset: number;
};

type City = {
  id: string;
  name_ar: string;
  name_en?: string | null;
};

type GroupItem = {
  id: string;
  name: string;
  icon?: string | null;
  customers_count?: number | null;
  is_member?: boolean;
};

type CodReasonCode =
  | "no_response"
  | "not_serious_payment"
  | "not_serious_receiving"
  | "other";

type CodReputationRecord = {
  id: string;
  order_id?: string | null;
  reason_code: CodReasonCode | string;
  reason_text: string;
  reason_note?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type CodReputationData = {
  settings: {
    block_untrusted_customers: boolean;
    untrusted_min_store_count: number;
  };
  current_store_record: CodReputationRecord | null;
  summary: {
    active_record_count: number;
    active_store_count: number;
    threshold: number;
    is_untrusted: boolean;
    should_block_cod: boolean;
    latest_reason_code?: string | null;
    latest_reason_text?: string | null;
    latest_reason_note?: string | null;
    latest_at?: string | null;
    reasons?: Array<{
      reason_code: string;
      reason_text: string;
      count: number;
    }>;
  };
};

const PAGE_SIZE = 10;

const COD_REASON_OPTIONS: Array<{
  value: CodReasonCode;
  label: string;
}> = [
  { value: "no_response", label: "العميل لا يجيب عند التواصل" },
  { value: "not_serious_payment", label: "العميل غير جاد في الدفع" },
  { value: "not_serious_receiving", label: "العميل غير جاد في استلام الطلب" },
  { value: "other", label: "أخرى" },
];

function s(x: any) {
  return String(x ?? "").trim();
}

async function safeJson(r: Response) {
  try {
    return await r.json();
  } catch {
    return null;
  }
}

function fmtDate(value?: string | null) {
  if (!value) return "-";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";

  return new Intl.DateTimeFormat("ar-SA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function fmtDateTime(value?: string | null) {
  if (!value) return "-";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";

  return new Intl.DateTimeFormat("ar-SA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function fmtMoney(value?: number | null) {
  const n = Number(value ?? 0);

  if (!Number.isFinite(n)) return "0";

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

function avatarText(name?: string | null) {
  const x = s(name);
  return x ? x[0] : "ع";
}

function genderLabel(value?: string | null) {
  const v = s(value).toLowerCase();

  if (v === "male") return "ذكر";
  if (v === "female") return "أنثى";

  return "-";
}

function buildCustomerRegion(customer?: CustomerData | null) {
  const firstSeen = customer?.store_customers?.[0];

  if (!firstSeen) return "-";

  return "—";
}

function extractAddressText(order: OrderRow) {
  if (order.address_text) return order.address_text;

  const x = order.shipping_address;
  if (!x || typeof x !== "object") return "-";

  const parts = [
    x.address_line1,
    x.address_line2,
    x.district,
    x.district_name,
    x.city,
    x.city_name,
    x.region,
    x.state,
    x.country,
    x.country_name,
  ]
    .map((v) => s(v))
    .filter(Boolean);

  return parts.length ? parts.join("، ") : "-";
}

function statusLabel(status?: string | null) {
  const v = s(status).toLowerCase();

  if (v === "completed") return "تم التنفيذ";
  if (v === "shipped") return "قيد الشحن";
  if (v === "paid") return "مدفوع";
  if (v === "pending") return "بانتظار المراجعة";
  if (v === "failed") return "فشل";
  if (v === "cancelled") return "ملغي";

  return status || "-";
}

function statusClass(status?: string | null) {
  const v = s(status).toLowerCase();

  if (v === "completed") return "is-completed";
  if (v === "shipped" || v === "paid") return "is-shipped";
  if (v === "failed" || v === "cancelled") return "is-danger";

  return "is-pending";
}

function normalizePhone(v: string) {
  return s(v).replace(/\s+/g, "");
}

function toYMDParts(v: any) {
  const x = s(v);

  if (!x) return { by: "", bm: "", bd: "" };

  const d = new Date(x);

  if (Number.isNaN(d.getTime())) return { by: "", bm: "", bd: "" };

  return {
    by: String(d.getFullYear()),
    bm: String(d.getMonth() + 1),
    bd: String(d.getDate()),
  };
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function codReasonLabel(value?: string | null) {
  const code = s(value);

  return (
    COD_REASON_OPTIONS.find((item) => item.value === code)?.label ||
    "سجل غير محدد"
  );
}

function storesCountText(count: number) {
  if (count <= 0) return "لا يوجد";
  if (count === 1) return "متجر واحد";
  if (count === 2) return "متجرين";
  if (count >= 3 && count <= 10) return `${count} متاجر`;

  return `${count} متجر`;
}

function IconMessage() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 10h8" />
      <path d="M8 14h5" />
      <path d="M7 20l2.5-2H17a4 4 0 0 0 4-4V8a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v6a4 4 0 0 0 4 4z" />
    </svg>
  );
}

function IconEdit() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z" />
    </svg>
  );
}

function IconBan() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 15.5l7-7" />
    </svg>
  );
}

function IconGroup() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <circle cx="9.5" cy="7" r="4" />
      <path d="M20 8v6" />
      <path d="M17 11h6" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <path d="M3 10h18" />
      <rect x="3" y="4" width="18" height="18" rx="3" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function IconGlobe() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18" />
      <path d="M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}

function IconPin() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 21s7-5.2 7-12a7 7 0 1 0-14 0c0 6.8 7 12 7 12Z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

function IconCake() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 8h8" />
      <path d="M12 2v4" />
      <path d="M5 14h14" />
      <path d="M6 10h12v10H6z" />
      <path d="M6 15c1.2 1 2.4 1 3.6 0s2.4-1 3.6 0 2.4 1 3.6 0 2.4-1 3.2 0" />
    </svg>
  );
}

function IconFile() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h4" />
    </svg>
  );
}

function IconMail() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M4 7l8 6 8-6" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 1 1 4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1A2 2 0 1 1 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.6V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.6 1h.1a2 2 0 0 1 0 4H21a1.7 1.7 0 0 0-1.6 1Z" />
    </svg>
  );
}

function CustomerActionsMenu({
  open,
  hasCodRecord,
  onToggle,
  onClose,
  onEdit,
  onCodReputation,
  onAddToGroup,
}: {
  open: boolean;
  hasCodRecord: boolean;
  onToggle: () => void;
  onClose: () => void;
  onEdit: () => void;
  onCodReputation: () => void;
  onAddToGroup: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return;

      const node = wrapRef.current;
      if (!node) return;
      if (node.contains(e.target as Node)) return;

      onClose();
    }

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open, onClose]);

  return (
    <div ref={wrapRef} className="adm-customer-details-actions">
      <button
        type="button"
        onClick={onToggle}
        className="adm-customer-details-actions__trigger"
      >
        <span>خيارات العميل</span>
        <span className="adm-customer-details-actions__icon">
          <IconSettings />
        </span>
      </button>

      {open ? (
        <div className="adm-customer-details-actions__menu">
          <button type="button">
            <span>إرسال رسالة</span>
            <i>
              <IconMessage />
            </i>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onEdit();
            }}
          >
            <span>تعديل العميل</span>
            <i>
              <IconEdit />
            </i>
          </button>

          <button
            type="button"
            className="is-primary"
            onClick={() => {
              onClose();
              onCodReputation();
            }}
          >
            <span>{hasCodRecord ? "تعديل سجل العميل" : "حظر العميل"}</span>
            <i>
              <IconBan />
            </i>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onAddToGroup();
            }}
          >
            <span>إضافة الى مجموعة</span>
            <i>
              <IconGroup />
            </i>
          </button>
        </div>
      ) : null}
    </div>
  );
}

function CustomerCodAlert({
  reputation,
  loading,
  onOpen,
}: {
  reputation: CodReputationData | null;
  loading: boolean;
  onOpen: () => void;
}) {
  if (loading && !reputation) {
    return (
      <section className="adm-customer-details-alert is-loading">
        <div className="adm-customer-details-alert__content">
          <span className="adm-customer-details-alert__badge">!</span>
          <div>
            <h2>جاري فحص سجل العميل...</h2>
            <p>يتم التحقق من سجل العميل داخل المنصة.</p>
          </div>
        </div>
      </section>
    );
  }

  const summary = reputation?.summary;
  const currentRecord = reputation?.current_store_record;

  if (!summary || summary.active_store_count <= 0) return null;

  const latestReason =
    s(summary.latest_reason_text) ||
    s(summary.latest_reason_note) ||
    codReasonLabel(summary.latest_reason_code);

  return (
    <section className="adm-customer-details-alert">
      <div className="adm-customer-details-alert__content">
        <span className="adm-customer-details-alert__badge">⚠️</span>

        <div>
          <h2>تنبيه: هذا العميل لديه سجل في عدة متاجر</h2>
          <p>
            هذا العميل لديه سجل سابق لخيار الدفع عند الاستلام مع شكاوى تتعلق بـ{" "}
            <strong>{latestReason}</strong>.
          </p>

          {currentRecord ? (
            <p>
              سجل متجرك الحالي: <strong>{currentRecord.reason_text}</strong>
              {currentRecord.created_at ? (
                <> — {fmtDateTime(currentRecord.created_at)}</>
              ) : null}
            </p>
          ) : null}
        </div>
      </div>

      <button type="button" onClick={onOpen}>
        إدارة السجل
      </button>
    </section>
  );
}

function CodReputationModal({
  open,
  customer,
  orders,
  reputation,
  saving,
  errorMsg,
  successMsg,
  onClose,
  onSave,
  onRevoke,
}: {
  open: boolean;
  customer: CustomerData | null;
  orders: OrderRow[];
  reputation: CodReputationData | null;
  saving: boolean;
  errorMsg: string;
  successMsg: string;
  onClose: () => void;
  onSave: (payload: {
    reason_code: CodReasonCode;
    reason_note: string;
    order_id: string;
  }) => void;
  onRevoke: () => void;
}) {
  const currentRecord = reputation?.current_store_record ?? null;

  const [reasonCode, setReasonCode] =
    useState<CodReasonCode>("not_serious_receiving");
  const [reasonNote, setReasonNote] = useState("");
  const [orderId, setOrderId] = useState("");

  useEffect(() => {
    if (!open) return;

    const currentReason = s(currentRecord?.reason_code) as CodReasonCode;

    setReasonCode(
      currentReason && COD_REASON_OPTIONS.some((x) => x.value === currentReason)
        ? currentReason
        : "not_serious_receiving",
    );

    setReasonNote(s(currentRecord?.reason_note));
    setOrderId(s(currentRecord?.order_id));
  }, [open, currentRecord]);

  if (!open) return null;

  const needsNote = reasonCode === "other";
  const canSave = reasonCode && (!needsNote || s(reasonNote));

  return (
    <div className="adm-customer-details-modal">
      <button
        type="button"
        className="adm-customer-details-modal__backdrop"
        onClick={saving ? undefined : onClose}
        aria-label="إغلاق"
      />

      <section className="adm-customer-details-modal__panel">
        <header className="adm-customer-details-modal__head">
          <button type="button" onClick={onClose} disabled={saving}>
            ×
          </button>

          <div>
            <h2>{currentRecord ? "تعديل سجل العميل" : "حظر العميل"}</h2>
            <p>
              هذا السجل يظهر كتنبية للتاجر، ويستخدم لإخفاء الدفع عند الاستلام
              فقط في المتاجر التي فعّلت شرط العملاء غير الجادين.
            </p>
          </div>
        </header>

        <div className="adm-customer-details-modal__body">
          {errorMsg ? (
            <div className="adm-customer-details-formAlert is-error">
              {errorMsg}
            </div>
          ) : null}

          {successMsg ? (
            <div className="adm-customer-details-formAlert is-success">
              {successMsg}
            </div>
          ) : null}

          <div className="adm-customer-details-miniInfo">
            <span>العميل</span>
            <strong>{customer?.full_name || "بدون اسم"}</strong>
            <small>{customer?.phone_e164 || customer?.email || "-"}</small>
          </div>

          {reputation?.summary?.active_store_count ? (
            <div className="adm-customer-details-miniWarning">
              لدى العميل سجل في{" "}
              <strong>
                {storesCountText(reputation.summary.active_store_count)}
              </strong>
              . آخر سبب:{" "}
              <strong>
                {s(reputation.summary.latest_reason_text) ||
                  codReasonLabel(reputation.summary.latest_reason_code)}
              </strong>
              .
            </div>
          ) : null}

          <div className="adm-customer-details-formGrid">
            <label>
              <span>سبب الحظر *</span>
              <select
                value={reasonCode}
                onChange={(event) =>
                  setReasonCode(event.currentTarget.value as CodReasonCode)
                }
                disabled={saving}
              >
                {COD_REASON_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>الطلب المرتبط بالسجل</span>
              <select
                value={orderId}
                onChange={(event) => setOrderId(event.currentTarget.value)}
                disabled={saving}
              >
                <option value="">بدون ربط بطلب محدد</option>

                {orders.map((order) => (
                  <option key={order.id} value={order.id}>
                    طلب #{order.order_number ?? "-"} —{" "}
                    {fmtDateTime(order.created_at)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>ملاحظة داخلية {needsNote ? "*" : ""}</span>
              <textarea
                value={reasonNote}
                onChange={(event) => setReasonNote(event.currentTarget.value)}
                disabled={saving}
                rows={4}
                placeholder={
                  needsNote
                    ? "اكتب سبب الحظر..."
                    : "ملاحظة اختيارية للتاجر فقط..."
                }
              />
            </label>
          </div>
        </div>

        <footer className="adm-customer-details-modal__foot">
          <div>
            {currentRecord ? (
              <button
                type="button"
                disabled={saving}
                onClick={onRevoke}
                className="is-danger"
              >
                إلغاء سجل هذا المتجر
              </button>
            ) : null}
          </div>

          <div>
            <button type="button" disabled={saving} onClick={onClose}>
              إلغاء
            </button>

            <button
              type="button"
              disabled={saving || !canSave}
              onClick={() =>
                onSave({
                  reason_code: reasonCode,
                  reason_note: s(reasonNote),
                  order_id: s(orderId),
                })
              }
              className="is-primary"
            >
              {saving ? "جاري الحفظ..." : "حفظ السجل"}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function EditCustomerModal({
  open,
  customer,
  saving,
  errorMsg,
  successMsg,
  onClose,
  onSave,
}: {
  open: boolean;
  customer: CustomerData | null;
  saving: boolean;
  errorMsg: string;
  successMsg: string;
  onClose: () => void;
  onSave: (payload: {
    full_name: string;
    phone_e164: string;
    gender: string;
    birth_date: string;
    city_id: string;
  }) => void;
}) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<"" | "male" | "female">("");
  const [cityId, setCityId] = useState("");

  const [birthDate, setBirthDate] = useState("");
  const [by, setBy] = useState<number | "">("");
  const [bm, setBm] = useState<number | "">("");
  const [bd, setBd] = useState<number | "">("");

  const [cities, setCities] = useState<City[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);

  const [cityOpen, setCityOpen] = useState(false);
  const [cityQuery, setCityQuery] = useState("");

  const cityBtnRef = useRef<HTMLButtonElement | null>(null);
  const citySearchRef = useRef<HTMLInputElement | null>(null);

  const years = useMemo(() => {
    const now = new Date().getFullYear();
    const arr: number[] = [];

    for (let y = now; y >= now - 90; y--) arr.push(y);

    return arr;
  }, []);

  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);
  const days = useMemo(() => Array.from({ length: 31 }, (_, i) => i + 1), []);

  const selectedCity = useMemo(
    () => cities.find((c) => c.id === cityId),
    [cities, cityId],
  );

  const filteredCities = useMemo(() => {
    const q = cityQuery.trim().toLowerCase();

    if (!q) return cities;

    return cities.filter((c) => {
      const ar = s(c.name_ar).toLowerCase();
      const en = s(c.name_en).toLowerCase();

      return ar.includes(q) || en.includes(q);
    });
  }, [cities, cityQuery]);

  useEffect(() => {
    if (!open) return;

    setFullName(s(customer?.full_name));
    setPhone(s(customer?.phone_e164));
    setGender((s(customer?.gender) as "male" | "female" | "") || "");
    setCityId(s(customer?.city_id));

    const parts = toYMDParts(customer?.birth_date);

    setBy(parts.by ? Number(parts.by) : "");
    setBm(parts.bm ? Number(parts.bm) : "");
    setBd(parts.bd ? Number(parts.bd) : "");
  }, [open, customer]);

  useEffect(() => {
    if (!by || !bm || !bd) {
      setBirthDate("");
      return;
    }

    setBirthDate(`${by}-${pad2(Number(bm))}-${pad2(Number(bd))}`);
  }, [by, bm, bd]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    (async () => {
      setCitiesLoading(true);

      try {
        const res = await fetch("/api/ref/locations/cities", {
          cache: "no-store",
          credentials: "include",
        });

        const json = await safeJson(res);

        if (!res.ok || json?.ok === false) {
          throw new Error(json?.message || json?.error || "CITIES_FAILED");
        }

        if (!cancelled) {
          setCities(Array.isArray(json?.value) ? json.value : []);
        }
      } catch {
        if (!cancelled) {
          setCities([]);
        }
      } finally {
        if (!cancelled) {
          setCitiesLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!cityOpen) {
      setCityQuery("");
      return;
    }

    setTimeout(() => citySearchRef.current?.focus(), 0);
  }, [cityOpen]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!cityOpen) return;

      const t = e.target as HTMLElement;
      const box = document.getElementById("merchant-customer-city-popover");

      if (!box) return;
      if (box.contains(t) || cityBtnRef.current?.contains(t as any)) return;

      setCityOpen(false);
    }

    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [cityOpen]);

  if (!open) return null;

  return (
    <div className="adm-customer-details-modal">
      <button
        type="button"
        className="adm-customer-details-modal__backdrop"
        onClick={saving ? undefined : onClose}
        aria-label="إغلاق"
      />

      <section className="adm-customer-details-modal__panel is-small">
        <header className="adm-customer-details-modal__head">
          <button type="button" onClick={onClose} disabled={saving}>
            ×
          </button>

          <div>
            <h2>تعديل البيانات</h2>
            <p>حدّث بيانات العميل الأساسية بنفس طريقة إكمال البيانات.</p>
          </div>
        </header>

        <div className="adm-customer-details-modal__body">
          {errorMsg ? (
            <div className="adm-customer-details-formAlert is-error">
              {errorMsg}
            </div>
          ) : null}

          {successMsg ? (
            <div className="adm-customer-details-formAlert is-success">
              {successMsg}
            </div>
          ) : null}

          <div className="adm-customer-details-formGrid">
            <label>
              <span>الاسم</span>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="الاسم"
                disabled={saving}
              />
            </label>

            <label>
              <span>الجوال</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="الجوال"
                disabled={saving}
              />
            </label>

            <div className="adm-customer-details-dateGrid">
              <label>
                <span>اليوم</span>
                <select
                  value={bd}
                  onChange={(e) =>
                    setBd(e.target.value ? Number(e.target.value) : "")
                  }
                  disabled={saving}
                >
                  <option value="">اليوم</option>
                  {days.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>الشهر</span>
                <select
                  value={bm}
                  onChange={(e) =>
                    setBm(e.target.value ? Number(e.target.value) : "")
                  }
                  disabled={saving}
                >
                  <option value="">الشهر</option>
                  {months.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>السنة</span>
                <select
                  value={by}
                  onChange={(e) =>
                    setBy(e.target.value ? Number(e.target.value) : "")
                  }
                  disabled={saving}
                >
                  <option value="">السنة</option>
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label>
              <span>الجنس</span>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                disabled={saving}
              >
                <option value="">اختر الجنس</option>
                <option value="male">ذكر</option>
                <option value="female">أنثى</option>
              </select>
            </label>

            <div className="adm-customer-details-cityPicker">
              <span>المدينة</span>

              <button
                ref={cityBtnRef}
                type="button"
                onClick={() => setCityOpen((v) => !v)}
                disabled={saving || citiesLoading}
              >
                <span>
                  {citiesLoading
                    ? "جاري تحميل المدن..."
                    : selectedCity
                      ? selectedCity.name_ar
                      : "اختر المدينة"}
                </span>
                <b>▾</b>
              </button>

              {cityOpen ? (
                <div
                  id="merchant-customer-city-popover"
                  className="adm-customer-details-cityPicker__menu"
                >
                  <input
                    ref={citySearchRef}
                    value={cityQuery}
                    onChange={(e) => setCityQuery(e.target.value)}
                    placeholder="ابحث عن المدينة..."
                  />

                  <div>
                    {filteredCities.length === 0 ? (
                      <p>لا توجد نتائج</p>
                    ) : (
                      filteredCities.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setCityId(c.id);
                            setCityOpen(false);
                          }}
                          className={c.id === cityId ? "is-active" : ""}
                        >
                          <span>{c.name_ar}</span>
                          <small>{c.name_en}</small>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <label>
              <span>البريد الإلكتروني</span>
              <input value={s(customer?.email)} disabled />
            </label>
          </div>
        </div>

        <footer className="adm-customer-details-modal__foot">
          <div />

          <div>
            <button type="button" disabled={saving} onClick={onClose}>
              إلغاء
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() =>
                onSave({
                  full_name: s(fullName),
                  phone_e164: normalizePhone(phone),
                  gender: s(gender),
                  birth_date: s(birthDate),
                  city_id: s(cityId),
                })
              }
              className="is-primary"
            >
              {saving ? "جاري الحفظ..." : "حفظ البيانات"}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function AddToGroupModal({
  open,
  customerId,
  saving,
  errorMsg,
  successMsg,
  onClose,
  onSave,
}: {
  open: boolean;
  customerId: string;
  saving: boolean;
  errorMsg: string;
  successMsg: string;
  onClose: () => void;
  onSave: (groupId: string) => void;
}) {
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [groupId, setGroupId] = useState("");

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    (async () => {
      setLoading(true);

      try {
        const res = await fetch(
          `/api/customer-groups/list?customer_id=${customerId}`,
          {
            cache: "no-store",
            credentials: "include",
          },
        );

        const json = await safeJson(res);

        if (!res.ok) {
          throw new Error(json?.error || "GROUPS_FAILED");
        }

        if (!cancelled) {
          const items = Array.isArray(json) ? json : [];

          setGroups(items);

          const firstAvailable = items.find((x: GroupItem) => !x.is_member);
          setGroupId(firstAvailable?.id ?? items[0]?.id ?? "");
        }
      } catch {
        if (!cancelled) {
          setGroups([]);
          setGroupId("");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, customerId]);

  const selectedGroup = useMemo(() => {
    return groups.find((g) => g.id === groupId) ?? null;
  }, [groups, groupId]);

  const selectedGroupIsMember = !!selectedGroup?.is_member;

  if (!open) return null;

  return (
    <div className="adm-customer-details-modal">
      <button
        type="button"
        className="adm-customer-details-modal__backdrop"
        onClick={saving ? undefined : onClose}
        aria-label="إغلاق"
      />

      <section className="adm-customer-details-modal__panel is-small">
        <header className="adm-customer-details-modal__head">
          <button type="button" onClick={onClose} disabled={saving}>
            ×
          </button>

          <div>
            <h2>إضافة عميل واحد</h2>
            <p>اختر المجموعة المناسبة لإضافة العميل إليها.</p>
          </div>
        </header>

        <div className="adm-customer-details-modal__body">
          {errorMsg ? (
            <div className="adm-customer-details-formAlert is-error">
              {errorMsg}
            </div>
          ) : null}

          {successMsg ? (
            <div className="adm-customer-details-formAlert is-success">
              {successMsg}
            </div>
          ) : null}

          <div className="adm-customer-details-formGrid">
            <label>
              <span>المجموعة</span>
              <select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                disabled={saving || loading || groups.length === 0}
              >
                <option value="">اختر المجموعة</option>

                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                    {group.is_member ? " - مضاف" : ""}
                  </option>
                ))}
              </select>
            </label>

            <div className="adm-customer-details-groupList">
              {loading ? (
                <p>جاري تحميل المجموعات...</p>
              ) : groups.length === 0 ? (
                <p>لا توجد مجموعات</p>
              ) : (
                groups.map((group) => {
                  const selected = groupId === group.id;
                  const isMember = !!group.is_member;

                  return (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => setGroupId(group.id)}
                      className={selected ? "is-active" : ""}
                    >
                      <span>{group.name}</span>
                      <em>{isMember ? "مضاف" : group.icon || "👥"}</em>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <footer className="adm-customer-details-modal__foot">
          <div />

          <div>
            <button type="button" onClick={onClose} disabled={saving}>
              إلغاء
            </button>

            <button
              type="button"
              onClick={() => onSave(groupId)}
              disabled={saving || !groupId || selectedGroupIsMember}
              className="is-primary"
            >
              {saving
                ? "جاري الإضافة..."
                : selectedGroupIsMember
                  ? "مضاف مسبقًا"
                  : "إضافة"}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function InfoCard({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value?: string | null;
}) {
  return (
    <div className="adm-customer-details-infoCard">
      <span className="adm-customer-details-infoCard__icon">{icon}</span>

      <div>
        <small>{title}</small>
        <strong>{value || "-"}</strong>
      </div>
    </div>
  );
}

function OrdersTable({
  orders,
  ordersCount,
  hasMoreOrders,
  loadingMore,
  loadMoreRef,
}: {
  orders: OrderRow[];
  ordersCount: number;
  hasMoreOrders: boolean;
  loadingMore: boolean;
  loadMoreRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <section className="adm-customer-details-orders">
      <header className="adm-customer-details-orders__head">
        <div>
          <span className="adm-customer-details-orders__icon">
            <IconFile />
          </span>

          <h2>الطلبات</h2>
        </div>

        <small>{ordersCount} طلب</small>
      </header>

      {orders.length === 0 ? (
        <div className="adm-customer-details-orders__empty">لا توجد طلبات</div>
      ) : (
        <>
          <div className="adm-customer-details-orders__table">
            <div className="adm-customer-details-orders__thead">
              <span>رقم الطلب</span>
              <span>التاريخ</span>
              <span>المبلغ</span>
              <span>الحالة</span>
              <span>العنوان</span>
              <span>الإجراءات</span>
            </div>

            {orders.map((order) => (
              <div key={order.id} className="adm-customer-details-orders__row">
                <div className="is-order">
                  <strong>#{order.order_number ?? "-"}</strong>
                </div>

                <div>{fmtDateTime(order.created_at)}</div>

                <div dir="ltr" className="is-money">
                  SAR {fmtMoney(order.total_amount)}
                </div>

                <div>
                  <span
                    className={[
                      "adm-customer-details-orders__status",
                      statusClass(order.status),
                    ].join(" ")}
                  >
                    {statusLabel(order.status)}
                  </span>
                </div>

                <div className="is-address">{extractAddressText(order)}</div>

                <div>
                  <button
                    type="button"
                    className="adm-customer-details-orders__repeat"
                  >
                    تكرار الطلب
                  </button>
                </div>
              </div>
            ))}
          </div>

          {hasMoreOrders ? (
            <div
              ref={loadMoreRef}
              className="adm-customer-details-orders__loadMore"
            >
              {loadingMore ? "جار تحميل المزيد..." : "مرر لأسفل لتحميل المزيد"}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

export default function CustomerDetails({ id }: { id: string }) {
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [ordersCount, setOrdersCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [offset, setOffset] = useState(0);
  const [hasMoreOrders, setHasMoreOrders] = useState(true);

  const [menuOpen, setMenuOpen] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");

  const [groupOpen, setGroupOpen] = useState(false);
  const [groupSaving, setGroupSaving] = useState(false);
  const [groupError, setGroupError] = useState("");
  const [groupSuccess, setGroupSuccess] = useState("");

  const [codOpen, setCodOpen] = useState(false);
  const [codLoading, setCodLoading] = useState(false);
  const [codSaving, setCodSaving] = useState(false);
  const [codError, setCodError] = useState("");
  const [codSuccess, setCodSuccess] = useState("");
  const [codReputation, setCodReputation] =
    useState<CodReputationData | null>(null);

  async function loadCodReputation() {
    setCodLoading(true);

    try {
      const res = await fetch(`/api/customers/${id}/cod-reputation`, {
        cache: "no-store",
        credentials: "include",
      });

      const json = await safeJson(res);

      if (!res.ok || json?.ok === false) {
        throw new Error(json?.error || "COD_REPUTATION_FAILED");
      }

      setCodReputation((json?.value ?? null) as CodReputationData | null);
    } catch {
      setCodReputation(null);
    } finally {
      setCodLoading(false);
    }
  }

  async function loadOrders(reset = false) {
    const nextOffset = reset ? 0 : offset;

    if (reset) {
      setLoading(true);
    } else {
      if (loadingMore || !hasMoreOrders) return;
      setLoadingMore(true);
    }

    const res = await fetch(
      `/api/customers/${id}?limit=${PAGE_SIZE}&offset=${nextOffset}`,
      { cache: "no-store" },
    );

    const data: ApiResponse = await res.json();

    if (!res.ok) {
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    setCustomer(data.customer ?? null);
    setOrdersCount(Number(data.ordersCount ?? 0));
    setHasMoreOrders(Boolean(data.hasMoreOrders));

    setOrders((prev) => {
      const source = reset ? [] : prev;
      const map = new Map<string, OrderRow>();

      for (const item of source) map.set(item.id, item);
      for (const item of data.orders ?? []) map.set(item.id, item);

      return Array.from(map.values());
    });

    setOffset(Number(data.nextOffset ?? nextOffset + (data.orders?.length ?? 0)));

    if (reset) {
      setLoading(false);
    } else {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    setOrders([]);
    setOffset(0);
    setHasMoreOrders(true);
    setCodReputation(null);

    void loadOrders(true);
    void loadCodReputation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!hasMoreOrders) return;

    const node = loadMoreRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];

        if (first?.isIntersecting) {
          void loadOrders(false);
        }
      },
      { rootMargin: "300px" },
    );

    observer.observe(node);

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMoreOrders, loadingMore, offset]);

  const firstSeenAt = useMemo(() => {
    return (
      customer?.store_customers?.[0]?.first_seen_at ?? customer?.created_at ?? null
    );
  }, [customer]);

  const lastSeenAt = useMemo(() => {
    return customer?.store_customers?.[0]?.last_seen_at ?? null;
  }, [customer]);

  const customerScore = useMemo(() => {
    const value = Number(customer?.total_orders ?? ordersCount ?? 0);

    if (!Number.isFinite(value) || value <= 0) return avatarText(customer?.full_name);

    return String(Math.min(99, Math.floor(value)));
  }, [customer?.full_name, customer?.total_orders, ordersCount]);

  const latestCodRecordText = useMemo(() => {
    const count = codReputation?.summary?.active_store_count ?? 0;

    if (!count) return "لا يوجد سجل";

    return `${storesCountText(count)} — ${
      codReputation?.summary?.latest_reason_text ||
      codReasonLabel(codReputation?.summary?.latest_reason_code)
    }`;
  }, [codReputation]);

  async function handleSaveCustomer(payload: {
    full_name: string;
    phone_e164: string;
    gender: string;
    birth_date: string;
    city_id: string;
  }) {
    setEditSaving(true);
    setEditError("");
    setEditSuccess("");

    try {
      if (!payload.full_name) {
        setEditError("الاسم مطلوب.");
        return;
      }

      if (!payload.birth_date || !payload.gender || !payload.city_id) {
        setEditError("أكمل الاسم وتاريخ الميلاد والجنس والمدينة.");
        return;
      }

      const res = await fetch(`/api/customers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const json = await safeJson(res);

      if (!res.ok) {
        setEditError(
          s(json?.message_ar) || s(json?.error) || "تعذر حفظ بيانات العميل",
        );
        return;
      }

      setCustomer((prev) => ({
        ...(prev ?? { id }),
        ...json?.customer,
        store_customers: prev?.store_customers ?? [],
      }));

      setEditSuccess("تم حفظ البيانات بنجاح.");

      setTimeout(() => {
        setEditOpen(false);
        setEditSuccess("");
      }, 700);
    } catch (e: any) {
      setEditError(s(e?.message) || "تعذر حفظ البيانات");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleAddToGroup(groupId: string) {
    setGroupSaving(true);
    setGroupError("");
    setGroupSuccess("");

    try {
      if (!groupId) {
        setGroupError("اختر المجموعة أولًا.");
        return;
      }

      const res = await fetch(`/api/customers/${id}/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ group_id: groupId }),
      });

      const json = await safeJson(res);

      if (!res.ok) {
        setGroupError(s(json?.error) || "تعذر إضافة العميل إلى المجموعة");
        return;
      }

      setGroupSuccess("تمت إضافة العميل إلى المجموعة بنجاح.");

      setTimeout(() => {
        setGroupOpen(false);
        setGroupSuccess("");
      }, 700);
    } catch (e: any) {
      setGroupError(s(e?.message) || "تعذر إضافة العميل إلى المجموعة");
    } finally {
      setGroupSaving(false);
    }
  }

  async function handleSaveCodReputation(payload: {
    reason_code: CodReasonCode;
    reason_note: string;
    order_id: string;
  }) {
    setCodSaving(true);
    setCodError("");
    setCodSuccess("");

    try {
      if (!payload.reason_code) {
        setCodError("اختر سبب الحظر.");
        return;
      }

      if (payload.reason_code === "other" && !s(payload.reason_note)) {
        setCodError("اكتب سبب الحظر.");
        return;
      }

      const res = await fetch(`/api/customers/${id}/cod-reputation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify(payload),
      });

      const json = await safeJson(res);

      if (!res.ok || json?.ok === false) {
        setCodError(s(json?.error) || "تعذر حفظ سجل العميل.");
        return;
      }

      const nextReputation = json?.value?.reputation ?? null;

      if (nextReputation) {
        setCodReputation(nextReputation as CodReputationData);
      } else {
        await loadCodReputation();
      }

      setCodSuccess("تم حفظ سجل العميل بنجاح.");

      setTimeout(() => {
        setCodOpen(false);
        setCodSuccess("");
      }, 700);
    } catch (e: any) {
      setCodError(s(e?.message) || "تعذر حفظ سجل العميل.");
    } finally {
      setCodSaving(false);
    }
  }

  async function handleRevokeCodReputation() {
    setCodSaving(true);
    setCodError("");
    setCodSuccess("");

    try {
      const recordId = s(codReputation?.current_store_record?.id);

      const res = await fetch(`/api/customers/${id}/cod-reputation`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({
          action: "revoke",
          id: recordId || undefined,
        }),
      });

      const json = await safeJson(res);

      if (!res.ok || json?.ok === false) {
        setCodError(s(json?.error) || "تعذر إلغاء سجل العميل.");
        return;
      }

      const nextReputation = json?.value?.reputation ?? null;

      if (nextReputation) {
        setCodReputation(nextReputation as CodReputationData);
      } else {
        await loadCodReputation();
      }

      setCodSuccess("تم إلغاء سجل هذا المتجر عن العميل.");

      setTimeout(() => {
        setCodOpen(false);
        setCodSuccess("");
      }, 700);
    } catch (e: any) {
      setCodError(s(e?.message) || "تعذر إلغاء سجل العميل.");
    } finally {
      setCodSaving(false);
    }
  }

  if (loading && !customer) {
    return (
      <main className="adm-customer-details">
        <div className="adm-customer-details__skeleton is-alert" />
        <div className="adm-customer-details__skeleton is-grid" />
        <div className="adm-customer-details__skeleton is-table" />
      </main>
    );
  }

  if (!customer) {
    return (
      <main className="adm-customer-details">
        <div className="adm-customer-details-empty">تعذر تحميل العميل</div>
      </main>
    );
  }

  return (
    <>
      <EditCustomerModal
        open={editOpen}
        customer={customer}
        saving={editSaving}
        errorMsg={editError}
        successMsg={editSuccess}
        onClose={() => {
          if (editSaving) return;
          setEditOpen(false);
          setEditError("");
          setEditSuccess("");
        }}
        onSave={handleSaveCustomer}
      />

      <AddToGroupModal
        open={groupOpen}
        customerId={id}
        saving={groupSaving}
        errorMsg={groupError}
        successMsg={groupSuccess}
        onClose={() => {
          if (groupSaving) return;
          setGroupOpen(false);
          setGroupError("");
          setGroupSuccess("");
        }}
        onSave={handleAddToGroup}
      />

      <CodReputationModal
        open={codOpen}
        customer={customer}
        orders={orders}
        reputation={codReputation}
        saving={codSaving}
        errorMsg={codError}
        successMsg={codSuccess}
        onClose={() => {
          if (codSaving) return;
          setCodOpen(false);
          setCodError("");
          setCodSuccess("");
        }}
        onSave={handleSaveCodReputation}
        onRevoke={handleRevokeCodReputation}
      />

      <main className="adm-customer-details">
        <CustomerCodAlert
          reputation={codReputation}
          loading={codLoading}
          onOpen={() => {
            setCodError("");
            setCodSuccess("");
            setCodOpen(true);
          }}
        />

        <section className="adm-customer-details-layout">
          <aside className="adm-customer-details-profile">
            <div className="adm-customer-details-profile__score">
              <span>{customerScore}</span>
            </div>

            <h1>{customer.full_name || "بدون اسم"}</h1>

            <p>
              {genderLabel(customer.gender)}
              {customer.birth_date ? <> · {fmtDate(customer.birth_date)}</> : null}
            </p>

            <div className="adm-customer-details-profile__email">
              <span>{customer.email || customer.phone_e164 || "-"}</span>
              <i>
                <IconMail />
              </i>
            </div>

            {customer.email ? (
              <a
                href={`mailto:${customer.email}`}
                className="adm-customer-details-profile__primaryBtn"
              >
                <span>إيميل</span>
                <i>
                  <IconMail />
                </i>
              </a>
            ) : customer.phone_e164 ? (
              <a
                href={`tel:${customer.phone_e164}`}
                className="adm-customer-details-profile__primaryBtn"
              >
                <span>اتصال</span>
              </a>
            ) : null}

            <CustomerActionsMenu
              open={menuOpen}
              hasCodRecord={Boolean(codReputation?.current_store_record)}
              onToggle={() => setMenuOpen((v) => !v)}
              onClose={() => setMenuOpen(false)}
              onEdit={() => {
                setEditError("");
                setEditSuccess("");
                setEditOpen(true);
              }}
              onCodReputation={() => {
                setCodError("");
                setCodSuccess("");
                setCodOpen(true);
              }}
              onAddToGroup={() => {
                setGroupError("");
                setGroupSuccess("");
                setGroupOpen(true);
              }}
            />
          </aside>

          <div className="adm-customer-details-mainGrid">
            <InfoCard
              icon={<IconCalendar />}
              title="تاريخ التسجيل في المتجر"
              value={fmtDate(firstSeenAt)}
            />

            <InfoCard icon={<IconGlobe />} title="اللغة" value="العربية" />

            <InfoCard
              icon={<IconPin />}
              title="المنطقة"
              value={buildCustomerRegion(customer)}
            />

            <InfoCard
              icon={<IconClock />}
              title="آخر ظهور"
              value={fmtDateTime(lastSeenAt)}
            />

            <InfoCard
              icon={<IconCake />}
              title="تاريخ الميلاد"
              value={fmtDate(customer.birth_date)}
            />

            <InfoCard
              icon={<IconUser />}
              title="الجنس"
              value={genderLabel(customer.gender)}
            />

            <div className="adm-customer-details-record">
              <span className="adm-customer-details-record__icon">
                <IconFile />
              </span>

              <div>
                <small>سجل العميل</small>
                <strong>{latestCodRecordText}</strong>
              </div>
            </div>
          </div>
        </section>

        <OrdersTable
          orders={orders}
          ordersCount={ordersCount}
          hasMoreOrders={hasMoreOrders}
          loadingMore={loadingMore}
          loadMoreRef={loadMoreRef}
        />
      </main>
    </>
  );
}