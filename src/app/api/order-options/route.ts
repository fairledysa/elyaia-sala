//apps/merchant/src/app/api/order-options/route.ts
import { NextResponse } from "next/server";
import { getStoreIdFromSession } from "@/lib/auth/getStoreId";
import { supabaseAdmin } from "@/lib/supabase/admin";

type OptionType = "text" | "number" | "choices" | "appointment";
type AppliesTo = "all" | "categories";

const OPTION_TYPES = new Set<OptionType>([
  "text",
  "number",
  "choices",
  "appointment",
]);

const APPLIES_TO = new Set<AppliesTo>(["all", "categories"]);

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function nullableText(value: unknown) {
  const text = cleanText(value);
  return text ? text : null;
}

function numberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeCategoryIds(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);
}

function defaultAppointmentMetadata() {
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

function normalizeChoices(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item: any, index) => ({
      label: cleanText(item?.label),
      price_customer: numberOrNull(item?.price_customer),
      cost: numberOrNull(item?.cost),
      weight_kg: numberOrNull(item?.weight_kg),
      sort_order: Number.isFinite(Number(item?.sort_order))
        ? Number(item.sort_order)
        : index,
    }))
    .filter((item) => item.label);
}

function normalizePayload(body: any) {
  const type = cleanText(body?.type) as OptionType;

  if (!OPTION_TYPES.has(type)) {
    throw new Error("INVALID_TYPE");
  }

  const name = cleanText(body?.name);
  if (!name) {
    throw new Error("NAME_REQUIRED");
  }

  const appliesTo = cleanText(body?.applies_to) as AppliesTo;
  const finalAppliesTo = APPLIES_TO.has(appliesTo) ? appliesTo : "all";

  const categoryIds = normalizeCategoryIds(body?.category_ids);

  if (finalAppliesTo === "categories" && categoryIds.length === 0) {
    throw new Error("CATEGORIES_REQUIRED");
  }

  const textSize = cleanText(body?.text_size);
  const choices = normalizeChoices(body?.choices);

  if (type === "choices" && choices.length === 0) {
    throw new Error("CHOICES_REQUIRED");
  }

  const metadata =
    type === "appointment"
      ? body?.metadata && typeof body.metadata === "object"
        ? body.metadata
        : defaultAppointmentMetadata()
      : {};

  return {
    option: {
      type,
      name,
      description: nullableText(body?.description),
      status: cleanText(body?.status) === "inactive" ? "inactive" : "active",
      is_required: Boolean(body?.is_required),
      applies_to: finalAppliesTo,
      text_size:
        type === "text" ? (textSize === "large" ? "large" : "small") : null,
      allow_multiple: type === "choices" ? Boolean(body?.allow_multiple) : false,
      price_customer:
        type === "appointment" ? numberOrNull(body?.price_customer) : null,
      metadata,
    },
    categoryIds,
    choices,
  };
}

async function fetchOptions(storeId: string) {
  const sb = supabaseAdmin();

  const { data: options, error } = await sb
    .from("store_order_options")
    .select("*")
    .eq("store_id", storeId)
    .neq("status", "deleted")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;

  const optionIds = (options ?? []).map((item) => item.id);

  if (optionIds.length === 0) {
    return [];
  }

  const [{ data: categories, error: categoriesError }, { data: choices, error: choicesError }] =
    await Promise.all([
      sb
        .from("store_order_option_categories")
        .select("option_id, category_id")
        .eq("store_id", storeId)
        .in("option_id", optionIds),
      sb
        .from("store_order_option_choices")
        .select("*")
        .eq("store_id", storeId)
        .in("option_id", optionIds)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
    ]);

  if (categoriesError) throw categoriesError;
  if (choicesError) throw choicesError;

  const categoryMap = new Map<string, string[]>();
  for (const row of categories ?? []) {
    const list = categoryMap.get(row.option_id) ?? [];
    list.push(row.category_id);
    categoryMap.set(row.option_id, list);
  }

  const choicesMap = new Map<string, any[]>();
  for (const row of choices ?? []) {
    const list = choicesMap.get(row.option_id) ?? [];
    list.push(row);
    choicesMap.set(row.option_id, list);
  }

  return (options ?? []).map((item) => ({
    ...item,
    category_ids: categoryMap.get(item.id) ?? [],
    choices: choicesMap.get(item.id) ?? [],
  }));
}

async function getNextSortOrder(storeId: string) {
  const sb = supabaseAdmin();

  const { data } = await sb
    .from("store_order_options")
    .select("sort_order")
    .eq("store_id", storeId)
    .neq("status", "deleted")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  return Number(data?.sort_order ?? -1) + 1;
}

export async function GET() {
  try {
    const storeId = await getStoreIdFromSession();
    const data = await fetchOptions(storeId);

    return NextResponse.json({ data });
  } catch (e: any) {
    const message = e?.message ?? "Unknown error";

    return NextResponse.json(
      { error: message },
      {
        status:
          message === "UNAUTHENTICATED"
            ? 401
            : message === "STORE_NOT_FOUND"
              ? 403
              : 500,
      },
    );
  }
}

export async function POST(req: Request) {
  try {
    const storeId = await getStoreIdFromSession();
    const body = await req.json();

    const sb = supabaseAdmin();
    const payload = normalizePayload(body);
    const sortOrder = await getNextSortOrder(storeId);

    const { data: option, error } = await sb
      .from("store_order_options")
      .insert({
        ...payload.option,
        store_id: storeId,
        sort_order: sortOrder,
      })
      .select("*")
      .single();

    if (error) throw error;

    if (payload.option.applies_to === "categories") {
      const rows = payload.categoryIds.map((categoryId) => ({
        store_id: storeId,
        option_id: option.id,
        category_id: categoryId,
      }));

      const { error: categoryError } = await sb
        .from("store_order_option_categories")
        .insert(rows);

      if (categoryError) throw categoryError;
    }

    if (payload.option.type === "choices") {
      const rows = payload.choices.map((choice) => ({
        store_id: storeId,
        option_id: option.id,
        label: choice.label,
        price_customer: choice.price_customer,
        cost: choice.cost,
        weight_kg: choice.weight_kg,
        sort_order: choice.sort_order,
      }));

      const { error: choicesError } = await sb
        .from("store_order_option_choices")
        .insert(rows);

      if (choicesError) throw choicesError;
    }

    const data = await fetchOptions(storeId);
    const created = data.find((item: any) => item.id === option.id);

    return NextResponse.json({ data: created ?? option }, { status: 201 });
  } catch (e: any) {
    const message = e?.message ?? "Unknown error";

    return NextResponse.json(
      { error: message },
      {
        status:
          message === "UNAUTHENTICATED"
            ? 401
            : message === "STORE_NOT_FOUND"
              ? 403
              : message === "INVALID_TYPE" ||
                  message === "NAME_REQUIRED" ||
                  message === "CATEGORIES_REQUIRED" ||
                  message === "CHOICES_REQUIRED"
                ? 400
                : 500,
      },
    );
  }
}