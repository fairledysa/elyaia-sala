// FILE: apps/merchant/src/app/(app)/settings/domains/_components/DomainsClient.tsx
"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  Globe2,
  HelpCircle,
  Info,
  LockKeyhole,
  MoreVertical,
  Plus,
  RefreshCw,
  Settings,
  ShieldCheck,
  Star,
  X,
  XCircle,
} from "lucide-react";
import { FormEvent, useMemo, useState, useTransition } from "react";

export type StoreDomainRow = {
  id: string;
  store_id: string;
  domain: string;
  type: string;
  is_primary: boolean;
  verified_at: string | null;
  dns_status: string | null;
  status?: string | null;
  updated_at?: string | null;
  last_checked_at?: string | null;
  vercel_project_id?: string | null;
  vercel_domain_name?: string | null;
  vercel_verified?: boolean | null;
  vercel_configured?: boolean | null;
  dns_records?: any[] | null;
  dns_check_result?: Record<string, any> | null;
  error_message?: string | null;
  verification_token?: string | null;
  created_at: string;
};

type DnsRow = {
  type: string;
  host: string;
  value: string;
  note: string;
  status: string;
};

type Props = {
  defaultDomain: string | null;
  initialDomains: StoreDomainRow[];
};

const faqs = [
  {
    title: "ما هو نطاق المتجر؟",
    text: "هو عنوان موقعك على الإنترنت مثل store.com ويستخدمه العملاء للوصول إلى متجرك.",
  },
  {
    title: "هل يمكنني استخدام أكثر من نطاق؟",
    text: "نعم، يمكنك ربط أكثر من نطاق وتحديد النطاق الأساسي الذي يظهر للزوار.",
  },
  {
    title: "ما الفرق بين النطاق المجاني والخاص؟",
    text: "النطاق المجاني يكون من المنصة، أما النطاق الخاص فهو دومين تملكه وتربطه بمتجرك.",
  },
  {
    title: "متى يتم تفعيل النطاق؟",
    text: "بعد إضافة سجلات DNS الصحيحة قد يستغرق التفعيل من دقائق إلى 48 ساعة.",
  },
  {
    title: "هل أحتاج إلى شهادة SSL؟",
    text: "يتم تجهيز شهادة الأمان تلقائيًا بعد نجاح ربط النطاق والتحقق منه.",
  },
];

function s(value: any) {
  return String(value ?? "").trim();
}

