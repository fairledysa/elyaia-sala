// FILE: apps/merchant/src/app/(app)/settings/shipping/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import PickupLocationModal, {
  PickupLocationValue,
} from "./_components/PickupLocationModal";
import RateModal from "./_components/RateModal";
import CourierRateModal from "./_components/CourierRateModal";
import PickupPointsModal from "./_components/PickupPointsModal";
import FreeShippingModal from "./_components/FreeShippingModal";
import CodRulesModal from "./_components/CodRulesModal";

function clsx(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

async function loadPickupLocation(): Promise<PickupLocationValue | null> {
  const r = await fetch("/api/settings/store/shipping/pickup-location/get", {
    cache: "no-store",
  });

  const j = await r.json().catch(() => ({}));

  if (!r.ok || !j?.ok) return null;

  return (j.value || null) as PickupLocationValue | null;
}

async function savePickupLocation(
  value: PickupLocationValue,
): Promise<PickupLocationValue> {
  const r = await fetch("/api/settings/store/shipping/pickup-location/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });

  const j = await r.json().catch(() => ({}));

  if (!r.ok || !j?.ok) throw new Error(j?.error || "SAVE_FAILED");

  return (j.value || value) as PickupLocationValue;
}

type CarrierCatalogItem = {
  id: string;
  code: string;
  name: string;
  logo_url: string | null;
  provider_kind: "platform_api" | "platform_manual";
  status: "active" | "inactive";
};

type StoreCarrier = {
  id: string;
  store_id: string;
  carrier_id: string | null;
  type: "platform" | "courier" | "pickup";
  display_name: string;
  enabled: boolean;
  status: "active" | "inactive";
};

type NameDialogState =
  | {
      mode: "create_courier" | "create_pickup" | "rename";
      title: string;
      description: string;
      submitLabel: string;
      target?: StoreCarrier;
    }
  | null;

async function carriersList(): Promise<{
  store_id: string;
  catalog: CarrierCatalogItem[];
  store_carriers: StoreCarrier[];
}> {
  const r = await fetch("/api/settings/store/shipping/carriers/list", {
    cache: "no-store",
  });

  const j = await r.json().catch(() => ({}));

  if (!r.ok || !j?.ok) throw new Error(j?.error || "CARRIERS_LIST_FAILED");

  return j.value;
}

async function enablePlatformCarrier(carrier_code: string) {
  const r = await fetch("/api/settings/store/shipping/carriers/platform/enable", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ carrier_code, display_name: "" }),
  });

  const j = await r.json().catch(() => ({}));

  if (!r.ok || !j?.ok) throw new Error(j?.error || "ENABLE_FAILED");

  return j.value as StoreCarrier;
}

async function disableStoreCarrier(store_shipping_carrier_id: string) {
  const r = await fetch("/api/settings/store/shipping/carriers/disable", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ store_shipping_carrier_id }),
  });

  const j = await r.json().catch(() => ({}));

  if (!r.ok || !j?.ok) throw new Error(j?.error || "DISABLE_FAILED");

  return j.value as StoreCarrier;
}

async function createCarrier(
  type: "courier" | "pickup",
  display_name: string,
) {
  const r = await fetch("/api/settings/store/shipping/carriers/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, display_name }),
  });

  const j = await r.json().catch(() => ({}));

  if (!r.ok || !j?.ok) throw new Error(j?.error || "CREATE_CARRIER_FAILED");

  return j.value as StoreCarrier;
}

async function updateCarrierName(
  store_shipping_carrier_id: string,
  display_name: string,
) {
  const r = await fetch("/api/settings/store/shipping/carriers/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ store_shipping_carrier_id, display_name }),
  });

  const j = await r.json().catch(() => ({}));

  if (!r.ok || !j?.ok) throw new Error(j?.error || "UPDATE_NAME_FAILED");

  return j.value as StoreCarrier;
}

async function deleteCarrier(store_shipping_carrier_id: string) {
  const r = await fetch("/api/settings/store/shipping/carriers/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ store_shipping_carrier_id }),
  });

  const j = await r.json().catch(() => ({}));

  if (!r.ok || !j?.ok) throw new Error(j?.error || "DELETE_FAILED");

  return j.value;
}

async function ratesList(store_shipping_carrier_id: string): Promise<any[]> {
  const url = new URL(
    "/api/settings/store/shipping/rates/list",
    window.location.origin,
  );

  url.searchParams.set(
    "store_shipping_carrier_id",
    store_shipping_carrier_id,
  );

  const r = await fetch(url.toString(), { cache: "no-store" });
  const j = await r.json().catch(() => ({}));

  if (!r.ok || !j?.ok) throw new Error(j?.error || "RATES_LIST_FAILED");

  return (j.value || []) as any[];
}

