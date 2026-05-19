// FILE: apps/merchant/src/app/api/orders/[id]/order-options/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  loadOrderMoneyContext,
  recalcOrderTotalsForAdmin,
  roundMoney,
} from "@/app/api/orders/_lib/order-money";

function s(x: any) {
  return String(x ?? "").trim();
}

function n(x: any) {
  const v = Number(x ?? 0);
  return Number.isFinite(v) ? v : 0;
}

function round2(x: any) {
  return Math.round(n(x) * 100) / 100;
}

function hasValue(value: any) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function firstValue(...values: any[]) {
  for (const value of values) {
    if (hasValue(value)) return value;
  }

  return null;
}

function safeObject(value: any): Record<string, any> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      //
    }
  }

  return {};
}

function safeArray(value: any): any[] {
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

async function resolveStoreUser() {
  const sb = await supabaseServer();

  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) return null;

  const { data: storeUser } = await sb
    .from("store_users")
    .select("id, store_id, auth_user_id, name, email, role")
    .eq("auth_user_id", user.id)
    .single();

  return storeUser ?? null;
}

function normalizePatchOption(row: any) {
  const title = s(row?.title || row?.name || row?.label || row?.option_name);

  return {
    id: s(row?.id),
    option_id: s(row?.option_id || row?.optionId) || null,
    title,
    value: s(row?.value),
    price_customer: round2(row?.price_customer ?? row?.priceCustomer ?? 0),
    currency: s(row?.currency),
  };
}

function normalizePatchForOrderCurrency(
  patch: ReturnType<typeof normalizePatchOption>,
  moneyContext: Awaited<ReturnType<typeof loadOrderMoneyContext>>,
) {
  return {
    ...patch,
    price_customer: roundMoney(
      moneyContext,
      patch.price_customer,
      moneyContext.orderCurrency,
    ),
    currency: moneyContext.orderCurrency,
  };
}

function answerOptionId(row: any) {
  const metadata = safeObject(row?.metadata);

  return s(
    firstValue(
      row?.option_id,
      row?.optionId,
      row?.order_option_id,
      row?.orderOptionId,
      row?.store_order_option_id,
      row?.storeOrderOptionId,
      metadata.option_id,
      metadata.optionId,
      metadata.order_option_id,
      metadata.orderOptionId,
      metadata.store_order_option_id,
      metadata.storeOrderOptionId,
    ),
  );
}

function answerTitle(row: any) {
  const metadata = safeObject(row?.metadata);

  return s(
    firstValue(
      row?.option_name,
      row?.optionName,
      row?.name,
      row?.title,
      row?.label,
      metadata.option_name,
      metadata.optionName,
      metadata.name,
      metadata.title,
      metadata.label,
    ),
  );
}

function answerPrice(row: any) {
  const metadata = safeObject(row?.metadata);

  return round2(
    firstValue(
      row?.price_customer,
      row?.priceCustomer,
      row?.price,
      row?.amount,
      row?.fee,
      metadata.price_customer,
      metadata.priceCustomer,
      metadata.price,
      metadata.amount,
      metadata.fee,
      0,
    ),
  );
}

function snapshotCheckout(snapshot: any) {
  const root = safeObject(snapshot);
  const checkout = safeObject(root.checkout);

  return {
    root,
    checkout,
    source: Object.keys(checkout).length ? checkout : root,
  };
}

function readSnapshotOptionLines(snapshot: any) {
  const { root, checkout } = snapshotCheckout(snapshot);

  return safeArray(
    firstValue(
      checkout.order_options,
      checkout.orderOptions,
      checkout.order_options_lines,
      checkout.orderOptionsLines,
      root.order_options,
      root.orderOptions,
      root.order_options_lines,
      root.orderOptionsLines,
      [],
    ),
  );
}

function readSnapshotFee(snapshot: any) {
  const { root, checkout } = snapshotCheckout(snapshot);

  return round2(
    firstValue(
      checkout.order_options_fee,
      checkout.orderOptionsFee,
      checkout.order_options_total,
      checkout.orderOptionsTotal,
      checkout.order_options_amount,
      checkout.options_amount,
      root.order_options_fee,
      root.orderOptionsFee,
      root.order_options_total,
      root.orderOptionsTotal,
      0,
    ),
  );
}