function formatDate(value: string | null | undefined) {
  if (!value) return "لم يتم التحقق بعد";

  try {
    return new Intl.DateTimeFormat("ar-SA", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return "غير معروف";
  }
}

function normalizeDnsRows(domain: StoreDomainRow | null): DnsRow[] {
  const rows = Array.isArray(domain?.dns_records) ? domain?.dns_records : [];

  return rows
    .map((row: any) => ({
      type: s(row?.type || "TXT").toUpperCase(),
      host: s(row?.host || row?.name || "@"),
      value: s(row?.value || row?.target || ""),
      note: s(row?.note || row?.reason || "سجل مطلوب لإكمال ربط الدومين."),
      status: s(row?.status || "pending"),
    }))
    .filter((row) => row.type && row.value);
}

function getDomainStatus(domain: StoreDomainRow | null) {
  if (!domain) {
    return {
      label: "النطاق المجاني مفعل",
      icon: <CheckCircle2 size={13} />,
      className: "adm-domains-status--done",
    };
  }

  const status = s(domain.status || domain.dns_status || "pending");

  if (domain.verified_at || status === "verified" || status === "active") {
    return {
      label: "مرتبط ومفعل",
      icon: <CheckCircle2 size={13} />,
      className: "adm-domains-status--done",
    };
  }

  if (status === "failed") {
    return {
      label: "يوجد خطأ",
      icon: <XCircle size={13} />,
      className: "adm-domains-status--pending",
    };
  }

  if (status === "needs_configuration") {
    return {
      label: "يحتاج ضبط DNS",
      icon: <AlertTriangle size={13} />,
      className: "adm-domains-status--pending",
    };
  }

  return {
    label: "بانتظار التحقق",
    icon: <Clock3 size={13} />,
    className: "adm-domains-status--pending",
  };
}

function getSetupProgress(domain: StoreDomainRow | null) {
  if (!domain) {
    return {
      percent: 25,
      done: 1,
      steps: {
        added: false,
        dns: false,
        verified: false,
        primary: false,
      },
    };
  }

  const added = true;
  const dns = Boolean(
    domain.vercel_configured || domain.dns_status === "configured",
  );
  const verified = Boolean(domain.verified_at || domain.vercel_verified);
  const primary = Boolean(domain.is_primary);

  const done = [added, dns, verified, primary].filter(Boolean).length;

  return {
    percent: done * 25,
    done,
    steps: {
      added,
      dns,
      verified,
      primary,
    },
  };
}

function DnsBadge({ type }: { type: string }) {
  return (
    <span
      className={`adm-domains-dnsType adm-domains-dnsType--${type.toLowerCase()}`}
    >
      {type}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const clean = status.toLowerCase();

  if (
    clean === "done" ||
    clean === "ok" ||
    clean === "verified" ||
    clean === "configured"
  ) {
    return (
      <span className="adm-domains-status adm-domains-status--done">
        <CheckCircle2 size={13} />
        تم الإضافة
      </span>
    );
  }

  if (clean === "failed" || clean === "error") {
    return (
      <span className="adm-domains-status adm-domains-status--pending">
        <XCircle size={13} />
        خطأ
      </span>
    );
  }

  return (
    <span className="adm-domains-status adm-domains-status--pending">
      <Clock3 size={13} />
      بانتظار
    </span>
  );
}

async function copyText(text: string) {
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
  } catch {
    //
  }
}

export default function DomainsClient({ defaultDomain, initialDomains }: Props) {
  const [domains, setDomains] = useState<StoreDomainRow[]>(
    Array.isArray(initialDomains) ? initialDomains : [],
  );

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [domainInput, setDomainInput] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const selectedDomain = useMemo(() => {
    return (
      domains.find((domain) => domain.is_primary) ||
      domains[0] ||
      null
    );
  }, [domains]);

  const currentDomainName =
    selectedDomain?.domain || defaultDomain || "غير محدد";

  const status = getDomainStatus(selectedDomain);
  const progress = getSetupProgress(selectedDomain);
  const dnsRows = normalizeDnsRows(selectedDomain);

  function upsertDomain(nextDomain: StoreDomainRow) {
    setDomains((prev) => {
      const filtered = prev.filter((item) => item.id !== nextDomain.id);
      return [nextDomain, ...filtered].sort((a, b) => {
        if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
        return (
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
        );
      });
    });
  }

  function handleAddDomain(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanDomain = domainInput.trim();

    if (!cleanDomain) {
      setErrorMessage("أدخل اسم الدومين أولًا.");
      return;
    }

    setErrorMessage("");

    startTransition(async () => {
      try {
        const res = await fetch("/api/settings/store/domains", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ domain: cleanDomain }),
        });

        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          setErrorMessage(
            json?.message || json?.error || "تعذر إضافة الدومين.",
          );
          return;
        }

        if (json?.domain?.id) {
          upsertDomain(json.domain);
          setDomainInput("");
          setIsAddOpen(false);
        }
      } catch {
        setErrorMessage("تعذر الاتصال بالخادم.");
      }
    });
  }

  function handleVerifyDomain() {
    if (!selectedDomain?.id) return;

    setErrorMessage("");

    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/settings/store/domains/${selectedDomain.id}/verify`,
          {
            method: "POST",
          },
        );

        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          setErrorMessage(
            json?.message || json?.error || "تعذر التحقق من الدومين.",
          );
          return;
        }

        if (json?.domain?.id) {
          upsertDomain(json.domain);
        }
      } catch {
        setErrorMessage("تعذر الاتصال بالخادم.");
      }
    });
  }

  function handleCopyAllRecords() {
    const text = dnsRows
      .map((row) => `${row.type}\t${row.host}\t${row.value}`)
      .join("\n");

    copyText(text);
  }

  return (
    <main className="adm-page adm-domains" dir="rtl">
      <div className="adm-page__inner adm-domains__inner">
        <header className="adm-domains-hero">
          <div className="adm-domains-hero__text">
            <div className="adm-domains-eyebrow">
              <Globe2 size={18} />
              الإعدادات
            </div>

            <h1>إعدادات النطاق الدومين</h1>
            <p>
              اربط نطاقك الخاص بمتجرك، وتابع حالة التحقق وسجلات DNS من مكان
              واحد.
            </p>
          </div>

          <div className="adm-domains-hero__actions">
            <button
              className="adm-domains-btn adm-domains-btn--ghost"
              type="button"
            >
              <HelpCircle size={17} />
              مساعدة
            </button>

            <button
              className="adm-domains-btn adm-domains-btn--primary"
              type="button"
              onClick={() => {
                setErrorMessage("");
                setIsAddOpen(true);
              }}
            >
              <Plus size={17} />
              نطاق جديد
            </button>
          </div>
        </header>

        {errorMessage ? (
          <div className="adm-domains-inlineError">
            <AlertTriangle size={16} />
            {errorMessage}
          </div>
        ) : null}

        <section className="adm-domains-alertBar" aria-label="تنبيهات مهمة">
          <div className="adm-domains-alertBar__head">
            <span className="adm-domains-alertBar__icon">
              <Info size={18} />
            </span>
            <div>
              <h2>تنبيهات مهمة</h2>
              <p>راجع هذه الملاحظات قبل تعديل سجلات النطاق.</p>
            </div>
          </div>

          <div className="adm-domains-alertBar__items">
            <div className="adm-domains-alertItem">
              <Clock3 size={17} />
              قد يستغرق انتشار DNS حتى 24 ساعة.
            </div>

            <div className="adm-domains-alertItem">
              <AlertTriangle size={17} />
              لا تحذف سجلات Google أو Zoho أو البريد إلا إذا عرفت أثرها.
            </div>

            <div className="adm-domains-alertItem">
              <ShieldCheck size={17} />
              النطاق لا يتفعل إلا بعد نجاح التحقق.
            </div>
          </div>
        </section>

        <section className="adm-domains-topGrid">
          <article className="adm-domains-card adm-domains-current">
            <div className="adm-domains-current__icon">
              <Globe2 size={54} />
              <LockKeyhole size={22} className="adm-domains-current__lock" />
            </div>

            <div className="adm-domains-current__content">
              <div className="adm-domains-primaryBadge">
                <Star size={15} />
                {selectedDomain?.is_primary
                  ? "النطاق الأساسي"
                  : selectedDomain
                    ? "نطاق مضاف"
                    : "النطاق المجاني"}
              </div>

              <div className="adm-domains-domainName">
                {currentDomainName}
                {currentDomainName !== "غير محدد" ? (
                  <a
                    href={`https://${currentDomainName}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="فتح النطاق"
                  >
                    <ExternalLink size={19} />
                  </a>
                ) : null}
              </div>

              <div className="adm-domains-liveBadge">
                <span />
                {status.label}
              </div>

              <div className="adm-domains-meta">
                <Clock3 size={14} />
                آخر تحقق: {formatDate(selectedDomain?.last_checked_at)}
              </div>

              {selectedDomain?.error_message ? (
                <div className="adm-domains-meta">
                  <AlertTriangle size={14} />
                  {selectedDomain.error_message}
                </div>
              ) : null}
            </div>

            <div className="adm-domains-current__actions">
              <button type="button" className="adm-domains-iconBtn">
                <MoreVertical size={19} />
              </button>

              <button
                type="button"
                className="adm-domains-actionBtn"
                onClick={handleVerifyDomain}
                disabled={!selectedDomain || isPending}
              >
                <Settings size={16} />
                {isPending ? "جاري الفحص..." : "تحقق DNS"}
              </button>

              <button
                type="button"
                className="adm-domains-actionBtn"
                onClick={() => copyText(currentDomainName)}
              >
                <Copy size={16} />
                نسخ
              </button>

              <a
                className="adm-domains-actionBtn"
                href={
                  currentDomainName !== "غير محدد"
                    ? `https://${currentDomainName}`
                    : "#"
                }
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink size={16} />
                فتح
              </a>
            </div>
          </article>

          <article className="adm-domains-card adm-domains-progress">
            <div className="adm-domains-progress__ring">
              <div className="adm-domains-progress__ringInner">
                {progress.percent}%
              </div>
            </div>

            <div className="adm-domains-progress__content">
              <h2>حالة الإعداد</h2>

              <div className="adm-domains-checkList">
                {[
                  ["added", "إضافة النطاق"],
                  ["dns", "تعديل سجلات DNS"],
                  ["verified", "التحقق من الملكية"],
                  ["primary", "تعيينه كنطاق أساسي"],
                ].map(([key, label]) => {
                  const done =
                    progress.steps[key as keyof typeof progress.steps];

                  return (
                    <div
                      key={key}
                      className={[
                        "adm-domains-checkList__item",
                        done ? "is-done" : "",
                      ].join(" ")}
                    >
                      {done ? (
                        <CheckCircle2 size={18} />
                      ) : (
                        <span className="adm-domains-checkList__empty" />
                      )}

                      {label}

                      {key === "primary" ? <small>اختياري</small> : null}
                    </div>
                  );
                })}
              </div>

              <p>{progress.done} من 4 مكتملة</p>
            </div>
          </article>
        </section>

        <section className="adm-domains-card adm-domains-dns">
          <div className="adm-domains-sectionHead">
            <div>
              <h2>سجلات DNS المطلوبة</h2>
              <p>
                {selectedDomain
                  ? "أضف السجلات التالية في مزود النطاق لديك ثم اضغط مزامنة."
                  : "النطاق المجاني لا يحتاج أي إعدادات DNS من طرفك."}
              </p>
            </div>

            <div className="adm-domains-sectionHead__actions">
              <button
                className="adm-domains-btn adm-domains-btn--ghost"
                type="button"
                onClick={handleVerifyDomain}
                disabled={!selectedDomain || isPending}
              >
                <RefreshCw size={16} />
                {isPending ? "جاري الفحص..." : "مزامنة"}
              </button>

              <button
                className="adm-domains-btn adm-domains-btn--dark"
                type="button"
                onClick={handleCopyAllRecords}
                disabled={!dnsRows.length}
              >
                <Copy size={16} />
                نسخ جميع السجلات
              </button>
            </div>
          </div>

          <div className="adm-domains-tableWrap">
            <table className="adm-domains-table">
              <thead>
                <tr>
                  <th>النوع</th>
                  <th>الاسم Host</th>
                  <th>القيمة Value</th>
                  <th>ملاحظة</th>
                  <th>الحالة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>

              <tbody>
                {dnsRows.length ? (
                  dnsRows.map((row) => (
                    <tr key={`${row.type}-${row.host}-${row.value}`}>
                      <td>
                        <DnsBadge type={row.type} />
                      </td>
                      <td className="adm-domains-code">{row.host}</td>
                      <td className="adm-domains-value">{row.value}</td>
                      <td>{row.note}</td>
                      <td>
                        <StatusBadge status={row.status} />
                      </td>
                      <td>
                        <button
                          className="adm-domains-copyBtn"
                          type="button"
                          onClick={() => copyText(row.value)}
                        >
                          <Copy size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6}>
                      {selectedDomain
                        ? "لا توجد سجلات DNS محفوظة بعد. بعد ربط Vercel ستظهر السجلات هنا."
                        : "النطاق المجاني يعمل تلقائيًا ولا يحتاج سجلات DNS."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="adm-domains-note">
            <Info size={16} />
            قد يستغرق تطبيق التغييرات من 5 دقائق إلى 48 ساعة حسب مزود النطاق.
          </div>
        </section>

        <section className="adm-domains-card adm-domains-faq">
          <div className="adm-domains-sectionHead adm-domains-sectionHead--faq">
            <div>
              <h2>الأسئلة الشائعة</h2>
              <p>إجابات سريعة تساعدك على فهم ربط النطاق وإعدادات DNS.</p>
            </div>

            <span className="adm-domains-helpCircle">
              <HelpCircle size={19} />
            </span>
          </div>

          <div className="adm-domains-faqGrid">
            {faqs.map((faq) => (
              <article className="adm-domains-faqItem" key={faq.title}>
                <div>
                  <h3>{faq.title}</h3>
                  <p>{faq.text}</p>
                </div>

                <span>⌄</span>
              </article>
            ))}
          </div>
        </section>
      </div>

      {isAddOpen ? (
        <div className="adm-domains-modalBackdrop" role="presentation">
          <section
            className="adm-domains-modal"
            role="dialog"
            aria-modal="true"
            aria-label="إضافة نطاق جديد"
          >
            <header className="adm-domains-modal__head">
              <div>
                <h2>إضافة نطاق جديد</h2>
                <p>أدخل الدومين الخاص بك بدون روابط أو مسارات.</p>
              </div>

              <button
                type="button"
                className="adm-domains-modal__close"
                onClick={() => setIsAddOpen(false)}
              >
                <X size={18} />
              </button>
            </header>

            <form className="adm-domains-modal__body" onSubmit={handleAddDomain}>
              <label className="adm-domains-field">
                <span>اسم الدومين</span>
                <input
                  value={domainInput}
                  onChange={(event) => setDomainInput(event.target.value)}
                  placeholder="example.com"
                  dir="ltr"
                  autoFocus
                />
              </label>

              <div className="adm-domains-modalHint">
                <Info size={16} />
                اكتب الدومين مثل <b>tooot.com</b> ولا تكتب https أو www إلا إذا
                كنت تريد ربط www فقط.
              </div>

              {errorMessage ? (
                <div className="adm-domains-inlineError">
                  <AlertTriangle size={16} />
                  {errorMessage}
                </div>
              ) : null}

              <footer className="adm-domains-modal__actions">
                <button
                  type="button"
                  className="adm-domains-btn adm-domains-btn--ghost"
                  onClick={() => setIsAddOpen(false)}
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  className="adm-domains-btn adm-domains-btn--primary"
                  disabled={isPending}
                >
                  <Plus size={16} />
                  {isPending ? "جاري الإضافة..." : "إضافة النطاق"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  );
}