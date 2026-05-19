//apps/merchant/src/app/(app)/settings/order-options/_components/OrderOptionCreateMenu.tsx
"use client";

import { useRef, useState } from "react";
import type { OrderOptionType } from "./OrderOptionModal";

type Props = {
  onSelect: (type: OrderOptionType) => void;
  align?: "start" | "center";
};

const ITEMS: Array<{ type: OrderOptionType; title: string; desc: string }> = [
  {
    type: "text",
    title: "حقل نصي",
    desc: "اسم أو ملاحظة أو نص يكتبه العميل",
  },
  {
    type: "number",
    title: "حقل رقمي",
    desc: "رقم إضافي أو كمية أو رقم تواصل",
  },
  {
    type: "choices",
    title: "حقل الخيارات",
    desc: "اختيارات جاهزة يمكن للعميل تحديدها",
  },
  {
    type: "appointment",
    title: "حقل موعد",
    desc: "حجز يوم أو يوم ووقت",
  },
];

export default function OrderOptionCreateMenu({
  onSelect,
  align = "start",
}: Props) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<number | null>(null);

  function clearCloseTimer() {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function scheduleClose() {
    clearCloseTimer();
    closeTimer.current = window.setTimeout(() => setOpen(false), 150);
  }

  return (
    <div
      className={[
        "adm-order-options-menu",
        align === "center" ? "adm-order-options-menu--center" : "",
      ].join(" ")}
      onMouseEnter={clearCloseTimer}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        className="adm-btn adm-btn--primary adm-btn--lg"
        onClick={() => setOpen((prev) => !prev)}
      >
        إضافة حقل جديد
        <span aria-hidden>⌄</span>
      </button>

      {open ? (
        <div className="adm-order-options-menu__panel">
          {ITEMS.map((item) => (
            <button
              key={item.type}
              type="button"
              className="adm-order-options-menu__item"
              onClick={() => {
                setOpen(false);
                onSelect(item.type);
              }}
            >
              <span className="adm-order-options-menu__itemIcon">＋</span>
              <span>
                <strong>{item.title}</strong>
                <small>{item.desc}</small>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}