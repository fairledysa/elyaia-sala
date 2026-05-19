// FILE: apps/merchant/src/app/(app)/customers/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, SlidersHorizontal, Sparkles, Users } from "lucide-react";
import CreateGroupModal from "./_components/CreateGroupModal";

type ConditionInput = {
  id: string;
  label?: string | null;
  type?: string | null;
  operator?: string | null;
  value?: string | null;
  min_value?: string | null;
  max_value?: string | null;
};

type Group = {
  id: string;
  name: string;
  icon?: string;
  created_at: string;
  conditions?: ConditionInput[];
};

type Customer = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  phone_e164?: string | null;
  gender?: string | null;
  birth_date?: string | null;
  total_orders?: number | null;
  total_spent?: number | null;
  last_order_at?: string | null;
  created_at?: string | null;
  first_seen_at?: string | null;
  last_seen_at?: string | null;
};

type GroupCard = {
  id: string;
  name: string;
  icon?: string;
  created_at: string;
  customers_count: number;
  conditions: ConditionInput[];
};

const PAGE_SIZE = 20;

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

function fmtMoney(value?: number | null) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "0";
  return new Intl.NumberFormat("ar-SA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

function customerAvatar(name?: string | null) {
  const text = String(name ?? "").trim();
  if (!text) return "👤";
  return text[0];
}

function toNumber(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function daysBetweenFromNow(dateValue?: string | null) {
  if (!dateValue) return null;
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return null;

  const now = new Date();
  const diff = now.getTime() - d.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function inNumberRange(
  actual: number,
  operator?: string | null,
  value?: string | null,
  minValue?: string | null,
  maxValue?: string | null
) {
  const op = String(operator ?? ">").trim();
  const main = toNumber(value ?? minValue);
  const max = toNumber(maxValue);

  if (op === "between") {
    if (main !== null && actual < main) return false;
    if (max !== null && actual > max) return false;
    return true;
  }

  if (main === null) return true;
  if (op === ">") return actual > main;
  if (op === "<") return actual < main;
  if (op === "=") return actual === main;

  return true;
}

function inDateRange(
  actual?: string | null,
  minValue?: string | null,
  maxValue?: string | null
) {
  if (!actual) return false;

  const actualDate = new Date(actual);
  if (Number.isNaN(actualDate.getTime())) return false;

  if (minValue) {
    const minDate = new Date(`${minValue}T00:00:00.000Z`);
    if (!Number.isNaN(minDate.getTime()) && actualDate < minDate) return false;
  }

  if (maxValue) {
    const maxDate = new Date(`${maxValue}T23:59:59.999Z`);
    if (!Number.isNaN(maxDate.getTime()) && actualDate > maxDate) return false;
  }

  return true;
}

function inDaysRange(
  actualDate?: string | null,
  minValue?: string | null,
  maxValue?: string | null
) {
  const days = daysBetweenFromNow(actualDate);
  if (days === null) return false;

  const min = toNumber(minValue);
  const max = toNumber(maxValue);

  if (min !== null && days < min) return false;
  if (max !== null && days > max) return false;

  return true;
}

function customerMatchesAllConditions(
  customer: Customer,
  conditions: ConditionInput[]
) {
  for (const c of conditions) {
    if (c.id === "doesnt_have_email") {
      const email = String(customer.email ?? "").trim();
      if (email) return false;
      continue;
    }

    if (c.id === "doesnt_have_orders") {
      const totalOrders = Number(customer.total_orders ?? 0);
      if (totalOrders !== 0) return false;
      continue;
    }

    if (c.id === "gender") {
      const expected = String(c.value ?? c.min_value ?? "")
        .trim()
        .toLowerCase();

      const actual = String(customer.gender ?? "")
        .trim()
        .toLowerCase();

      if (!expected) continue;
      if (actual !== expected) return false;
      continue;
    }

    if (c.id === "total_orders") {
      const actual = Number(customer.total_orders ?? 0);
      if (!inNumberRange(actual, c.operator, c.value, c.min_value, c.max_value)) {
        return false;
      }
      continue;
    }

    if (c.id === "total_sales") {
      const actual = Number(customer.total_spent ?? 0);
      if (!inNumberRange(actual, c.operator, c.value, c.min_value, c.max_value)) {
        return false;
      }
      continue;
    }

    if (c.id === "birthday") {
      if (!inDateRange(customer.birth_date, c.min_value, c.max_value)) {
        return false;
      }
      continue;
    }

    if (c.id === "joining_date") {
      if (!inDateRange(customer.created_at, c.min_value, c.max_value)) {
        return false;
      }
      continue;
    }

    if (c.id === "latest_purchase") {
      if (!inDaysRange(customer.last_order_at, c.min_value, c.max_value)) {
        return false;
      }
      continue;
    }
  }

  return true;
}

function formatConditionText(c: ConditionInput) {
  if (c.id === "gender") {
    if (c.value === "male") return "الجنس: ذكر";
    if (c.value === "female") return "الجنس: أنثى";
    return "الجنس";
  }

  if (c.id === "doesnt_have_orders") return "ليس لديهم طلبات";
  if (c.id === "doesnt_have_email") return "ليس لديهم بريد إلكتروني";

  if (c.id === "total_orders") {
    const op = c.operator === "between" ? "بين" : c.operator ?? "";
    const first = c.value ?? c.min_value ?? "";
    const second = c.operator === "between" ? ` - ${c.max_value ?? ""}` : "";
    return `عدد الطلبات ${op} ${first}${second}`.trim();
  }

  if (c.id === "total_sales") {
    const op = c.operator === "between" ? "بين" : c.operator ?? "";
    const first = c.value ?? c.min_value ?? "";
    const second = c.operator === "between" ? ` - ${c.max_value ?? ""}` : "";
    return `إجمالي المشتريات ${op} ${first}${second}`.trim();
  }

  if (c.id === "birthday") {
    const min = c.min_value ? `من ${c.min_value}` : "";
    const max = c.max_value ? ` إلى ${c.max_value}` : "";
    return `تاريخ الميلاد ${min}${max}`.trim();
  }

  if (c.id === "joining_date") {
    const min = c.min_value ? `من ${c.min_value}` : "";
    const max = c.max_value ? ` إلى ${c.max_value}` : "";
    return `تاريخ التسجيل ${min}${max}`.trim();
  }

  if (c.id === "latest_purchase") {
    const min = c.min_value ? `من ${c.min_value}` : "";
    const max = c.max_value ? ` إلى ${c.max_value}` : "";
    return `آخر طلب ${min}${max} يوم`.trim();
  }

  if (c.id === "last_login") {
    const min = c.min_value ? `من ${c.min_value}` : "";
    const max = c.max_value ? ` إلى ${c.max_value}` : "";
    return `آخر تسجيل دخول ${min}${max} يوم`.trim();
  }

  return c.label || c.id;
}

function formatGroupConditions(conditions: ConditionInput[]) {
  if (!Array.isArray(conditions) || conditions.length === 0) {
    return "كل عملاء المتجر";
  }

  return conditions.map(formatConditionText).join(" • ");
}

export default function CustomersPage() {
  const router = useRouter();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const [rawGroups, setRawGroups] = useState<Group[]>([]);
  const [items, setItems] = useState<Customer[]>([]);
  const [open, setOpen] = useState(false);

  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingMoreCustomers, setLoadingMoreCustomers] = useState(false);

  const [selectedGroupId, setSelectedGroupId] = useState("all");

  const [offset, setOffset] = useState(0);
  const [hasMoreCustomers, setHasMoreCustomers] = useState(true);

  async function safeJson(res: Response) {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return [];
    }
  }

  async function loadGroups() {
    setLoadingGroups(true);

    const groupsRes = await fetch("/api/customer-groups/list", {
      cache: "no-store",
    });

    const groupsData = await safeJson(groupsRes);
    setRawGroups(Array.isArray(groupsData) ? groupsData : []);
    setLoadingGroups(false);
  }

  async function loadCustomers(reset = false) {
    const nextOffset = reset ? 0 : offset;

    if (reset) {
      setLoadingCustomers(true);
    } else {
      if (!hasMoreCustomers || loadingMoreCustomers) return;
      setLoadingMoreCustomers(true);
    }

    const customersRes = await fetch(
      `/api/customers?limit=${PAGE_SIZE}&offset=${nextOffset}`,
      { cache: "no-store" }
    );

    const customersData = await safeJson(customersRes);

    const newItems = Array.isArray(customersData?.items)
      ? customersData.items
      : [];

    const nextHasMore = Boolean(customersData?.hasMore);

    setItems((prev) => {
      if (reset) return newItems;

      const map = new Map<string, Customer>();
      for (const item of prev) map.set(item.id, item);
      for (const item of newItems) map.set(item.id, item);
      return Array.from(map.values());
    });

    setOffset(nextOffset + newItems.length);
    setHasMoreCustomers(nextHasMore);

    if (reset) {
      setLoadingCustomers(false);
    } else {
      setLoadingMoreCustomers(false);
    }
  }

  async function loadAll() {
    await Promise.all([loadGroups(), loadCustomers(true)]);
  }

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (selectedGroupId !== "all") return;
    if (!hasMoreCustomers) return;

    const node = loadMoreRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting) {
          loadCustomers(false);
        }
      },
      { rootMargin: "300px" }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [selectedGroupId, hasMoreCustomers, loadingMoreCustomers, offset]);

  const groups = useMemo<GroupCard[]>(() => {
    const mapped: GroupCard[] = rawGroups.map((g) => {
      const conditions = Array.isArray(g.conditions) ? g.conditions : [];
      const matched = items.filter((customer) =>
        customerMatchesAllConditions(customer, conditions)
      );

      return {
        id: g.id,
        name: g.name,
        icon: g.icon ?? "👥",
        created_at: g.created_at,
        customers_count: matched.length,
        conditions,
      };
    });

    const allGroup: GroupCard = {
      id: "all",
      name: "جميع العملاء",
      icon: "👥",
      created_at: new Date().toISOString(),
      customers_count: items.length,
      conditions: [],
    };

    return [allGroup, ...mapped];
  }, [rawGroups, items]);

  const visibleCustomers = useMemo(() => {
    if (selectedGroupId === "all") return items;

    const activeGroup = groups.find((g) => g.id === selectedGroupId);
    if (!activeGroup) return [];

    return items.filter((customer) =>
      customerMatchesAllConditions(customer, activeGroup.conditions)
    );
  }, [groups, items, selectedGroupId]);

  return (
    <div className="adm-customers" dir="rtl">
      <div className="adm-customers__inner">
        <div className="adm-customers-hero">
          <div className="adm-customers-hero__main">
            <div className="adm-customers-hero__icon">
              <Users size={22} />
            </div>

            <div className="adm-customers-hero__text">
              <h1>مجموعات العملاء</h1>
              <p>إدارة العملاء وتقسيمهم حسب الطلبات والمشتريات والبيانات.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="adm-btn adm-btn--primary adm-btn--md"
          >
            <Plus size={16} />
            مجموعة جديدة
          </button>
        </div>

        {loadingGroups || loadingCustomers ? (
          <div className="adm-customers-groups">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="adm-card adm-customers-skeleton" />
            ))}
          </div>
        ) : (
          <div className="adm-customers-groups">
            {groups.map((g) => {
              const active = selectedGroupId === g.id;

              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setSelectedGroupId(g.id)}
                  className={[
                    "adm-customers-groupCard",
                    active ? "is-active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <div className="adm-customers-groupCard__icon">
                    {g.icon || "👥"}
                  </div>

                  <div className="adm-customers-groupCard__name">{g.name}</div>

                  <div className="adm-customers-groupCard__conditions">
                    {formatGroupConditions(g.conditions)}
                  </div>

                  <div className="adm-customers-groupCard__count">
                    {g.customers_count} عميل
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="adm-customers-toolbar">
          <div className="adm-customers-toolbar__actions">
            <button type="button" className="adm-btn adm-btn--light adm-btn--sm">
              <Sparkles size={15} />
              خدمات
            </button>

            <button type="button" className="adm-btn adm-btn--light adm-btn--sm">
              <SlidersHorizontal size={15} />
              تصفية
            </button>
          </div>

          <button type="button" className="adm-btn adm-btn--outline adm-btn--sm">
            تحرير سريع
          </button>
        </div>

        <section className="adm-card adm-customers-tableCard">
          <div className="adm-customers-tableCard__head">
            <div className="adm-customers-tableCard__title">
              العملاء
              <span>({visibleCustomers.length} عميل)</span>
            </div>

            <div className="adm-customers-checkBox" aria-hidden="true" />
          </div>

          {loadingCustomers ? (
            <div className="adm-customers-listSkeleton">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="adm-customers-rowSkeleton" />
              ))}
            </div>
          ) : visibleCustomers.length === 0 ? (
            <div className="adm-customers-empty">لا يوجد عملاء</div>
          ) : (
            <div className="adm-customers-list">
              {visibleCustomers.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => router.push(`/customers/${c.id}`)}
                  className="adm-customers-row"
                >
                  <div className="adm-customers-row__main">
                    <div className="adm-customers-avatar">
                      {customerAvatar(c.full_name)}
                    </div>

                    <div className="adm-customers-row__info">
                      <div className="adm-customers-row__nameLine">
                        <span>{c.full_name || "بدون اسم"}</span>
                        <em>جديد</em>
                      </div>

                      <div className="adm-customers-row__contact">
                        {c.email || c.phone_e164 || "-"}
                      </div>

                      <div className="adm-customers-row__date">
                        تاريخ التسجيل: {fmtDate(c.created_at)}
                      </div>
                    </div>
                  </div>

                  <div className="adm-customers-row__stats">
                    <div className="adm-customers-stat">
                      <span>الطلبات</span>
                      <strong>{Number(c.total_orders ?? 0)}</strong>
                    </div>

                    <div className="adm-customers-stat">
                      <span>الصرف</span>
                      <strong>{fmtMoney(c.total_spent)} ر.س</strong>
                    </div>

                    <div className="adm-customers-stat">
                      <span>آخر طلب</span>
                      <strong>{fmtDate(c.last_order_at)}</strong>
                    </div>

                    <div className="adm-customers-checkBox" aria-hidden="true" />
                  </div>
                </button>
              ))}

              {selectedGroupId === "all" && hasMoreCustomers ? (
                <div ref={loadMoreRef} className="adm-customers-loadMore">
                  {loadingMoreCustomers
                    ? "جار تحميل المزيد..."
                    : "مرر لأسفل لتحميل المزيد"}
                </div>
              ) : null}
            </div>
          )}
        </section>

        <CreateGroupModal
          open={open}
          onClose={() => {
            setOpen(false);
            setItems([]);
            setOffset(0);
            setHasMoreCustomers(true);
            loadAll();
          }}
        />
      </div>
    </div>
  );
}