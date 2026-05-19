//apps/merchant/src/app/(app)/settings/order-options/_components/OrderOptionModal.tsx
"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

export type OrderOptionType = "text" | "number" | "choices" | "appointment";
type AppliesTo = "all" | "categories";
type TextSize = "small" | "large";
type ScheduleMode = "days" | "days_times";

type DayKey =
  | "saturday"
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday";

type TimeRange = {
  from: string;
  to: string;
};

type AppointmentDay = {
  enabled: boolean;
  ranges: TimeRange[];
};

type AppointmentMetadata = {
  appointment: {
    scheduleMode: ScheduleMode;
    durationMinutes: number | null;
    preparationMinutes: number | null;
    allowMultipleBookingsPerCustomer: boolean;
    lateBookingLimitDays: number | null;
    maxBookingsPerCustomer: number | null;
    location: string | null;
    days: Record<DayKey, AppointmentDay>;
    exceptions: Array<{
      date: string;
      reason: string;
    }>;
  };
};

type ChoiceDraft = {
  id?: string;
  label: string;
  price_customer: string;
  cost: string;
  weight_kg: string;
  sort_order: number;
};

export type CategoryItem = {
  id: string;
  parent_id?: string | null;
  name: string;
  depth?: number | null;
  path?: string | null;
};

export type OrderOptionRecord = {
  id: string;
  type: OrderOptionType;
  name: string;
  description?: string | null;
  status: "active" | "inactive" | "deleted";
  is_required: boolean;
  applies_to: AppliesTo;
  text_size?: TextSize | null;
  allow_multiple: boolean;
  price_customer?: number | string | null;
  metadata?: AppointmentMetadata | Record<string, any> | null;
  sort_order: number;
  category_ids?: string[];
  choices?: Array<{
    id: string;
    label: string;
    price_customer?: number | string | null;
    cost?: number | string | null;
    weight_kg?: number | string | null;
    sort_order?: number | null;
  }>;
};

export type OrderOptionSubmitPayload = {
  type: OrderOptionType;
  name: string;
  description: string | null;
  status: "active" | "inactive";
  is_required: boolean;
  applies_to: AppliesTo;
  category_ids: string[];
  text_size: TextSize | null;
  allow_multiple: boolean;
  price_customer: string | null;
  choices: Array<{
    label: string;
    price_customer: string | null;
    cost: string | null;
    weight_kg: string | null;
    sort_order: number;
  }>;
  metadata: AppointmentMetadata | Record<string, any>;
};

type Props = {
  open: boolean;
  type: OrderOptionType | null;
  option: OrderOptionRecord | null;
  categories: CategoryItem[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: OrderOptionSubmitPayload) => void;
};

const TYPE_TITLES: Record<OrderOptionType, string> = {
  text: "إضافة حقل نصي",
  number: "إضافة حقل رقمي",
  choices: "إضافة حقل الخيارات",
  appointment: "حقل موعد",
};

const DAY_LIST: Array<{ key: DayKey; label: string }> = [
  { key: "saturday", label: "السبت" },
  { key: "sunday", label: "الأحد" },
  { key: "monday", label: "الاثنين" },
  { key: "tuesday", label: "الثلاثاء" },
  { key: "wednesday", label: "الأربعاء" },
  { key: "thursday", label: "الخميس" },
  { key: "friday", label: "الجمعة" },
];

function defaultAppointmentMetadata(): AppointmentMetadata {
  return {
    appointment: {
      scheduleMode: "days",
      durationMinutes: null,
      preparationMinutes: null,
      allowMultipleBookingsPerCustomer: false,
      lateBookingLimitDays: null,
      maxBookingsPerCustomer: null,
      location: null,
      days: {
        saturday: { enabled: false, ranges: [{ from: "09:00", to: "17:00" }] },
        sunday: { enabled: false, ranges: [{ from: "09:00", to: "17:00" }] },
        monday: { enabled: false, ranges: [{ from: "09:00", to: "17:00" }] },
        tuesday: { enabled: false, ranges: [{ from: "09:00", to: "17:00" }] },
        wednesday: { enabled: false, ranges: [{ from: "09:00", to: "17:00" }] },
        thursday: { enabled: false, ranges: [{ from: "09:00", to: "17:00" }] },
        friday: { enabled: false, ranges: [{ from: "09:00", to: "17:00" }] },
      },
      exceptions: [],
    },
  };
}

