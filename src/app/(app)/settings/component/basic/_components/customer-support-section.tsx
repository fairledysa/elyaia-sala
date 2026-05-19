// FILE: apps/merchant/src/app/(app)/settings/component/basic/_components/customer-support-section.tsx
"use client";

import {
  type ClipboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import SectionShell from "./section-shell";
import Button from "@/components/ui/Button";
import Input from "@/components/form/Input";
import FieldWrap from "@/components/form/FieldWrap";
import Icon from "@/components/icon/Icon";

type Support = {
  phone: string;
  whatsapp: string;
  whatsapp_pending: string;
  whatsapp_verified_at: string | null;
  telegram: string;
  email: string;
};

function OtpBoxes({
  value,
  onChange,
  disabled,
  length = 4,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  length?: number;
}) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const digits = useMemo(() => {
    const v = String(value || "").replace(/\D/g, "").slice(0, length);
    return Array.from({ length }, (_, i) => v[i] || "");
  }, [value, length]);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  function setDigits(nextDigits: string[]) {
    onChange(nextDigits.join(""));
  }

  function setAt(idx: number, digit: string) {
    const next = digits.slice();
    next[idx] = digit;
    setDigits(next);
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    if (disabled) return;
    e.preventDefault();

    const text = e.clipboardData.getData("text") || "";
    const only = text.replace(/\D/g, "").slice(0, length);
    if (!only) return;

    const next = Array.from({ length }, (_, i) => only[i] || "");
    setDigits(next);

    const focusIndex = Math.min(only.length, length) - 1;
    setTimeout(() => inputsRef.current[Math.max(0, focusIndex)]?.focus(), 0);
  }

  return (
    <div className="adm-basic-support-otp" dir="ltr">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputsRef.current[index] = el;
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={1}
          disabled={disabled}
          value={digit}
          onPaste={handlePaste}
          onChange={(e) => {
            if (disabled) return;

            const raw = (e.target.value || "").replace(/\D/g, "");
            if (!raw) {
              setAt(index, "");
              return;
            }

            const nextDigit = raw.slice(-1);
            setAt(index, nextDigit);

            if (index < length - 1) inputsRef.current[index + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (disabled) return;

            if (e.key === "Backspace") {
              if (digits[index]) {
                setAt(index, "");
              } else if (index > 0) {
                inputsRef.current[index - 1]?.focus();

                const next = digits.slice();
                next[index - 1] = "";
                setDigits(next);
              }

              e.preventDefault();
            }

            if (e.key === "ArrowLeft") {
              if (index > 0) inputsRef.current[index - 1]?.focus();
              e.preventDefault();
            }

            if (e.key === "ArrowRight") {
              if (index < length - 1) inputsRef.current[index + 1]?.focus();
              e.preventDefault();
            }
          }}
          className="adm-basic-support-otp__input"
        />
      ))}
    </div>
  );
}

