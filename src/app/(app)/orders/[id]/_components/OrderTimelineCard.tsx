// app/(app)/orders/[id]/_components/OrderTimelineCard.tsx
"use client";

import type { ReactNode } from "react";
import {
  ClipboardList,
  Store,
  Clock3,
  User,
  Truck,
  CreditCard,
  Ticket,
  Package,
  Trash2,
  Plus,
} from "lucide-react";
import type {
  CustomerMini,
  OrderDetails,
  StatusHistoryItem,
  AuditLogItem,
} from "./OrderDetailsPageClient";
import {
  dt,
  shortDt,
  s,
  labelBaseStatus,
} from "./OrderDetailsPageClient";

function TimelineItem({
  title,
  subtitle,
  time,
  topLine,
  icon,
}: {
  title: string;
  subtitle: string;
  time: string;
  topLine?: boolean;
  icon: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="flex items-start gap-4">
        <div className="relative flex w-14 flex-col items-center">
          {topLine ? (
            <div className="absolute right-1/2 top-[-42px] h-10 w-px translate-x-1/2 border-r border-dashed border-slate-300" />
          ) : null}

          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#eefcf9] text-[#5acfc0]">
            {icon}
          </div>
        </div>

        <div className="text-right">
          <div className="text-[18px] font-medium text-slate-700">{title}</div>
          <div className="mt-2 text-[15px] leading-7 text-[#55c9da]">
            {subtitle}
          </div>
        </div>
      </div>

      <div dir="ltr" className="pt-3 text-left text-sm text-slate-400">
        {time}
      </div>
    </div>
  );
}

function historySubtitle(x: StatusHistoryItem) {
  const note = s(x.note);
  if (note) return note;
  return labelBaseStatus(x.to_base_status_key);
}

function historyTitle(x: StatusHistoryItem, customerName: string) {
  const actorName = s(x.actor_name);
  if (actorName) return actorName;
  return customerName;
}

type TimelineSource = "created" | "status" | "audit";

type TimelineEntry = {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  created_at: string;
  icon: ReactNode;
  source: TimelineSource;
};

function readAuditActorName(log: AuditLogItem) {
  return s((log as any)?.actor_name);
}

function readAuditActorRole(log: AuditLogItem) {
  return s((log as any)?.actor_role);
}

function auditTitle(log: AuditLogItem, customerName: string) {
  const actorName = readAuditActorName(log);
  const actorRole = readAuditActorRole(log);

  if (actorName && actorRole) {
    return `${actorName} — ${actorRole}`;
  }

  if (actorName) {
    return actorName;
  }

  if (s(log.actor_type) === "store_user") {
    return "موظف المتجر";
  }

  return customerName;
}

function moneyText(v: any, currency = "SAR") {
  const value = Number(v ?? 0);
  const safe = Number.isFinite(value) ? value : 0;

  return `${new Intl.NumberFormat("en-SA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(safe)} ${currency}`;
}

function paymentMethodLabel(v: unknown) {
  const x = s(v).toLowerCase();

  if (!x) return "-";
  if (x === "cod" || x.includes("cod") || x.includes("cash")) {
    return "الدفع عند الاستلام";
  }
  if (x === "bank_transfer" || x.includes("bank")) {
    return "تحويل بنكي";
  }
  if (x.startsWith("provider:")) {
    return x.replace("provider:", "");
  }
  if (x.includes("tamara")) return "تمارا";
  if (x.includes("tabby")) return "تابي";
  if (x.includes("card")) return "بطاقة";
  return s(v);
}

function buildSelectedOptionsText(raw: any) {
  const rows = Array.isArray(raw) ? raw : [];
  const parts = rows
    .map((row: any) => {
      const name = s(row?.name);
      const value = s(row?.value);
      if (!name || !value) return "";
      if (name.startsWith("__")) return "";
      if (name === "ملاحظة" || name === "مرفق") return "";
      return `${name}: ${value}`;
    })
    .filter(Boolean);

  return parts.join(" - ");
}

function pushChange(changes: string[], text: string) {
  const value = s(text);
  if (value) changes.push(value);
}

