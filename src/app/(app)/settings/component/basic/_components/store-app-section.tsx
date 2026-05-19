// FILE: apps/merchant/src/app/(app)/settings/component/basic/_components/store-app-section.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

import SectionShell from "./section-shell";
import Button from "@/components/ui/Button";
import Input from "@/components/form/Input";
import FieldWrap from "@/components/form/FieldWrap";
import Icon from "@/components/icon/Icon";

type AppLinks = {
  ios: string;
  android: string;
};

type AppKey = keyof AppLinks;

function AppLinkField({
  name,
  label,
  placeholder,
  icon,
  value,
  loading,
  onChange,
}: {
  name: AppKey;
  label: string;
  placeholder: string;
  icon: string;
  value: string;
  loading: boolean;
  onChange: (key: AppKey, value: string) => void;
}) {
  return (
    <div className="adm-basic-app-field">
      <label className="adm-basic-app-field__label">
        <span className="adm-basic-app-field__icon">
          <Icon icon={icon as any} size="text-xl" />
        </span>

        <span>{label}</span>
      </label>

      <FieldWrap>
        <Input
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={(event: any) => onChange(name, event.target.value)}
          disabled={loading}
        />
      </FieldWrap>
    </div>
  );
}

export default function StoreAppSection({ id }: { id: string }) {
  const [app, setApp] = useState<AppLinks>({
    ios: "",
    android: "",
  });

  const [initial, setInitial] = useState<AppLinks | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch("/api/settings/store/app/get");
        const json = await response.json().catch(() => ({}));

        if (response.ok && json?.ok) {
          setApp(json.app);
          setInitial(json.app);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const hasChanges = useMemo(() => {
    if (!initial) return true;
    return JSON.stringify(initial) !== JSON.stringify(app);
  }, [initial, app]);

  function updateAppLink(key: AppKey, value: string) {
    setApp((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function onSave() {
    setSaving(true);
    setMsg(null);

    try {
      const response = await fetch("/api/settings/store/app/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(app),
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok || !json?.ok) {
        setMsg(`فشل الحفظ: ${json?.error || "SAVE_FAILED"}`);
        return;
      }

      setInitial(json.app);
      setMsg("تم الحفظ");
      setTimeout(() => setMsg(null), 1600);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionShell
      id={id}
      sectionKey="app"
      title="تطبيق المتجر"
      description="تظهر روابط تطبيق المتجر في تذييل صفحة المتجر"
      icon="SmartPhone01"
    >
      <div className="adm-basic-app">
        <div className="adm-basic-app-box">
          <div className="adm-basic-app-box__head">
            <h4 className="adm-basic-app-box__title">روابط التطبيق</h4>
            <p className="adm-basic-app-box__desc">
              أضف روابط تطبيق المتجر على iOS وأندرويد ليتم عرضها في واجهة المتجر.
            </p>
          </div>

          <div className="adm-basic-app-fields">
            <AppLinkField
              name="ios"
              label="رابط تطبيق iOS"
              placeholder="أضف رابط التطبيق على iOS"
              icon="Apple"
              value={app.ios}
              loading={loading}
              onChange={updateAppLink}
            />

            <AppLinkField
              name="android"
              label="رابط تطبيق أندرويد"
              placeholder="أضف رابط التطبيق على أندرويد"
              icon="Android"
              value={app.android}
              loading={loading}
              onChange={updateAppLink}
            />
          </div>
        </div>

        <div className="adm-basic-app-save">
          <div className="adm-basic-app-save__msg">{msg || ""}</div>

          <Button
            variant="solid"
            color="primary"
            className="adm-basic-app-save__btn adm-basic-app-btn adm-basic-app-btn--primary"
            isLoading={saving}
            isDisable={loading || saving || !hasChanges}
            onClick={onSave}
          >
            حفظ
          </Button>
        </div>
      </div>
    </SectionShell>
  );
}