function lineTitle(line: any) {
  const metadata = safeObject(line?.metadata);

  return s(
    firstValue(
      line?.option_name,
      line?.optionName,
      line?.name,
      line?.title,
      line?.label,
      metadata.option_name,
      metadata.optionName,
      metadata.name,
      metadata.title,
      metadata.label,
    ),
  );
}

function lineOptionId(line: any) {
  const metadata = safeObject(line?.metadata);

  return s(
    firstValue(
      line?.option_id,
      line?.optionId,
      line?.order_option_id,
      line?.orderOptionId,
      line?.store_order_option_id,
      line?.storeOrderOptionId,
      metadata.option_id,
      metadata.optionId,
      metadata.order_option_id,
      metadata.orderOptionId,
      metadata.store_order_option_id,
      metadata.storeOrderOptionId,
    ),
  );
}

function lineId(line: any) {
  return s(line?.id);
}

function linePrice(line: any) {
  const metadata = safeObject(line?.metadata);

  return round2(
    firstValue(
      line?.price_customer,
      line?.priceCustomer,
      line?.price,
      line?.amount,
      line?.fee,
      metadata.price_customer,
      metadata.priceCustomer,
      metadata.price,
      metadata.amount,
      metadata.fee,
      0,
    ),
  );
}

function patchMatchesLine(
  patch: ReturnType<typeof normalizePatchOption>,
  line: any,
) {
  const id = lineId(line);
  const optionId = lineOptionId(line);
  const title = lineTitle(line);

  if (patch.id && id && patch.id === id) return true;
  if (patch.option_id && optionId && patch.option_id === optionId) return true;
  if (patch.title && title && patch.title === title) return true;

  return false;
}

function buildSnapshotLineFromPatch(
  patch: ReturnType<typeof normalizePatchOption>,
  fallbackCurrency: string,
  now: string,
) {
  const metadata = {
    value: patch.value,
    answer_value: patch.value,
    answerValue: patch.value,
    display_value: patch.value,
    displayValue: patch.value,
    price_customer: patch.price_customer,
    priceCustomer: patch.price_customer,
    currency: fallbackCurrency,
    edited_by_admin: true,
    edited_at: now,
  };

  return {
    id: patch.id || patch.option_id || patch.title,
    option_id: patch.option_id,
    optionId: patch.option_id,
    name: patch.title,
    title: patch.title,
    label: patch.title,
    option_name: patch.title,
    optionName: patch.title,
    value: patch.value,
    display_value: patch.value,
    displayValue: patch.value,
    answer_value: patch.value,
    answerValue: patch.value,
    price_customer: patch.price_customer,
    priceCustomer: patch.price_customer,
    currency: fallbackCurrency,
    metadata,
  };
}

