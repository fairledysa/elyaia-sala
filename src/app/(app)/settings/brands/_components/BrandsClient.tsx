// FILE: apps/merchant/src/app/(app)/settings/brands/_components/BrandsClient.tsx

"use client";

import * as React from "react";
import { Image as ImageIcon, Plus, RefreshCw } from "lucide-react";

import type { Brand } from "./types";
import { createBrand, deleteBrand, listBrands, updateBrand } from "./api";
import BrandDialog from "./BrandDialog";
import BrandCard from "./BrandCard";

export default function BrandsClient() {
  const [items, setItems] = React.useState<Brand[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState("");

  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"create" | "edit">("create");
  const [current, setCurrent] = React.useState<Brand | null>(null);

  async function load() {
    setErr("");
    setLoading(true);

    try {
      const data = await listBrands();
      setItems(data);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load();
  }, []);

  function openCreate() {
    setMode("create");
    setCurrent(null);
    setOpen(true);
  }

  function openEdit(brand: Brand) {
    setMode("edit");
    setCurrent(brand);
    setOpen(true);
  }

  async function onSubmit(payload: Partial<Brand>) {
    if (mode === "create") {
      const created = await createBrand(payload);
      setItems((prev) => [created, ...prev]);
      return;
    }

    if (current) {
      const updated = await updateBrand(current.id, payload);

      setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      setCurrent(updated);
    }
  }

  async function onDelete() {
    if (!current) return;

    await deleteBrand(current.id);

    setItems((prev) => prev.filter((x) => x.id !== current.id));
    setCurrent(null);
  }

  return (
    <section dir="rtl" className="adm-page adm-brands">
      <div className="adm-page__inner">
        <header className="adm-hero adm-brands__hero">
          <div className="adm-hero__main">
            <div className="adm-hero__icon">
              <ImageIcon />
            </div>

            <div className="adm-hero__text">
              <h1 className="adm-hero__title">الماركات</h1>
              <p className="adm-hero__desc">
                إدارة شعارات وبنرات الماركات وربطها بواجهة المتجر ونتائج SEO.
              </p>
            </div>
          </div>

          <div className="adm-hero__actions">
            <button
              type="button"
              onClick={() => void load()}
              className="adm-btn adm-btn--secondary"
              disabled={loading}
            >
              <RefreshCw />
              تحديث
            </button>

            <button
              type="button"
              onClick={openCreate}
              className="adm-btn adm-btn--primary"
            >
              <Plus />
              إضافة ماركة
            </button>
          </div>
        </header>

        {err ? <div className="adm-alert adm-alert--danger">{err}</div> : null}

        <div className="adm-card adm-brands__listCard">
          <div className="adm-brands__listHead">
            <div className="adm-brands__listTitle">
              <strong>قائمة الماركات</strong>
              <span>كل ماركة تظهر هنا يمكن تعديلها أو إيقافها بسرعة.</span>
            </div>

            <span className="adm-brands__count">{items.length}</span>
          </div>

          {loading ? (
            <div className="adm-brands__loading">جاري تحميل الماركات...</div>
          ) : !items.length ? (
            <div className="adm-brands__empty">لا توجد ماركات حتى الآن.</div>
          ) : (
            <div className="adm-brands__grid">
              {items.map((brand) => (
                <BrandCard
                  key={brand.id}
                  brand={brand}
                  onEdit={() => openEdit(brand)}
                  onChanged={() => void load()}
                />
              ))}
            </div>
          )}
        </div>

        <BrandDialog
          open={open}
          mode={mode}
          initial={current}
          onClose={() => setOpen(false)}
          onSubmit={onSubmit}
          onDelete={mode === "edit" ? onDelete : undefined}
        />
      </div>
    </section>
  );
}