// FILE: apps/merchant/src/app/(app)/settings/_components/MaintenanceSettingsModal.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

export type MaintenanceSettingsValues = {
  enabled: boolean;
  title: string;
  message: string;
  show_contact_methods: boolean;
};

const DEFAULT_MAINTENANCE_SETTINGS: MaintenanceSettingsValues = {
  enabled: false,
  title: "المتجر مغلق حاليًا",
  message:
    "عذرًا عزيزي العميل، المتجر حاليًا قيد الصيانة وسنعاود العمل خلال وقت قريب.",
  show_contact_methods: true,
};

type Props = {
  open: boolean;
  onClose: () => void;
};

function normalizeSettings(input: any): MaintenanceSettingsValues {
  const source = input && typeof input === "object" ? input : {};

  return {
    enabled: Boolean(source.enabled),
    title: String(source.title ?? DEFAULT_MAINTENANCE_SETTINGS.title),
    message: String(source.message ?? DEFAULT_MAINTENANCE_SETTINGS.message),
    show_contact_methods:
      typeof source.show_contact_methods === "boolean"
        ? source.show_contact_methods
        : DEFAULT_MAINTENANCE_SETTINGS.show_contact_methods,
  };
}

export default function MaintenanceSettingsModal({ open, onClose }: Props) {
  const [settings, setSettings] = useState<MaintenanceSettingsValues>(
    DEFAULT_MAINTENANCE_SETTINGS,
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const canSave = useMemo(() => {
    return settings.title.trim().length > 0 && settings.message.trim().length > 0;
  }, [settings.title, settings.message]);

  useEffect(() => {
    if (!open) return;

    let alive = true;

    async function load() {
      setLoading(true);
      setSaving(false);
      setSaved(false);
      setError("");

      try {
        const res = await fetch("/api/settings/store/maintenance/get", {
          method: "GET",
          cache: "no-store",
        });

        const json = await res.json().catch(() => null);

        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || "LOAD_FAILED");
        }

        if (alive) {
          setSettings(normalizeSettings(json.settings));
        }
      } catch {
        if (alive) {
          setError("تعذر تحميل إعدادات وضع الصيانة.");
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, [open]);

  if (!open) return null;

  async function handleSave() {
    if (!canSave || saving) return;

    setSaving(true);
    setSaved(false);
    setError("");

    try {
      const payload: MaintenanceSettingsValues = {
        enabled: Boolean(settings.enabled),
        title: settings.title.trim(),
        message: settings.message.trim(),
        show_contact_methods: Boolean(settings.show_contact_methods),
      };

      const res = await fetch("/api/settings/store/maintenance/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "SAVE_FAILED");
      }

      setSaved(true);

      window.setTimeout(() => {
        onClose();
      }, 450);
    } catch {
      setError("تعذر حفظ إعدادات وضع الصيانة.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="adm-maintenance-modal" dir="rtl" role="dialog" aria-modal="true">
      <div className="adm-maintenance-modal__backdrop" onClick={onClose} />

      <section className="adm-maintenance-modal__panel">
        <header className="adm-maintenance-modal__head">
          <button
            type="button"
            className="adm-maintenance-modal__close"
            onClick={onClose}
            aria-label="إغلاق"
          >
            ×
          </button>

          <h2 className="adm-maintenance-modal__title">وضع الصيانة</h2>
        </header>

        <div className="adm-maintenance-modal__body">
          {loading ? (
            <div className="adm-maintenance-modal__loading">
              جاري تحميل إعدادات وضع الصيانة...
            </div>
          ) : (
            <>
              <div className="adm-maintenance-modal__top">
                <div className="adm-maintenance-modal__copy">
                  <div className="adm-maintenance-modal__subTitle">
                    وضع الصيانة
                  </div>
                  <p className="adm-maintenance-modal__desc">
                    عند تفعيل وضع الصيانة سيتم منع العملاء والزوار من الدخول
                    للمتجر، وسيظهر لهم محتوى صفحة الصيانة بدل صفحات المتجر.
                    لوحة الإدارة ستبقى متاحة لك بشكل طبيعي.
                  </p>
                </div>

                <label className="adm-maintenance-switch">
                  <input
                    type="checkbox"
                    checked={settings.enabled}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        enabled: e.target.checked,
                      }))
                    }
                  />
                  <span className="adm-maintenance-switch__track">
                    <span className="adm-maintenance-switch__thumb" />
                  </span>
                </label>
              </div>

              <div className="adm-maintenance-field">
                <label className="adm-maintenance-field__label">
                  العنوان الرئيسي للصيانة
                </label>
                <input
                  value={settings.title}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                  className="adm-maintenance-field__input"
                  placeholder="اكتب عنوان صفحة الصيانة"
                  maxLength={120}
                  dir="rtl"
                />
              </div>

              <div className="adm-maintenance-field">
                <label className="adm-maintenance-field__label">
                  رسالة الصيانة
                </label>
                <textarea
                  value={settings.message}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      message: e.target.value,
                    }))
                  }
                  className="adm-maintenance-field__textarea"
                  placeholder="اكتب الرسالة التي ستظهر للعميل أثناء الصيانة"
                  rows={4}
                  maxLength={700}
                  dir="rtl"
                />
              </div>

              <label className="adm-maintenance-check">
                <input
                  type="checkbox"
                  checked={settings.show_contact_methods}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      show_contact_methods: e.target.checked,
                    }))
                  }
                />
                <span className="adm-maintenance-check__box" />
                <span className="adm-maintenance-check__text">
                  إظهار وسائل التواصل إن وجدت من بيانات المتجر
                </span>
              </label>

              {error ? (
                <div className="adm-maintenance-alert adm-maintenance-alert--error">
                  {error}
                </div>
              ) : null}

              {saved ? (
                <div className="adm-maintenance-alert adm-maintenance-alert--success">
                  تم حفظ إعدادات وضع الصيانة.
                </div>
              ) : null}
            </>
          )}
        </div>

        <footer className="adm-maintenance-modal__foot">
          <button
            type="button"
            className="adm-btn adm-btn--primary"
            onClick={handleSave}
            disabled={loading || saving || !canSave}
          >
            {saving ? "جاري الحفظ..." : "حفظ"}
          </button>

          <button
            type="button"
            className="adm-btn adm-btn--soft"
            onClick={onClose}
            disabled={saving}
          >
            إلغاء
          </button>
        </footer>
      </section>
    </div>
  );
}