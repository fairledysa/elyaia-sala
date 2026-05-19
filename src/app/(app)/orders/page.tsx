// FILE: apps/merchant/src/app/(app)/orders/page.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "@/boltify/components/icon/Icon";

type StatusCardItem = {
  key: string;
  label: string;
  count: number;
  dotColor: string;
  icon: string;
  type: "base" | "store";
  base_status_key: string;
  store_status_id?: string | null;
};

type OrderRow = {
  id: string;
  order_number: string;
  customer_name: string;
  amount: number;
  currency: string;
  city: string;
  channel: string;
  created_at?: string | null;
  status?: string | null;
  is_draft?: boolean;
  base_status: string;
  base_status_key: string;
  sub_status?: string | null;
  store_status_id?: string | null;
};

type OrdersListResponse = {
  rows: OrderRow[];
  total?: number;
  hasMore?: boolean;
  nextOffset?: number | null;
};

type StatusSummaryResponse = {
  cards: StatusCardItem[];
};

type QuickStatusItem = {
  key: string;
  label: string;
  icon: string;
  dotColor: string;
  type: "base" | "store";
  base_status_key: string;
  store_status_id?: string | null;
};

type PendingBulkAction = {
  status: QuickStatusItem;
  orderIds: string[];
};

type CreateDraftOrderResponse = {
  ok?: boolean;
  id?: string;
  edit_url?: string;
  error?: string;
};

function s(x: any) {
  return String(x ?? "").trim();
}

async function safeJson(r: Response) {
  try {
    return await r.json();
  } catch {
    return null;
  }
}

function fmtMoney(amount: number, currency: string) {
  const value = Number(amount ?? 0);
  const code = s(currency) || "SAR";

  return (
    new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value) + ` ${code}`
  );
}

function timeAgo(value?: string | null) {
  if (!value) return "-";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";

  const now = Date.now();
  const diff = Math.max(0, now - d.getTime());

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return "الآن";
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  if (hours < 24) return `منذ ${hours} ساعة`;
  return `منذ ${days} يوم`;
}

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" className="adm-orders__svg" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

