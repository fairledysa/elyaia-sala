// FILE: apps/merchant/src/app/(app)/dashboard/settings/shipping/_components/PickupPointsModal.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type City = { id: string; name_ar?: string; name_en?: string; label?: string };

type PickupPoint = {
  id: string;
  store_shipping_carrier_id: string;
  city_id: string;
  city_name?: string;
  title: string;
  address: string;
  map_url: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  notes: string | null;
  status: "active" | "inactive";
  created_at: string;
};

function clsx(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

function Ico({
  name,
}: {
  name: "close" | "search" | "trash" | "edit" | "plus" | "ok";
}) {
  const common = "adm-shipping-points-ico";

  switch (name) {
    case "close":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none">
          <path
            d="M6 6l12 12M18 6L6 18"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );

    case "search":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none">
          <path
            d="M10.5 18a7.5 7.5 0 110-15 7.5 7.5 0 010 15z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M16.5 16.5L21 21"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );

    case "trash":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none">
          <path
            d="M4 7h16"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M10 11v7"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M14 11v7"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M6 7l1-3h10l1 3v14a2 2 0 01-2 2H8a2 2 0 01-2-2V7z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      );

    case "edit":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none">
          <path
            d="M12 20h9"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      );

    case "plus":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none">
          <path
            d="M12 5v14M5 12h14"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );

    case "ok":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none">
          <path
            d="M20 6L9 17l-5-5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
}

async function fetchCities(q?: string): Promise<City[]> {
  const url = new URL("/api/ref/locations/cities", window.location.origin);
  if (q) url.searchParams.set("q", q);

  const res = await fetch(url.toString(), { cache: "no-store" });
  const json = await res.json().catch(() => ({}));

  if (!res.ok || !json?.ok) return [];
  return (json.value || []) as City[];
}

async function listPoints(
  store_shipping_carrier_id: string,
): Promise<PickupPoint[]> {
  const url = new URL(
    "/api/settings/store/shipping/pickup-points/list",
    window.location.origin,
  );

  url.searchParams.set("store_shipping_carrier_id", store_shipping_carrier_id);

  const res = await fetch(url.toString(), { cache: "no-store" });
  const json = await res.json().catch(() => ({}));

  if (!res.ok || !json?.ok) throw new Error(json?.error || "LIST_FAILED");
  return (json.value || []) as PickupPoint[];
}

