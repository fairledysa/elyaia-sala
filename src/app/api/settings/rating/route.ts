// FILE: apps/merchant/src/app/api/settings/rating/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getStoreIdFromSession } from "@/lib/auth/getStoreId";

const RATING_SETTINGS_SLUG = "rating_settings";

type ChannelKey = "email" | "sms";

type RatingSettingsValues = {
  publishTestimonials: boolean;
  publishRatings: boolean;
  allowAttachImages: boolean;
  allowLikes: boolean;
  showRatingSummary: boolean;
  showRecommendation: boolean;
  allowContactSupport: boolean;
  allowUpdate: boolean;
  allowUpdatePeriod: number;

  testimonialsEnabled: boolean;
  shippingEnabled: boolean;
  productsEnabled: boolean;
  allowHiddenNames: boolean;
  displayTestimonials: boolean;
  displayCustomerReviews: boolean;
  displayProductReviewsOnApp: boolean;

  orderStatuses: string[];
  thanksMessage: string;

  ratingEnabled: boolean;
  ratingHoursPeriod: number;
  channels: ChannelKey[];
  ratingMessageTitle: string;
  ratingMessage: string;
};

const DEFAULT_RATING_SETTINGS: RatingSettingsValues = {
  publishTestimonials: true,
  publishRatings: true,
  allowAttachImages: false,
  allowLikes: false,
  showRatingSummary: true,
  showRecommendation: true,
  allowContactSupport: false,
  allowUpdate: false,
  allowUpdatePeriod: 7,

  testimonialsEnabled: true,
  shippingEnabled: true,
  productsEnabled: true,
  allowHiddenNames: false,
  displayTestimonials: true,
  displayCustomerReviews: true,
  displayProductReviewsOnApp: false,

  orderStatuses: ["completed", "delivered"],
  thanksMessage: "شكراً لوقتك\nونتمنى لك تسوق ممتع",

  ratingEnabled: true,
  ratingHoursPeriod: 168,
  channels: ["email"],
  ratingMessageTitle: "نتمنى أن نعرف رأيك في الطلب",
  ratingMessage: "ياليت نعرف رأيك في الطلب من خلال الرابط: {url}",
};

const ALLOWED_ORDER_STATUSES = new Set([
  "pending",
  "completed",
  "processing",
  "shipping",
  "delivered",
  "shipped",
  "cancelled",
  "refunded",
  "failed",
]);

const ALLOWED_CHANNELS = new Set<ChannelKey>(["email", "sms"]);

function noStoreJson(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      ...(init?.headers ?? {}),
    },
  });
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asBool(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "active", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "inactive", "off"].includes(normalized)) return false;
  }

  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }

  return fallback;
}

function asNumber(value: unknown, fallback: number, max = 100000) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  if (n < 0) return fallback;
  return Math.min(Math.floor(n), max);
}

function asText(value: unknown, fallback: string, maxLength: number) {
  if (typeof value !== "string") return fallback;
  return value.slice(0, maxLength);
}

function asStatuses(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return [...fallback];

  return value
    .map((item) => String(item ?? "").trim())
    .filter((item) => ALLOWED_ORDER_STATUSES.has(item));
}

function asChannels(value: unknown, fallback: ChannelKey[]) {
  if (!Array.isArray(value)) return [...fallback];

  return value
    .map((item) => String(item ?? "").trim() as ChannelKey)
    .filter((item): item is ChannelKey => ALLOWED_CHANNELS.has(item));
}

