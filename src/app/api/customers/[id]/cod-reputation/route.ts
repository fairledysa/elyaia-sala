import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const REASON_LABELS: Record<string, string> = {
  no_response: "العميل لا يجيب عند التواصل",
  not_serious_payment: "العميل غير جاد في الدفع",
  not_serious_receiving: "العميل غير جاد في استلام الطلب",
  other: "أخرى",
};

const ALLOWED_REASONS = new Set(Object.keys(REASON_LABELS));

function s(value: unknown) {
  return String(value ?? "").trim();
}

function n(value: unknown, fallback = 0) {
  const num = Number(value ?? fallback);
  return Number.isFinite(num) ? num : fallback;
}

function ok(value: any) {
  return NextResponse.json(
    { ok: true, value },
    { headers: { "Cache-Control": "no-store" } },
  );
}

function fail(error: string, status = 500, extra?: any) {
  return NextResponse.json(
    { ok: false, error, ...(extra ? { extra } : {}) },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function reasonText(reasonCode?: string | null, reasonNote?: string | null) {
  const code = s(reasonCode);
  const note = s(reasonNote);

  if (code === "other" && note) return note;

  return REASON_LABELS[code] || "سجل غير محدد";
}

async function resolveStoreContext() {
  const sb = await supabaseServer();

  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user?.id) {
    return {
      user: null,
      storeId: null,
      storeUserId: null,
      error: "UNAUTHENTICATED",
      status: 401,
    };
  }

  const { data, error } = await sb
    .from("store_users")
    .select("id,store_id")
    .eq("auth_user_id", user.id)
    .single();

  if (error || !data?.store_id) {
    return {
      user,
      storeId: null,
      storeUserId: null,
      error: "NO_STORE",
      status: 400,
    };
  }

  return {
    user,
    storeId: String(data.store_id),
    storeUserId: String(data.id),
    error: null,
    status: 200,
  };
}

async function assertCustomerBelongsToStore(args: {
  admin: any;
  storeId: string;
  customerId: string;
}) {
  const { admin, storeId, customerId } = args;

  const { data, error } = await admin
    .from("store_customers")
    .select("store_id,customer_id")
    .eq("store_id", storeId)
    .eq("customer_id", customerId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return Boolean(data?.customer_id);
}

async function assertOrderBelongsToCustomer(args: {
  admin: any;
  storeId: string;
  customerId: string;
  orderId: string;
}) {
  const { admin, storeId, customerId, orderId } = args;

  if (!orderId) return true;

  const { data, error } = await admin
    .from("orders")
    .select("id")
    .eq("id", orderId)
    .eq("store_id", storeId)
    .eq("customer_id", customerId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return Boolean(data?.id);
}

async function loadCodReputation(args: {
  admin: any;
  storeId: string;
  customerId: string;
}) {
  const { admin, storeId, customerId } = args;

  const [settingsR, recordsR] = await Promise.all([
    admin
      .from("store_cod_restrictions")
      .select("block_untrusted_customers,untrusted_min_store_count")
      .eq("store_id", storeId)
      .maybeSingle(),

    admin
      .from("customer_reputation_records")
      .select(
        [
          "id",
          "store_id",
          "customer_id",
          "order_id",
          "reason_code",
          "reason_note",
          "status",
          "created_at",
          "updated_at",
        ].join(","),
      )
      .eq("customer_id", customerId)
      .eq("status", "active")
      .order("created_at", { ascending: false }),
  ]);

  if (settingsR.error && settingsR.error.code !== "PGRST116") {
    throw new Error(settingsR.error.message);
  }

  if (recordsR.error) {
    throw new Error(recordsR.error.message);
  }

  const records = Array.isArray(recordsR.data) ? recordsR.data : [];

  const storeIds = Array.from(
    new Set(records.map((row: any) => s(row.store_id)).filter(Boolean)),
  );

  const currentStoreRecord =
    records.find((row: any) => s(row.store_id) === storeId) || null;

  const latestRecord = records[0] || null;

  const reasonsMap = new Map<
    string,
    {
      reason_code: string;
      reason_text: string;
      count: number;
    }
  >();

  for (const row of records) {
    const code = s(row.reason_code) || "other";
    const key = code;

    const old = reasonsMap.get(key);

    reasonsMap.set(key, {
      reason_code: code,
      reason_text: reasonText(code, row.reason_note),
      count: (old?.count || 0) + 1,
    });
  }

  const threshold = Math.max(
    1,
    Math.floor(n(settingsR.data?.untrusted_min_store_count, 3)),
  );

  const activeStoreCount = storeIds.length;
  const isUntrusted = activeStoreCount >= threshold;
  const blockUntrustedCustomers = Boolean(
    settingsR.data?.block_untrusted_customers,
  );

  return {
    settings: {
      block_untrusted_customers: blockUntrustedCustomers,
      untrusted_min_store_count: threshold,
    },

    current_store_record: currentStoreRecord
      ? {
          id: String(currentStoreRecord.id),
          order_id: currentStoreRecord.order_id
            ? String(currentStoreRecord.order_id)
            : null,
          reason_code: s(currentStoreRecord.reason_code),
          reason_text: reasonText(
            currentStoreRecord.reason_code,
            currentStoreRecord.reason_note,
          ),
          reason_note: s(currentStoreRecord.reason_note) || null,
          created_at: currentStoreRecord.created_at ?? null,
          updated_at: currentStoreRecord.updated_at ?? null,
        }
      : null,

    summary: {
      active_record_count: records.length,
      active_store_count: activeStoreCount,
      threshold,
      is_untrusted: isUntrusted,
      should_block_cod: blockUntrustedCustomers && isUntrusted,

      latest_reason_code: latestRecord ? s(latestRecord.reason_code) : null,
      latest_reason_text: latestRecord
        ? reasonText(latestRecord.reason_code, latestRecord.reason_note)
        : null,
      latest_reason_note: latestRecord ? s(latestRecord.reason_note) || null : null,
      latest_at: latestRecord?.created_at ?? null,

      reasons: Array.from(reasonsMap.values()),
    },
  };
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const customerId = s(id);

    if (!customerId) return fail("CUSTOMER_ID_REQUIRED", 400);

    const auth = await resolveStoreContext();

    if (!auth.storeId) {
      return fail(auth.error || "UNAUTHENTICATED", auth.status || 401);
    }

    const admin = supabaseAdmin();

    const belongs = await assertCustomerBelongsToStore({
      admin,
      storeId: auth.storeId,
      customerId,
    });

    if (!belongs) {
      return fail("CUSTOMER_NOT_FOUND", 404);
    }

    const value = await loadCodReputation({
      admin,
      storeId: auth.storeId,
      customerId,
    });

    return ok(value);
  } catch (e: any) {
    return fail(e?.message || "FAILED_TO_LOAD_CUSTOMER_REPUTATION", 500);
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const customerId = s(id);

    if (!customerId) return fail("CUSTOMER_ID_REQUIRED", 400);

    const auth = await resolveStoreContext();

    if (!auth.storeId || !auth.storeUserId) {
      return fail(auth.error || "UNAUTHENTICATED", auth.status || 401);
    }

    const body = await req.json().catch(() => ({}));

    const reasonCode = s(body?.reason_code);
    const reasonNote = s(body?.reason_note);
    const orderId = s(body?.order_id);

    if (!ALLOWED_REASONS.has(reasonCode)) {
      return fail("INVALID_REASON_CODE", 400);
    }

    if (reasonCode === "other" && !reasonNote) {
      return fail("REASON_NOTE_REQUIRED", 400);
    }

    const admin = supabaseAdmin();

    const belongs = await assertCustomerBelongsToStore({
      admin,
      storeId: auth.storeId,
      customerId,
    });

    if (!belongs) {
      return fail("CUSTOMER_NOT_FOUND", 404);
    }

    const orderOk = await assertOrderBelongsToCustomer({
      admin,
      storeId: auth.storeId,
      customerId,
      orderId,
    });

    if (!orderOk) {
      return fail("ORDER_NOT_FOUND_FOR_CUSTOMER", 404);
    }

    const existingR = await admin
      .from("customer_reputation_records")
      .select("id")
      .eq("store_id", auth.storeId)
      .eq("customer_id", customerId)
      .eq("status", "active")
      .maybeSingle();

    if (existingR.error && existingR.error.code !== "PGRST116") {
      throw new Error(existingR.error.message);
    }

    const payload = {
      store_id: auth.storeId,
      customer_id: customerId,
      order_id: orderId || null,
      reason_code: reasonCode,
      reason_note: reasonNote || null,
      status: "active",
      updated_by_store_user_id: auth.storeUserId,
      updated_at: new Date().toISOString(),
    };

    let saved: any = null;

    if (existingR.data?.id) {
      const { data, error } = await admin
        .from("customer_reputation_records")
        .update(payload)
        .eq("id", existingR.data.id)
        .eq("store_id", auth.storeId)
        .select(
          "id,store_id,customer_id,order_id,reason_code,reason_note,status,created_at,updated_at",
        )
        .single();

      if (error) throw new Error(error.message);
      saved = data;
    } else {
      const { data, error } = await admin
        .from("customer_reputation_records")
        .insert({
          ...payload,
          created_by_store_user_id: auth.storeUserId,
        })
        .select(
          "id,store_id,customer_id,order_id,reason_code,reason_note,status,created_at,updated_at",
        )
        .single();

      if (error) throw new Error(error.message);
      saved = data;
    }

    const reputation = await loadCodReputation({
      admin,
      storeId: auth.storeId,
      customerId,
    });

    return ok({
      saved: true,
      record: saved
        ? {
            id: String(saved.id),
            order_id: saved.order_id ? String(saved.order_id) : null,
            reason_code: s(saved.reason_code),
            reason_text: reasonText(saved.reason_code, saved.reason_note),
            reason_note: s(saved.reason_note) || null,
            status: s(saved.status),
            created_at: saved.created_at ?? null,
            updated_at: saved.updated_at ?? null,
          }
        : null,
      reputation,
    });
  } catch (e: any) {
    return fail(e?.message || "FAILED_TO_SAVE_CUSTOMER_REPUTATION", 500);
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const customerId = s(id);

    if (!customerId) return fail("CUSTOMER_ID_REQUIRED", 400);

    const auth = await resolveStoreContext();

    if (!auth.storeId || !auth.storeUserId) {
      return fail(auth.error || "UNAUTHENTICATED", auth.status || 401);
    }

    const body = await req.json().catch(() => ({}));
    const action = s(body?.action) || "revoke";
    const recordId = s(body?.id);

    if (action !== "revoke") {
      return fail("INVALID_ACTION", 400);
    }

    const admin = supabaseAdmin();

    const belongs = await assertCustomerBelongsToStore({
      admin,
      storeId: auth.storeId,
      customerId,
    });

    if (!belongs) {
      return fail("CUSTOMER_NOT_FOUND", 404);
    }

    let query = admin
      .from("customer_reputation_records")
      .update({
        status: "revoked",
        revoked_at: new Date().toISOString(),
        revoked_by_store_user_id: auth.storeUserId,
        updated_by_store_user_id: auth.storeUserId,
        updated_at: new Date().toISOString(),
      })
      .eq("store_id", auth.storeId)
      .eq("customer_id", customerId)
      .eq("status", "active");

    if (recordId) {
      query = query.eq("id", recordId);
    }

    const { data, error } = await query
      .select("id,store_id,customer_id,reason_code,status,updated_at")
      .maybeSingle();

    if (error) throw new Error(error.message);

    const reputation = await loadCodReputation({
      admin,
      storeId: auth.storeId,
      customerId,
    });

    return ok({
      revoked: Boolean(data?.id),
      record: data ?? null,
      reputation,
    });
  } catch (e: any) {
    return fail(e?.message || "FAILED_TO_REVOKE_CUSTOMER_REPUTATION", 500);
  }
}