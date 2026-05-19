// FILE: apps/merchant/src/app/(app)/settings/component/basic/_components/social-accounts-section.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

import SectionShell from "./section-shell";
import Button from "@/components/ui/Button";
import Input from "@/components/form/Input";
import FieldWrap from "@/components/form/FieldWrap";

type Social = {
  instagram: string;
  x: string;
  snapchat: string;
  tiktok: string;
  youtube: string;
  facebook: string;
};

type SocialKey = keyof Social;

type SocialFieldProps = {
  name: SocialKey;
  label: string;
  placeholder: string;
  value: string;
  loading: boolean;
  onChange: (key: SocialKey, value: string) => void;
};

function SocialField({
  name,
  label,
  placeholder,
  value,
  loading,
  onChange,
}: SocialFieldProps) {
  return (
    <div className="adm-basic-social-field">
      <label className="adm-basic-social-field__label">{label}</label>

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

export default function SocialAccountsSection({ id }: { id: string }) {
  const [social, setSocial] = useState<Social>({
    instagram: "",
    x: "",
    snapchat: "",
    tiktok: "",
    youtube: "",
    facebook: "",
  });

  const [initial, setInitial] = useState<Social | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch("/api/settings/store/social/get");
        const json = await response.json().catch(() => ({}));

        if (response.ok && json?.ok) {
          setSocial(json.social);
          setInitial(json.social);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const hasChanges = useMemo(() => {
    if (!initial) return true;
    return JSON.stringify(initial) !== JSON.stringify(social);
  }, [initial, social]);

  function updateSocial(key: SocialKey, value: string) {
    setSocial((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function onSave() {
    setSaving(true);
    setMsg(null);

    try {
      const response = await fetch("/api/settings/store/social/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(social),
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok || !json?.ok) {
        setMsg(`فشل الحفظ: ${json?.error || "SAVE_FAILED"}`);
        return;
      }

      setInitial(json.social);
      setMsg("تم الحفظ");
      setTimeout(() => setMsg(null), 1600);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionShell
      id={id}
      sectionKey="social"
      title="حسابات التواصل الاجتماعي"
      description="تظهر حسابات التواصل الاجتماعي في تذييل صفحة المتجر"
      icon="ShareKnowledge"
    >
      <div className="adm-basic-social">
        <div className="adm-basic-social-fields">
          <SocialField
            name="instagram"
            label="حساب انستجرام"
            placeholder="أضف حساب انستجرام"
            value={social.instagram}
            loading={loading}
            onChange={updateSocial}
          />

          <SocialField
            name="x"
            label="حساب اكس"
            placeholder="أضف حساب اكس"
            value={social.x}
            loading={loading}
            onChange={updateSocial}
          />

          <SocialField
            name="snapchat"
            label="حساب سناب شات"
            placeholder="أضف حساب سناب شات"
            value={social.snapchat}
            loading={loading}
            onChange={updateSocial}
          />

          <SocialField
            name="tiktok"
            label="حساب تيك توك"
            placeholder="أضف حساب تيك توك"
            value={social.tiktok}
            loading={loading}
            onChange={updateSocial}
          />

          <SocialField
            name="youtube"
            label="قناة يوتيوب"
            placeholder="أضف رابط أو اسم قناة يوتيوب"
            value={social.youtube}
            loading={loading}
            onChange={updateSocial}
          />

          <SocialField
            name="facebook"
            label="حساب فيسبوك"
            placeholder="أضف حساب فيسبوك"
            value={social.facebook}
            loading={loading}
            onChange={updateSocial}
          />
        </div>

        <div className="adm-basic-social-save">
          <div className="adm-basic-social-save__msg">{msg || ""}</div>

          <Button
            variant="solid"
            color="primary"
            className="adm-basic-social-save__btn adm-basic-social-btn adm-basic-social-btn--primary"
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