function normalizeAppointmentMetadata(value: any): AppointmentMetadata {
  const base = defaultAppointmentMetadata();

  if (!value?.appointment) return base;

  return {
    appointment: {
      ...base.appointment,
      ...value.appointment,
      days: {
        ...base.appointment.days,
        ...(value.appointment.days ?? {}),
      },
      exceptions: Array.isArray(value.appointment.exceptions)
        ? value.appointment.exceptions
        : [],
    },
  };
}

function toInput(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function emptyChoice(index: number): ChoiceDraft {
  return {
    label: "",
    price_customer: "",
    cost: "",
    weight_kg: "",
    sort_order: index,
  };
}

export default function OrderOptionModal({
  open,
  type,
  option,
  categories,
  saving,
  onClose,
  onSubmit,
}: Props) {
  const isEdit = Boolean(option?.id);
  const [tab, setTab] = useState<"data" | "options" | "schedule">("data");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [isRequired, setIsRequired] = useState(false);
  const [appliesTo, setAppliesTo] = useState<AppliesTo>("all");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);

  const [textSize, setTextSize] = useState<TextSize>("small");
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [priceCustomer, setPriceCustomer] = useState("");
  const [choices, setChoices] = useState<ChoiceDraft[]>([
    emptyChoice(0),
    emptyChoice(1),
  ]);
  const [metadata, setMetadata] = useState<AppointmentMetadata>(
    defaultAppointmentMetadata(),
  );

  useEffect(() => {
    if (!open || !type) return;

    setTab("data");

    setName(option?.name ?? "");
    setDescription(option?.description ?? "");
    setStatus(option?.status === "inactive" ? "inactive" : "active");
    setIsRequired(Boolean(option?.is_required));
    setAppliesTo(option?.applies_to === "categories" ? "categories" : "all");
    setCategoryIds(option?.category_ids ?? []);

    setTextSize(option?.text_size === "large" ? "large" : "small");
    setAllowMultiple(Boolean(option?.allow_multiple));
    setPriceCustomer(toInput(option?.price_customer));

    setChoices(
      option?.choices?.length
        ? option.choices.map((item, index) => ({
            id: item.id,
            label: item.label ?? "",
            price_customer: toInput(item.price_customer),
            cost: toInput(item.cost),
            weight_kg: toInput(item.weight_kg),
            sort_order: Number(item.sort_order ?? index),
          }))
        : [emptyChoice(0), emptyChoice(1)],
    );

    setMetadata(normalizeAppointmentMetadata(option?.metadata));
  }, [open, type, option]);

  const title = type ? TYPE_TITLES[type] : "";

  const selectedCategoriesText = useMemo(() => {
    if (categoryIds.length === 0) return "اختر التصنيفات";

    const names = categories
      .filter((category) => categoryIds.includes(category.id))
      .map((category) => category.name);

    if (names.length === 0) return `${categoryIds.length} تصنيفات مختارة`;
    if (names.length <= 2) return names.join("، ");

    return `${names.slice(0, 2).join("، ")} و ${names.length - 2} أخرى`;
  }, [categories, categoryIds]);

if (!open || !type) return null;

const currentType: OrderOptionType = type;

  function submit(e: FormEvent) {
    e.preventDefault();

    const cleanName = name.trim();
    if (!cleanName) {
      window.alert("اسم الحقل مطلوب");
      return;
    }

    if (appliesTo === "categories" && categoryIds.length === 0) {
      window.alert("اختر تصنيف واحد على الأقل");
      return;
    }

    const cleanChoices = choices
      .map((choice, index) => ({
        label: choice.label.trim(),
        price_customer: choice.price_customer.trim() || null,
        cost: choice.cost.trim() || null,
        weight_kg: choice.weight_kg.trim() || null,
        sort_order: index,
      }))
      .filter((choice) => choice.label);

 if (currentType === "choices" && cleanChoices.length === 0) {
  window.alert("أضف خيار واحد على الأقل");
  return;
}

onSubmit({
  type: currentType,
  name: cleanName,
  description: description.trim() || null,
  status,
  is_required: isRequired,
  applies_to: appliesTo,
  category_ids: appliesTo === "categories" ? categoryIds : [],
  text_size: currentType === "text" ? textSize : null,
  allow_multiple: currentType === "choices" ? allowMultiple : false,
  price_customer:
    currentType === "appointment" ? priceCustomer.trim() || null : null,
  choices: currentType === "choices" ? cleanChoices : [],
  metadata: currentType === "appointment" ? metadata : {},
});
  }

  return (
    <div className="adm-order-options-modal" role="dialog" aria-modal="true">
      <button
        type="button"
        className="adm-order-options-modal__backdrop"
        onClick={onClose}
        aria-label="إغلاق"
      />

      <form className="adm-order-options-modal__panel" onSubmit={submit}>
        <div className="adm-order-options-modal__head">
          <div>
            <h2>{isEdit ? title.replace("إضافة ", "تعديل ") : title}</h2>
            <p>اضبط بيانات الحقل كما سيظهر للعميل.</p>
          </div>

          <button
            type="button"
            className="adm-order-options-modal__close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {(type === "choices" || type === "appointment") && (
          <div className="adm-order-options-tabs">
            <button
              type="button"
              className={tab === "data" ? "is-active" : ""}
              onClick={() => setTab("data")}
            >
              بيانات الحقل
            </button>

            {type === "choices" ? (
              <button
                type="button"
                className={tab === "options" ? "is-active" : ""}
                onClick={() => setTab("options")}
              >
                الخيارات
              </button>
            ) : null}

            {type === "appointment" ? (
              <button
                type="button"
                className={tab === "schedule" ? "is-active" : ""}
                onClick={() => setTab("schedule")}
              >
                جدولة الحجوزات
              </button>
            ) : null}
          </div>
        )}

        <div className="adm-order-options-modal__body">
          {tab === "data" ? (
            <div className="adm-form adm-form--lg">
              <Field label="اسم الحقل">
                <input
                  className="adm-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: بطاقة هدية"
                />
              </Field>

              {type !== "appointment" ? (
                <Field label="وصف توضيحي اختياري">
                  <textarea
                    className="adm-textarea"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="اكتب وصفًا يظهر للعميل تحت اسم الحقل"
                  />
                </Field>
              ) : null}

              {type === "text" ? (
                <Field label="حجم الحقل النصي">
                  <div className="adm-order-options-radioGrid">
                    <RadioCard
                      checked={textSize === "small"}
                      title="حقل نصي صغير"
                      onClick={() => setTextSize("small")}
                    />
                    <RadioCard
                      checked={textSize === "large"}
                      title="حقل نصي كبير"
                      onClick={() => setTextSize("large")}
                    />
                  </div>
                </Field>
              ) : null}

              {type === "appointment" ? (
                <Field label="سعر حجز الموعد">
                  <input
                    className="adm-input adm-input--ltr"
                    value={priceCustomer}
                    onChange={(e) => setPriceCustomer(e.target.value)}
                    inputMode="decimal"
                    placeholder="0"
                  />
                </Field>
              ) : null}

              <ProductScope
                appliesTo={appliesTo}
                setAppliesTo={setAppliesTo}
                categories={categories}
                categoryIds={categoryIds}
                setCategoryIds={setCategoryIds}
                selectedText={selectedCategoriesText}
              />

              {type === "choices" ? (
                <ToggleLine
                  checked={allowMultiple}
                  onChange={setAllowMultiple}
                  title="تمكين العميل من اختيار أكثر من خيار واحد"
                />
              ) : null}

              <ToggleLine
                checked={isRequired}
                onChange={setIsRequired}
                title="تعيين كحقل مطلوب"
                desc="اجعل الحقل يظهر في سلة العميل كحقل مطلوب يجب تعبئته قبل إتمام الطلب."
              />

              <ToggleLine
                checked={status === "active"}
                onChange={(checked) => setStatus(checked ? "active" : "inactive")}
                title="تفعيل الحقل"
                desc="عند التعطيل لن يظهر هذا الحقل للعميل."
              />
            </div>
          ) : null}

          {type === "choices" && tab === "options" ? (
            <ChoicesEditor choices={choices} setChoices={setChoices} />
          ) : null}

          {type === "appointment" && tab === "schedule" ? (
            <ScheduleEditor metadata={metadata} setMetadata={setMetadata} />
          ) : null}
        </div>

        <div className="adm-order-options-modal__footer">
          <button
            type="button"
            className="adm-btn adm-btn--secondary"
            onClick={onClose}
            disabled={saving}
          >
            إغلاق
          </button>

          <button
            type="submit"
            className="adm-btn adm-btn--primary"
            disabled={saving}
          >
            {saving ? "جاري الحفظ..." : "حفظ"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="adm-field">
      <span className="adm-field__label">{label}</span>
      {children}
    </label>
  );
}

