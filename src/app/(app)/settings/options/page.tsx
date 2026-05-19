// app/(app)/settings/options/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Box, ClipboardList, Users, MessageSquare, Settings2 } from "lucide-react";

import OptionsSectionCard from "./_components/OptionsSectionCard";
import OptionsTable from "./_components/OptionsTable";
import OptionsSwitchRow from "./_components/OptionsSwitchRow";
import OptionsActionRow from "./_components/OptionsActionRow";

import ProductPurchaseCountModal from "./modals/ProductPurchaseCountModal";
import ProductRecommendationsModal from "./modals/ProductRecommendationsModal";
import ReceivingOrdersModal from "./modals/ReceivingOrdersModal";
import ReceivingOrdersTimesModal from "./modals/ReceivingOrdersTimesModal";
import OrderNotesModal from "./modals/OrderNotesModal";
import CancelOrderModal from "./modals/CancelOrderModal";
import OrderAutoCompletedStatusModal from "./modals/OrderAutoCompletedStatusModal";
import RestoreStockByStatusModal from "./modals/RestoreStockByStatusModal";
import AgreementBeforeSubmitModal from "./modals/AgreementBeforeSubmitModal";
import OrderCompletionPageModal from "./modals/OrderCompletionPageModal";
import CustomizePackingListModal from "./modals/CustomizePackingListModal";
import ShippingLabelDeductionModal from "./modals/ShippingLabelDeductionModal";
import CustomerAddressMethodModal from "./modals/CustomerAddressMethodModal";
import ReportsStatusesModal from "./modals/ReportsStatusesModal";

type ProductTypeValue =
  | "product"
  | "service"
  | "group_products"
  | "financial_support"
  | "codes"
  | "digital"
  | "food"
  | "donating"
  | "booking";

type OptionModalKey =
  | "productPurchaseCount"
  | "productRecommendations"
  | "receivingOrders"
  | "receivingOrdersTimes"
  | "orderNotes"
  | "cancelOrder"
  | "orderAutoCompletedStatus"
  | "restoreStockByStatus"
  | "agreementBeforeSubmit"
  | "orderCompletionPage"
  | "customizePackingList"
  | "shippingLabelDeduction"
  | "customerAddressMethod"
  | "reportsStatuses"
  | null;

type CategoryOption = { id: string; name: string };
type OrderStatusOption = { id: string; name: string };

type DayKey =
  | "saturday"
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday";

type SwitchesState = {
  duplicateProductInCart: boolean;
  quantitySort: boolean;
  seeMoreButton: boolean;
  showDashInstead: boolean;
  priceStartFrom: boolean;
  digitalProductProtection: boolean;
  showWeight: boolean;
  showProductSku: boolean;
  hsCodeEnabled: boolean;
  taxIncluded: boolean;

  disablePaymentDelay: boolean;
  shippingIndicator: boolean;
  reorderEnable: boolean;

  optionalRegisterEmail: boolean;
  allowEmailLogin: boolean;
  mergeOldCart: boolean;
  browserNotificationForApplePay: boolean;

  publishComments: boolean;
  pagesFeedbackEnable: boolean;
  productsFeedbackEnable: boolean;
  productsFeedbackDisableGuest: boolean;
};

type ProductPurchaseCountState = {
  enabled: boolean;
  selectedCategoriesOnly: boolean;
  categoryIds: string[];
};

type ProductRecommendationsState = {
  enabled: boolean;
  type: "random" | "category" | "brand" | "tag";
};

type ReceivingOrdersState = {
  enabled: boolean;
  restrictCod: boolean;
  enableDailyLimit: boolean;
  dailyLimit: string;
  message: string;
};

type ReceivingOrdersTimesState = Record<
  DayKey,
  { enabled: boolean; from: string; to: string }
>;

type OrderNotesState = {
  enabled: boolean;
  title: string;
  description: string;
};

type CancelOrderState = {
  enabled: boolean;
  hoursLimit: number;
};

type OrderAutoCompletedStatusState = {
  epaymentEnabled: boolean;
  epaymentExcluded: ProductTypeValue[];
  codEnabled: boolean;
  codExcluded: ProductTypeValue[];
  instalmentsEnabled: boolean;
  instalmentsExcluded: ProductTypeValue[];
};

type RestoreStockByStatusState = {
  enabled: boolean;
  statusIds: string[];
};

type AgreementBeforeSubmitState = {
  visibility: "in_all" | "in_cod" | "hide";
  text: string;
  autoAccept: boolean;
};

type OrderCompletionPageState = {
  thankTitle: string;
  paymentWaiting: string;
  underReview: string;
  completed: string;
};

type CustomizePackingListState = {
  showShippingDuration: boolean;
  showProductId: boolean;
  showCategory: boolean;
  hidePrices: boolean;
  showProductQuantity: boolean;
  showBrand: boolean;
  hideProductPicture: boolean;
  useSaTimeZone: boolean;
  showOrderOptions: boolean;
  showPayments: boolean;
  showShipping: boolean;
  showProductOptions: boolean;
  showOrderNote: boolean;
  showSku: boolean;
  showTotalItemCount: boolean;
};

type ShippingLabelDeductionState = {
  type: "wallet_and_epayment" | "wallet";
};

type CustomerAddressMethodState = {
  criteria: "location" | "location_and_national_address";
  provider: "default";
  addressDescriptionRequired: boolean;
};