function sanitizeSettings(raw: unknown): RatingSettingsValues {
  const input = asRecord(raw);

  return {
    publishTestimonials: asBool(
      input.publishTestimonials,
      DEFAULT_RATING_SETTINGS.publishTestimonials,
    ),
    publishRatings: asBool(
      input.publishRatings,
      DEFAULT_RATING_SETTINGS.publishRatings,
    ),
    allowAttachImages: asBool(
      input.allowAttachImages,
      DEFAULT_RATING_SETTINGS.allowAttachImages,
    ),
    allowLikes: asBool(input.allowLikes, DEFAULT_RATING_SETTINGS.allowLikes),
    showRatingSummary: asBool(
      input.showRatingSummary,
      DEFAULT_RATING_SETTINGS.showRatingSummary,
    ),
    showRecommendation: asBool(
      input.showRecommendation,
      DEFAULT_RATING_SETTINGS.showRecommendation,
    ),
    allowContactSupport: asBool(
      input.allowContactSupport,
      DEFAULT_RATING_SETTINGS.allowContactSupport,
    ),
    allowUpdate: asBool(
      input.allowUpdate,
      DEFAULT_RATING_SETTINGS.allowUpdate,
    ),
    allowUpdatePeriod: asNumber(
      input.allowUpdatePeriod,
      DEFAULT_RATING_SETTINGS.allowUpdatePeriod,
      365,
    ),

    testimonialsEnabled: asBool(
      input.testimonialsEnabled,
      DEFAULT_RATING_SETTINGS.testimonialsEnabled,
    ),
    shippingEnabled: asBool(
      input.shippingEnabled,
      DEFAULT_RATING_SETTINGS.shippingEnabled,
    ),
    productsEnabled: asBool(
      input.productsEnabled,
      DEFAULT_RATING_SETTINGS.productsEnabled,
    ),
    allowHiddenNames: asBool(
      input.allowHiddenNames,
      DEFAULT_RATING_SETTINGS.allowHiddenNames,
    ),
    displayTestimonials: asBool(
      input.displayTestimonials,
      DEFAULT_RATING_SETTINGS.displayTestimonials,
    ),
    displayCustomerReviews: asBool(
      input.displayCustomerReviews,
      DEFAULT_RATING_SETTINGS.displayCustomerReviews,
    ),
    displayProductReviewsOnApp: asBool(
      input.displayProductReviewsOnApp,
      DEFAULT_RATING_SETTINGS.displayProductReviewsOnApp,
    ),

    orderStatuses: asStatuses(
      input.orderStatuses,
      DEFAULT_RATING_SETTINGS.orderStatuses,
    ),
    thanksMessage: asText(
      input.thanksMessage,
      DEFAULT_RATING_SETTINGS.thanksMessage,
      120,
    ),

    ratingEnabled: asBool(
      input.ratingEnabled,
      DEFAULT_RATING_SETTINGS.ratingEnabled,
    ),
    ratingHoursPeriod: asNumber(
      input.ratingHoursPeriod,
      DEFAULT_RATING_SETTINGS.ratingHoursPeriod,
      8760,
    ),
    channels: asChannels(input.channels, DEFAULT_RATING_SETTINGS.channels),
    ratingMessageTitle: asText(
      input.ratingMessageTitle,
      DEFAULT_RATING_SETTINGS.ratingMessageTitle,
      120,
    ),
    ratingMessage: asText(
      input.ratingMessage,
      DEFAULT_RATING_SETTINGS.ratingMessage,
      1000,
    ),
  };
}

function errorResponse(error: unknown) {
  const msg = String((error as any)?.message ?? error ?? "UNKNOWN_ERROR");

  if (msg === "UNAUTHENTICATED") {
    return noStoreJson(
      { ok: false, error: "UNAUTHENTICATED" },
      { status: 401 },
    );
  }

  if (msg === "STORE_NOT_FOUND") {
    return noStoreJson(
      { ok: false, error: "STORE_NOT_FOUND" },
      { status: 404 },
    );
  }

  return noStoreJson({ ok: false, error: msg }, { status: 500 });
}

export async function GET() {
  try {
    const storeId = await getStoreIdFromSession();
    const sb = supabaseAdmin();

    const { data, error } = await sb
      .from("store_settings")
      .select("id,store_id,slug,type,value,updated_at")
      .eq("store_id", storeId)
      .eq("slug", RATING_SETTINGS_SLUG)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (error) {
      return noStoreJson(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    const item = data?.[0] ?? null;
    const settings = sanitizeSettings(item?.value ?? DEFAULT_RATING_SETTINGS);

    return noStoreJson({
      ok: true,
      store_id: storeId,
      item,
      settings,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const storeId = await getStoreIdFromSession();
    const sb = supabaseAdmin();

    const body = await req.json().catch(() => null);
    const rawSettings = body?.settings ?? body?.value;

    if (rawSettings === undefined) {
      return noStoreJson(
        { ok: false, error: "MISSING_SETTINGS" },
        { status: 400 },
      );
    }

    const settings = sanitizeSettings(rawSettings);
    const now = new Date().toISOString();

    const { data: existingRows, error: findError } = await sb
      .from("store_settings")
      .select("id")
      .eq("store_id", storeId)
      .eq("slug", RATING_SETTINGS_SLUG)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (findError) {
      return noStoreJson(
        { ok: false, error: findError.message },
        { status: 500 },
      );
    }

    const existing = existingRows?.[0] ?? null;

    if (existing?.id) {
      const { data, error } = await sb
        .from("store_settings")
        .update({
          type: "json",
          value: settings,
          updated_at: now,
        })
        .eq("id", existing.id)
        .select("id,store_id,slug,type,value,updated_at")
        .single();

      if (error) {
        return noStoreJson(
          { ok: false, error: error.message },
          { status: 500 },
        );
      }

      return noStoreJson({
        ok: true,
        item: data,
        settings: sanitizeSettings(data?.value),
      });
    }

    const { data, error } = await sb
      .from("store_settings")
      .insert({
        store_id: storeId,
        slug: RATING_SETTINGS_SLUG,
        type: "json",
        value: settings,
        created_at: now,
        updated_at: now,
      })
      .select("id,store_id,slug,type,value,updated_at")
      .single();

    if (error) {
      return noStoreJson(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    return noStoreJson({
      ok: true,
      item: data,
      settings: sanitizeSettings(data?.value),
    });
  } catch (error) {
    return errorResponse(error);
  }
}