function carrierTypeLabel(type: StoreCarrier["type"]) {
  if (type === "platform") return "شركة منصة";
  if (type === "courier") return "موصل خاص";
  return "استلام من الفرع";
}

function carrierFallbackIcon(type: StoreCarrier["type"]) {
  if (type === "platform") return "🚚";
  if (type === "courier") return "🛵";
  return "📍";
}

export default function ShippingPage() {
  const [openPickup, setOpenPickup] = useState(false);
  const [pickupBusy, setPickupBusy] = useState(false);
  const [savedPickup, setSavedPickup] =
    useState<PickupLocationValue | null>(null);

  const [carriersBusy, setCarriersBusy] = useState(false);
  const [carriersErr, setCarriersErr] = useState("");
  const [catalog, setCatalog] = useState<CarrierCatalogItem[]>([]);
  const [storeCarriers, setStoreCarriers] = useState<StoreCarrier[]>([]);

  const [rateOpen, setRateOpen] = useState(false);
  const [rateBusy, setRateBusy] = useState(false);
  const [rateCarrierId, setRateCarrierId] = useState("");
  const [rateCarrierName, setRateCarrierName] = useState("");
  const [rateCarrierCode, setRateCarrierCode] = useState("");

  const [courierOpen, setCourierOpen] = useState(false);
  const [courierCarrierId, setCourierCarrierId] = useState("");
  const [courierCarrierName, setCourierCarrierName] = useState("");

  const [ppOpen, setPpOpen] = useState(false);
  const [ppCarrierId, setPpCarrierId] = useState("");
  const [ppCarrierName, setPpCarrierName] = useState("");

  const [freeShippingOpen, setFreeShippingOpen] = useState(false);
  const [codRulesOpen, setCodRulesOpen] = useState(false);

  const [nameDialog, setNameDialog] = useState<NameDialogState>(null);
  const [nameValue, setNameValue] = useState("");
  const [nameBusy, setNameBusy] = useState(false);
  const [nameErr, setNameErr] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<StoreCarrier | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteErr, setDeleteErr] = useState("");

  useEffect(() => {
    let mounted = true;

    (async () => {
      const data = await loadPickupLocation();
      if (!mounted) return;
      setSavedPickup(data);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const pickupDone = useMemo(() => {
    const p = savedPickup;

    return (
      !!p &&
      !!p.city_id &&
      !!p.district_id &&
      !!String(p.street || "").trim() &&
      !!String(p.landmark || "").trim()
    );
  }, [savedPickup]);

  const pickupSummary = useMemo(() => {
    if (!savedPickup) return "لم يتم تحديد موقع الاستلام بعد";

    return `${savedPickup.city_name} / ${savedPickup.district_name} — ${savedPickup.street} — ${savedPickup.landmark}`;
  }, [savedPickup]);

  const catalogById = useMemo(() => {
    const map = new Map<string, CarrierCatalogItem>();

    for (const carrier of catalog || []) {
      map.set(carrier.id, carrier);
    }

    return map;
  }, [catalog]);

  const storeCarrierByCatalogId = useMemo(() => {
    const map = new Map<string, StoreCarrier>();

    for (const carrier of storeCarriers || []) {
      if (carrier.type !== "platform") continue;
      if (!carrier.carrier_id) continue;

      map.set(carrier.carrier_id, carrier);
    }

    return map;
  }, [storeCarriers]);

  const customCouriers = useMemo(() => {
    return (storeCarriers || []).filter((carrier) => carrier.type === "courier");
  }, [storeCarriers]);

  const pickupCarriers = useMemo(() => {
    return (storeCarriers || []).filter((carrier) => carrier.type === "pickup");
  }, [storeCarriers]);

  const enabledCount = useMemo(() => {
    return (storeCarriers || []).filter(
      (carrier) => carrier.enabled && carrier.status === "active",
    ).length;
  }, [storeCarriers]);

  async function refreshCarriers() {
    setCarriersErr("");
    setCarriersBusy(true);

    try {
      const data = await carriersList();
      setCatalog(data.catalog || []);
      setStoreCarriers(data.store_carriers || []);
    } catch (e: any) {
      setCarriersErr(e?.message || "فشل تحميل شركات الشحن");
    } finally {
      setCarriersBusy(false);
    }
  }

  useEffect(() => {
    if (!pickupDone) return;

    let mounted = true;

    (async () => {
      setCarriersErr("");

      try {
        const data = await carriersList();
        if (!mounted) return;

        setCatalog(data.catalog || []);
        setStoreCarriers(data.store_carriers || []);
      } catch (e: any) {
        if (!mounted) return;
        setCarriersErr(e?.message || "فشل تحميل شركات الشحن");
      }
    })();

    return () => {
      mounted = false;
    };
  }, [pickupDone]);

  async function openPlatformRate(sc: StoreCarrier) {
    const cat = sc.carrier_id ? catalogById.get(sc.carrier_id) : null;

    setRateCarrierCode(cat?.code || "platform");
    setRateCarrierId(sc.id);
    setRateCarrierName(sc.display_name);
    setRateOpen(true);
  }

  async function openCourierRate(sc: StoreCarrier) {
    setCourierCarrierId(sc.id);
    setCourierCarrierName(sc.display_name);
    setCourierOpen(true);
  }

  async function openPickupPoints(sc: StoreCarrier) {
    setPpCarrierId(sc.id);
    setPpCarrierName(sc.display_name);
    setPpOpen(true);
  }

  async function openRateModalForCarrier(sc: StoreCarrier) {
    if (sc.type === "platform") return openPlatformRate(sc);
    if (sc.type === "courier") return openCourierRate(sc);
    return openPickupPoints(sc);
  }

  async function openRateIfMissing(sc: StoreCarrier) {
    if (sc.type === "pickup") return;

    try {
      setRateBusy(true);

      const rates = await ratesList(sc.id);

      if (!rates || rates.length === 0) {
        await openRateModalForCarrier(sc);
      }
    } finally {
      setRateBusy(false);
    }
  }

  function openCreateDialog(type: "courier" | "pickup") {
    setNameErr("");

    if (type === "courier") {
      setNameValue("موصل جديد");
      setNameDialog({
        mode: "create_courier",
        title: "إضافة موصل جديد",
        description:
          "اكتب اسم خدمة التوصيل الخاصة التي ستظهر للعميل داخل صفحة الدفع.",
        submitLabel: "إضافة الموصل",
      });
      return;
    }

    setNameValue("فرع جديد");
    setNameDialog({
      mode: "create_pickup",
      title: "إضافة فرع استلام",
      description:
        "اكتب اسم خيار الاستلام من الفرع، وبعد الإضافة ستتمكن من إدارة الفروع والعناوين.",
      submitLabel: "إضافة الفرع",
    });
  }

  function openRenameDialog(sc: StoreCarrier) {
    setNameErr("");
    setNameValue(sc.display_name);
    setNameDialog({
      mode: "rename",
      title: "تعديل اسم العرض",
      description:
        "هذا الاسم سيظهر داخل لوحة الإدارة وقد يظهر للعميل حسب إعدادات طريقة الشحن.",
      submitLabel: "حفظ الاسم",
      target: sc,
    });
  }

  function closeNameDialog() {
    if (nameBusy) return;

    setNameDialog(null);
    setNameValue("");
    setNameErr("");
  }

  async function submitNameDialog() {
    if (!nameDialog) return;

    const name = String(nameValue || "").trim();

    if (!name) {
      setNameErr("اكتب اسم الخدمة أولًا.");
      return;
    }

    try {
      setNameBusy(true);
      setNameErr("");
      setCarriersErr("");

      if (nameDialog.mode === "rename") {
        if (!nameDialog.target) throw new Error("MISSING_TARGET");

        await updateCarrierName(nameDialog.target.id, name);
        await refreshCarriers();
        closeNameDialog();
        return;
      }

      const type = nameDialog.mode === "create_courier" ? "courier" : "pickup";
      const created = await createCarrier(type, name);

      await refreshCarriers();
      closeNameDialog();

      if (type === "courier") {
        await openRateIfMissing(created);
        return;
      }

      await openPickupPoints(created);
    } catch (e: any) {
      setNameErr(e?.message || "فشل حفظ البيانات");
    } finally {
      setNameBusy(false);
    }
  }

  function openDeleteDialog(sc: StoreCarrier) {
    setDeleteErr("");
    setDeleteTarget(sc);
  }

  function closeDeleteDialog() {
    if (deleteBusy) return;

    setDeleteTarget(null);
    setDeleteErr("");
  }

  async function submitDeleteDialog() {
    if (!deleteTarget) return;

    try {
      setDeleteBusy(true);
      setDeleteErr("");
      setCarriersErr("");

      await deleteCarrier(deleteTarget.id);
      await refreshCarriers();
      closeDeleteDialog();
    } catch (e: any) {
      setDeleteErr(e?.message || "فشل حذف طريقة الشحن");
    } finally {
      setDeleteBusy(false);
    }
  }

  async function togglePlatformCarrier(carrier: CarrierCatalogItem) {
    const storeCarrier = storeCarrierByCatalogId.get(carrier.id);

    try {
      setCarriersBusy(true);
      setCarriersErr("");

      if (storeCarrier?.enabled) {
        await disableStoreCarrier(storeCarrier.id);
        await refreshCarriers();
        return;
      }

      const sc = await enablePlatformCarrier(carrier.code);

      await refreshCarriers();
      await openRateIfMissing(sc);
    } catch (e: any) {
      setCarriersErr(e?.message || "فشل العملية");
    } finally {
      setCarriersBusy(false);
    }
  }

  return (
    <div className="adm-page__inner adm-shipping" dir="rtl">
      <section className="adm-shipping-hero">
        <div className="adm-shipping-hero__main">
          <div className="adm-shipping-hero__icon">🚚</div>

          <div className="adm-shipping-hero__text">
            <div className="adm-shipping-kicker">إعدادات المتجر</div>
            <h1 className="adm-shipping-hero__title">الشحن والتوصيل</h1>
            <p className="adm-shipping-hero__desc">
              إدارة شركات الشحن، طرق التوصيل، الموصلين، وفروع الاستلام في متجرك.
            </p>
          </div>
        </div>

        <div className="adm-shipping-hero__side">
          <div className="adm-shipping-steps-pill">
            <span>موقع الاستلام</span>
            <span>طرق الشحن</span>
            <span>التسعيرات</span>
          </div>

          <button
            type="button"
            onClick={() => void refreshCarriers()}
            disabled={carriersBusy || !pickupDone}
            className="adm-btn adm-btn--secondary"
          >
            تحديث البيانات
          </button>
        </div>
      </section>

      <section className="adm-shipping-panel">
        <div className="adm-shipping-panel__head">
          <div>
            <h2 className="adm-shipping-panel__title">موقع استلام الشحنات</h2>
            <p className="adm-shipping-panel__desc">
              هذا الموقع إجباري قبل تفعيل شركات أو طرق الشحن.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setOpenPickup(true)}
            className="adm-btn adm-btn--primary"
          >
            {savedPickup ? "تعديل الموقع" : "تحديد الموقع"}
          </button>
        </div>

        <div className="adm-shipping-pickup-card">
          <div className="adm-shipping-pickup-card__icon">📍</div>

          <div className="adm-shipping-pickup-card__content">
            <div className="adm-shipping-pickup-card__label">
              موقع الاستلام الحالي
            </div>

            <div className="adm-shipping-pickup-card__summary">
              {pickupSummary}
            </div>

            {savedPickup?.notes ? (
              <div className="adm-shipping-pickup-card__note">
                ملاحظة: {savedPickup.notes}
              </div>
            ) : null}
          </div>

          <div
            className={clsx(
              "adm-shipping-status",
              pickupDone
                ? "adm-shipping-status--success"
                : "adm-shipping-status--danger",
            )}
          >
            {pickupDone ? "موقع الاستلام جاهز" : "أكمل موقع الاستلام"}
          </div>
        </div>
      </section>

      <section
        className={clsx(
          "adm-shipping-panel adm-shipping-board",
          !pickupDone && "adm-shipping-board--disabled",
        )}
      >
        <div className="adm-shipping-panel__head">
          <div>
            <h2 className="adm-shipping-panel__title">شركات وطرق الشحن</h2>
            <p className="adm-shipping-panel__desc">
              فعّل خيارًا واحدًا على الأقل: شركة منصة، موصل خاص، أو استلام من
              الفرع.
            </p>
          </div>

          <span className="adm-shipping-counter">
            المفعّل الآن: {enabledCount}
          </span>
        </div>

        {carriersErr ? (
          <div className="adm-shipping-alert adm-shipping-alert--danger">
            {carriersErr}
          </div>
        ) : null}

        {!pickupDone ? (
          <div className="adm-shipping-empty">
            حدّد موقع الاستلام أولًا حتى تتمكن من إدارة طرق الشحن.
          </div>
        ) : (
          <div className="adm-shipping-board__body">
            <div className="adm-shipping-group">
              <div className="adm-shipping-group__head">
                <div className="adm-shipping-group__icon">🚛</div>
                <div>
                  <h3 className="adm-shipping-group__title">شحن عادي</h3>
                  <p className="adm-shipping-group__desc">
                    شركات الشحن المتاحة من المنصة. فعّل الشركة ثم أضف التسعيرة
                    المناسبة.
                  </p>
                </div>
              </div>

              {catalog.length === 0 ? (
                <div className="adm-shipping-empty adm-shipping-empty--small">
                  لا توجد شركات منصة متاحة حاليًا.
                </div>
              ) : (
                <div className="adm-shipping-provider-grid">
                  {catalog.map((carrier) => {
                    const storeCarrier = storeCarrierByCatalogId.get(carrier.id);
                    const isEnabled =
                      !!storeCarrier?.enabled && storeCarrier.status === "active";

                    return (
                      <div
                        key={carrier.id}
                        className={clsx(
                          "adm-shipping-provider",
                          isEnabled && "adm-shipping-provider--active",
                        )}
                      >
                        <div className="adm-shipping-provider__top">
                          <button
                            type="button"
                            disabled={carriersBusy || rateBusy}
                            onClick={() => void togglePlatformCarrier(carrier)}
                            className={clsx(
                              "adm-shipping-switch",
                              isEnabled && "adm-shipping-switch--on",
                            )}
                            aria-label={
                              isEnabled ? "تعطيل شركة الشحن" : "تفعيل شركة الشحن"
                            }
                          >
                            <span />
                          </button>

                          <div className="adm-shipping-provider__logo">
                            {carrier.logo_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={carrier.logo_url} alt={carrier.name} />
                            ) : (
                              <span>{carrier.name.slice(0, 1)}</span>
                            )}
                          </div>
                        </div>

                        <div className="adm-shipping-provider__body">
                          <h4 className="adm-shipping-provider__name">
                            {storeCarrier?.display_name || carrier.name}
                          </h4>

                          <div className="adm-shipping-provider__meta">
                            {carrier.provider_kind === "platform_api"
                              ? "ربط منصة"
                              : "تشغيل يدوي"}
                          </div>

                          <span
                            className={clsx(
                              "adm-shipping-badge",
                              isEnabled && "adm-shipping-badge--active",
                            )}
                          >
                            {isEnabled ? "مفعّل" : "غير مفعّل"}
                          </span>
                        </div>

                        <div className="adm-shipping-provider__actions">
                          {isEnabled && storeCarrier ? (
                            <>
                              <button
                                type="button"
                                disabled={rateBusy}
                                onClick={() => void openPlatformRate(storeCarrier)}
                                className="adm-btn adm-btn--primary adm-btn--sm"
                              >
                                التسعيرة
                              </button>

                              <button
                                type="button"
                                onClick={() => openRenameDialog(storeCarrier)}
                                className="adm-btn adm-btn--secondary adm-btn--sm"
                              >
                                تعديل الاسم
                              </button>

                              <button
                                type="button"
                                disabled={carriersBusy}
                                onClick={async () => {
                                  try {
                                    setCarriersBusy(true);
                                    await disableStoreCarrier(storeCarrier.id);
                                    await refreshCarriers();
                                  } finally {
                                    setCarriersBusy(false);
                                  }
                                }}
                                className="adm-btn adm-btn--dangerGhost adm-btn--sm"
                              >
                                تعطيل
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                disabled={carriersBusy || rateBusy}
                                onClick={() => void togglePlatformCarrier(carrier)}
                                className="adm-btn adm-btn--primaryGhost adm-btn--sm"
                              >
                                تفعيل
                              </button>

                              {storeCarrier ? (
                                <button
                                  type="button"
                                  onClick={() => openRenameDialog(storeCarrier)}
                                  className="adm-btn adm-btn--secondary adm-btn--sm"
                                >
                                  تعديل الاسم
                                </button>
                              ) : null}

                              <button
                                type="button"
                                disabled
                                className="adm-btn adm-btn--disabled adm-btn--sm"
                              >
                                التسعيرة
                              </button>
                            </>
                          )}
                        </div>

                        <div className="adm-shipping-provider__hint">
                          {isEnabled
                            ? "اضبط رسوم الشحن، مناطق التغطية، مدة التوصيل وخيارات الدفع."
                            : "فعّل الشركة أولًا ثم أضف التسعيرة ومناطق التغطية."}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="adm-shipping-group">
              <div className="adm-shipping-group__head adm-shipping-group__head--withAction">
                <div className="adm-shipping-group__icon">🛵</div>
                <div>
                  <h3 className="adm-shipping-group__title">
                    المندوبين وشركات الشحن الخاصة
                  </h3>
                  <p className="adm-shipping-group__desc">
                    أضف موصل خاص بك أو شركة شحن خاصة.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={carriersBusy || rateBusy}
                  onClick={() => openCreateDialog("courier")}
                  className="adm-btn adm-btn--primary adm-shipping-group__action"
                >
                  + إضافة موصل جديد
                </button>
              </div>

              {customCouriers.length === 0 ? (
                <div className="adm-shipping-strip">
                  <div>
                    <strong>لا يوجد موصل خاص بعد</strong>
                    <span>
                      أضف موصلًا وحدد المدن والسعر ورسوم الدفع عند الاستلام.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="adm-shipping-provider-grid adm-shipping-provider-grid--custom">
                  {customCouriers.map((carrier) => {
                    const isEnabled =
                      carrier.enabled && carrier.status === "active";

                    return (
                      <div
                        key={carrier.id}
                        className={clsx(
                          "adm-shipping-provider",
                          isEnabled && "adm-shipping-provider--active",
                        )}
                      >
                        <div className="adm-shipping-provider__top">
                          <span
                            className={clsx(
                              "adm-shipping-badge",
                              isEnabled && "adm-shipping-badge--active",
                            )}
                          >
                            {isEnabled ? "مفعّل" : "غير مفعّل"}
                          </span>

                          <div className="adm-shipping-provider__logo adm-shipping-provider__logo--emoji">
                            {carrierFallbackIcon(carrier.type)}
                          </div>
                        </div>

                        <div className="adm-shipping-provider__body">
                          <h4 className="adm-shipping-provider__name">
                            {carrier.display_name}
                          </h4>

                          <div className="adm-shipping-provider__meta">
                            {carrierTypeLabel(carrier.type)}
                          </div>
                        </div>

                        <div className="adm-shipping-provider__actions">
                          <button
                            type="button"
                            disabled={rateBusy || !isEnabled}
                            onClick={() => void openCourierRate(carrier)}
                            className={clsx(
                              "adm-btn adm-btn--sm",
                              isEnabled
                                ? "adm-btn--primary"
                                : "adm-btn--disabled",
                            )}
                          >
                            التسعيرة
                          </button>

                          <button
                            type="button"
                            onClick={() => openRenameDialog(carrier)}
                            className="adm-btn adm-btn--secondary adm-btn--sm"
                          >
                            تعديل الاسم
                          </button>

                          <button
                            type="button"
                            disabled={carriersBusy}
                            onClick={() => openDeleteDialog(carrier)}
                            className="adm-btn adm-btn--dangerGhost adm-btn--sm"
                          >
                            حذف
                          </button>
                        </div>

                        <div className="adm-shipping-provider__hint">
                          إعدادات الموصل والتسعيرة تظهر من نفس البطاقة.
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="adm-shipping-group">
              <div className="adm-shipping-group__head adm-shipping-group__head--withAction">
                <div className="adm-shipping-group__icon">🏬</div>
                <div>
                  <h3 className="adm-shipping-group__title">استلام من الفرع</h3>
                  <p className="adm-shipping-group__desc">
                    اسمح لعملائك باستلام الطلب من فروعك.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={carriersBusy}
                  onClick={() => openCreateDialog("pickup")}
                  className="adm-btn adm-btn--primary adm-shipping-group__action"
                >
                  + إضافة فرع
                </button>
              </div>

              {pickupCarriers.length === 0 ? (
                <div className="adm-shipping-strip">
                  <div>
                    <strong>لا يوجد فرع استلام بعد</strong>
                    <span>أضف فرعًا ليظهر كخيار استلام للعملاء.</span>
                  </div>
                </div>
              ) : (
                <div className="adm-shipping-provider-grid adm-shipping-provider-grid--custom">
                  {pickupCarriers.map((carrier) => {
                    const isEnabled =
                      carrier.enabled && carrier.status === "active";

                    return (
                      <div
                        key={carrier.id}
                        className={clsx(
                          "adm-shipping-provider",
                          isEnabled && "adm-shipping-provider--active",
                        )}
                      >
                        <div className="adm-shipping-provider__top">
                          <span
                            className={clsx(
                              "adm-shipping-badge",
                              isEnabled && "adm-shipping-badge--active",
                            )}
                          >
                            {isEnabled ? "مفعّل" : "غير مفعّل"}
                          </span>

                          <div className="adm-shipping-provider__logo adm-shipping-provider__logo--emoji">
                            {carrierFallbackIcon(carrier.type)}
                          </div>
                        </div>

                        <div className="adm-shipping-provider__body">
                          <h4 className="adm-shipping-provider__name">
                            {carrier.display_name}
                          </h4>

                          <div className="adm-shipping-provider__meta">
                            {carrierTypeLabel(carrier.type)}
                          </div>
                        </div>

                        <div className="adm-shipping-provider__actions">
                          <button
                            type="button"
                            onClick={() => void openPickupPoints(carrier)}
                            className="adm-btn adm-btn--primary adm-btn--sm"
                          >
                            إدارة الفروع
                          </button>

                          <button
                            type="button"
                            onClick={() => openRenameDialog(carrier)}
                            className="adm-btn adm-btn--secondary adm-btn--sm"
                          >
                            تعديل الاسم
                          </button>

                          <button
                            type="button"
                            disabled={carriersBusy}
                            onClick={() => openDeleteDialog(carrier)}
                            className="adm-btn adm-btn--dangerGhost adm-btn--sm"
                          >
                            حذف
                          </button>
                        </div>

                        <div className="adm-shipping-provider__hint">
                          إدارة الفروع والمدينة والعنوان من نفس البطاقة.
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="adm-shipping-settings-box">
              <div className="adm-shipping-settings-box__head">
                <h3 className="adm-shipping-settings-box__title">
                  إعدادات الشحن
                </h3>
                <p className="adm-shipping-settings-box__desc">
                  إعدادات عامة لجميع طرق الشحن.
                </p>
              </div>

              <div className="adm-shipping-settings-grid">
                <button
                  type="button"
                  onClick={() => setFreeShippingOpen(true)}
                  className="adm-shipping-settings-card adm-shipping-settings-card--button"
                >
                  <div className="adm-shipping-settings-card__icon">🎁</div>
                  <div>
                    <strong>الشحن المجاني</strong>
                    <span>قواعد الشحن المجاني</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setCodRulesOpen(true)}
                  className="adm-shipping-settings-card adm-shipping-settings-card--button"
                >
                  <div className="adm-shipping-settings-card__icon">💵</div>
                  <div>
                    <strong>الدفع عند الاستلام</strong>
                    <span>قواعد ورسوم الدفع عند الاستلام</span>
                  </div>
                </button>

                <div className="adm-shipping-settings-card">
                  <div className="adm-shipping-settings-card__icon">⚙️</div>
                  <div>
                    <strong>خيارات شركات الشحن</strong>
                    <span>تخصيص الخيارات المتاحة</span>
                  </div>
                </div>

                <div className="adm-shipping-settings-card">
                  <div className="adm-shipping-settings-card__icon">🧮</div>
                  <div>
                    <strong>حاسبة أسعار الشحن</strong>
                    <span>تقدير تكلفة الشحن</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {nameDialog ? (
        <div className="adm-shipping-rate-modal" role="dialog" aria-modal="true">
          <button
            type="button"
            className="adm-shipping-rate-modal__backdrop"
            onClick={closeNameDialog}
            aria-label="إغلاق"
          />

          <div className="adm-shipping-rate-modal__wrap">
            <form
              className="adm-shipping-rate-modal__panel"
              onSubmit={(event) => {
                event.preventDefault();
                void submitNameDialog();
              }}
            >
              <div className="adm-shipping-rate-modal__head">
                <div className="adm-shipping-rate-modal__titleWrap">
                  <h2 className="adm-shipping-rate-modal__title">
                    {nameDialog.title}
                  </h2>
                  <p className="adm-shipping-rate-modal__desc">
                    {nameDialog.description}
                  </p>
                </div>

                <button
                  type="button"
                  className="adm-shipping-rate-modal__close"
                  onClick={closeNameDialog}
                  disabled={nameBusy}
                  aria-label="إغلاق"
                >
                  ×
                </button>
              </div>

              <div className="adm-shipping-rate-modal__body">
                {nameErr ? (
                  <div className="adm-shipping-rate-alert adm-shipping-rate-alert--danger">
                    {nameErr}
                  </div>
                ) : null}

                <div className="adm-shipping-rate-card">
                  <div className="adm-shipping-rate-field">
                    <label className="adm-shipping-rate-field__label">
                      اسم الخدمة
                    </label>

                    <input
                      autoFocus
                      value={nameValue}
                      disabled={nameBusy}
                      onChange={(event) => setNameValue(event.target.value)}
                      className="adm-shipping-rate-field__control"
                      placeholder="مثال: موصل الرياض"
                    />
                  </div>

                  <div className="adm-shipping-rate-hint">
                    استخدم اسمًا واضحًا ومختصرًا، لأن هذا الاسم سيساعدك في إدارة
                    طرق الشحن وقد يظهر للعميل حسب إعدادات العرض.
                  </div>
                </div>
              </div>

              <div className="adm-shipping-rate-modal__footer">
                <button
                  type="button"
                  className="adm-btn adm-btn--secondary"
                  onClick={closeNameDialog}
                  disabled={nameBusy}
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  className="adm-btn adm-btn--primary"
                  disabled={nameBusy}
                >
                  {nameBusy ? "جاري الحفظ..." : nameDialog.submitLabel}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="adm-shipping-rate-modal" role="dialog" aria-modal="true">
          <button
            type="button"
            className="adm-shipping-rate-modal__backdrop"
            onClick={closeDeleteDialog}
            aria-label="إغلاق"
          />

          <div className="adm-shipping-rate-modal__wrap">
            <div className="adm-shipping-rate-modal__panel">
              <div className="adm-shipping-rate-modal__head">
                <div className="adm-shipping-rate-modal__titleWrap">
                  <h2 className="adm-shipping-rate-modal__title">
                    حذف طريقة الشحن
                  </h2>
                  <p className="adm-shipping-rate-modal__desc">
                    سيتم حذف هذه الخدمة من خيارات الشحن الخاصة بمتجرك.
                  </p>
                </div>

                <button
                  type="button"
                  className="adm-shipping-rate-modal__close"
                  onClick={closeDeleteDialog}
                  disabled={deleteBusy}
                  aria-label="إغلاق"
                >
                  ×
                </button>
              </div>

              <div className="adm-shipping-rate-modal__body">
                {deleteErr ? (
                  <div className="adm-shipping-rate-alert adm-shipping-rate-alert--danger">
                    {deleteErr}
                  </div>
                ) : null}

                <div className="adm-shipping-rate-card">
                  <div className="adm-shipping-rate-card__titleWrap">
                    <h3 className="adm-shipping-rate-card__title">
                      {deleteTarget.display_name}
                    </h3>
                    <p className="adm-shipping-rate-card__desc">
                      النوع: {carrierTypeLabel(deleteTarget.type)}
                    </p>
                  </div>

                  <div className="adm-shipping-rate-note adm-shipping-rate-note--danger">
                    هل أنت متأكد أنك تريد حذف هذه الخدمة نهائيًا؟ لا يمكن
                    التراجع عن هذه العملية بعد الحذف.
                  </div>
                </div>
              </div>

              <div className="adm-shipping-rate-modal__footer">
                <button
                  type="button"
                  className="adm-btn adm-btn--secondary"
                  onClick={closeDeleteDialog}
                  disabled={deleteBusy}
                >
                  إلغاء
                </button>

                <button
                  type="button"
                  className="adm-btn adm-btn--danger"
                  onClick={() => void submitDeleteDialog()}
                  disabled={deleteBusy}
                >
                  {deleteBusy ? "جاري الحذف..." : "حذف الخدمة"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <FreeShippingModal
        open={freeShippingOpen}
        busy={carriersBusy}
        onClose={() => setFreeShippingOpen(false)}
        onSaved={async () => {
          await refreshCarriers();
        }}
      />

      <CodRulesModal
        open={codRulesOpen}
        busy={carriersBusy}
        onClose={() => setCodRulesOpen(false)}
        onSaved={async () => {
          await refreshCarriers();
        }}
      />

      <PickupLocationModal
        open={openPickup}
        busy={pickupBusy}
        initialValue={savedPickup}
        onClose={() => {
          if (pickupBusy) return;
          setOpenPickup(false);
        }}
        onConfirm={async (value) => {
          try {
            setPickupBusy(true);
            const savedValue = await savePickupLocation(value);
            setSavedPickup(savedValue);
            setOpenPickup(false);
          } finally {
            setPickupBusy(false);
          }
        }}
      />

      <RateModal
        open={rateOpen}
        busy={rateBusy}
        storeShippingCarrierId={rateCarrierId}
        carrierName={rateCarrierName}
        carrierCode={rateCarrierCode}
        onClose={() => setRateOpen(false)}
        onSaved={async () => {
          await refreshCarriers();
        }}
      />

      <CourierRateModal
        open={courierOpen}
        busy={rateBusy}
        storeShippingCarrierId={courierCarrierId}
        carrierName={courierCarrierName}
        onClose={() => setCourierOpen(false)}
        onSaved={async () => {
          await refreshCarriers();
        }}
      />

      <PickupPointsModal
        open={ppOpen}
        busy={carriersBusy}
        storeShippingCarrierId={ppCarrierId}
        carrierName={ppCarrierName}
        onClose={() => setPpOpen(false)}
      />
    </div>
  );
}