function updateSnapshotWithPatches(args: {
  snapshot: any;
  patches: ReturnType<typeof normalizePatchOption>[];
  fallbackCurrency: string;
  now: string;
}) {
  const { snapshot, patches, fallbackCurrency, now } = args;

  const root = safeObject(snapshot);
  const existingCheckout =
    root.checkout && typeof root.checkout === "object" && !Array.isArray(root.checkout)
      ? { ...root.checkout }
      : {};

  const currentLines = readSnapshotOptionLines(root);
  const usedPatchIndexes = new Set<number>();

  const updatedLines = currentLines.length
    ? currentLines.map((line: any) => {
        const patchIndex = patches.findIndex((row) => patchMatchesLine(row, line));
        const patch = patchIndex >= 0 ? patches[patchIndex] : null;

        if (!patch) return line;

        usedPatchIndexes.add(patchIndex);

        const oldMetadata = safeObject(line?.metadata);

        const metadata = {
          ...oldMetadata,
          value: patch.value,
          answer_value: patch.value,
          answerValue: patch.value,
          display_value: patch.value,
          displayValue: patch.value,
          price_customer: patch.price_customer,
          priceCustomer: patch.price_customer,
          currency: fallbackCurrency,
          edited_by_admin: true,
          edited_at: now,
        };

        return {
          ...line,
          value: patch.value,
          display_value: patch.value,
          displayValue: patch.value,
          answer_value: patch.value,
          answerValue: patch.value,
          price_customer: patch.price_customer,
          priceCustomer: patch.price_customer,
          currency: fallbackCurrency,
          metadata,
        };
      })
    : [];

  const appendedLines = patches
    .filter((_, index) => !usedPatchIndexes.has(index))
    .map((patch) => buildSnapshotLineFromPatch(patch, fallbackCurrency, now));

  const nextLines = currentLines.length
    ? [...updatedLines, ...appendedLines]
    : patches.map((patch) =>
        buildSnapshotLineFromPatch(patch, fallbackCurrency, now),
      );

  const nextFee = round2(
    nextLines.reduce((sum: number, line: any) => sum + linePrice(line), 0),
  );

  const checkout = {
    ...existingCheckout,
    order_options: nextLines,
    orderOptions: nextLines,
    order_options_fee: nextFee,
    orderOptionsFee: nextFee,
    order_options_base: nextFee,
    orderOptionsBase: nextFee,
    order_options_tax: 0,
    orderOptionsTax: 0,
    order_options_total: nextFee,
    orderOptionsTotal: nextFee,
    currency: fallbackCurrency,
  };

  return {
    snapshot: {
      ...root,
      checkout,
      order_options: nextLines,
      orderOptions: nextLines,
      order_options_fee: nextFee,
      orderOptionsFee: nextFee,
      order_options_base: nextFee,
      orderOptionsBase: nextFee,
      order_options_tax: 0,
      orderOptionsTax: 0,
      order_options_total: nextFee,
      orderOptionsTotal: nextFee,
      currency: fallbackCurrency,
    },
    fee: nextFee,
    lines: nextLines,
  };
}

async function loadAnswerRows(sb: any, args: { storeId: string; order: any }) {
  const { storeId, order } = args;

  try {
    const byOrder = await sb
      .from("order_option_answers")
      .select("*")
      .eq("store_id", storeId)
      .eq("order_id", order.id);

    if (!byOrder.error && Array.isArray(byOrder.data) && byOrder.data.length) {
      return byOrder.data;
    }
  } catch {
    //
  }

  return [];
}

function findAnswerForPatch(
  patch: ReturnType<typeof normalizePatchOption>,
  rows: any[],
) {
  return (
    rows.find((row) => patch.id && s(row?.id) === patch.id) ||
    rows.find((row) => {
      const optionId = answerOptionId(row);
      return patch.option_id && optionId && patch.option_id === optionId;
    }) ||
    rows.find((row) => {
      const title = answerTitle(row);
      return patch.title && title && patch.title === title;
    }) ||
    null
  );
}