function auditToEntry(
  log: AuditLogItem,
  customerName: string,
  currency: string,
): TimelineEntry | null {
  const action = s(log.action);
  const beforeData = log.before_data ?? {};
  const afterData = log.after_data ?? {};
  const createdAt = s(log.created_at);

  if (!createdAt) return null;

  if (action === "order.customer.updated") {
    const beforeName =
      s(beforeData?.customer_name) ||
      s(beforeData?.full_name) ||
      s(beforeData?.customer?.full_name);

    const afterName =
      s(afterData?.customer_name) ||
      s(afterData?.full_name) ||
      s(afterData?.customer?.full_name);

    const beforePhone =
      s(beforeData?.phone_e164) || s(beforeData?.customer?.phone_e164);
    const afterPhone =
      s(afterData?.phone_e164) || s(afterData?.customer?.phone_e164);

    let subtitle = "تم تعديل بيانات العميل";

    if (beforeName && afterName && beforeName !== afterName) {
      subtitle = `تم تغيير العميل من ${beforeName} إلى ${afterName}`;
    } else if (beforePhone !== afterPhone && (beforePhone || afterPhone)) {
      subtitle = `تم تغيير رقم الجوال من ${beforePhone || "-"} إلى ${afterPhone || "-"}`;
    }

    return {
      id: `audit-${log.id}`,
      title: auditTitle(log, customerName),
      subtitle,
      time: shortDt(createdAt),
      created_at: createdAt,
      icon: <User className="h-6 w-6" />,
      source: "audit",
    };
  }

  if (action === "order.shipping.updated") {
    const beforeRequires = Boolean(beforeData?.requires_shipping);
    const afterRequires = Boolean(afterData?.requires_shipping);

    const beforeCarrier = s(
      beforeData?.shipping_snapshot?.carrier_name ||
        beforeData?.shipping_snapshot?.store_shipping_carrier_name ||
        beforeData?.carrier_name,
    );

    const afterCarrier = s(
      afterData?.shipping_snapshot?.carrier_name ||
        afterData?.shipping_snapshot?.store_shipping_carrier_name ||
        afterData?.carrier_name,
    );

    const beforeAmount = Number(beforeData?.shipping_amount ?? 0);
    const afterAmount = Number(afterData?.shipping_amount ?? 0);

    const beforeAddress = s(
      beforeData?.shipping_address?.text || beforeData?.shipping_snapshot?.text,
    );
    const afterAddress = s(
      afterData?.shipping_address?.text || afterData?.shipping_snapshot?.text,
    );

    let subtitle = "تم تعديل بيانات الشحن";

    if (beforeRequires !== afterRequires) {
      subtitle = afterRequires
        ? "تم تحويل الطلب إلى طلب يتطلب شحن"
        : "تم تحويل الطلب إلى طلب بدون شحن";
    } else if (beforeCarrier !== afterCarrier && (beforeCarrier || afterCarrier)) {
      subtitle = `تم تغيير شركة الشحن من ${beforeCarrier || "-"} إلى ${afterCarrier || "-"}`;
    } else if (beforeAmount !== afterAmount) {
      subtitle = `تم تغيير تكلفة الشحن من ${moneyText(beforeAmount, currency)} إلى ${moneyText(afterAmount, currency)}`;
    } else if (beforeAddress !== afterAddress && (beforeAddress || afterAddress)) {
      subtitle = `تم تعديل عنوان الشحن${afterAddress ? ` إلى ${afterAddress}` : ""}`;
    }

    return {
      id: `audit-${log.id}`,
      title: auditTitle(log, customerName),
      subtitle,
      time: shortDt(createdAt),
      created_at: createdAt,
      icon: <Truck className="h-6 w-6" />,
      source: "audit",
    };
  }

  if (action === "order.payment.updated") {
    const beforeMethod = paymentMethodLabel(beforeData?.payment_method);
    const afterMethod = paymentMethodLabel(afterData?.payment_method);

    const beforeTotal = Number(beforeData?.total_amount ?? 0);
    const afterTotal = Number(afterData?.total_amount ?? 0);

    const changes: string[] = [];

    if (beforeMethod !== afterMethod) {
      pushChange(
        changes,
        `تم تغيير وسيلة الدفع من ${beforeMethod || "-"} إلى ${afterMethod || "-"}`,
      );
    }

    if (beforeTotal !== afterTotal) {
      pushChange(
        changes,
        `تم تغيير إجمالي الطلب من ${moneyText(beforeTotal, currency)} إلى ${moneyText(afterTotal, currency)}`,
      );
    }

    return {
      id: `audit-${log.id}`,
      title: auditTitle(log, customerName),
      subtitle: changes.join("، ") || "تم تعديل وسيلة الدفع",
      time: shortDt(createdAt),
      created_at: createdAt,
      icon: <CreditCard className="h-6 w-6" />,
      source: "audit",
    };
  }

  if (action === "order.coupon.applied") {
    const code = s(afterData?.coupon_code) || s(afterData?.code);
    const discount = afterData?.discount_amount;

    return {
      id: `audit-${log.id}`,
      title: auditTitle(log, customerName),
      subtitle: code
        ? `تم تطبيق كوبون الخصم ${code}${discount != null ? ` بقيمة ${moneyText(discount, currency)}` : ""}`
        : "تم تطبيق كوبون خصم",
      time: shortDt(createdAt),
      created_at: createdAt,
      icon: <Ticket className="h-6 w-6" />,
      source: "audit",
    };
  }

  if (action === "order.coupon.removed") {
    const code = s(beforeData?.coupon_code) || s(beforeData?.code);
    const discount = Number(beforeData?.discount_amount ?? 0);

    return {
      id: `audit-${log.id}`,
      title: auditTitle(log, customerName),
      subtitle: code
        ? `تم حذف كوبون الخصم ${code}${discount > 0 ? ` وكان يخصم ${moneyText(discount, currency)}` : ""}`
        : "تم حذف كوبون الخصم",
      time: shortDt(createdAt),
      created_at: createdAt,
      icon: <Ticket className="h-6 w-6" />,
      source: "audit",
    };
  }

  if (action === "order.item.added") {
    const itemName = s(afterData?.name) || "منتج";
    const qty = Number(afterData?.qty ?? 0);
    const unitPrice = Number(afterData?.unit_price ?? 0);
    const optionsText = buildSelectedOptionsText(afterData?.selected_options);

    const parts = [
      `تمت إضافة المنتج ${itemName}`,
      qty > 0 ? `الكمية ${qty}` : "",
      unitPrice > 0 ? `السعر ${moneyText(unitPrice, currency)}` : "",
      optionsText ? `الخيارات ${optionsText}` : "",
    ].filter(Boolean);

    return {
      id: `audit-${log.id}`,
      title: auditTitle(log, customerName),
      subtitle: parts.join("، "),
      time: shortDt(createdAt),
      created_at: createdAt,
      icon: <Plus className="h-6 w-6" />,
      source: "audit",
    };
  }

  if (action === "order.item.updated") {
    const itemName = s(afterData?.name) || s(beforeData?.name) || "منتج";

    const beforeQty = Number(beforeData?.qty ?? 0);
    const afterQty = Number(afterData?.qty ?? 0);

    const beforeUnitPrice = Number(beforeData?.unit_price ?? 0);
    const afterUnitPrice = Number(afterData?.unit_price ?? 0);

    const beforeTotalPrice = Number(beforeData?.total_price ?? 0);
    const afterTotalPrice = Number(afterData?.total_price ?? 0);

    const beforeSku = s(beforeData?.sku);
    const afterSku = s(afterData?.sku);

    const beforeOptionsText = buildSelectedOptionsText(beforeData?.selected_options);
    const afterOptionsText = buildSelectedOptionsText(afterData?.selected_options);

    const changes: string[] = [];

    if (beforeQty !== afterQty) {
      pushChange(changes, `تم تغيير الكمية من ${beforeQty} إلى ${afterQty}`);
    }

    if (beforeUnitPrice !== afterUnitPrice) {
      pushChange(
        changes,
        `تم تغيير السعر من ${moneyText(beforeUnitPrice, currency)} إلى ${moneyText(afterUnitPrice, currency)}`,
      );
    }

    if (beforeTotalPrice !== afterTotalPrice) {
      pushChange(
        changes,
        `تم تغيير إجمالي المنتج من ${moneyText(beforeTotalPrice, currency)} إلى ${moneyText(afterTotalPrice, currency)}`,
      );
    }

    if (beforeSku !== afterSku && (beforeSku || afterSku)) {
      pushChange(changes, `تم تغيير SKU من ${beforeSku || "-"} إلى ${afterSku || "-"}`);
    }

    if (
      beforeOptionsText !== afterOptionsText &&
      (beforeOptionsText || afterOptionsText)
    ) {
      pushChange(
        changes,
        `تم تغيير الخيارات من ${beforeOptionsText || "-"} إلى ${afterOptionsText || "-"}`,
      );
    }

    return {
      id: `audit-${log.id}`,
      title: auditTitle(log, customerName),
      subtitle:
        changes.length > 0
          ? `${itemName}: ${changes.join("، ")}`
          : `تم تعديل المنتج ${itemName}`,
      time: shortDt(createdAt),
      created_at: createdAt,
      icon: <Package className="h-6 w-6" />,
      source: "audit",
    };
  }

  if (action === "order.item.deleted") {
    const itemName = s(beforeData?.name) || "منتج";
    const qty = Number(beforeData?.qty ?? 0);
    const unitPrice = Number(beforeData?.unit_price ?? 0);
    const optionsText = buildSelectedOptionsText(beforeData?.selected_options);

    const parts = [
      `تم حذف المنتج ${itemName} من الطلب`,
      qty > 0 ? `الكمية ${qty}` : "",
      unitPrice > 0 ? `السعر ${moneyText(unitPrice, currency)}` : "",
      optionsText ? `الخيارات ${optionsText}` : "",
    ].filter(Boolean);

    return {
      id: `audit-${log.id}`,
      title: auditTitle(log, customerName),
      subtitle: parts.join("، "),
      time: shortDt(createdAt),
      created_at: createdAt,
      icon: <Trash2 className="h-6 w-6" />,
      source: "audit",
    };
  }

  return {
    id: `audit-${log.id}`,
    title: auditTitle(log, customerName),
    subtitle: "تم تعديل بيانات الطلب",
    time: shortDt(createdAt),
    created_at: createdAt,
    icon: <Clock3 className="h-6 w-6" />,
    source: "audit",
  };
}

