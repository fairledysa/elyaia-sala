// FILE: apps/merchant/src/app/(app)/orders/[id]/_components/OrderDetailsSkeleton.tsx
"use client";

function Block({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`adm-order-details-skeletonBlock ${className}`}
      style={style}
    />
  );
}

export default function OrderDetailsSkeleton() {
  return (
    <div dir="rtl" className="adm-order-details-skeleton">
      <div className="adm-order-details-skeleton__inner">
        <div className="adm-order-details-skeleton__nav">
          <Block style={{ width: 144, height: 48, borderRadius: 999 }} />
          <Block style={{ width: 144, height: 48, borderRadius: 999 }} />
        </div>

        <Block style={{ height: 260 }} />

        <div className="adm-order-details__grid3">
          <Block style={{ height: 260 }} />
          <Block style={{ height: 260 }} />
          <Block style={{ height: 260 }} />
        </div>

        <Block style={{ height: 420 }} />
        <Block style={{ height: 320 }} />
        <Block style={{ height: 150 }} />
        <Block style={{ height: 340 }} />
        <Block style={{ height: 120 }} />
      </div>
    </div>
  );
}