export default function CustomerSupportSection({ id }: { id: string }) {
  const [support, setSupport] = useState<Support>({
    phone: "",
    whatsapp: "",
    whatsapp_pending: "",
    whatsapp_verified_at: null,
    telegram: "",
    email: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [msg, setMsg] = useState<string | null>(null);
  const [waRequestError, setWaRequestError] = useState<string | null>(null);

  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch("/api/settings/store/support/get");
        const json = await response.json().catch(() => ({}));

        if (response.ok && json?.ok) {
          setSupport(json.support);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function saveSupport() {
    setSaving(true);
    setMsg(null);

    try {
      const response = await fetch("/api/settings/store/support/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          phone: support.phone,
          telegram: support.telegram,
          email: support.email,
        }),
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok || !json?.ok) {
        setMsg(`فشل الحفظ: ${json?.error || "SAVE_FAILED"}`);
        return;
      }

      setMsg("تم الحفظ");
      setTimeout(() => setMsg(null), 1600);
    } finally {
      setSaving(false);
    }
  }

  async function requestWhatsappVerify() {
    setOtpBusy(true);
    setOtpError(null);
    setDevCode(null);
    setWaRequestError(null);
    setMsg(null);

    try {
      const response = await fetch("/api/settings/store/support/whatsapp/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ whatsapp: support.whatsapp }),
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok || !json?.ok) {
        setWaRequestError(json?.error || `REQUEST_FAILED_${response.status}`);
        return;
      }

      if (json?.dev_code) setDevCode(String(json.dev_code));

      setShowOtp(true);
    } finally {
      setOtpBusy(false);
    }
  }

  async function verifyWhatsapp() {
    setOtpBusy(true);
    setOtpError(null);
    setMsg(null);

    try {
      const response = await fetch("/api/settings/store/support/whatsapp/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: otpCode }),
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok || !json?.ok) {
        setOtpError(json?.error || `VERIFY_FAILED_${response.status}`);
        return;
      }

      setSupport((prev) => ({
        ...prev,
        whatsapp: String(json?.whatsapp || prev.whatsapp),
        whatsapp_pending: "",
        whatsapp_verified_at: String(
          json?.support?.whatsapp_verified_at || new Date().toISOString(),
        ),
      }));

      setShowOtp(false);
      setOtpCode("");
      setDevCode(null);

      setMsg("تم توثيق رقم الواتساب");
      setTimeout(() => setMsg(null), 1600);
    } finally {
      setOtpBusy(false);
    }
  }

  function closeOtp() {
    setShowOtp(false);
    setOtpCode("");
    setOtpError(null);
    setDevCode(null);
  }

  return (
    <SectionShell
      id={id}
      sectionKey="support"
      title="قنوات خدمة العملاء"
      description="تظهر قنوات خدمة العملاء في تذييل صفحة المتجر"
      icon="CustomerService"
    >
      <div className="adm-basic-support">
        <div className="adm-basic-support-notice">
          <div className="adm-basic-support-notice__text">
            هل ترغب باستخدام معلومات مالك المتجر للتواصل مع الدعم الفني لمتجرك؟
          </div>

          <div className="adm-basic-support-notice__actions">
            <Button
              variant="solid"
              color="primary"
              dimension="sm"
              className="adm-basic-support-btn adm-basic-support-btn--primary"
            >
              نعم
            </Button>

            <Button
              variant="outline"
              color="zinc"
              dimension="sm"
              icon="Cancel01"
              className="adm-basic-support-btn adm-basic-support-btn--icon"
            />
          </div>
        </div>

        <div className="adm-basic-support-fields">
          <div className="adm-basic-support-field">
            <label className="adm-basic-support-field__label">رقم الجوال</label>

            <div className="adm-basic-support-field__control">
              <FieldWrap className="adm-basic-support-field__wrap">
                <Input
                  name="phone"
                  placeholder="+9665XXXXXXXX"
                  value={support.phone}
                  onChange={(e: any) =>
                    setSupport((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  disabled={loading}
                />
              </FieldWrap>

              <Button
                variant="solid"
                color="primary"
                dimension="sm"
                isLoading={saving}
                isDisable={loading || saving}
                onClick={saveSupport}
                className="adm-basic-support-btn adm-basic-support-btn--primary"
              >
                تحديث
              </Button>
            </div>
          </div>

          <div className="adm-basic-support-field">
            <label className="adm-basic-support-field__label">رقم واتساب</label>

            <div className="adm-basic-support-field__control">
              <FieldWrap className="adm-basic-support-field__wrap">
                <Input
                  name="whatsapp"
                  placeholder="+123456789 أو رقم محلي"
                  value={support.whatsapp}
                  onChange={(e: any) => {
                    setSupport((prev) => ({
                      ...prev,
                      whatsapp: e.target.value,
                      whatsapp_verified_at: null,
                    }));
                    setWaRequestError(null);
                  }}
                  disabled={loading}
                />
              </FieldWrap>

              <Button
                variant="solid"
                color="primary"
                dimension="sm"
                isLoading={otpBusy}
                isDisable={loading || otpBusy || !support.whatsapp.trim()}
                onClick={requestWhatsappVerify}
                className="adm-basic-support-btn adm-basic-support-btn--primary"
              >
                تحديث
              </Button>
            </div>

            {waRequestError ? (
              <div className="adm-basic-support-field__error">
                فشل طلب التحقق: {waRequestError}
              </div>
            ) : (
              <div className="adm-basic-support-field__hint">
                {support.whatsapp_verified_at
                  ? `موثّق (${new Date(
                      support.whatsapp_verified_at,
                    ).toLocaleString("ar-SA")})`
                  : "غير موثّق — عند التحديث سيتم إرسال كود تحقق للواتساب."}
              </div>
            )}
          </div>

          <div className="adm-basic-support-field">
            <label className="adm-basic-support-field__label">تيليجرام</label>

            <FieldWrap>
              <Input
                name="telegram"
                placeholder="أضف رابط إضافة في تيليجرام"
                value={support.telegram}
                onChange={(e: any) =>
                  setSupport((prev) => ({ ...prev, telegram: e.target.value }))
                }
                disabled={loading}
              />
            </FieldWrap>
          </div>

          <div className="adm-basic-support-field">
            <label className="adm-basic-support-field__label">
              عنوان البريد الإلكتروني
            </label>

            <FieldWrap>
              <Input
                name="support_email"
                placeholder="أضف عنوان البريد الإلكتروني"
                value={support.email}
                onChange={(e: any) =>
                  setSupport((prev) => ({ ...prev, email: e.target.value }))
                }
                disabled={loading}
              />
            </FieldWrap>
          </div>
        </div>

        <div className="adm-basic-support-apps">
          <div className="adm-basic-support-apps__content">
            <span className="adm-basic-support-apps__icon">
              <Icon icon="Whatsapp" size="text-xl" />
            </span>

            <div className="adm-basic-support-apps__text">
              تواصل مع عملائك بكل سهولة — اكتشف +50 تطبيق في متجر تطبيقات سلة
              لتواصل أسهل مع عملائك.
            </div>
          </div>

          <Button
            variant="solid"
            color="primary"
            dimension="sm"
            className="adm-basic-support-btn adm-basic-support-btn--primary"
          >
            تطبيقات المحادثة
          </Button>
        </div>

        <div className="adm-basic-support-save">
          <div className="adm-basic-support-save__msg">{msg || ""}</div>

          <Button
            variant="solid"
            color="primary"
            className="adm-basic-support-btn adm-basic-support-btn--primary adm-basic-support-save__btn"
            isLoading={saving}
            isDisable={loading || saving}
            onClick={saveSupport}
          >
            حفظ
          </Button>
        </div>

        {showOtp ? (
          <div className="adm-basic-support-modal" role="dialog" aria-modal="true">
            <div className="adm-basic-support-modal__panel">
              <div className="adm-basic-support-modal__head">
                <div className="adm-basic-support-modal__titleWrap">
                  <div className="adm-basic-support-modal__title">
                    تحقق رقم واتساب
                  </div>

                  <div className="adm-basic-support-modal__desc">
                    أدخل كود التحقق المرسل إلى واتساب.
                  </div>

                  {devCode ? (
                    <div className="adm-basic-support-modal__dev">
                      للتطوير فقط — الكود: <strong>{devCode}</strong>
                    </div>
                  ) : null}
                </div>

                <button
                  type="button"
                  className="adm-basic-support-modal__close"
                  onClick={closeOtp}
                >
                  ×
                </button>
              </div>

              <div className="adm-basic-support-modal__body">
                <OtpBoxes
                  value={otpCode}
                  onChange={setOtpCode}
                  disabled={otpBusy}
                />

                {otpError ? (
                  <div className="adm-basic-support-modal__error">
                    خطأ: {otpError}
                  </div>
                ) : null}

                <div className="adm-basic-support-modal__actions">
                  <Button
                    variant="outline"
                    color="zinc"
                    onClick={closeOtp}
                    className="adm-basic-support-btn adm-basic-support-btn--secondary"
                  >
                    إلغاء
                  </Button>

                  <Button
                    variant="solid"
                    color="primary"
                    isLoading={otpBusy}
                    isDisable={otpBusy || otpCode.replace(/\D/g, "").length !== 4}
                    onClick={verifyWhatsapp}
                    className="adm-basic-support-btn adm-basic-support-btn--primary"
                  >
                    تحقق
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </SectionShell>
  );
}