type ReportsStatusesState = {
  saleStatusIds: string[];
};

type State = {
  switches: SwitchesState;
  productPurchaseCount: ProductPurchaseCountState;
  productRecommendations: ProductRecommendationsState;
  receivingOrders: ReceivingOrdersState;
  receivingOrdersTimes: ReceivingOrdersTimesState;
  orderNotes: OrderNotesState;
  cancelOrder: CancelOrderState;
  orderAutoCompletedStatus: OrderAutoCompletedStatusState;
  restoreStockByStatus: RestoreStockByStatusState;
  agreementBeforeSubmit: AgreementBeforeSubmitState;
  orderCompletionPage: OrderCompletionPageState;
  customizePackingList: CustomizePackingListState;
  shippingLabelDeduction: ShippingLabelDeductionState;
  customerAddressMethod: CustomerAddressMethodState;
  reportsStatuses: ReportsStatusesState;
};

type SaveState = "idle" | "saving" | "error";

type SettingsApiGetAllResponse = {
  ok: boolean;
  store_id?: string;
  items?: Record<string, unknown>;
  error?: string;
};

type SettingsApiPutResponse = {
  ok: boolean;
  item?: {
    id?: string;
    slug?: string;
    type?: string;
    value?: unknown;
    updated_at?: string;
  };
  error?: string;
};

type CategoriesApiGetResponse = {
  data?: Array<{
    id?: string;
    name?: string;
  }>;
  error?: string;
};

const productTypes: { value: ProductTypeValue; label: string }[] = [
  { value: "product", label: "منتج جاهز" },
  { value: "service", label: "خدمة حسب الطلب" },
  { value: "group_products", label: "مجموعة منتجات" },
  { value: "financial_support", label: "كفالة" },
  { value: "codes", label: "بطاقة رقمية" },
  { value: "digital", label: "منتج رقمي" },
  { value: "food", label: "أكل" },
  { value: "donating", label: "تبرع" },
  { value: "booking", label: "حجوزات" },
];

const orderStatuses: OrderStatusOption[] = [
  { id: "1", name: "بانتظار الدفع" },
  { id: "2", name: "بانتظار المراجعة" },
  { id: "3", name: "قيد التنفيذ" },
  { id: "4", name: "تم التنفيذ" },
  { id: "8", name: "جاري التوصيل" },
  { id: "9", name: "تم التوصيل" },
  { id: "10", name: "تم الشحن" },
  { id: "11", name: "بإنتظار تأكيد الدفع" },
  { id: "13", name: "طلب عرض سعر" },
  { id: "5", name: "ملغى" },
  { id: "7", name: "مسترجع" },
];

const dayOrder: DayKey[] = [
  "saturday",
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
];

const initialState: State = {
  switches: {
    duplicateProductInCart: true,
    quantitySort: true,
    seeMoreButton: true,
    showDashInstead: true,
    priceStartFrom: true,
    digitalProductProtection: false,
    showWeight: false,
    showProductSku: true,
    hsCodeEnabled: false,
    taxIncluded: false,

    disablePaymentDelay: true,
    shippingIndicator: true,
    reorderEnable: false,

    optionalRegisterEmail: true,
    allowEmailLogin: true,
    mergeOldCart: true,
    browserNotificationForApplePay: true,

    publishComments: true,
    pagesFeedbackEnable: true,
    productsFeedbackEnable: true,
    productsFeedbackDisableGuest: true,
  },

  productPurchaseCount: {
    enabled: true,
    selectedCategoriesOnly: false,
    categoryIds: [],
  },

  productRecommendations: {
    enabled: true,
    type: "category",
  },

  receivingOrders: {
    enabled: true,
    restrictCod: false,
    enableDailyLimit: false,
    dailyLimit: "",
    message:
      "ياهلا {name}\nنعتذر عميلنا العزيز، لايمكن استقبال طلبك اليوم لوصولنا للحد الاعلى لطلبات اليوم، يمكنك الطلب بعد {time}.",
  },

  receivingOrdersTimes: {
    saturday: { enabled: false, from: "", to: "" },
    sunday: { enabled: false, from: "", to: "" },
    monday: { enabled: false, from: "", to: "" },
    tuesday: { enabled: false, from: "", to: "" },
    wednesday: { enabled: false, from: "", to: "" },
    thursday: { enabled: false, from: "", to: "" },
    friday: { enabled: false, from: "", to: "" },
  },

  orderNotes: {
    enabled: false,
    title: "ملاحظة",
    description: "اكتبي ملاحظتك",
  },

  cancelOrder: {
    enabled: false,
    hoursLimit: 24,
  },

  orderAutoCompletedStatus: {
    epaymentEnabled: false,
    epaymentExcluded: [],
    codEnabled: false,
    codExcluded: [],
    instalmentsEnabled: false,
    instalmentsExcluded: [],
  },

  restoreStockByStatus: {
    enabled: false,
    statusIds: ["13", "5", "7"],
  },

  agreementBeforeSubmit: {
    visibility: "in_cod",
    text: "اتعهد بإستلام الطلبية عند اختياري (الدفع عند الاستلام)",
    autoAccept: true,
  },

  orderCompletionPage: {
    thankTitle: "شكرا لتسوّقكم عبر متجرنا",
    paymentWaiting: "طلبك حالياً غير مؤكد!\nنأمل تأكيد الدفع عبر الرابط المرسل لجوالك",
    underReview: "تم استقبال طلبك بنجاح\nسيتم تجهيز الطلب في أقرب وقت",
    completed: "تم تجهيز طلبك بنجاح\nسيتم إرسال الطلب في أقرب وقت",
  },

  customizePackingList: {
    showShippingDuration: true,
    showProductId: true,
    showCategory: true,
    hidePrices: false,
    showProductQuantity: true,
    showBrand: true,
    hideProductPicture: false,
    useSaTimeZone: true,
    showOrderOptions: true,
    showPayments: true,
    showShipping: true,
    showProductOptions: true,
    showOrderNote: true,
    showSku: true,
    showTotalItemCount: false,
  },

  shippingLabelDeduction: {
    type: "wallet_and_epayment",
  },

  customerAddressMethod: {
    criteria: "location_and_national_address",
    provider: "default",
    addressDescriptionRequired: false,
  },

  reportsStatuses: {
    saleStatusIds: ["3", "4", "8", "9", "10"],
  },
};

