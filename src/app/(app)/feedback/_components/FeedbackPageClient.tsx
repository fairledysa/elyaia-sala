// FILE: apps/merchant/src/app/(app)/feedback/_components/FeedbackPageClient.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import FeedbackList from "./FeedbackList";
import type { FeedbackItem } from "./types";

type TabKey = "all" | "reviews" | "questions" | "support";

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
};

function buildPageNumbers(current: number, total: number) {
  if (total <= 1) return [1];

  const pages = new Set<number>();
  pages.add(1);
  pages.add(total);

  for (let i = current - 2; i <= current + 2; i++) {
    if (i >= 1 && i <= total) pages.add(i);
  }

  if (current <= 4) {
    for (let i = 1; i <= Math.min(5, total); i++) pages.add(i);
  }

  if (current >= total - 3) {
    for (let i = Math.max(1, total - 4); i <= total; i++) pages.add(i);
  }

  return Array.from(pages).sort((a, b) => a - b);
}

export default function FeedbackPageClient() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
    hasPrev: false,
    hasNext: false,
  });

  async function load(nextPage = page, options?: { silent?: boolean }) {
    const silent = options?.silent ?? false;

    if (!silent) setLoading(true);

    try {
      const res = await fetch(`/api/feedback?page=${nextPage}&pageSize=20`, {
        cache: "no-store",
      });

      const json = await res.json();

      const allItems = Array.isArray(json?.items) ? json.items : [];
      setItems(allItems);

      setPagination({
        page: Number(json?.pagination?.page ?? nextPage),
        pageSize: Number(json?.pagination?.pageSize ?? 20),
        total: Number(json?.pagination?.total ?? 0),
        totalPages: Number(json?.pagination?.totalPages ?? 0),
        hasPrev: Boolean(json?.pagination?.hasPrev),
        hasNext: Boolean(json?.pagination?.hasNext),
      });
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (tab === "reviews") {
        return (
          item.type === "store_review" ||
          item.type === "product_review" ||
          item.type === "shipping_review"
        );
      }

      if (tab === "questions") {
        return item.type === "product_question" || item.type === "page_question";
      }

      if (tab === "support") {
        return item.type === "support_contact";
      }

      return true;
    });
  }, [items, tab]);

  const visiblePages = useMemo(() => {
    return buildPageNumbers(pagination.page, pagination.totalPages);
  }, [pagination.page, pagination.totalPages]);

  function goToPage(nextPage: number) {
    if (nextPage < 1 || nextPage > pagination.totalPages || nextPage === page) {
      return;
    }

    setPage(nextPage);
  }

  const tabBtn = (value: TabKey, label: string) => {
    const active = tab === value;

    return (
      <button
        type="button"
        onClick={() => setTab(value)}
        className={[
          "adm-feedback-tab",
          active ? "adm-feedback-tab--active" : "",
        ].join(" ")}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="adm-page__inner" dir="rtl">
      <section className="adm-hero">
        <div className="adm-hero__main">
          <div className="adm-hero__icon">★</div>

          <div className="adm-hero__text">
            <h1 className="adm-hero__title">الأسئلة والتقييمات</h1>
            <p className="adm-hero__desc">
              إدارة أسئلة العملاء والتقييمات وطلبات التواصل من مكان واحد.
            </p>
          </div>
        </div>

        <div className="adm-hero__actions">
          <div className="adm-feedback-tabs">
            {tabBtn("all", "الكل")}
            {tabBtn("reviews", "التقييمات")}
            {tabBtn("questions", "الأسئلة")}
            {tabBtn("support", "طلبات التواصل")}
          </div>
        </div>
      </section>

      <section className="adm-card adm-card--lg adm-feedback-card">
        {loading ? (
          <div className="adm-card__body">
            <div className="adm-feedback-loading">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="adm-feedback-skeleton-card">
                  <div className="adm-skeleton adm-feedback-skeleton-line adm-feedback-skeleton-line--sm" />
                  <div className="adm-skeleton adm-feedback-skeleton-line" />
                  <div className="adm-skeleton adm-feedback-skeleton-box" />
                  <div className="adm-skeleton adm-feedback-skeleton-actions" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="adm-card__head adm-card__head--border">
              <div className="adm-card__titleWrap">
                <h2 className="adm-card__title">العناصر</h2>
                <p className="adm-card__desc">
                  مراجعة وإدارة العناصر حسب النوع والحالة.
                </p>
              </div>

              <div className="adm-card__actions">
                <span className="adm-feedback-pill">
                  الإجمالي: {pagination.total}
                </span>

                <span className="adm-feedback-pill">
                  الصفحة: {pagination.page} /{" "}
                  {Math.max(1, pagination.totalPages)}
                </span>
              </div>
            </div>

            <div className="adm-card__body">
              {filtered.length === 0 ? (
                <div className="adm-empty">لا توجد عناصر لعرضها</div>
              ) : (
                <FeedbackList
                  items={filtered}
                  onReload={() => load(page, { silent: true })}
                />
              )}

              {pagination.totalPages > 1 ? (
                <div className="adm-feedback-pagination">
                  <div className="adm-feedback-pagination__inner">
                    <button
                      type="button"
                      onClick={() => goToPage(page - 1)}
                      disabled={!pagination.hasPrev}
                      className="adm-feedback-page-btn"
                    >
                      »
                    </button>

                    {visiblePages.map((p, index) => {
                      const prev = visiblePages[index - 1];
                      const hasGap = index > 0 && p - prev > 1;

                      return (
                        <div key={p} className="adm-feedback-page-group">
                          {hasGap ? (
                            <span className="adm-feedback-page-gap">...</span>
                          ) : null}

                          <button
                            type="button"
                            onClick={() => goToPage(p)}
                            className={[
                              "adm-feedback-page-btn",
                              p === page ? "adm-feedback-page-btn--active" : "",
                            ].join(" ")}
                          >
                            {p}
                          </button>
                        </div>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => goToPage(page + 1)}
                      disabled={!pagination.hasNext}
                      className="adm-feedback-page-btn"
                    >
                      «
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </>
        )}
      </section>
    </div>
  );
}