function IconInfo() {
  return (
    <svg viewBox="0 0 24 24" className="adm-orders__svg" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v6" />
      <circle cx="12" cy="7.5" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconFilter() {
  return (
    <svg viewBox="0 0 24 24" className="adm-orders__svgSmall" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 6h16" />
      <path d="M7 12h10" />
      <path d="M10 18h4" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" className="adm-orders__svgSmall" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4" />
      <path d="M8 3v4" />
      <path d="M3 10h18" />
    </svg>
  );
}

function IconBriefcase() {
  return (
    <svg viewBox="0 0 24 24" className="adm-orders__svgSmall" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <path d="M3 12h18" />
    </svg>
  );
}

function StatusCard({
  item,
  active,
  onClick,
}: {
  item: StatusCardItem;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={["adm-orders-statusCard", active ? "is-active" : ""]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="adm-orders-statusCard__top">
        <span className="adm-orders-statusCard__count">{item.count}</span>

        <span className="adm-orders-statusCard__icon">
          {item.icon ? (
            <Icon icon={item.icon as any} className="adm-orders__boltIcon" />
          ) : (
            <span className="adm-orders-statusCard__placeholder" />
          )}
        </span>
      </div>

      <div className="adm-orders-statusCard__label">
        <span>{item.label}</span>
        <span
          className="adm-orders__statusDot"
          style={{ background: item.dotColor || "var(--adm-soft-text)" }}
        />
      </div>
    </button>
  );
}

function ServiceMenu({
  open,
  onToggle,
  onClose,
}: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  return (
    <div className="adm-orders-menuWrap">
      <button type="button" onClick={onToggle} className="adm-orders-btn adm-orders-btn--light">
        <IconBriefcase />
        <span>خدمات</span>
      </button>

      {open ? (
        <>
          <button type="button" onClick={onClose} className="adm-orders-menuBackdrop" />
          <div className="adm-orders-dropdown adm-orders-dropdown--right">
            <button type="button" className="adm-orders-dropdown__item">
              <span>الاسناد التلقائي</span>
              <span>⌁</span>
            </button>

            <button type="button" className="adm-orders-dropdown__item">
              <span>تصدير الطلبات</span>
              <span>↗</span>
            </button>

            <Link href="/orders/statuses" className="adm-orders-dropdown__item">
              <span>تخصيص الحالات</span>
              <span>✣</span>
            </Link>

            <button type="button" className="adm-orders-dropdown__item">
              <span>تحديث حالة الطلبات</span>
              <span>✎</span>
            </button>

            <button type="button" className="adm-orders-dropdown__item">
              <span>عمليات الدفع الإلكتروني</span>
              <span>⧉</span>
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

function QuickEditMenu({
  open,
  onToggle,
  onClose,
  statuses,
  disabled,
  busy,
  onChangeStatus,
}: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  statuses: QuickStatusItem[];
  disabled: boolean;
  busy: boolean;
  onChangeStatus: (status: QuickStatusItem) => void;
}) {
  const [statusesOpen, setStatusesOpen] = useState(false);

  useEffect(() => {
    if (!open) setStatusesOpen(false);
  }, [open]);

  return (
    <div className="adm-orders-menuWrap">
      <button
        type="button"
        disabled={disabled || busy}
        onClick={onToggle}
        className={[
          "adm-orders-btn",
          disabled || busy ? "adm-orders-btn--disabled" : "adm-orders-btn--outline",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <span>✦</span>
        <span>{busy ? "جارٍ التحديث..." : "تحرير سريع"}</span>
      </button>

      {open ? (
        <>
          <button type="button" onClick={onClose} className="adm-orders-menuBackdrop" />

          <div className="adm-orders-dropdown adm-orders-dropdown--left adm-orders-dropdown--wide">
            <div className="adm-orders-dropdown__body">
              <div className="adm-orders-dropdown__nestedWrap">
                <button
                  type="button"
                  onClick={() => setStatusesOpen((v) => !v)}
                  className="adm-orders-dropdown__item"
                >
                  <span className="adm-orders-dropdown__label">
                    <span>🗂️</span>
                    <span>تعديل حالة الطلب</span>
                  </span>
                  <span>{statusesOpen ? "‹" : "›"}</span>
                </button>

                {statusesOpen ? (
                  <div className="adm-orders-statusMenu">
                    <div className="adm-orders-statusMenu__head">اختر الحالة</div>

                    {statuses.length === 0 ? (
                      <div className="adm-orders-statusMenu__empty">
                        لا توجد حالات متاحة
                      </div>
                    ) : (
                      <div className="adm-orders-statusMenu__body">
                        {statuses.map((status) => (
                          <button
                            key={status.key}
                            type="button"
                            onClick={() => onChangeStatus(status)}
                            className="adm-orders-statusMenu__item"
                          >
                            <span className="adm-orders-statusMenu__name">
                              <span
                                className="adm-orders__statusDot"
                                style={{
                                  background: status.dotColor || "var(--adm-soft-text)",
                                }}
                              />
                              <span>{status.label}</span>
                            </span>

                            <span className="adm-orders-statusMenu__meta">
                              {status.type === "base" ? (
                                <span className="adm-orders-pill adm-orders-pill--neutral">
                                  أساسية
                                </span>
                              ) : (
                                <span className="adm-orders-pill adm-orders-pill--mint">
                                  فرعية
                                </span>
                              )}

                              {status.icon ? (
                                <Icon icon={status.icon as any} className="adm-orders__boltIcon" />
                              ) : null}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              <button type="button" className="adm-orders-dropdown__item">
                <span>اسناد إلى الموظفين</span>
                <span>👥</span>
              </button>

              <button type="button" className="adm-orders-dropdown__item">
                <span>طباعة الفواتير</span>
                <span>🧾</span>
              </button>

              <button type="button" className="adm-orders-dropdown__item">
                <span>تصدير الطلبات</span>
                <span>↗</span>
              </button>

              <button type="button" className="adm-orders-dropdown__item adm-orders-dropdown__item--danger">
                <span>حذف الطلب</span>
                <span>🗑️</span>
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function BulkStatusConfirmModal({
  open,
  busy,
  pending,
  rows,
  onClose,
  onConfirm,
}: {
  open: boolean;
  busy: boolean;
  pending: PendingBulkAction | null;
  rows: OrderRow[];
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open || !pending) return null;

  const selectedRows = rows.filter((row) => pending.orderIds.includes(row.id));

  return (
    <>
      <div className="adm-orders-modalBackdrop" />
      <div className="adm-orders-modalShell">
        <div className="adm-orders-modal">
          <div className="adm-orders-modal__head">
            <button
              type="button"
              onClick={busy ? undefined : onClose}
              className="adm-orders-modal__close"
              disabled={busy}
            >
              ×
            </button>

            <div className="adm-orders-modal__title">
              تغيير الطلبات إلى الحالة - {pending.status.label}
            </div>
          </div>

          <div className="adm-orders-modal__body">
            <div className="adm-orders-warning">
              <div>عدد الطلبات المحددة ({pending.orderIds.length})</div>
              <div>⚠️</div>
            </div>

            <div className="adm-orders-selectedList">
              {selectedRows.length === 0 ? (
                <div className="adm-orders-emptyText">لا توجد طلبات محددة</div>
              ) : (
                <div className="adm-orders-selectedList__rows">
                  {selectedRows.map((row) => (
                    <div key={row.id} className="adm-orders-selectedRow">
                      <div>
                        <div className="adm-orders-selectedRow__no">
                          #{row.order_number}
                        </div>
                        <div className="adm-orders-selectedRow__customer">
                          {row.customer_name}
                        </div>
                      </div>

                      <div className="adm-orders-selectedRow__status">
                        {row.sub_status || row.base_status}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="adm-orders-modal__footer">
            <button
              type="button"
              onClick={busy ? undefined : onClose}
              disabled={busy}
              className="adm-orders-btn adm-orders-btn--soft"
            >
              إغلاق
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={busy}
              className="adm-orders-btn adm-orders-btn--primary"
            >
              {busy ? "جارٍ التحديث..." : "نعم"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function orderHref(row: OrderRow) {
  return row.is_draft ? `/orders/${row.id}/new` : `/orders/${row.id}`;
}

function OrderDesktopRow({
  row,
  checked,
  currentCard,
  onToggle,
}: {
  row: OrderRow;
  checked: boolean;
  currentCard: StatusCardItem | null;
  onToggle: () => void;
}) {
  return (
    <div className={["adm-orders-row", checked ? "is-checked" : ""].filter(Boolean).join(" ")}>
      <div className="adm-orders-row__check">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="adm-orders-checkbox"
        />
      </div>

      <div className="adm-orders-row__iconWrap">
        <div className="adm-orders-row__icon">
          {currentCard?.icon ? (
            <Icon icon={currentCard.icon as any} className="adm-orders__boltIcon" />
          ) : null}
        </div>
      </div>

      <Link href={orderHref(row)} className="adm-orders-row__main">
        <div className="adm-orders-row__titleLine">
          <div className="adm-orders-row__customer">{row.customer_name}</div>

          {row.sub_status ? (
            <span className="adm-orders-pill adm-orders-pill--danger">
              {row.sub_status}
            </span>
          ) : null}

          {row.is_draft ? (
            <span className="adm-orders-pill adm-orders-pill--gold">مسودة</span>
          ) : null}
        </div>

        <div className="adm-orders-row__meta">
          <span>#{row.order_number || "-"}</span>
          <span>•</span>
          <span>{row.city || "-"}</span>
          <span>•</span>
          <span>{row.channel || "المتجر"}</span>

          {!row.is_draft ? (
            <>
              <span
                className="adm-orders__statusDot"
                style={{
                  background: currentCard?.dotColor || "var(--adm-soft-text)",
                }}
              />
              <span>{row.sub_status || row.base_status}</span>
            </>
          ) : (
            <span className="adm-orders-row__draftText">مسودة</span>
          )}
        </div>
      </Link>

      <div className="adm-orders-row__amount">
        {fmtMoney(row.amount, row.currency)}
      </div>

      <div className="adm-orders-row__time">
        {timeAgo(row.created_at)}
      </div>
    </div>
  );
}

function OrderMobileCard({
  row,
  checked,
  currentCard,
  onToggle,
}: {
  row: OrderRow;
  checked: boolean;
  currentCard: StatusCardItem | null;
  onToggle: () => void;
}) {
  return (
    <div className={["adm-orders-mobileCard", checked ? "is-checked" : ""].filter(Boolean).join(" ")}>
      <div className="adm-orders-mobileCard__top">
        <div className="adm-orders-mobileCard__right">
          <input
            type="checkbox"
            checked={checked}
            onChange={onToggle}
            className="adm-orders-checkbox"
          />

          <div className="adm-orders-row__icon">
            {currentCard?.icon ? (
              <Icon icon={currentCard.icon as any} className="adm-orders__boltIcon" />
            ) : null}
          </div>
        </div>

        <div className="adm-orders-mobileCard__amount">
          <div>{fmtMoney(row.amount, row.currency)}</div>
          <span>{timeAgo(row.created_at)}</span>
        </div>
      </div>

      <Link href={orderHref(row)} className="adm-orders-mobileCard__link">
        <div className="adm-orders-row__titleLine">
          <div className="adm-orders-row__customer">{row.customer_name}</div>

          {row.sub_status ? (
            <span className="adm-orders-pill adm-orders-pill--danger">
              {row.sub_status}
            </span>
          ) : null}

          {row.is_draft ? (
            <span className="adm-orders-pill adm-orders-pill--gold">مسودة</span>
          ) : null}
        </div>

        <div className="adm-orders-row__meta">
          <span>#{row.order_number || "-"}</span>
          <span>•</span>
          <span>{row.city || "-"}</span>
          <span>•</span>
          <span>{row.channel || "المتجر"}</span>

          {!row.is_draft ? (
            <>
              <span
                className="adm-orders__statusDot"
                style={{
                  background: currentCard?.dotColor || "var(--adm-soft-text)",
                }}
              />
              <span>{row.sub_status || row.base_status}</span>
            </>
          ) : (
            <span className="adm-orders-row__draftText">مسودة</span>
          )}
        </div>
      </Link>
    </div>
  );
}

export default function Page() {
  const router = useRouter();

  const [servicesOpen, setServicesOpen] = useState(false);
  const [quickEditOpen, setQuickEditOpen] = useState(false);

  const [cardsLoading, setCardsLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [creatingDraftOrder, setCreatingDraftOrder] = useState(false);

  const [query, setQuery] = useState("");
  const [cards, setCards] = useState<StatusCardItem[]>([]);
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [activeStatus, setActiveStatus] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingBulkAction, setPendingBulkAction] =
    useState<PendingBulkAction | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState<number | null>(null);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const cacheRef = useRef<
    Map<
      string,
      { rows: OrderRow[]; hasMore: boolean; nextOffset: number | null }
    >
  >(new Map());

  function getCacheKey(offset: number, limit: number) {
    return JSON.stringify({
      q: query || "",
      activeStatus: activeStatus || "",
      offset,
      limit,
    });
  }

  async function handleCreateDraftOrder() {
    try {
      if (creatingDraftOrder) return;

      setCreatingDraftOrder(true);

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          mode: "draft",
        }),
      });

      const data: CreateDraftOrderResponse | any = await safeJson(res);

      if (!res.ok) {
        throw new Error(s(data?.error) || "تعذر إنشاء الطلب");
      }

      const orderId = s(data?.id);

      if (orderId) {
        router.push(`/orders/${orderId}/new`);
        return;
      }

      throw new Error("تعذر فتح صفحة الطلب الجديدة");
    } catch (error: any) {
      window.alert(s(error?.message) || "تعذر إنشاء الطلب");
    } finally {
      setCreatingDraftOrder(false);
    }
  }

  async function loadCards() {
    setCardsLoading(true);
    try {
      const res = await fetch("/api/orders/status-summary", {
        cache: "no-store",
        credentials: "include",
      });

      const json: StatusSummaryResponse | any = await safeJson(res);

      if (!res.ok) {
        throw new Error(json?.error || "LOAD_CARDS_FAILED");
      }

      setCards(Array.isArray(json?.cards) ? json.cards : []);
    } catch (error) {
      console.error(error);
      setCards([]);
    } finally {
      setCardsLoading(false);
    }
  }

  function buildOrdersUrl(offset: number, limit: number) {
    const params = new URLSearchParams();

    if (query) params.set("q", query);
    params.set("offset", String(offset));
    params.set("limit", String(limit));

    if (activeStatus.startsWith("store:")) {
      params.set("status_type", "store");
      params.set("status_value", activeStatus.replace("store:", ""));
    } else if (activeStatus.startsWith("base:")) {
      params.set("status_type", "base");
      params.set("status_value", activeStatus.replace("base:", ""));
    }

    return `/api/orders/list?${params.toString()}`;
  }

  async function loadOrders(options?: {
    reset?: boolean;
    next?: boolean;
    force?: boolean;
  }) {
    const next = options?.next ?? false;
    const force = options?.force ?? false;

    const currentOffset = next ? nextOffset ?? 0 : 0;
    const currentLimit = next ? 20 : 15;
    const cacheKey = getCacheKey(currentOffset, currentLimit);

    if (next) {
      if (!hasMore || nextOffset == null || loadingMore) return;
      setLoadingMore(true);
    } else {
      setOrdersLoading(true);
    }

    try {
      if (!force && cacheRef.current.has(cacheKey)) {
        const cached = cacheRef.current.get(cacheKey)!;

        if (next) {
          setRows((prev) => {
            const map = new Map<string, OrderRow>();
            for (const item of prev) map.set(item.id, item);
            for (const item of cached.rows) map.set(item.id, item);
            return Array.from(map.values());
          });
        } else {
          setRows(cached.rows);
          setSelectedIds([]);
          setPendingBulkAction(null);
        }

        setHasMore(cached.hasMore);
        setNextOffset(cached.nextOffset);
        return;
      }

      const res = await fetch(buildOrdersUrl(currentOffset, currentLimit), {
        cache: "no-store",
        credentials: "include",
      });

      const json: OrdersListResponse | any = await safeJson(res);

      if (!res.ok) {
        throw new Error(json?.error || "LOAD_ORDERS_FAILED");
      }

      const nextRows = Array.isArray(json?.rows) ? json.rows : [];
      const nextHasMore = Boolean(json?.hasMore);
      const nextNextOffset =
        typeof json?.nextOffset === "number" ? json.nextOffset : null;

      cacheRef.current.set(cacheKey, {
        rows: nextRows,
        hasMore: nextHasMore,
        nextOffset: nextNextOffset,
      });

      if (next) {
        setRows((prev) => {
          const map = new Map<string, OrderRow>();
          for (const item of prev) map.set(item.id, item);
          for (const item of nextRows) map.set(item.id, item);
          return Array.from(map.values());
        });
      } else {
        setRows(nextRows);
        setSelectedIds([]);
        setPendingBulkAction(null);
      }

      setHasMore(nextHasMore);
      setNextOffset(nextNextOffset);
    } catch (error) {
      console.error(error);
      if (!next) {
        setRows([]);
        setSelectedIds([]);
        setHasMore(false);
        setNextOffset(null);
      }
    } finally {
      if (next) {
        setLoadingMore(false);
      } else {
        setOrdersLoading(false);
      }
    }
  }

  useEffect(() => {
    loadCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadOrders({ force: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStatus]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const ids = rows.map((row) => s(row.id)).filter(Boolean);

    if (ids.length === 0) {
      sessionStorage.removeItem("orders_ids");
      return;
    }

    sessionStorage.setItem("orders_ids", JSON.stringify(ids));
  }, [rows]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    if (!hasMore) return;
    if (ordersLoading || loadingMore) return;

    const el = sentinelRef.current;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting) {
          loadOrders({ next: true });
        }
      },
      {
        root: null,
        rootMargin: "300px",
        threshold: 0,
      }
    );

    observer.observe(el);

    return () => observer.disconnect();
  }, [hasMore, ordersLoading, loadingMore, nextOffset, activeStatus, query]);

  const displayedRows = rows;
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const allVisibleSelected =
    displayedRows.length > 0 &&
    displayedRows.every((row) => selectedSet.has(row.id));

  const someVisibleSelected =
    displayedRows.some((row) => selectedSet.has(row.id)) &&
    !allVisibleSelected;

  const selectableStatuses = useMemo<QuickStatusItem[]>(() => {
    const map = new Map<string, QuickStatusItem>();

    for (const item of cards) {
      if (item.type === "store" && s(item.store_status_id)) {
        map.set(`store:${item.store_status_id}`, {
          key: `store:${item.store_status_id}`,
          label: item.label,
          icon: item.icon,
          dotColor: item.dotColor,
          type: "store",
          base_status_key: item.base_status_key,
          store_status_id: item.store_status_id ?? null,
        });
        continue;
      }

      if (item.type === "base" && s(item.base_status_key)) {
        map.set(`base:${item.base_status_key}`, {
          key: `base:${item.base_status_key}`,
          label: item.label,
          icon: item.icon,
          dotColor: item.dotColor,
          type: "base",
          base_status_key: item.base_status_key,
          store_status_id: null,
        });
      }
    }

    return Array.from(map.values());
  }, [cards]);

  function handleStatusCardClick(item: StatusCardItem) {
    setSelectedIds([]);
    setPendingBulkAction(null);

    if (typeof window !== "undefined") {
      sessionStorage.removeItem("orders_ids");
    }

    setActiveStatus((prev) => {
      if (prev === item.key) return "";
      return item.key;
    });
  }

  function handleBulkStatusChange(status: QuickStatusItem) {
    if (selectedIds.length === 0) {
      window.alert("اختر طلب واحد على الأقل");
      return;
    }

    setPendingBulkAction({
      status,
      orderIds: [...selectedIds],
    });
  }

  async function confirmBulkStatusChange() {
    if (!pendingBulkAction) return;

    setBulkBusy(true);

    try {
      const res = await fetch("/api/orders/bulk-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          order_ids: pendingBulkAction.orderIds,
          store_status_id:
            pendingBulkAction.status.type === "store"
              ? pendingBulkAction.status.store_status_id ?? null
              : null,
          base_status_key: pendingBulkAction.status.base_status_key,
        }),
      });

      const json = await safeJson(res);

      if (!res.ok) {
        throw new Error(json?.error || "UPDATE_FAILED");
      }

      cacheRef.current.clear();
      setQuickEditOpen(false);
      setPendingBulkAction(null);

      await Promise.all([loadCards(), loadOrders({ force: true })]);
    } catch (error: any) {
      console.error(error);
      window.alert(error?.message || "تعذر تحديث حالات الطلبات");
    } finally {
      setBulkBusy(false);
    }
  }

  function toggleRow(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleAllVisible() {
    if (allVisibleSelected) {
      setSelectedIds((prev) =>
        prev.filter((id) => !displayedRows.some((row) => row.id === id))
      );
      return;
    }

    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const row of displayedRows) next.add(row.id);
      return Array.from(next);
    });
  }

  return (
    <div className="adm-orders" dir="rtl">
      <div className="adm-orders__inner">
        <section className="adm-orders__hero">
          <div className="adm-orders__heroMain">
            <div className="adm-orders__heroIcon">
              <IconSearch />
            </div>

            <div>
              <h1 className="adm-orders__title">الطلبات</h1>
              <p className="adm-orders__desc">
                تابع الطلبات، حدّث الحالات، وأنجز العمليات اليومية من مكان واحد.
              </p>
            </div>
          </div>

          <div className="adm-orders__heroActions">
            <button
              type="button"
              onClick={() => {
                cacheRef.current.clear();
                if (typeof window !== "undefined") {
                  sessionStorage.removeItem("orders_ids");
                }
                loadOrders({ force: true });
              }}
              className="adm-orders-iconBtn adm-orders-iconBtn--mint"
              aria-label="تحديث الطلبات"
            >
              <IconSearch />
            </button>

            <div className="adm-orders-selectLike">
              <span>الطلبات</span>
              <span>⌄</span>
            </div>

            <button
              type="button"
              className="adm-orders-iconBtn"
              aria-label="معلومات"
            >
              <IconInfo />
            </button>

            <button
              type="button"
              onClick={handleCreateDraftOrder}
              disabled={creatingDraftOrder}
              className="adm-orders-btn adm-orders-btn--primary"
            >
              <span>+</span>
              <span>{creatingDraftOrder ? "جارٍ الإنشاء..." : "طلب جديد"}</span>
            </button>
          </div>
        </section>

        <section className="adm-orders__searchBar">
          <div className="adm-orders-search">
            <IconSearch />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  cacheRef.current.clear();
                  setSelectedIds([]);
                  setPendingBulkAction(null);
                  if (typeof window !== "undefined") {
                    sessionStorage.removeItem("orders_ids");
                  }
                  loadOrders({ force: true });
                }
              }}
              placeholder="ابحث برقم الطلب، اسم العميل، رقم الشحنة"
            />
          </div>

          <div className="adm-orders__breadcrumb">
            <span>الرئيسية</span>
            <span>/</span>
            <span>الطلبات</span>
          </div>
        </section>

        <section className="adm-orders__toolbar">
          <QuickEditMenu
            open={quickEditOpen}
            onToggle={() => setQuickEditOpen((v) => !v)}
            onClose={() => setQuickEditOpen(false)}
            statuses={selectableStatuses}
            disabled={selectedIds.length === 0 || ordersLoading}
            busy={bulkBusy}
            onChangeStatus={handleBulkStatusChange}
          />

          <ServiceMenu
            open={servicesOpen}
            onToggle={() => setServicesOpen((v) => !v)}
            onClose={() => setServicesOpen(false)}
          />

          <button type="button" className="adm-orders-btn adm-orders-btn--light">
            <IconFilter />
            <span>تصفية</span>
          </button>

          <button type="button" className="adm-orders-btn adm-orders-btn--light">
            <IconCalendar />
            <span>الحجوزات</span>
          </button>

          {selectedIds.length > 0 ? (
            <div className="adm-orders-selectedBadge">
              تم تحديد {selectedIds.length} طلب
            </div>
          ) : null}
        </section>

        {cardsLoading ? (
          <section className="adm-orders-statusStrip">
            <div className="adm-orders-statusStrip__row">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="adm-orders-statusCard adm-orders-statusCard--loading" />
              ))}
            </div>
          </section>
        ) : (
          <section className="adm-orders-statusStrip">
            <div className="adm-orders-statusStrip__row">
              {cards.map((item) => (
                <StatusCard
                  key={item.key}
                  item={item}
                  active={activeStatus === item.key}
                  onClick={() => handleStatusCardClick(item)}
                />
              ))}
            </div>
          </section>
        )}

        <section className="adm-orders-tableCard">
          <div className="adm-orders-tableCard__head">
            <div>
              <h2>الطلبات</h2>
              <p>آخر الطلبات حسب حالة الطلب والبحث الحالي.</p>
            </div>

            <label className="adm-orders-checkAll">
              <span>تحديد الكل</span>
              <input
                type="checkbox"
                checked={allVisibleSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someVisibleSelected;
                }}
                onChange={toggleAllVisible}
                className="adm-orders-checkbox"
              />
            </label>
          </div>

          {ordersLoading ? (
            <div className="adm-orders-loadingList">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="adm-orders-skeletonRow">
                  <div className="adm-orders-skeleton adm-orders-skeleton--check" />
                  <div className="adm-orders-skeleton adm-orders-skeleton--icon" />
                  <div className="adm-orders-skeleton adm-orders-skeleton--main" />
                  <div className="adm-orders-skeleton adm-orders-skeleton--amount" />
                  <div className="adm-orders-skeleton adm-orders-skeleton--time" />
                </div>
              ))}
            </div>
          ) : displayedRows.length === 0 ? (
            <div className="adm-orders-emptyText">
              لا توجد طلبات لعرضها
            </div>
          ) : (
            <>
              <div className="adm-orders-list">
                {displayedRows.map((row) => {
                  const checked = selectedSet.has(row.id);

                  const currentCard =
                    row.is_draft
                      ? null
                      : cards.find((x) =>
                          x.type === "store"
                            ? x.store_status_id === row.store_status_id
                            : x.base_status_key === row.base_status_key
                        ) || null;

                  return (
                    <div key={row.id}>
                      <OrderDesktopRow
                        row={row}
                        checked={checked}
                        currentCard={currentCard}
                        onToggle={() => toggleRow(row.id)}
                      />

                      <OrderMobileCard
                        row={row}
                        checked={checked}
                        currentCard={currentCard}
                        onToggle={() => toggleRow(row.id)}
                      />
                    </div>
                  );
                })}
              </div>

              <div ref={sentinelRef} className="adm-orders__sentinel" />

              {loadingMore ? (
                <div className="adm-orders-loadingMore">
                  جارٍ تحميل المزيد...
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>

      <BulkStatusConfirmModal
        open={!!pendingBulkAction}
        busy={bulkBusy}
        pending={pendingBulkAction}
        rows={rows}
        onClose={() => {
          if (bulkBusy) return;
          setPendingBulkAction(null);
        }}
        onConfirm={confirmBulkStatusChange}
      />
    </div>
  );
}