function buildAnswerAuditShape(row: any) {
  return {
    id: s(row?.id) || null,
    option_id: answerOptionId(row) || null,
    title: answerTitle(row) || null,
    value: s(row?.value) || s(safeObject(row?.metadata)?.value) || null,
    price_customer: answerPrice(row),
    currency: s(row?.currency) || s(safeObject(row?.metadata)?.currency) || null,
    metadata: safeObject(row?.metadata),
  };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const storeUser = await resolveStoreUser();

    if (!storeUser?.store_id) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await params;
    const orderId = s(id);

    if (!orderId) {
      return NextResponse.json(
        { ok: false, error: "Order id is required" },
        { status: 400 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const rawPatches = safeArray(body?.options)
      .map(normalizePatchOption)
      .filter((row) => row.id || row.option_id || row.title);

    if (!rawPatches.length) {
      return NextResponse.json(
        { ok: false, error: "OPTIONS_REQUIRED" },
        { status: 400 },
      );
    }

    const sb = supabaseAdmin();

    const orderR = await sb
      .from("orders")
      .select(
        [
          "id",
          "store_id",
          "cart_id",
          "currency",
          "subtotal",
          "shipping_amount",
          "tax_amount",
          "discount_amount",
          "total_amount",
          "payment_method",
          "shipping_id",
          "shipping_snapshot",
          "updated_at",
        ].join(","),
      )
      .eq("id", orderId)
      .eq("store_id", storeUser.store_id)
      .maybeSingle();

    const order = orderR.data as any;

    if (orderR.error || !order?.id) {
      return NextResponse.json(
        { ok: false, error: orderR.error?.message || "Order not found" },
        { status: 404 },
      );
    }

    const storeId = s(order.store_id);

    const moneyContext = await loadOrderMoneyContext({
      admin: sb,
      storeId,
      orderId: s(order.id),
      orderCurrency: s(order.currency),
    });

    const currency = moneyContext.orderCurrency;
    const now = new Date().toISOString();

    const patches = rawPatches.map((patch) =>
      normalizePatchForOrderCurrency(patch, moneyContext),
    );

    const answerRows = await loadAnswerRows(sb, { storeId, order });

    const previousSnapshotFee = readSnapshotFee(order.shipping_snapshot);
    const previousAnswersFee = round2(
      answerRows.reduce((sum: number, row: any) => sum + answerPrice(row), 0),
    );

    const previousFee =
      previousSnapshotFee > 0 ? previousSnapshotFee : previousAnswersFee;

    const beforeAnswers = answerRows.map(buildAnswerAuditShape);

    const updatedAnswers: any[] = [];

    if (answerRows.length) {
      for (const patch of patches) {
        const answer = findAnswerForPatch(patch, answerRows);
        if (!answer?.id) continue;

        const oldMetadata = safeObject(answer.metadata);

        const metadata = {
          ...oldMetadata,
          value: patch.value,
          answer_value: patch.value,
          answerValue: patch.value,
          display_value: patch.value,
          displayValue: patch.value,
          price_customer: patch.price_customer,
          priceCustomer: patch.price_customer,
          currency,
          edited_by_admin: true,
          edited_at: now,
          edited_by_store_user_id: storeUser.id ?? null,
        };

        const updateR = await sb
          .from("order_option_answers")
          .update({
            value: patch.value,
            price_customer: patch.price_customer,
            currency,
            metadata,
          })
          .eq("store_id", storeId)
          .eq("id", answer.id)
          .eq("order_id", order.id)
          .select("*")
          .maybeSingle();

        if (updateR.error) {
          return NextResponse.json(
            {
              ok: false,
              error: "ORDER_OPTION_UPDATE_FAILED",
              detail: updateR.error.message,
            },
            { status: 500 },
          );
        }

        if (updateR.data) {
          updatedAnswers.push(updateR.data);
        }
      }
    }

    const snapshotUpdate = updateSnapshotWithPatches({
      snapshot: order.shipping_snapshot,
      patches,
      fallbackCurrency: currency,
      now,
    });

    const orderUpdateR = await sb
      .from("orders")
      .update({
        shipping_snapshot: snapshotUpdate.snapshot,
        updated_at: now,
      })
      .eq("id", order.id)
      .eq("store_id", storeId)
      .select("id,total_amount,shipping_snapshot")
      .maybeSingle();

    if (orderUpdateR.error) {
      return NextResponse.json(
        {
          ok: false,
          error: "ORDER_UPDATE_FAILED",
          detail: orderUpdateR.error.message,
        },
        { status: 500 },
      );
    }

    const totals = await recalcOrderTotalsForAdmin({
      admin: sb,
      storeId,
      orderId: s(order.id),
      actorId: s(storeUser.id),
      auditAction: "order_options.updated",
      auditBeforeData: {
        currency,
        order_options_fee: previousFee,
        total_amount: n(order.total_amount),
        answers: beforeAnswers,
        snapshot_lines: readSnapshotOptionLines(order.shipping_snapshot),
      },
      auditAfterData: {
        currency,
        requested_options: patches,
        updated_answers: updatedAnswers.map(buildAnswerAuditShape),
        snapshot_lines: snapshotUpdate.lines,
        order_options_fee: totalsPlaceholder(snapshotUpdate.fee),
      },
    });

    return NextResponse.json(
      {
        ok: true,
        order_id: order.id,
        currency: totals.currency,
        order_options_fee: totals.after.order_options_fee,
        total_amount: totals.after.total_amount,
      },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Unexpected server error" },
      { status: 500 },
    );
  }
}

function totalsPlaceholder(value: any) {
  return round2(value);
}