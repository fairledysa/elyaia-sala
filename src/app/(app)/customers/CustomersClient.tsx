// FILE: apps/merchant/src/app/(app)/customers/CustomersClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Filter, Plus, SlidersHorizontal, UsersRound } from "lucide-react";
import CreateGroupModal from "./_components/CreateGroupModal";

type Group = {
  id: string;
  name: string;
  icon?: string;
  created_at: string;
  customers_count: number;
};

type Customer = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  phone_e164?: string | null;
  total_orders?: number | null;
  total_spent?: number | null;
  last_order_at?: string | null;
  gender?: string | null;
  birth_date?: string | null;
  created_at?: string | null;
};

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
  const value = String(name ?? "").trim();
  if (!value) return "؟";
  return value[0];
}

export default function CustomersPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [items, setItems] = useState<Customer[]>([]);
  const [open, setOpen] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState("all");

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

    const [groupsRes, countRes] = await Promise.all([
      fetch("/api/customer-groups/list", { cache: "no-store" }),
      fetch("/api/customers/count", { cache: "no-store" }),
    ]);

    const groupsData = await safeJson(groupsRes);
    const countData = await safeJson(countRes);

    const allGroup: Group = {
      id: "all",
      name: "جميع العملاء",
      icon: "👥",
      created_at: new Date().toISOString(),
      customers_count: Number(countData?.count ?? 0),
    };

    setGroups([allGroup, ...(Array.isArray(groupsData) ? groupsData : [])]);
    setLoadingGroups(false);
  }

  async function loadCustomers() {
    setLoadingCustomers(true);

    const res = await fetch("/api/customers", { cache: "no-store" });
    const data = await safeJson(res);

    setItems(Array.isArray(data) ? data : []);
    setLoadingCustomers(false);
  }

  useEffect(() => {
    void loadGroups();
    void loadCustomers();
  }, []);

  const visibleCustomers = useMemo(() => {
    if (selectedGroupId === "all") return items;
    return items;
  }, [items, selectedGroupId]);

  return (
    <main className="adm-page adm-customers" dir="rtl">
      <div className="adm-page__inner">
        <section className="adm-customers-hero">
          <div className="adm-customers-hero__main">
            <div className="adm-customers-hero__icon">
              <UsersRound size={24} />
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
            <Plus size={17} />
            مجموعة جديدة
          </button>
        </section>

        {loadingGroups ? (
          <div className="adm-customers-groups">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="adm-card adm-customers-skeleton"
                aria-hidden="true"
              />
            ))}
          </div>
        ) : (
          <div className="adm-customers-groups">
            {groups.map((group) => {
              const active = selectedGroupId === group.id;

              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setSelectedGroupId(group.id)}
                  className={[
                    "adm-customers-groupCard",
                    active ? "is-active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <div className="adm-customers-groupCard__icon">
                    {group.icon || "👥"}
                  </div>

                  <div className="adm-customers-groupCard__name">
                    {group.name}
                  </div>

                  <div className="adm-customers-groupCard__conditions">
                    {group.id === "all" ? "كل عملاء المتجر" : "مجموعة عملاء"}
                  </div>

                  <div className="adm-customers-groupCard__count">
                    {Number(group.customers_count ?? 0)} عميل
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="adm-customers-toolbar">
          <button type="button" className="adm-btn adm-btn--outline adm-btn--sm">
            تحرير سريع
          </button>

          <div className="adm-customers-toolbar__actions">
            <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm">
              خدمات
              <SlidersHorizontal size={16} />
            </button>

            <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm">
              تصفية
              <Filter size={16} />
            </button>
          </div>
        </div>

        <section className="adm-card adm-customers-tableCard">
          <div className="adm-customers-tableCard__head">
            <div className="adm-customers-tableCard__title">
              العملاء
              <span>({visibleCustomers.length} عميل)</span>
            </div>

            <div className="adm-customers-checkBox" />
          </div>

          {loadingCustomers ? (
            <div className="adm-customers-listSkeleton">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="adm-customers-rowSkeleton"
                  aria-hidden="true"
                />
              ))}
            </div>
          ) : visibleCustomers.length === 0 ? (
            <div className="adm-customers-empty">لا يوجد عملاء</div>
          ) : (
            <div className="adm-customers-list">
              {visibleCustomers.map((customer) => (
                <div key={customer.id} className="adm-customers-row">
                  <div className="adm-customers-row__main">
                    <div className="adm-customers-avatar">
                      {customerAvatar(customer.full_name)}
                    </div>

                    <div className="adm-customers-row__info">
                      <div className="adm-customers-row__nameLine">
                        <span>{customer.full_name || "بدون اسم"}</span>
                        <em>جديد</em>
                      </div>

                      <div className="adm-customers-row__contact">
                        {customer.email || customer.phone_e164 || "-"}
                      </div>

                      <div className="adm-customers-row__date">
                        تاريخ التسجيل: {fmtDate(customer.created_at)}
                      </div>
                    </div>
                  </div>

                  <div className="adm-customers-row__stats">
                    <div className="adm-customers-stat">
                      <span>الطلبات</span>
                      <strong>{Number(customer.total_orders ?? 0)}</strong>
                    </div>

                    <div className="adm-customers-stat">
                      <span>الصرف</span>
                      <strong>{fmtMoney(customer.total_spent)} ر.س</strong>
                    </div>

                    <div className="adm-customers-stat">
                      <span>آخر طلب</span>
                      <strong>{fmtDate(customer.last_order_at)}</strong>
                    </div>

                    <div className="adm-customers-checkBox" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <CreateGroupModal
          open={open}
          onClose={() => {
            setOpen(false);
            void loadGroups();
          }}
        />
      </div>
    </main>
  );
}