const switchKeyToSettingKey: Record<keyof SwitchesState, string> = {
  duplicateProductInCart: "switch_duplicate_product_in_cart",
  quantitySort: "switch_quantity_sort",
  seeMoreButton: "switch_see_more_button",
  showDashInstead: "switch_show_dash_instead",
  priceStartFrom: "switch_price_start_from",
  digitalProductProtection: "switch_digital_product_protection",
  showWeight: "switch_show_weight",
  showProductSku: "switch_show_product_sku",
  hsCodeEnabled: "switch_hs_code_enabled",
  taxIncluded: "switch_tax_included",

  disablePaymentDelay: "switch_disable_payment_delay",
  shippingIndicator: "switch_shipping_indicator",
  reorderEnable: "switch_reorder_enable",

  optionalRegisterEmail: "switch_optional_register_email",
  allowEmailLogin: "switch_allow_email_login",
  mergeOldCart: "switch_merge_old_cart",
  browserNotificationForApplePay: "switch_browser_notification_for_applepay",

  publishComments: "switch_publish_comments",
  pagesFeedbackEnable: "switch_pages_feedback_enable",
  productsFeedbackEnable: "switch_products_feedback_enable",
  productsFeedbackDisableGuest: "switch_products_feedback_disable_guest",
};

const settingToStateKeyMap = {
  "options:product_purchase_count": "productPurchaseCount",
  "options:product_recommendations": "productRecommendations",
  "options:receiving_orders": "receivingOrders",
  "options:receiving_orders_times": "receivingOrdersTimes",
  "options:order_notes": "orderNotes",
  "options:cancel_order": "cancelOrder",
  "options:order_auto_completed_status": "orderAutoCompletedStatus",
  "options:restore_stock_by_status": "restoreStockByStatus",
  "options:agreement_before_submit": "agreementBeforeSubmit",
  "options:order_completion_page": "orderCompletionPage",
  "options:customize_packing_list": "customizePackingList",
  "options:shipping_label_deduction": "shippingLabelDeduction",
  "options:customer_address_method": "customerAddressMethod",
  "options:reports_statuses": "reportsStatuses",
} as const;

type NonSwitchStateKey =
  | "productPurchaseCount"
  | "productRecommendations"
  | "receivingOrders"
  | "receivingOrdersTimes"
  | "orderNotes"
  | "cancelOrder"
  | "orderAutoCompletedStatus"
  | "restoreStockByStatus"
  | "agreementBeforeSubmit"
  | "orderCompletionPage"
  | "customizePackingList"
  | "shippingLabelDeduction"
  | "customerAddressMethod"
  | "reportsStatuses";

function mergeReceivingOrdersTimes(
  rawValue: unknown,
  fallback: ReceivingOrdersTimesState
): ReceivingOrdersTimesState {
  const merged: ReceivingOrdersTimesState = {
    ...fallback,
  };

  if (!rawValue || typeof rawValue !== "object") return merged;

  for (const day of dayOrder) {
    const row = (rawValue as Partial<ReceivingOrdersTimesState>)[day];
    if (row && typeof row === "object") {
      merged[day] = {
        ...merged[day],
        ...row,
      };
    }
  }

  return merged;
}

