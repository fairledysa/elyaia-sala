// FILE: apps/merchant/src/app/(app)/settings/component/basic/_components/store-info-section.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

import SectionShell from "./section-shell";
import Button from "@/components/ui/Button";
import Input from "@/components/form/Input";
import FieldWrap from "@/components/form/FieldWrap";
import Icon from "@/components/icon/Icon";

type Profile = {
  description: string;
  logo_url: string;
  favicon_url: string;
};

type UploadKind = "logo" | "favicon";

function StoreImageBlock({
  inputId,
  title,
  icon,
  imageUrl,
  imageAlt,
  emptyIcon,
  inputName,
  placeholder,
  accept,
  uploadText,
  hint,
  disabled,
  uploading,
  onUrlChange,
  onUpload,
}: {
  inputId: string;
  title: string;
  icon: string;
  imageUrl: string;
  imageAlt: string;
  emptyIcon: string;
  inputName: string;
  placeholder: string;
  accept: string;
  uploadText: string;
  hint: string;
  disabled: boolean;
  uploading: boolean;
  onUrlChange: (value: string) => void;
  onUpload: (file: File) => Promise<void>;
}) {
  return (
    <div className="adm-basic-store-field">
      <div className="adm-basic-store-field__head">
        <label className="adm-basic-store-field__label">{title}</label>

        <span className="adm-basic-store-field__headIcon">
          <Icon icon={icon as any} size="text-xl" />
        </span>
      </div>

      <div className="adm-basic-store-upload">
        <div className="adm-basic-store-upload__preview">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={imageAlt}
              className="adm-basic-store-upload__img"
            />
          ) : (
            <Icon icon={emptyIcon as any} size="text-2xl" />
          )}
        </div>

        <div className="adm-basic-store-upload__content">
          <FieldWrap
            lastSuffix={
              <span className="adm-basic-store-field__suffix">
                <Icon icon="Link01" />
              </span>
            }
          >
            <Input
              name={inputName}
              placeholder={placeholder}
              value={imageUrl}
              onChange={(event: any) => onUrlChange(event.target.value)}
              disabled={disabled}
            />
          </FieldWrap>

          <div className="adm-basic-store-upload__actions">
            <input
              id={inputId}
              type="file"
              accept={accept}
              className="adm-basic-store-fileInput"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;

                await onUpload(file);

                try {
                  event.target.value = "";
                } catch {}
              }}
              disabled={disabled || uploading}
            />

            <Button
              variant="solid"
              color="primary"
              isLoading={uploading}
              isDisable={disabled || uploading}
              onClick={() =>
                (
                  document.getElementById(inputId) as HTMLInputElement | null
                )?.click()
              }
              className="adm-basic-store-btn adm-basic-store-btn--primary"
            >
              {uploadText}
            </Button>

            <div className="adm-basic-store-upload__hint">{hint}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StoreInfoSection({
  id,
  storeName,
  storeSlug,
  profileInitial,
  isLoadingProfile,
  onProfileSaved,
  onStoreNameSaved,
}: {
  id: string;
  storeName: string;
  storeSlug: string;
  profileInitial: Profile;
  isLoadingProfile: boolean;
  onProfileSaved: (value: Profile) => void;
  onStoreNameSaved?: (name: string) => void;
}) {
  const [storeNameAr, setStoreNameAr] = useState(storeName || "");
  const [description, setDescription] = useState(
    profileInitial.description || "",
  );
  const [logoUrl, setLogoUrl] = useState(profileInitial.logo_url || "");
  const [faviconUrl, setFaviconUrl] = useState(
    profileInitial.favicon_url || "",
  );

  const [isSaving, setIsSaving] = useState(false);
  const [savedTick, setSavedTick] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingFavicon, setIsUploadingFavicon] = useState(false);

  useEffect(() => {
    setStoreNameAr(storeName || "");
  }, [storeName]);

  useEffect(() => {
    setDescription(profileInitial.description || "");
    setLogoUrl(profileInitial.logo_url || "");
    setFaviconUrl(profileInitial.favicon_url || "");
  }, [
    profileInitial.description,
    profileInitial.logo_url,
    profileInitial.favicon_url,
  ]);

  const hasChanges = useMemo(() => {
    return (
      storeNameAr !== (storeName || "") ||
      description !== (profileInitial.description || "") ||
      logoUrl !== (profileInitial.logo_url || "") ||
      faviconUrl !== (profileInitial.favicon_url || "")
    );
  }, [
    storeNameAr,
    storeName,
    description,
    logoUrl,
    faviconUrl,
    profileInitial,
  ]);

  async function uploadViaWorker(kind: UploadKind, file: File) {
    setErrorMsg(null);

    const formData = new FormData();
    formData.append("kind", kind);
    formData.append("file", file);

    const response = await fetch("/api/uploads/r2/put", {
      method: "POST",
      body: formData,
    });

    const json = await response.json().catch(() => ({}));
    if (!response.ok || !json?.ok) {
      throw new Error(json?.error || "UPLOAD_FAILED");
    }

    return json.publicUrl as string;
  }

  async function onSave() {
    setIsSaving(true);
    setErrorMsg(null);
    setSavedTick(false);

    try {
      const response = await fetch("/api/settings/store/profile/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          store_name: storeNameAr,
          description,
          logo_url: logoUrl,
          favicon_url: faviconUrl,
        }),
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok || !json?.ok) {
        setErrorMsg(json?.error || "SAVE_FAILED");
        return;
      }

      onProfileSaved({
        description,
        logo_url: logoUrl,
        favicon_url: faviconUrl,
      });

      onStoreNameSaved?.(storeNameAr);

      setSavedTick(true);
      setTimeout(() => setSavedTick(false), 1600);
    } catch {
      setErrorMsg("NETWORK_ERROR");
    } finally {
      setIsSaving(false);
    }
  }

  function resetForm() {
    setStoreNameAr(storeName || "");
    setDescription(profileInitial.description || "");
    setLogoUrl(profileInitial.logo_url || "");
    setFaviconUrl(profileInitial.favicon_url || "");
    setErrorMsg(null);
    setSavedTick(false);
  }

  return (
    <SectionShell
      id={id}
      sectionKey="store"
      title="بيانات المتجر"
      description="تظهر بيانات المتجر في رأس وتذييل صفحة المتجر وفي تبويب المتصفِّح"
      icon="StoreManagement01"
    >
      <div className="adm-basic-store">
        <StoreImageBlock
          inputId="adm_store_logo_file"
          title="شعار المتجر"
          icon="Image01"
          imageUrl={logoUrl}
          imageAlt="logo"
          emptyIcon="ImageNotFound01"
          inputName="logo_url"
          placeholder="الرابط يظهر تلقائيًا بعد الرفع"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          uploadText="رفع الشعار"
          hint="PNG/JPG/WebP — أفضل مقاس: 250×100"
          disabled={isLoadingProfile}
          uploading={isUploadingLogo}
          onUrlChange={setLogoUrl}
          onUpload={async (file) => {
            setIsUploadingLogo(true);
            setErrorMsg(null);

            try {
              const url = await uploadViaWorker("logo", file);
              setLogoUrl(url);
            } catch (error: any) {
              setErrorMsg(error?.message || "UPLOAD_FAILED");
            } finally {
              setIsUploadingLogo(false);
            }
          }}
        />

        <StoreImageBlock
          inputId="adm_store_favicon_file"
          title="أيقونة تبويب المتجر"
          icon="Browser"
          imageUrl={faviconUrl}
          imageAlt="favicon"
          emptyIcon="ImageNotFound02"
          inputName="favicon_url"
          placeholder="الرابط يظهر تلقائيًا بعد الرفع"
          accept="image/png,image/x-icon,image/vnd.microsoft.icon,image/jpeg,image/webp"
          uploadText="رفع الأيقونة"
          hint="أفضل مقاس: 32×32"
          disabled={isLoadingProfile}
          uploading={isUploadingFavicon}
          onUrlChange={setFaviconUrl}
          onUpload={async (file) => {
            setIsUploadingFavicon(true);
            setErrorMsg(null);

            try {
              const url = await uploadViaWorker("favicon", file);
              setFaviconUrl(url);
            } catch (error: any) {
              setErrorMsg(error?.message || "UPLOAD_FAILED");
            } finally {
              setIsUploadingFavicon(false);
            }
          }}
        />

        <div className="adm-basic-store-field">
          <div className="adm-basic-store-field__head">
            <label className="adm-basic-store-field__label">اسم المتجر</label>

            <span className="adm-basic-store-field__headIcon">
              <Icon icon="Edit02" size="text-xl" />
            </span>
          </div>

          <FieldWrap>
            <Input
              name="store_name_ar"
              value={storeNameAr}
              onChange={(event: any) => setStoreNameAr(event.target.value)}
              disabled={isLoadingProfile}
            />
          </FieldWrap>

          <div className="adm-basic-store-field__hint">
            هذا الاسم يظهر للعميل داخل المتجر.
          </div>
        </div>

        <div className="adm-basic-store-field">
          <div className="adm-basic-store-field__head">
            <label className="adm-basic-store-field__label">
              اسم المتجر بالإنجليزي (الساب دومين)
            </label>

            <span className="adm-basic-store-field__headIcon">
              <Icon icon="Locked" size="text-xl" />
            </span>
          </div>

          <FieldWrap
            lastSuffix={
              <span className="adm-basic-store-field__suffix">
                .elyaia.com
              </span>
            }
          >
            <Input name="store_slug" value={storeSlug || ""} disabled readOnly />
          </FieldWrap>

          <div className="adm-basic-store-field__hint">
            ثابت ولا يمكن تغييره من هنا.
          </div>
        </div>

        <div className="adm-basic-store-field">
          <div className="adm-basic-store-field__head">
            <label className="adm-basic-store-field__label">وصف المتجر</label>

            <span className="adm-basic-store-field__headIcon">
              <Icon icon="Note01" size="text-xl" />
            </span>
          </div>

          <div className="adm-basic-store-editor">
            <textarea
              className="adm-basic-store-editor__textarea"
              rows={5}
              placeholder="اكتب وصفًا مختصرًا عن المتجر"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={isLoadingProfile}
            />

            <div className="adm-basic-store-editor__footer">
              <div className="adm-basic-store-editor__tools">
                <span>B</span>
                <span>I</span>
                <span>U</span>
              </div>

              <div>{description.length}/2000</div>
            </div>
          </div>

          {errorMsg ? (
            <div className="adm-basic-store-status adm-basic-store-status--error">
              خطأ: {errorMsg}
            </div>
          ) : null}

          {savedTick ? (
            <div className="adm-basic-store-status adm-basic-store-status--success">
              تم الحفظ
            </div>
          ) : null}
        </div>

        <div className="adm-basic-store-actions">
          <Button
            variant="solid"
            color="zinc"
            isDisable={isSaving || isLoadingProfile || !hasChanges}
            onClick={resetForm}
            className="adm-basic-store-btn adm-basic-store-btn--secondary"
          >
            إعادة ضبط
          </Button>

          <Button
            variant="solid"
            color="primary"
            className="adm-basic-store-btn adm-basic-store-btn--primary adm-basic-store-actions__save"
            isLoading={isSaving}
            isDisable={isSaving || isLoadingProfile || !hasChanges}
            onClick={onSave}
          >
            حفظ
          </Button>
        </div>
      </div>
    </SectionShell>
  );
}