function RadioCard({
  checked,
  title,
  desc,
  onClick,
}: {
  checked: boolean;
  title: string;
  desc?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={[
        "adm-order-options-radioCard",
        checked ? "is-active" : "",
      ].join(" ")}
      onClick={onClick}
    >
      <span className="adm-order-options-radioCard__dot" />
      <span>
        <strong>{title}</strong>
        {desc ? <small>{desc}</small> : null}
      </span>
    </button>
  );
}

function ToggleLine({
  checked,
  onChange,
  title,
  desc,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  desc?: string;
}) {
  return (
    <label className="adm-order-options-toggleLine">
      <span>
        <strong>{title}</strong>
        {desc ? <small>{desc}</small> : null}
      </span>

      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

function ProductScope({
  appliesTo,
  setAppliesTo,
  categories,
  categoryIds,
  setCategoryIds,
  selectedText,
}: {
  appliesTo: AppliesTo;
  setAppliesTo: (value: AppliesTo) => void;
  categories: CategoryItem[];
  categoryIds: string[];
  setCategoryIds: (value: string[]) => void;
  selectedText: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const search = q.trim().toLowerCase();
    if (!search) return categories;

    return categories.filter((category) =>
      category.name.toLowerCase().includes(search),
    );
  }, [categories, q]);

  function toggleCategory(id: string) {
    if (categoryIds.includes(id)) {
      setCategoryIds(categoryIds.filter((item) => item !== id));
    } else {
      setCategoryIds([...categoryIds, id]);
    }
  }

  return (
    <div className="adm-field">
      <span className="adm-field__label">تخصيص المنتجات</span>

      <div className="adm-order-options-radioGrid">
        <RadioCard
          checked={appliesTo === "all"}
          title="كل المنتجات"
          onClick={() => setAppliesTo("all")}
        />
        <RadioCard
          checked={appliesTo === "categories"}
          title="تصنيفات مختارة"
          onClick={() => setAppliesTo("categories")}
        />
      </div>

      {appliesTo === "categories" ? (
        <div className="adm-order-options-categoryPicker">
          <button
            type="button"
            className="adm-order-options-categoryPicker__button"
            onClick={() => setOpen((prev) => !prev)}
          >
            <span>{selectedText}</span>
            <span>⌄</span>
          </button>

          {open ? (
            <div className="adm-order-options-categoryPicker__panel">
              <input
                className="adm-input"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="بحث في التصنيفات"
              />

              <div className="adm-order-options-categoryPicker__list">
                {filtered.length === 0 ? (
                  <div className="adm-order-options-categoryPicker__empty">
                    لا توجد تصنيفات مطابقة.
                  </div>
                ) : (
                  filtered.map((category) => (
                    <label
                      key={category.id}
                      className="adm-order-options-categoryPicker__item"
                    >
                      <input
                        type="checkbox"
                        checked={categoryIds.includes(category.id)}
                        onChange={() => toggleCategory(category.id)}
                      />
                      <span>{category.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ChoicesEditor({
  choices,
  setChoices,
}: {
  choices: ChoiceDraft[];
  setChoices: (choices: ChoiceDraft[]) => void;
}) {
  function updateChoice(index: number, key: keyof ChoiceDraft, value: string) {
    setChoices(
      choices.map((choice, i) =>
        i === index ? { ...choice, [key]: value } : choice,
      ),
    );
  }

  function removeChoice(index: number) {
    setChoices(choices.filter((_, i) => i !== index));
  }

  function addChoice() {
    setChoices([...choices, emptyChoice(choices.length)]);
  }

  return (
    <div className="adm-order-options-choices">
      <div className="adm-order-options-choices__head">
        <h3>الخيارات</h3>
        <button
          type="button"
          className="adm-btn adm-btn--soft adm-btn--sm"
          onClick={addChoice}
        >
          إضافة خيار جديد
        </button>
      </div>

      <div className="adm-order-options-choices__table">
        <div className="adm-order-options-choices__labels">
          <span>اسم الخيار</span>
          <span>السعر اختياري</span>
          <span>التكلفة اختياري</span>
          <span>الوزن اختياري</span>
          <span />
        </div>

        {choices.map((choice, index) => (
          <div key={index} className="adm-order-options-choices__row">
            <span className="adm-order-options-choices__drag">⋮⋮</span>

            <input
              className="adm-input"
              value={choice.label}
              onChange={(e) => updateChoice(index, "label", e.target.value)}
              placeholder="اسم الخيار"
            />

            <input
              className="adm-input adm-input--ltr"
              value={choice.price_customer}
              onChange={(e) =>
                updateChoice(index, "price_customer", e.target.value)
              }
              placeholder="0"
              inputMode="decimal"
            />

            <input
              className="adm-input adm-input--ltr"
              value={choice.cost}
              onChange={(e) => updateChoice(index, "cost", e.target.value)}
              placeholder="0"
              inputMode="decimal"
            />

            <input
              className="adm-input adm-input--ltr"
              value={choice.weight_kg}
              onChange={(e) => updateChoice(index, "weight_kg", e.target.value)}
              placeholder="0"
              inputMode="decimal"
            />

            <button
              type="button"
              className="adm-icon-btn adm-icon-btn--danger"
              onClick={() => removeChoice(index)}
              disabled={choices.length <= 1}
              aria-label="حذف"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScheduleEditor({
  metadata,
  setMetadata,
}: {
  metadata: AppointmentMetadata;
  setMetadata: (value: AppointmentMetadata) => void;
}) {
  const appointment = metadata.appointment;
  const isDaysTimes = appointment.scheduleMode === "days_times";

  function patchAppointment(
    patch: Partial<AppointmentMetadata["appointment"]>,
  ) {
    setMetadata({
      appointment: {
        ...appointment,
        ...patch,
      },
    });
  }

  function patchDay(day: DayKey, patch: Partial<AppointmentDay>) {
    patchAppointment({
      days: {
        ...appointment.days,
        [day]: {
          ...appointment.days[day],
          ...patch,
        },
      },
    });
  }

  function updateRange(
    day: DayKey,
    index: number,
    key: keyof TimeRange,
    value: string,
  ) {
    const ranges = appointment.days[day].ranges.map((range, i) =>
      i === index ? { ...range, [key]: value } : range,
    );

    patchDay(day, { ranges });
  }

  function addRange(day: DayKey) {
    patchDay(day, {
      ranges: [...appointment.days[day].ranges, { from: "09:00", to: "17:00" }],
    });
  }

  function removeRange(day: DayKey, index: number) {
    const ranges = appointment.days[day].ranges.filter((_, i) => i !== index);
    patchDay(day, { ranges: ranges.length ? ranges : [{ from: "09:00", to: "17:00" }] });
  }

  function addException() {
    patchAppointment({
      exceptions: [
        ...appointment.exceptions,
        {
          date: "",
          reason: "",
        },
      ],
    });
  }

  function updateException(index: number, key: "date" | "reason", value: string) {
    patchAppointment({
      exceptions: appointment.exceptions.map((item, i) =>
        i === index ? { ...item, [key]: value } : item,
      ),
    });
  }

  function removeException(index: number) {
    patchAppointment({
      exceptions: appointment.exceptions.filter((_, i) => i !== index),
    });
  }

  return (
    <div className="adm-form adm-form--lg">
      <Field label="نظام جدولة الحجوزات">
        <div className="adm-order-options-radioGrid">
          <RadioCard
            checked={appointment.scheduleMode === "days"}
            title="الأيام"
            onClick={() => patchAppointment({ scheduleMode: "days" })}
          />
          <RadioCard
            checked={appointment.scheduleMode === "days_times"}
            title="الأيام والأوقات"
            onClick={() => patchAppointment({ scheduleMode: "days_times" })}
          />
        </div>
      </Field>

      {isDaysTimes ? (
        <div className="adm-form__grid2">
          <Field label="مدة الموعد">
            <div className="adm-order-options-unitInput">
              <input
                className="adm-input adm-input--ltr"
                value={toInput(appointment.durationMinutes)}
                onChange={(e) =>
                  patchAppointment({
                    durationMinutes: e.target.value
                      ? Number(e.target.value)
                      : null,
                  })
                }
                inputMode="numeric"
                placeholder="60"
              />
              <span>دقيقة</span>
            </div>
          </Field>

          <Field label="وقت التجهيز">
            <div className="adm-order-options-unitInput">
              <input
                className="adm-input adm-input--ltr"
                value={toInput(appointment.preparationMinutes)}
                onChange={(e) =>
                  patchAppointment({
                    preparationMinutes: e.target.value
                      ? Number(e.target.value)
                      : null,
                  })
                }
                inputMode="numeric"
                placeholder="30"
              />
              <span>دقيقة</span>
            </div>
          </Field>
        </div>
      ) : null}

      <ToggleLine
        checked={appointment.allowMultipleBookingsPerCustomer}
        onChange={(checked) =>
          patchAppointment({ allowMultipleBookingsPerCustomer: checked })
        }
        title="حجز عدة مواعيد لنفس العميل"
      />

      <div className="adm-form__grid2">
        <Field label="الحد من الحجوزات المتأخرة">
          <input
            className="adm-input adm-input--ltr"
            value={toInput(appointment.lateBookingLimitDays)}
            onChange={(e) =>
              patchAppointment({
                lateBookingLimitDays: e.target.value
                  ? Number(e.target.value)
                  : null,
              })
            }
            inputMode="numeric"
            placeholder="مثال: 2"
          />
        </Field>

        <Field label="الحد الأعلى للحجوزات للعميل الواحد">
          <input
            className="adm-input adm-input--ltr"
            value={toInput(appointment.maxBookingsPerCustomer)}
            onChange={(e) =>
              patchAppointment({
                maxBookingsPerCustomer: e.target.value
                  ? Number(e.target.value)
                  : null,
              })
            }
            inputMode="numeric"
            placeholder="مثال: 1"
          />
        </Field>
      </div>

      <Field label="موقع">
        <input
          className="adm-input"
          value={appointment.location ?? ""}
          onChange={(e) =>
            patchAppointment({ location: e.target.value.trim() || null })
          }
          placeholder="مثال: فرع الرياض"
        />
      </Field>

      <div className="adm-order-options-days">
        <div className="adm-order-options-subhead">
          <h3>حدد الأيام المتاحة للحجز</h3>
        </div>

        {DAY_LIST.map((day) => {
          const dayValue = appointment.days[day.key];

          return (
            <div key={day.key} className="adm-order-options-dayRow">
              <div className="adm-order-options-dayRow__top">
                <label className="adm-order-options-dayRow__switch">
                  <input
                    type="checkbox"
                    checked={dayValue.enabled}
                    onChange={(e) =>
                      patchDay(day.key, { enabled: e.target.checked })
                    }
                  />
                  <span>{day.label}</span>
                </label>

                {isDaysTimes && dayValue.enabled ? (
                  <button
                    type="button"
                    className="adm-btn adm-btn--soft adm-btn--sm"
                    onClick={() => addRange(day.key)}
                  >
                    +
                  </button>
                ) : null}
              </div>

              {isDaysTimes && dayValue.enabled ? (
                <div className="adm-order-options-ranges">
                  {dayValue.ranges.map((range, index) => (
                    <div key={index} className="adm-order-options-range">
                      <label>
                        <span>من</span>
                        <input
                          type="time"
                          className="adm-input adm-input--ltr"
                          value={range.from}
                          onChange={(e) =>
                            updateRange(day.key, index, "from", e.target.value)
                          }
                        />
                      </label>

                      <label>
                        <span>إلى</span>
                        <input
                          type="time"
                          className="adm-input adm-input--ltr"
                          value={range.to}
                          onChange={(e) =>
                            updateRange(day.key, index, "to", e.target.value)
                          }
                        />
                      </label>

                      <button
                        type="button"
                        className="adm-icon-btn adm-icon-btn--danger"
                        onClick={() => removeRange(day.key, index)}
                        aria-label="حذف الفترة"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="adm-order-options-exceptions">
        <div className="adm-order-options-subhead">
          <h3>استثناءات الحجز</h3>
          <button
            type="button"
            className="adm-btn adm-btn--secondary adm-btn--sm"
            onClick={addException}
          >
            إضافة
          </button>
        </div>

        {appointment.exceptions.length === 0 ? (
          <div className="adm-empty">لا توجد استثناءات حجز.</div>
        ) : (
          <div className="adm-order-options-exceptions__list">
            {appointment.exceptions.map((item, index) => (
              <div key={index} className="adm-order-options-exception">
                <input
                  type="date"
                  className="adm-input adm-input--ltr"
                  value={item.date}
                  onChange={(e) =>
                    updateException(index, "date", e.target.value)
                  }
                />

                <input
                  className="adm-input"
                  value={item.reason}
                  onChange={(e) =>
                    updateException(index, "reason", e.target.value)
                  }
                  placeholder="سبب الاستثناء"
                />

                <button
                  type="button"
                  className="adm-icon-btn adm-icon-btn--danger"
                  onClick={() => removeException(index)}
                  aria-label="حذف"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}