async function createPoint(payload: any) {
  const res = await fetch("/api/settings/store/shipping/pickup-points/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) throw new Error(json?.error || "CREATE_FAILED");

  return json.value;
}

async function updatePoint(payload: any) {
  const res = await fetch("/api/settings/store/shipping/pickup-points/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) throw new Error(json?.error || "UPDATE_FAILED");

  return json.value;
}

async function deletePoint(id: string) {
  const res = await fetch("/api/settings/store/shipping/pickup-points/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) throw new Error(json?.error || "DELETE_FAILED");

  return json.value;
}

export default function PickupPointsModal({
  open,
  busy,
  storeShippingCarrierId,
  carrierName,
  onClose,
}: {
  open: boolean;
  busy?: boolean;
  storeShippingCarrierId: string;
  carrierName?: string;
  onClose: () => void;
}) {
  const locked = !!busy;

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [points, setPoints] = useState<PickupPoint[]>([]);
  const [q, setQ] = useState("");

  const [cities, setCities] = useState<Array<{ id: string; label: string }>>(
    [],
  );
  const [loadingCities, setLoadingCities] = useState(false);

  const [editId, setEditId] = useState("");

  const [cityId, setCityId] = useState("");
  const [title, setTitle] = useState("");
  const [address, setAddress] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");

  const formLocked = locked || loading;

  async function refresh() {
    if (!storeShippingCarrierId) return;

    setErr("");
    setLoading(true);

    try {
      const rows = await listPoints(storeShippingCarrierId);
      setPoints(rows);
    } catch (e: any) {
      setErr(e?.message || "فشل تحميل الفروع");
      setPoints([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open || !storeShippingCarrierId) return;
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, storeShippingCarrierId]);

  useEffect(() => {
    if (!open) return;

    let mounted = true;

    (async () => {
      setLoadingCities(true);

      try {
        const all = await fetchCities("");

        if (!mounted) return;

        const mapped = all
          .map((city) => ({
            id: city.id,
            label: city.name_ar || city.label || city.name_en || "",
          }))
          .filter((item) => item.label);

        setCities(mapped);
      } finally {
        if (mounted) setLoadingCities(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [open]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return points;

    return points.filter((point) => {
      const text = `${point.title} ${point.address} ${
        point.city_name || ""
      }`.toLowerCase();

      return text.includes(qq);
    });
  }, [points, q]);

  function resetForm() {
    setEditId("");
    setCityId("");
    setTitle("");
    setAddress("");
    setMapUrl("");
    setPhone("");
    setNotes("");
    setStatus("active");
  }

  function startEdit(point: PickupPoint) {
    setEditId(point.id);
    setCityId(point.city_id);
    setTitle(point.title || "");
    setAddress(point.address || "");
    setMapUrl(point.map_url || "");
    setPhone(point.phone || "");
    setNotes(point.notes || "");
    setStatus((point.status as any) || "active");
  }

  const canSave = useMemo(() => {
    if (!storeShippingCarrierId) return false;
    if (!cityId) return false;
    if (!title.trim()) return false;
    if (!address.trim()) return false;

    return true;
  }, [storeShippingCarrierId, cityId, title, address]);

  if (!open) return null;

  return (
    <div className="adm-shipping-points-modal" dir="rtl">
      <button
        type="button"
        className="adm-shipping-points-modal__backdrop"
        onClick={() => (!formLocked ? onClose() : null)}
        aria-label="إغلاق"
      />

      <div className="adm-shipping-points-modal__wrap">
        <div className="adm-shipping-points-modal__panel">
          <div className="adm-shipping-points-modal__head">
            <div className="adm-shipping-points-modal__titleWrap">
              <h2 className="adm-shipping-points-modal__title">
                إدارة الفروع
              </h2>

              <p className="adm-shipping-points-modal__desc">
                {carrierName
                  ? `الخدمة: ${carrierName}`
                  : "إدارة فروع الاستلام من الفرع"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => (!formLocked ? onClose() : null)}
              disabled={formLocked}
              className="adm-shipping-points-modal__close"
              aria-label="إغلاق"
            >
              <Ico name="close" />
            </button>
          </div>

          <div className="adm-shipping-points-modal__body">
            {err ? (
              <div className="adm-shipping-points-alert adm-shipping-points-alert--danger">
                {err}
              </div>
            ) : null}

            <div className="adm-shipping-points-layout">
              <section className="adm-shipping-points-card">
                <div className="adm-shipping-points-card__head">
                  <div className="adm-shipping-points-card__titleWrap">
                    <h3 className="adm-shipping-points-card__title">الفروع</h3>
                    <p className="adm-shipping-points-card__desc">
                      اختر فرعًا للتعديل أو أضف فرع استلام جديد.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={formLocked}
                    onClick={() => {
                      resetForm();

                      setTimeout(() => {
                        const el = document.getElementById("pp-title");
                        (el as any)?.focus?.();
                      }, 0);
                    }}
                    className="adm-btn adm-btn--mint adm-btn--sm"
                  >
                    <Ico name="plus" />
                    فرع جديد
                  </button>
                </div>

                <div className="adm-shipping-points-search">
                  <span className="adm-shipping-points-search__icon">
                    <Ico name="search" />
                  </span>

                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="بحث داخل الفروع…"
                    className="adm-shipping-points-search__input"
                  />
                </div>

                {loading ? (
                  <div className="adm-loading-box">جاري التحميل…</div>
                ) : filtered.length === 0 ? (
                  <div className="adm-empty">لا يوجد فروع.</div>
                ) : (
                  <div className="adm-shipping-points-list">
                    {filtered.map((point) => (
                      <article
                        key={point.id}
                        className={clsx(
                          "adm-shipping-points-item",
                          editId === point.id &&
                            "adm-shipping-points-item--active",
                        )}
                      >
                        <div className="adm-shipping-points-item__main">
                          <div className="adm-shipping-points-item__top">
                            <h4 className="adm-shipping-points-item__title">
                              {point.title}
                            </h4>

                            <span
                              className={clsx(
                                "adm-shipping-points-status",
                                point.status === "active"
                                  ? "adm-shipping-points-status--active"
                                  : "adm-shipping-points-status--inactive",
                              )}
                            >
                              {point.status === "active" ? "نشط" : "غير نشط"}
                            </span>
                          </div>

                          <div className="adm-shipping-points-item__meta">
                            {point.city_name ? `${point.city_name} — ` : ""}
                            {point.address}
                          </div>

                          {point.map_url ? (
                            <div
                              className="adm-shipping-points-item__url"
                              dir="ltr"
                            >
                              {point.map_url}
                            </div>
                          ) : null}
                        </div>

                        <div className="adm-shipping-points-item__actions">
                          <button
                            type="button"
                            disabled={formLocked}
                            onClick={() => startEdit(point)}
                            className="adm-btn adm-btn--outline adm-btn--sm"
                          >
                            <Ico name="edit" />
                            تعديل
                          </button>

                          <button
                            type="button"
                            disabled={formLocked}
                            onClick={async () => {
                              const ok = confirm("حذف هذا الفرع؟");
                              if (!ok) return;

                              try {
                                setErr("");
                                setLoading(true);

                                await deletePoint(point.id);
                                await refresh();
                              } catch (e: any) {
                                setErr(e?.message || "فشل الحذف");
                              } finally {
                                setLoading(false);
                              }
                            }}
                            className="adm-btn adm-btn--danger adm-btn--sm"
                          >
                            <Ico name="trash" />
                            حذف
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section className="adm-shipping-points-card adm-shipping-points-card--form">
                <div className="adm-shipping-points-card__head">
                  <div className="adm-shipping-points-card__titleWrap">
                    <h3 className="adm-shipping-points-card__title">
                      {editId ? "تعديل فرع" : "إضافة فرع"}
                    </h3>

                    <p className="adm-shipping-points-card__desc">
                      الحقول الأساسية المطلوبة: المدينة، اسم الفرع، والعنوان.
                    </p>
                  </div>
                </div>

                <div className="adm-shipping-points-form">
                  <label className="adm-shipping-points-field">
                    <span className="adm-shipping-points-field__label">
                      المدينة
                    </span>

                    <select
                      value={cityId}
                      onChange={(e) => setCityId(e.target.value)}
                      disabled={formLocked || loadingCities}
                      className="adm-shipping-points-field__control"
                    >
                      <option value="">اختر المدينة…</option>

                      {cities.map((city) => (
                        <option key={city.id} value={city.id}>
                          {city.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="adm-shipping-points-field">
                    <span className="adm-shipping-points-field__label">
                      اسم الفرع
                    </span>

                    <input
                      id="pp-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      disabled={formLocked}
                      className="adm-shipping-points-field__control"
                      placeholder="مثال: فرع كريتر"
                    />
                  </label>

                  <label className="adm-shipping-points-field">
                    <span className="adm-shipping-points-field__label">
                      العنوان
                    </span>

                    <input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      disabled={formLocked}
                      className="adm-shipping-points-field__control"
                      placeholder="مثال: عدن - المنصورة - شارع ..."
                    />
                  </label>

                  <label className="adm-shipping-points-field">
                    <span className="adm-shipping-points-field__label">
                      رابط الخريطة
                    </span>

                    <input
                      value={mapUrl}
                      onChange={(e) => setMapUrl(e.target.value)}
                      disabled={formLocked}
                      className="adm-shipping-points-field__control"
                      placeholder="الصق رابط Google Maps"
                      dir="ltr"
                    />
                  </label>

                  <div className="adm-shipping-points-form__grid">
                    <label className="adm-shipping-points-field">
                      <span className="adm-shipping-points-field__label">
                        هاتف اختياري
                      </span>

                      <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={formLocked}
                        className="adm-shipping-points-field__control"
                        placeholder="مثال: 05xxxx"
                        dir="ltr"
                      />
                    </label>

                    <label className="adm-shipping-points-field">
                      <span className="adm-shipping-points-field__label">
                        الحالة
                      </span>

                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as any)}
                        disabled={formLocked}
                        className="adm-shipping-points-field__control"
                      >
                        <option value="active">نشط</option>
                        <option value="inactive">غير نشط</option>
                      </select>
                    </label>
                  </div>

                  <label className="adm-shipping-points-field">
                    <span className="adm-shipping-points-field__label">
                      ملاحظات اختيارية
                    </span>

                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      disabled={formLocked}
                      className="adm-shipping-points-field__textarea"
                      placeholder="مثال: بجانب محطة..."
                    />
                  </label>

                  <div className="adm-shipping-points-form__actions">
                    <button
                      type="button"
                      disabled={formLocked || !canSave}
                      onClick={async () => {
                        try {
                          setErr("");
                          setLoading(true);

                          const payload = {
                            store_shipping_carrier_id: storeShippingCarrierId,
                            city_id: cityId,
                            title,
                            address,
                            map_url: mapUrl || null,
                            phone: phone || null,
                            notes: notes || null,
                            status,
                          };

                          if (editId) {
                            await updatePoint({ id: editId, ...payload });
                          } else {
                            await createPoint(payload);
                          }

                          resetForm();
                          await refresh();
                        } catch (e: any) {
                          setErr(e?.message || "فشل الحفظ");
                        } finally {
                          setLoading(false);
                        }
                      }}
                      className={clsx(
                        "adm-btn",
                        !formLocked && canSave
                          ? "adm-btn--primary"
                          : "adm-btn--disabled",
                      )}
                    >
                      <Ico name="ok" />
                      {editId ? "حفظ التعديل" : "حفظ الفرع"}
                    </button>

                    <button
                      type="button"
                      disabled={formLocked}
                      onClick={() => resetForm()}
                      className="adm-btn adm-btn--outline"
                    >
                      تفريغ
                    </button>
                  </div>

                  <div className="adm-shipping-points-hint">
                    الاستلام من الفرع يظهر للعميل بناءً على الفروع النشطة هنا.
                  </div>
                </div>
              </section>
            </div>
          </div>

          <div className="adm-shipping-points-modal__footer">
            <button
              type="button"
              disabled={formLocked}
              onClick={() => onClose()}
              className="adm-btn adm-btn--outline"
            >
              إغلاق
            </button>

            <button
              type="button"
              disabled={formLocked}
              onClick={() => void refresh()}
              className="adm-btn adm-btn--outline"
            >
              تحديث
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}