function SettingsOptionsSkeleton() {
  return (
    <div className="space-y-6" dir="rtl">
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-8 w-56 animate-pulse rounded-xl bg-slate-200" />
        <div className="mt-3 h-4 w-80 animate-pulse rounded-lg bg-slate-100" />
      </div>

      {Array.from({ length: 4 }).map((_, sectionIndex) => (
        <div
          key={sectionIndex}
          className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
            <div className="h-6 w-32 animate-pulse rounded-lg bg-slate-200" />
            <div className="h-10 w-10 animate-pulse rounded-full bg-slate-100" />
          </div>

          <div className="divide-y divide-slate-100">
            {Array.from({ length: 5 }).map((__, rowIndex) => (
              <div
                key={rowIndex}
                className="flex items-center justify-between gap-4 px-6 py-5"
              >
                <div className="min-w-0 flex-1">
                  <div className="h-5 w-72 animate-pulse rounded-lg bg-slate-200" />
                  <div className="mt-2 h-4 w-40 animate-pulse rounded-lg bg-slate-100" />
                </div>

                {rowIndex % 2 === 0 ? (
                  <div className="h-7 w-12 animate-pulse rounded-full bg-slate-200" />
                ) : (
                  <div className="h-10 w-20 animate-pulse rounded-2xl bg-slate-200" />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SettingsOptionsPage() {
  const [state, setState] = useState<State>(initialState);
  const [activeModal, setActiveModal] = useState<OptionModalKey>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);

  const [switchSaveStates, setSwitchSaveStates] = useState<
    Partial<Record<keyof SwitchesState, SaveState>>
  >({});
  const [switchErrors, setSwitchErrors] = useState<
    Partial<Record<keyof SwitchesState, string>>
  >({});

  const setSwitchLoading = (key: keyof SwitchesState, value: SaveState) => {
    setSwitchSaveStates((prev) => ({ ...prev, [key]: value }));
  };

  const setSwitchError = (key: keyof SwitchesState, value: string) => {
    setSwitchErrors((prev) => ({ ...prev, [key]: value }));
  };

  const saveBooleanSetting = async (key: string, value: boolean) => {
    const res = await fetch("/api/settings/options", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        key,
        value: { enabled: value },
      }),
    });

    const json: SettingsApiPutResponse = await res.json();

    if (!res.ok || !json?.ok) {
      throw new Error(json?.error || "فشل حفظ الإعداد");
    }
  };

  const updateSwitch = async (key: keyof SwitchesState, value: boolean) => {
    const previousValue = state.switches[key];

    setState((prev) => ({
      ...prev,
      switches: {
        ...prev.switches,
        [key]: value,
      },
    }));

    setSwitchLoading(key, "saving");
    setSwitchError(key, "");

    try {
      await saveBooleanSetting(switchKeyToSettingKey[key], value);
      setSwitchLoading(key, "idle");
    } catch (error) {
      console.error(`Failed to save switch ${String(key)}`, error);

      setState((prev) => ({
        ...prev,
        switches: {
          ...prev.switches,
          [key]: previousValue,
        },
      }));

      setSwitchLoading(key, "error");
      setSwitchError(
        key,
        error instanceof Error ? error.message : "حدث خطأ أثناء الحفظ"
      );
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function loadAllSettings() {
      try {
        setPageLoading(true);

        const [settingsRes, categoriesRes] = await Promise.all([
          fetch("/api/settings/options", {
            method: "GET",
            cache: "no-store",
          }),
          fetch("/api/categories", {
            method: "GET",
            cache: "no-store",
          }),
        ]);

        const json: SettingsApiGetAllResponse = await settingsRes.json();
        const categoriesJson: CategoriesApiGetResponse = await categoriesRes.json();

        if (!settingsRes.ok || !json?.ok) {
          console.error("Failed to load settings", json?.error);
          return;
        }

        const items = json.items ?? {};

        const nextSwitches: SwitchesState = {
          ...initialState.switches,
        };

        for (const [switchKey, settingKey] of Object.entries(
          switchKeyToSettingKey
        ) as [keyof SwitchesState, string][]) {
          const rawValue = items[`options:${settingKey}`];

          if (
            rawValue &&
            typeof rawValue === "object" &&
            "enabled" in rawValue &&
            typeof (rawValue as { enabled?: unknown }).enabled === "boolean"
          ) {
            nextSwitches[switchKey] = (rawValue as { enabled: boolean }).enabled;
          }
        }

        const nextPartialState: Partial<State> = {};

        for (const [slug, stateKey] of Object.entries(settingToStateKeyMap) as [
          keyof typeof settingToStateKeyMap,
          NonSwitchStateKey
        ][]) {
          const rawValue = items[slug];
          if (!rawValue || typeof rawValue !== "object") continue;

          switch (stateKey) {
            case "productPurchaseCount":
              nextPartialState.productPurchaseCount = {
                ...initialState.productPurchaseCount,
                ...(rawValue as Partial<ProductPurchaseCountState>),
              };
              break;

            case "productRecommendations":
              nextPartialState.productRecommendations = {
                ...initialState.productRecommendations,
                ...(rawValue as Partial<ProductRecommendationsState>),
              };
              break;

            case "receivingOrders":
              nextPartialState.receivingOrders = {
                ...initialState.receivingOrders,
                ...(rawValue as Partial<ReceivingOrdersState>),
              };
              break;

            case "receivingOrdersTimes":
              nextPartialState.receivingOrdersTimes = mergeReceivingOrdersTimes(
                rawValue,
                initialState.receivingOrdersTimes
              );
              break;

            case "orderNotes":
              nextPartialState.orderNotes = {
                ...initialState.orderNotes,
                ...(rawValue as Partial<OrderNotesState>),
              };
              break;

            case "cancelOrder":
              nextPartialState.cancelOrder = {
                ...initialState.cancelOrder,
                ...(rawValue as Partial<CancelOrderState>),
              };
              break;

            case "orderAutoCompletedStatus":
              nextPartialState.orderAutoCompletedStatus = {
                ...initialState.orderAutoCompletedStatus,
                ...(rawValue as Partial<OrderAutoCompletedStatusState>),
              };
              break;

            case "restoreStockByStatus":
              nextPartialState.restoreStockByStatus = {
                ...initialState.restoreStockByStatus,
                ...(rawValue as Partial<RestoreStockByStatusState>),
              };
              break;

            case "agreementBeforeSubmit":
              nextPartialState.agreementBeforeSubmit = {
                ...initialState.agreementBeforeSubmit,
                ...(rawValue as Partial<AgreementBeforeSubmitState>),
              };
              break;

            case "orderCompletionPage":
              nextPartialState.orderCompletionPage = {
                ...initialState.orderCompletionPage,
                ...(rawValue as Partial<OrderCompletionPageState>),
              };
              break;

            case "customizePackingList":
              nextPartialState.customizePackingList = {
                ...initialState.customizePackingList,
                ...(rawValue as Partial<CustomizePackingListState>),
              };
              break;

            case "shippingLabelDeduction":
              nextPartialState.shippingLabelDeduction = {
                ...initialState.shippingLabelDeduction,
                ...(rawValue as Partial<ShippingLabelDeductionState>),
              };
              break;

            case "customerAddressMethod":
              nextPartialState.customerAddressMethod = {
                ...initialState.customerAddressMethod,
                ...(rawValue as Partial<CustomerAddressMethodState>),
              };
              break;

            case "reportsStatuses":
              nextPartialState.reportsStatuses = {
                ...initialState.reportsStatuses,
                ...(rawValue as Partial<ReportsStatusesState>),
              };
              break;
          }
        }

        const nextCategories: CategoryOption[] = Array.isArray(categoriesJson?.data)
          ? categoriesJson.data
              .map((item) => ({
                id: String(item?.id ?? "").trim(),
                name: String(item?.name ?? "").trim(),
              }))
              .filter((item) => item.id && item.name)
          : [];

        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            ...nextPartialState,
            switches: nextSwitches,
          }));
          setCategoryOptions(nextCategories);
        }
      } catch (error) {
        console.error("Failed to load settings", error);
      } finally {
        if (!cancelled) {
          setPageLoading(false);
        }
      }
    }

    loadAllSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  const dayLabels = useMemo(
    () => ({
      saturday: "السبت",
      sunday: "الأحد",
      monday: "الإثنين",
      tuesday: "الثلاثاء",
      wednesday: "الأربعاء",
      thursday: "الخميس",
      friday: "الجمعة",
    }),
    []
  );

  const switchDescription = (key: keyof SwitchesState) => {
    if (switchSaveStates[key] === "saving") return "جارٍ الحفظ...";
    if (switchSaveStates[key] === "error") return switchErrors[key] || "فشل الحفظ";
    return undefined;
  };

  const actionDescription = (loading: boolean, summary?: string) => {
    if (loading) return "جارٍ التحميل...";
    return summary;
  };

  const productPurchaseCountSummary = useMemo(() => {
    const value = state.productPurchaseCount;
    if (!value.enabled) return "مخفي";
    if (!value.selectedCategoriesOnly) return "كل المنتجات";
    const count = value.categoryIds.length;
    if (!count) return "تصنيفات محددة";
    return `${count} ${count === 1 ? "تصنيف" : "تصنيفات"}`;
  }, [state.productPurchaseCount]);

  const productRecommendationsSummary = useMemo(() => {
    const value = state.productRecommendations;
    if (!value.enabled) return "مغلق";
    const labelMap: Record<ProductRecommendationsState["type"], string> = {
      random: "منتجات عشوائية",
      category: "من نفس التصنيف",
      brand: "من نفس الماركة",
      tag: "من نفس الوسم",
    };
    return labelMap[value.type];
  }, [state.productRecommendations]);

  const receivingOrdersSummary = useMemo(() => {
    const value = state.receivingOrders;
    if (!value.enabled) return "متوقف";
    if (value.enableDailyLimit && value.dailyLimit) {
      return `مفعّل · حد يومي ${value.dailyLimit}`;
    }
    return "مفعّل";
  }, [state.receivingOrders]);

  const receivingOrdersTimesSummary = useMemo(() => {
    const enabledDays = dayOrder.filter((day) => state.receivingOrdersTimes[day]?.enabled);
    if (!enabledDays.length) return "غير محدد";
    return `${enabledDays.length} ${enabledDays.length === 1 ? "يوم مفعّل" : "أيام مفعلة"}`;
  }, [state.receivingOrdersTimes]);

  const orderNotesSummary = useMemo(() => {
    return state.orderNotes.enabled ? "مفعّل" : "مغلق";
  }, [state.orderNotes]);

  const cancelOrderSummary = useMemo(() => {
    if (!state.cancelOrder.enabled) return "مغلق";
    return `${state.cancelOrder.hoursLimit} ساعة`;
  }, [state.cancelOrder]);

  const orderAutoCompletedStatusSummary = useMemo(() => {
    const labels: string[] = [];
    if (state.orderAutoCompletedStatus.epaymentEnabled) labels.push("الدفع الإلكتروني");
    if (state.orderAutoCompletedStatus.codEnabled) labels.push("الدفع عند الاستلام");
    if (state.orderAutoCompletedStatus.instalmentsEnabled) labels.push("الأقساط");
    if (!labels.length) return "غير مفعّل";
    return labels.join(" + ");
  }, [state.orderAutoCompletedStatus]);

  const restoreStockByStatusSummary = useMemo(() => {
    if (!state.restoreStockByStatus.enabled) return "مغلق";
    const count = state.restoreStockByStatus.statusIds.length;
    return `${count} ${count === 1 ? "حالة" : "حالات"}`;
  }, [state.restoreStockByStatus]);

  const agreementBeforeSubmitSummary = useMemo(() => {
    const map: Record<AgreementBeforeSubmitState["visibility"], string> = {
      in_all: "يظهر دائماً",
      in_cod: "يظهر عند الدفع عند الاستلام",
      hide: "مخفي",
    };
    return map[state.agreementBeforeSubmit.visibility];
  }, [state.agreementBeforeSubmit]);

  const orderCompletionPageSummary = useMemo(() => {
    return state.orderCompletionPage.thankTitle?.trim() ? "مخصص" : "افتراضي";
  }, [state.orderCompletionPage]);

  const customizePackingListSummary = useMemo(() => {
    const enabledCount = Object.values(state.customizePackingList).filter(Boolean).length;
    return `${enabledCount} ${enabledCount === 1 ? "خيار مفعّل" : "خيارات مفعلة"}`;
  }, [state.customizePackingList]);

  const shippingLabelDeductionSummary = useMemo(() => {
    return state.shippingLabelDeduction.type === "wallet_and_epayment"
      ? "المحفظة والمدفوعات الإلكترونية"
      : "رصيد المتجر";
  }, [state.shippingLabelDeduction]);

  const customerAddressMethodSummary = useMemo(() => {
    return state.customerAddressMethod.criteria === "location"
      ? "الموقع الجغرافي"
      : "نموذج العنوان والموقع الجغرافي";
  }, [state.customerAddressMethod]);

  const reportsStatusesSummary = useMemo(() => {
    const count = state.reportsStatuses.saleStatusIds.length;
    return `${count} ${count === 1 ? "حالة" : "حالات"}`;
  }, [state.reportsStatuses]);

  if (pageLoading) {
    return <SettingsOptionsSkeleton />;
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">خيارات المتجر</h1>
        <p className="mt-2 text-sm text-slate-500">
          إعدادات المنتجات والطلبات والعملاء والأسئلة والتقارير.
        </p>
      </div>

      <OptionsSectionCard title="المنتجات" icon={<Box className="h-5 w-5" />}>
        <OptionsTable>
          <OptionsSwitchRow
            title="إمكانية تكرار المنتجات في السلة"
            description={switchDescription("duplicateProductInCart")}
            checked={state.switches.duplicateProductInCart}
            onChange={(v) => updateSwitch("duplicateProductInCart", v)}
          />
          <OptionsActionRow
            title="تخصيص ظهور مرات الشراء للمنتجات"
            description={actionDescription(false, productPurchaseCountSummary)}
            onClick={() => setActiveModal("productPurchaseCount")}
          />
          <OptionsSwitchRow
            title="عرض المنتجات التي نفذت في نهاية الصفحات"
            description={switchDescription("quantitySort")}
            checked={state.switches.quantitySort}
            onChange={(v) => updateSwitch("quantitySort", v)}
          />
          <OptionsSwitchRow
            title="عرض زر تفاصيل أكثر لوصف المنتج"
            description={switchDescription("seeMoreButton")}
            checked={state.switches.seeMoreButton}
            onChange={(v) => updateSwitch("seeMoreButton", v)}
          />
          <OptionsSwitchRow
            title="عرض علامة - عندما يكون سعر المنتج صفر"
            description={switchDescription("showDashInstead")}
            checked={state.switches.showDashInstead}
            onChange={(v) => updateSwitch("showDashInstead", v)}
          />
          <OptionsActionRow
            title="عرض منتجات ربما تعجبك في صفحة المنتج"
            description={actionDescription(false, productRecommendationsSummary)}
            onClick={() => setActiveModal("productRecommendations")}
          />
          <OptionsSwitchRow
            title="تفعيل إظهار نطاق السعر على المنتج"
            description={switchDescription("priceStartFrom")}
            checked={state.switches.priceStartFrom}
            onChange={(v) => updateSwitch("priceStartFrom", v)}
          />
          <OptionsSwitchRow
            title="وضع حماية المنتج الرقمي لملفات (PDF)"
            description={switchDescription("digitalProductProtection")}
            checked={state.switches.digitalProductProtection}
            onChange={(v) => updateSwitch("digitalProductProtection", v)}
          />
          <OptionsSwitchRow
            title="عرض الوزن في تفاصيل المنتج وصفحة السلة والفواتير"
            description={switchDescription("showWeight")}
            checked={state.switches.showWeight}
            onChange={(v) => updateSwitch("showWeight", v)}
          />
          <OptionsSwitchRow
            title="عرض الرقم المخزني SKU في تفاصيل المنتج والطلب"
            description={switchDescription("showProductSku")}
            checked={state.switches.showProductSku}
            onChange={(v) => updateSwitch("showProductSku", v)}
          />
          <OptionsSwitchRow
            title="إظهار حقل رمز التنسيق الجمركي (HS Code) ضمن بيانات المنتج"
            description={switchDescription("hsCodeEnabled")}
            checked={state.switches.hsCodeEnabled}
            onChange={(v) => updateSwitch("hsCodeEnabled", v)}
          />
          <OptionsSwitchRow
            title="إدخال أسعار المنتجات شاملة الضريبة"
            description={switchDescription("taxIncluded")}
            checked={state.switches.taxIncluded}
            onChange={(v) => updateSwitch("taxIncluded", v)}
          />
        </OptionsTable>
      </OptionsSectionCard>

      <OptionsSectionCard title="الطلبات" icon={<ClipboardList className="h-5 w-5" />}>
        <OptionsTable>
          <OptionsActionRow
            title="استقبال الطلبات"
            description={actionDescription(false, receivingOrdersSummary)}
            onClick={() => setActiveModal("receivingOrders")}
          />
          <OptionsActionRow
            title="أوقات استقبال الطلبات"
            description={actionDescription(false, receivingOrdersTimesSummary)}
            onClick={() => setActiveModal("receivingOrdersTimes")}
          />
          <OptionsActionRow
            title="السماح بإضافة ملاحظة على الطلب"
            description={actionDescription(false, orderNotesSummary)}
            onClick={() => setActiveModal("orderNotes")}
          />
          <OptionsActionRow
            title="السماح للعميل بإلغاء الطلب قبل البدء بتنفيذه"
            description={actionDescription(false, cancelOrderSummary)}
            onClick={() => setActiveModal("cancelOrder")}
          />
          <OptionsActionRow
            title="تعيين حالة (تم التنفيذ) عند الطلب"
            description={actionDescription(false, orderAutoCompletedStatusSummary)}
            onClick={() => setActiveModal("orderAutoCompletedStatus")}
          />
          <OptionsActionRow
            title="إعادة المخزون تلقائيا بناء على حالة الطلب"
            description={actionDescription(false, restoreStockByStatusSummary)}
            onClick={() => setActiveModal("restoreStockByStatus")}
          />
          <OptionsSwitchRow
            title="تعطيل مهلة الدفع في التحويل البنكي"
            description={switchDescription("disablePaymentDelay")}
            checked={state.switches.disablePaymentDelay}
            onChange={(v) => updateSwitch("disablePaymentDelay", v)}
          />
          <OptionsSwitchRow
            title="عرض مؤشر الشحن"
            description={switchDescription("shippingIndicator")}
            checked={state.switches.shippingIndicator}
            onChange={(v) => updateSwitch("shippingIndicator", v)}
          />
          <OptionsSwitchRow
            title="تفعيل إعادة الطلب"
            description={switchDescription("reorderEnable")}
            checked={state.switches.reorderEnable}
            onChange={(v) => updateSwitch("reorderEnable", v)}
          />
          <OptionsActionRow
            title="الإقرار قبل ارسال الطلب"
            description={actionDescription(false, agreementBeforeSubmitSummary)}
            onClick={() => setActiveModal("agreementBeforeSubmit")}
          />
          <OptionsActionRow
            title="تخصيص صفحة اكتمال الطلب"
            description={actionDescription(false, orderCompletionPageSummary)}
            onClick={() => setActiveModal("orderCompletionPage")}
          />
          <OptionsActionRow
            title="تخصيص قائمة تجهيز الطلب"
            description={actionDescription(false, customizePackingListSummary)}
            onClick={() => setActiveModal("customizePackingList")}
          />
          <OptionsActionRow
            title="طريقة خصم رسوم بوليصات الشحن"
            description={actionDescription(false, shippingLabelDeductionSummary)}
            onClick={() => setActiveModal("shippingLabelDeduction")}
          />
        </OptionsTable>
      </OptionsSectionCard>

      <OptionsSectionCard title="العملاء" icon={<Users className="h-5 w-5" />}>
        <OptionsTable>
          <OptionsSwitchRow
            title="البريد الإلكتروني اختياري للعملاء"
            description={switchDescription("optionalRegisterEmail")}
            checked={state.switches.optionalRegisterEmail}
            onChange={(v) => updateSwitch("optionalRegisterEmail", v)}
          />
          <OptionsSwitchRow
            title="تمكين تسجيل الدخول باستخدام البريد"
            description={switchDescription("allowEmailLogin")}
            checked={state.switches.allowEmailLogin}
            onChange={(v) => updateSwitch("allowEmailLogin", v)}
          />
          <OptionsSwitchRow
            title="دمج سلة مشتريات العملاء بعد تسجيل الدخول"
            description={switchDescription("mergeOldCart")}
            checked={state.switches.mergeOldCart}
            onChange={(v) => updateSwitch("mergeOldCart", v)}
          />
          <OptionsSwitchRow
            title="تنبيه العملاء باستخدام متصفح سفاري للدفع من خلال Apple Pay"
            description={switchDescription("browserNotificationForApplePay")}
            checked={state.switches.browserNotificationForApplePay}
            onChange={(v) => updateSwitch("browserNotificationForApplePay", v)}
          />
          <OptionsActionRow
            title="طريقة تحديد عنوان العميل"
            description={actionDescription(false, customerAddressMethodSummary)}
            onClick={() => setActiveModal("customerAddressMethod")}
          />
        </OptionsTable>
      </OptionsSectionCard>

      <OptionsSectionCard title="الاسئلة و التقييمات" icon={<MessageSquare className="h-5 w-5" />}>
        <OptionsTable>
          <OptionsSwitchRow
            title="نشر الأسئلة مباشرةً دون مراجعة"
            description={switchDescription("publishComments")}
            checked={state.switches.publishComments}
            onChange={(v) => updateSwitch("publishComments", v)}
          />
          <OptionsSwitchRow
            title="تفعيل الأسئلة في الصفحات التعريفية"
            description={switchDescription("pagesFeedbackEnable")}
            checked={state.switches.pagesFeedbackEnable}
            onChange={(v) => updateSwitch("pagesFeedbackEnable", v)}
          />
          <OptionsSwitchRow
            title="تفعيل إضافة الأسئلة في المنتجات"
            description={switchDescription("productsFeedbackEnable")}
            checked={state.switches.productsFeedbackEnable}
            onChange={(v) => updateSwitch("productsFeedbackEnable", v)}
          />
          <OptionsSwitchRow
            title="منع الزوار من إضافة أسئلة"
            description={switchDescription("productsFeedbackDisableGuest")}
            checked={state.switches.productsFeedbackDisableGuest}
            onChange={(v) => updateSwitch("productsFeedbackDisableGuest", v)}
          />
        </OptionsTable>
      </OptionsSectionCard>

      <OptionsSectionCard title="الخيارات العامة" icon={<Settings2 className="h-5 w-5" />}>
        <OptionsTable>
          <OptionsActionRow
            title="تخصيص حالات حساب التقارير"
            description={actionDescription(false, reportsStatusesSummary)}
            onClick={() => setActiveModal("reportsStatuses")}
          />
        </OptionsTable>
      </OptionsSectionCard>

      <ProductPurchaseCountModal
        open={activeModal === "productPurchaseCount"}
        onClose={() => setActiveModal(null)}
        value={state.productPurchaseCount}
        categories={categoryOptions}
        onSave={(value) => {
          setState((prev) => ({ ...prev, productPurchaseCount: value }));
          setActiveModal(null);
        }}
      />

      <ProductRecommendationsModal
        open={activeModal === "productRecommendations"}
        onClose={() => setActiveModal(null)}
        value={state.productRecommendations}
        onSave={(value) => {
          setState((prev) => ({ ...prev, productRecommendations: value }));
          setActiveModal(null);
        }}
      />

      <ReceivingOrdersModal
        open={activeModal === "receivingOrders"}
        onClose={() => setActiveModal(null)}
        value={state.receivingOrders}
        onSave={(value) => {
          setState((prev) => ({ ...prev, receivingOrders: value }));
          setActiveModal(null);
        }}
      />

      <ReceivingOrdersTimesModal
        open={activeModal === "receivingOrdersTimes"}
        onClose={() => setActiveModal(null)}
        value={state.receivingOrdersTimes}
        dayLabels={dayLabels}
        onSave={(value) => {
          setState((prev) => ({ ...prev, receivingOrdersTimes: value }));
          setActiveModal(null);
        }}
      />

      <OrderNotesModal
        open={activeModal === "orderNotes"}
        onClose={() => setActiveModal(null)}
        value={state.orderNotes}
        onSave={(value) => {
          setState((prev) => ({ ...prev, orderNotes: value }));
          setActiveModal(null);
        }}
      />

      <CancelOrderModal
        open={activeModal === "cancelOrder"}
        onClose={() => setActiveModal(null)}
        value={state.cancelOrder}
        onSave={(value) => {
          setState((prev) => ({ ...prev, cancelOrder: value }));
          setActiveModal(null);
        }}
      />

      <OrderAutoCompletedStatusModal
        open={activeModal === "orderAutoCompletedStatus"}
        onClose={() => setActiveModal(null)}
        value={state.orderAutoCompletedStatus}
        productTypes={productTypes}
        onSave={(value) => {
          setState((prev) => ({ ...prev, orderAutoCompletedStatus: value }));
          setActiveModal(null);
        }}
      />

      <RestoreStockByStatusModal
        open={activeModal === "restoreStockByStatus"}
        onClose={() => setActiveModal(null)}
        value={state.restoreStockByStatus}
        statuses={orderStatuses}
        onSave={(value) => {
          setState((prev) => ({ ...prev, restoreStockByStatus: value }));
          setActiveModal(null);
        }}
      />

      <AgreementBeforeSubmitModal
        open={activeModal === "agreementBeforeSubmit"}
        onClose={() => setActiveModal(null)}
        value={state.agreementBeforeSubmit}
        onSave={(value) => {
          setState((prev) => ({ ...prev, agreementBeforeSubmit: value }));
          setActiveModal(null);
        }}
      />

      <OrderCompletionPageModal
        open={activeModal === "orderCompletionPage"}
        onClose={() => setActiveModal(null)}
        value={state.orderCompletionPage}
        onSave={(value) => {
          setState((prev) => ({ ...prev, orderCompletionPage: value }));
          setActiveModal(null);
        }}
      />

      <CustomizePackingListModal
        open={activeModal === "customizePackingList"}
        onClose={() => setActiveModal(null)}
        value={state.customizePackingList}
        onSave={(value) => {
          setState((prev) => ({ ...prev, customizePackingList: value }));
          setActiveModal(null);
        }}
      />

      <ShippingLabelDeductionModal
        open={activeModal === "shippingLabelDeduction"}
        onClose={() => setActiveModal(null)}
        value={state.shippingLabelDeduction}
        onSave={(value) => {
          setState((prev) => ({ ...prev, shippingLabelDeduction: value }));
          setActiveModal(null);
        }}
      />

      <CustomerAddressMethodModal
        open={activeModal === "customerAddressMethod"}
        onClose={() => setActiveModal(null)}
        value={state.customerAddressMethod}
        onSave={(value) => {
          setState((prev) => ({ ...prev, customerAddressMethod: value }));
          setActiveModal(null);
        }}
      />

      <ReportsStatusesModal
        open={activeModal === "reportsStatuses"}
        onClose={() => setActiveModal(null)}
        value={state.reportsStatuses}
        statuses={orderStatuses}
        onSave={(value) => {
          setState((prev) => ({ ...prev, reportsStatuses: value }));
          setActiveModal(null);
        }}
      />
    </div>
  );
}