function buildCreatedEntry(customerName: string, createdAt: unknown): TimelineEntry {
  const created = s(createdAt);

  return {
    id: "created-order",
    title: customerName,
    subtitle: "قام العميل بإنشاء الطلب",
    time: shortDt(created),
    created_at: created,
    icon: <Store className="h-6 w-6" />,
    source: "created",
  };
}

function buildStatusEntry(
  item: StatusHistoryItem,
  customerName: string,
): TimelineEntry {
  return {
    id: `status-${item.id}`,
    title: historyTitle(item, customerName),
    subtitle: historySubtitle(item),
    time: shortDt(item.created_at),
    created_at: s(item.created_at),
    icon: <Clock3 className="h-6 w-6" />,
    source: "status",
  };
}

export default function OrderTimelineCard({
  order,
  customer,
  currentStatusLabel,
}: {
  order: OrderDetails;
  customer: CustomerMini | null;
  currentStatusLabel: string;
}) {
  const history = Array.isArray(order.status_history) ? order.status_history : [];
  const auditLogs = Array.isArray(order.audit_logs) ? order.audit_logs : [];
  const customerName = s(customer?.full_name) || "العميل";
  const currency = s(order.currency) || "SAR";

  const entries: TimelineEntry[] = [
    buildCreatedEntry(customerName, order.created_at),
    ...history.map((item) => buildStatusEntry(item, customerName)),
    ...auditLogs
      .map((log) => auditToEntry(log, customerName, currency))
      .filter((entry): entry is TimelineEntry => Boolean(entry)),
  ]
    .filter((entry) => s(entry.created_at))
    .sort((a, b) => {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return da - db;
    });

  const fallbackNeeded = entries.length === 1;

  return (
    <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between px-5 py-5 md:px-8">
        <div className="inline-flex items-center gap-3 text-[28px] font-medium text-slate-700">
          <ClipboardList className="h-6 w-6 text-slate-500" />
          سجل الطلب
        </div>

      
      </div>

      <div className="space-y-10 px-5 pb-10 pt-4 md:px-8">
        {entries.map((entry, index) => (
          <TimelineItem
            key={entry.id}
            title={entry.title}
            subtitle={entry.subtitle}
            time={entry.time}
            topLine={index > 0}
            icon={entry.icon}
          />
        ))}

        {fallbackNeeded ? (
          <TimelineItem
            title={customerName}
            subtitle={currentStatusLabel}
            time={shortDt(
              order.status_updated_at || order.updated_at || order.created_at,
            )}
            topLine
            icon={<Clock3 className="h-6 w-6" />}
          />
        ) : null}

        <div dir="ltr" className="text-right text-sm text-slate-400">
          {dt(order.created_at)}
        </div>
      </div>
    </section>
  );
}