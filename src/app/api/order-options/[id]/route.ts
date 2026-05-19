//apps/merchant/src/app/api/order-options/[id]/route.ts
import { NextResponse } from "next/server";
import { getStoreIdFromSession } from "@/lib/auth/getStoreId";
import { supabaseAdmin } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type OptionType = "text" | "number" | "choices" | "appointment";
type AppliesTo = "all" | "categories";

const OPTION_TYPES = new Set<OptionType>([
  "text",
  "number",
  "choices",
  "appointment",
]);

const APPLIES_TO = new Set<AppliesTo>(["all", "categories"]);
const STATUS = new Set(["active", "inactive", "deleted"]);

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
  const status = cleanText(body?.status);

  if (status && Object.keys(body ?? {}).length === 1) {
    if (!STATUS.has(status)) throw new Error("INVALID_STATUS");
    return {
      statusOnly: true as const,
      option: {
        status,
        updated_at: new Date().toISOString(),
      },
      categoryIds: [],
      choices: [],
    };
  }

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

  const finalStatus = STATUS.has(status) && status !== "deleted" ? status : "active";

  return {
    statusOnly: false as const,
    option: {
      type,
      name,
      description: nullableText(body?.description),
      status: finalStatus,
      is_required: Boolean(body?.is_required),
      applies_to: finalAppliesTo,
      text_size:
        type === "text" ? (textSize === "large" ? "large" : "small") : null,
      allow_multiple: type === "choices" ? Boolean(body?.allow_multiple) : false,
      price_customer:
        type === "appointment" ? numberOrNull(body?.price_customer) : null,
      metadata:
        type === "appointment" &&
        body?.metadata &&
        typeof body.metadata === "object"
          ? body.metadata
          : {},
      updated_at: new Date().toISOString(),
    },
    categoryIds,
    choices,
  };
}

async function assertOption(storeId: string, id: string) {
  const sb = supabaseAdmin();

  const { data, error } = await sb
    .from("store_order_options")
    .select("id")
    .eq("store_id", storeId)
    .eq("id", id)
    .neq("status", "deleted")
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("OPTION_NOT_FOUND");
}

async function fetchOption(storeId: string, id: string) {
  const sb = supabaseAdmin();

  const { data: option, error } = await sb
    .from("store_order_options")
    .select("*")
    .eq("store_id", storeId)
    .eq("id", id)
    .neq("status", "deleted")
    .single();

  if (error) throw error;

  const [{ data: categories, error: categoriesError }, { data: choices, error: choicesError }] =
    await Promise.all([
      sb
        .from("store_order_option_categories")
        .select("category_id")
        .eq("store_id", storeId)
        .eq("option_id", id),
      sb
        .from("store_order_option_choices")
        .select("*")
        .eq("store_id", storeId)
        .eq("option_id", id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
    ]);

  if (categoriesError) throw categoriesError;
  if (choicesError) throw choicesError;

  return {
    ...option,
    category_ids: (categories ?? []).map((item) => item.category_id),
    choices: choices ?? [],
  };
}

export async function GET(_req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const storeId = await getStoreIdFromSession();
    const data = await fetchOption(storeId, id);

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
              : message === "OPTION_NOT_FOUND"
                ? 404
                : 500,
      },
    );
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const storeId = await getStoreIdFromSession();
    const body = await req.json();
    const payload = normalizePayload(body);

    await assertOption(storeId, id);

    const sb = supabaseAdmin();

    const { error } = await sb
      .from("store_order_options")
      .update(payload.option)
      .eq("store_id", storeId)
      .eq("id", id);

    if (error) throw error;

    if (!payload.statusOnly) {
      await sb
        .from("store_order_option_categories")
        .delete()
        .eq("store_id", storeId)
        .eq("option_id", id);

      if (payload.option.applies_to === "categories") {
        const rows = payload.categoryIds.map((categoryId) => ({
          store_id: storeId,
          option_id: id,
          category_id: categoryId,
        }));

        const { error: categoryError } = await sb
          .from("store_order_option_categories")
          .insert(rows);

        if (categoryError) throw categoryError;
      }

      await sb
        .from("store_order_option_choices")
        .delete()
        .eq("store_id", storeId)
        .eq("option_id", id);

      if (payload.option.type === "choices") {
        const rows = payload.choices.map((choice) => ({
          store_id: storeId,
          option_id: id,
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
    }

    const data = await fetchOption(storeId, id);

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
              : message === "OPTION_NOT_FOUND"
                ? 404
                : message === "INVALID_TYPE" ||
                    message === "INVALID_STATUS" ||
                    message === "NAME_REQUIRED" ||
                    message === "CATEGORIES_REQUIRED" ||
                    message === "CHOICES_REQUIRED"
                  ? 400
                  : 500,
      },
    );
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const storeId = await getStoreIdFromSession();

    await assertOption(storeId, id);

    const sb = supabaseAdmin();

    const { error } = await sb
      .from("store_order_options")
      .update({
        status: "deleted",
        updated_at: new Date().toISOString(),
      })
      .eq("store_id", storeId)
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
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
              : message === "OPTION_NOT_FOUND"
                ? 404
                : 500,
      },
    );
  }
}