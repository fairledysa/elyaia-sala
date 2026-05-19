// app/api/orders/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function s(x: any) {
  return String(x ?? "").trim();
}

function n(x: any) {
  const v = Number(x ?? 0);
  return Number.isFinite(v) ? v : 0;
}

function round2(x: number) {
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
    } catch {}
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

function uniqString(values: any[]) {
  return Array.from(
    new Set(values.map((value) => s(value)).filter(Boolean))
  );
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

function normalizeOrderOptionChoice(choice: any, choiceMap?: Map<string, any>) {
  const choiceId = s(
    choice?.id ??
      choice?.choice_id ??
      choice?.choiceId ??
      choice?.value_id ??
      choice?.valueId
  );

  const dbChoice = choiceId && choiceMap ? choiceMap.get(choiceId) : null;

  const label =
    s(choice?.label) ||
    s(choice?.name) ||
    s(choice?.title) ||
    s(choice?.value) ||
    s(choice?.display_value) ||
    s(choice?.displayValue) ||
    s(dbChoice?.label) ||
    s(dbChoice?.name) ||
    s(dbChoice?.title) ||
    s(dbChoice?.value) ||
    s(dbChoice?.display_value) ||
    s(dbChoice?.displayValue);

  const price = round2(
    firstValue(
      choice?.price_customer,
      choice?.priceCustomer,
      choice?.price,
      choice?.amount,
      dbChoice?.price_customer,
      dbChoice?.priceCustomer,
      dbChoice?.price,
      dbChoice?.amount,
      0
    )
  );

  if (!label && !choiceId) return null;

  return {
    id: choiceId || null,
    label: label || choiceId,
    name: label || choiceId,
    value: label || choiceId,
    price_customer: price,
    priceCustomer: price,
  };
}

function normalizeOrderOptionChoices(value: any, choiceMap?: Map<string, any>) {
  const rows = safeArray(value);

  return rows
    .map((choice) => normalizeOrderOptionChoice(choice, choiceMap))
    .filter(Boolean);
}

 function stringifyOrderOptionValue(value: any): string {
  if (value === null || value === undefined) return "";

  if (Array.isArray(value)) {
    return value
      .map((item: any) => stringifyOrderOptionValue(item))
      .filter((item: string) => Boolean(item))
      .join("، ");
  }

  if (typeof value === "object") {
    const obj = safeObject(value);

    const date = s(
      firstValue(
        obj.date,
        obj.date_value,
        obj.dateValue,
        obj.selected_date,
        obj.selectedDate
      )
    );

    const time = s(
      firstValue(
        obj.time,
        obj.time_value,
        obj.timeValue,
        obj.selected_time,
        obj.selectedTime
      )
    );

    const from = s(
      firstValue(obj.from, obj.start, obj.start_time, obj.startTime)
    );

    const to = s(firstValue(obj.to, obj.end, obj.end_time, obj.endTime));

    if (date && from && to) return `${date} من ${from} إلى ${to}`;
    if (date && time) return `${date} - ${time}`;
    if (date) return date;
    if (from && to) return `من ${from} إلى ${to}`;

    return s(
      firstValue(
        obj.label,
        obj.name,
        obj.title,
        obj.value,
        obj.display_value,
        obj.displayValue,
        ""
      )
    );
  }

  return s(value);
}

function extractChoiceIdsFromAnswer(row: any) {
  const metadata = safeObject(row?.metadata);

  const candidates = [
    row?.choice_id,
    row?.choiceId,
    row?.selected_choice_id,
    row?.selectedChoiceId,
    row?.value_id,
    row?.valueId,
    row?.choice_ids,
    row?.choiceIds,
    row?.selected_choice_ids,
    row?.selectedChoiceIds,
    metadata.choice_id,
    metadata.choiceId,
    metadata.selected_choice_id,
    metadata.selectedChoiceId,
    metadata.value_id,
    metadata.valueId,
    metadata.choice_ids,
    metadata.choiceIds,
    metadata.selected_choice_ids,
    metadata.selectedChoiceIds,
  ];

  const fromChoices = [
    ...safeArray(row?.choices),
    ...safeArray(row?.selected_choices),
    ...safeArray(row?.choice_values),
    ...safeArray(metadata.choices),
    ...safeArray(metadata.selected_choices),
    ...safeArray(metadata.choice_values),
  ].flatMap((choice: any) => [
    choice?.id,
    choice?.choice_id,
    choice?.choiceId,
    choice?.value_id,
    choice?.valueId,
  ]);

  const values: string[] = [];

  for (const candidate of [...candidates, ...fromChoices]) {
    if (Array.isArray(candidate)) {
      for (const item of candidate) {
        const value = s(item);
        if (value) values.push(value);
      }
      continue;
    }

    const value = s(candidate);
    if (value) values.push(value);
  }

  return uniqString(values);
}

function normalizeOrderOptionLineFromSnapshot(line: any, fallbackCurrency = "SAR") {
  const metadata = safeObject(line?.metadata);

  const optionId = s(
    firstValue(
      line?.option_id,
      line?.optionId,
      line?.order_option_id,
      line?.orderOptionId,
      line?.store_order_option_id,
      line?.storeOrderOptionId
    )
  );

  const title =
    s(
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
        metadata.label
      )
    ) || "خيار الطلب";

  const choices = normalizeOrderOptionChoices(
    firstValue(
      line?.choices,
      line?.selected_choices,
      line?.choice_values,
      line?.choiceValues,
      metadata.choices,
      metadata.selected_choices,
      metadata.choice_values,
      []
    )
  );

  const value =
    stringifyOrderOptionValue(
      firstValue(
        line?.display_value,
        line?.displayValue,
        line?.answer_label,
        line?.answerLabel,
        line?.answer_value,
        line?.answerValue,
        line?.value,
        line?.text_value,
        line?.textValue,
        line?.number_value,
        line?.numberValue,
        line?.date_value,
        line?.dateValue,
        line?.time_value,
        line?.timeValue,
        metadata.display_value,
        metadata.displayValue,
        metadata.answer_label,
        metadata.answerLabel,
        metadata.answer_value,
        metadata.answerValue,
        metadata.value,
        metadata.text_value,
        metadata.textValue,
        metadata.number_value,
        metadata.numberValue,
        metadata.date_value,
        metadata.dateValue,
        metadata.time_value,
        metadata.timeValue
      )
    ) || choices.map((choice: any) => s(choice?.label)).filter(Boolean).join("، ");

  const priceFromChoices = round2(
    choices.reduce((sum: number, choice: any) => {
      return sum + n(choice?.price_customer ?? choice?.priceCustomer);
    }, 0)
  );

  const price = round2(
    firstValue(
      line?.price_customer,
      line?.priceCustomer,
      line?.price,
      line?.amount,
      metadata.price_customer,
      metadata.priceCustomer,
      metadata.price,
      metadata.amount,
      priceFromChoices
    )
  );

  const currency = s(
    firstValue(
      line?.currency,
      line?.currency_code,
      line?.currencyCode,
      metadata.currency,
      metadata.currency_code,
      metadata.currencyCode,
      fallbackCurrency
    )
  );

  if (!title && !value && choices.length === 0 && price <= 0) return null;

  return {
    id: s(line?.id) || optionId || title,
    option_id: optionId || null,
    optionId: optionId || null,

    name: title,
    title,
    label: title,
    option_name: title,
    optionName: title,

    type: s(firstValue(line?.type, line?.field_type, metadata.type, metadata.field_type)),
    field_type: s(firstValue(line?.field_type, line?.fieldType, metadata.field_type)),

    value,
    display_value: value,
    displayValue: value,
    answer_value: value,
    answerValue: value,

    choices,
    choice_labels: choices.map((choice: any) => s(choice?.label)).filter(Boolean),
    choiceLabels: choices.map((choice: any) => s(choice?.label)).filter(Boolean),

    metadata,

    price_customer: price,
    priceCustomer: price,
    currency,
  };
}

function normalizeOrderOptionLineFromAnswer(args: {
  row: any;
  optionMap: Map<string, any>;
  choiceMap: Map<string, any>;
  fallbackCurrency: string;
}) {
  const row = args.row;
  const metadata = safeObject(row?.metadata);

  const optionId = s(
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
      metadata.storeOrderOptionId
    )
  );

  const option = optionId ? args.optionMap.get(optionId) : null;

  const title =
    s(
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
        option?.title,
        option?.name,
        option?.label
      )
    ) || "خيار الطلب";

  const choiceIds = extractChoiceIdsFromAnswer(row);

  const choicesFromObjects = normalizeOrderOptionChoices(
    firstValue(
      row?.choices,
      row?.selected_choices,
      row?.choice_values,
      row?.choiceValues,
      metadata.choices,
      metadata.selected_choices,
      metadata.choice_values,
      []
    ),
    args.choiceMap
  );

  const choicesFromIds = choiceIds
    .map((choiceId) => normalizeOrderOptionChoice({ id: choiceId }, args.choiceMap))
    .filter(Boolean);

  const choices = choicesFromObjects.length ? choicesFromObjects : choicesFromIds;

  const value =
    stringifyOrderOptionValue(
      firstValue(
        row?.display_value,
        row?.displayValue,
        row?.answer_label,
        row?.answerLabel,
        row?.answer_value,
        row?.answerValue,
        row?.value,
        row?.text_value,
        row?.textValue,
        row?.number_value,
        row?.numberValue,
        row?.date_value,
        row?.dateValue,
        row?.time_value,
        row?.timeValue,
        metadata.display_value,
        metadata.displayValue,
        metadata.answer_label,
        metadata.answerLabel,
        metadata.answer_value,
        metadata.answerValue,
        metadata.value,
        metadata.text_value,
        metadata.textValue,
        metadata.number_value,
        metadata.numberValue,
        metadata.date_value,
        metadata.dateValue,
        metadata.time_value,
        metadata.timeValue
      )
    ) || choices.map((choice: any) => s(choice?.label)).filter(Boolean).join("، ");

  const priceFromChoices = round2(
    choices.reduce((sum: number, choice: any) => {
      return sum + n(choice?.price_customer ?? choice?.priceCustomer);
    }, 0)
  );

  const price = round2(
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
      priceFromChoices
    )
  );

  const currency = s(
    firstValue(
      row?.currency,
      row?.currency_code,
      row?.currencyCode,
      metadata.currency,
      metadata.currency_code,
      metadata.currencyCode,
      args.fallbackCurrency
    )
  );

  if (!title && !value && choices.length === 0 && price <= 0) return null;

  return {
    id: s(row?.id) || optionId || title,
    option_id: optionId || null,
    optionId: optionId || null,

    name: title,
    title,
    label: title,
    option_name: title,
    optionName: title,

    type: s(
      firstValue(
        row?.type,
        row?.field_type,
        row?.fieldType,
        metadata.type,
        metadata.field_type,
        metadata.fieldType,
        option?.type,
        option?.field_type,
        option?.fieldType,
        option?.input_type,
        option?.inputType
      )
    ),
    field_type: s(
      firstValue(
        row?.field_type,
        row?.fieldType,
        metadata.field_type,
        metadata.fieldType,
        option?.field_type,
        option?.fieldType
      )
    ),

    value,
    display_value: value,
    displayValue: value,
    answer_value: value,
    answerValue: value,

    choices,
    choice_labels: choices.map((choice: any) => s(choice?.label)).filter(Boolean),
    choiceLabels: choices.map((choice: any) => s(choice?.label)).filter(Boolean),

    metadata,

    price_customer: price,
    priceCustomer: price,
    currency,
  };
}

function extractOrderOptionsFromSnapshot(order: any) {
  const snapshot = safeObject(order?.shipping_snapshot);
  const checkout = safeObject(snapshot?.checkout);

  const source = Object.keys(checkout).length ? checkout : snapshot;

  const rawLines = safeArray(
    firstValue(
      checkout.order_options,
      checkout.orderOptions,
      checkout.order_options_lines,
      checkout.orderOptionsLines,
      snapshot.order_options,
      snapshot.orderOptions,
      snapshot.order_options_lines,
      snapshot.orderOptionsLines,
      []
    )
  );

  const fallbackCurrency =
    s(
      firstValue(
        checkout.currency,
        checkout.currency_code,
        checkout.currencyCode,
        snapshot.currency,
        snapshot.currency_code,
        snapshot.currencyCode,
        order?.currency,
        "SAR"
      )
    ) || "SAR";

  const lines = rawLines
    .map((line) => normalizeOrderOptionLineFromSnapshot(line, fallbackCurrency))
    .filter(Boolean);

  const fee = round2(
    firstValue(
      checkout.order_options_fee,
      checkout.orderOptionsFee,
      checkout.order_options_total,
      checkout.orderOptionsTotal,
      snapshot.order_options_fee,
      snapshot.orderOptionsFee,
      snapshot.order_options_total,
      snapshot.orderOptionsTotal,
      lines.reduce((sum: number, line: any) => {
        return sum + n(line?.price_customer ?? line?.priceCustomer);
      }, 0)
    )
  );

  const base = round2(
    firstValue(
      checkout.order_options_base,
      checkout.orderOptionsBase,
      snapshot.order_options_base,
      snapshot.orderOptionsBase,
      fee
    )
  );

  const tax = round2(
    firstValue(
      checkout.order_options_tax,
      checkout.orderOptionsTax,
      snapshot.order_options_tax,
      snapshot.orderOptionsTax,
      0
    )
  );

  const total = round2(
    firstValue(
      checkout.order_options_total,
      checkout.orderOptionsTotal,
      snapshot.order_options_total,
      snapshot.orderOptionsTotal,
      fee
    )
  );

  return {
    lines,
    fee,
    base,
    tax,
    total,
  };
}

async function loadOrderOptionsForAdmin(args: {
  sb: any;
  storeId: string;
  order: any;
}) {
  const { sb, storeId, order } = args;

  const snapshotData = extractOrderOptionsFromSnapshot(order);

  let answerRows: any[] = [];

  try {
    const byOrder = await sb
      .from("order_option_answers")
      .select("*")
      .eq("store_id", storeId)
      .eq("order_id", order.id);

    if (!byOrder.error && Array.isArray(byOrder.data)) {
      answerRows = byOrder.data;
    }
  } catch {}

  if (!answerRows.length && order?.cart_id) {
    try {
      const byCart = await sb
        .from("order_option_answers")
        .select("*")
        .eq("store_id", storeId)
        .eq("cart_id", order.cart_id);

      if (!byCart.error && Array.isArray(byCart.data)) {
        answerRows = byCart.data;
      }
    } catch {}
  }

  if (!answerRows.length) {
    return snapshotData;
  }

  answerRows = answerRows.slice().sort((a: any, b: any) => {
    const asort = Number(a?.sort_order ?? 0);
    const bsort = Number(b?.sort_order ?? 0);

    if (Number.isFinite(asort) && Number.isFinite(bsort) && asort !== bsort) {
      return asort - bsort;
    }

    return s(a?.created_at).localeCompare(s(b?.created_at));
  });

  const optionIds = uniqString(
    answerRows.flatMap((row: any) => {
      const metadata = safeObject(row?.metadata);

      return [
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
      ];
    })
  );

  const choiceIds = uniqString(
    answerRows.flatMap((row: any) => extractChoiceIdsFromAnswer(row))
  );

  let optionMap = new Map<string, any>();

  if (optionIds.length) {
    try {
      const optionsR = await sb
        .from("store_order_options")
        .select("*")
        .eq("store_id", storeId)
        .in("id", optionIds);

      if (!optionsR.error && Array.isArray(optionsR.data)) {
        optionMap = new Map(
          optionsR.data
            .filter((row: any) => row?.id)
            .map((row: any) => [String(row.id), row])
        );
      }
    } catch {}
  }

  let choiceMap = new Map<string, any>();

  if (choiceIds.length) {
    try {
      const choicesR = await sb
        .from("store_order_option_choices")
        .select("*")
        .eq("store_id", storeId)
        .in("id", choiceIds);

      if (!choicesR.error && Array.isArray(choicesR.data)) {
        choiceMap = new Map(
          choicesR.data
            .filter((row: any) => row?.id)
            .map((row: any) => [String(row.id), row])
        );
      }
    } catch {}
  }

  const fallbackCurrency = s(order?.currency) || "SAR";

  const lines = answerRows
    .map((row: any) =>
      normalizeOrderOptionLineFromAnswer({
        row,
        optionMap,
        choiceMap,
        fallbackCurrency,
      })
    )
    .filter(Boolean);

  if (!lines.length) {
    return snapshotData;
  }

  const computedFee = round2(
    lines.reduce((sum: number, line: any) => {
      return sum + n(line?.price_customer ?? line?.priceCustomer);
    }, 0)
  );

  const fee = snapshotData.fee > 0 ? snapshotData.fee : computedFee;
  const base = snapshotData.base > 0 ? snapshotData.base : fee;
  const tax = snapshotData.tax > 0 ? snapshotData.tax : 0;
  const total = snapshotData.total > 0 ? snapshotData.total : fee;

  return {
    lines,
    fee,
    base,
    tax,
    total,
  };
}

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const storeUser = await resolveStoreUser();

    if (!storeUser?.store_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const orderId = s(id);

    if (!orderId) {
      return NextResponse.json(
        { error: "Order id is required" },
        { status: 400 }
      );
    }

    const sb = supabaseAdmin();

    const { data: order, error: orderError } = await sb
      .from("orders")
      .select(
        `
        id,
        store_id,
        cart_id,
        order_number,
        status,
        currency,
        subtotal,
        shipping_amount,
        tax_amount,
        discount_amount,
        total_amount,
        payment_method,
        payment_status,
        shipping_address,
        shipping_id,
        shipping_carrier_id,
        shipping_snapshot,
        public_token,
        public_no,
        invoice_no,
        created_at,
        updated_at,
        address_id,
        customer_id,
        base_status_key,
        store_status_id,
        status_updated_at,
        status_note,

        order_items (
          id,
          order_id,
          product_id,
          variant_id,
          name,
          sku,
          qty,
          currency,
          unit_price,
          total_price,
          selected_option_value_ids,
          selected_options,
          created_at
        )
      `
      )
      .eq("id", orderId)
      .eq("store_id", storeUser.store_id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: orderError?.message || "Order not found" },
        { status: 404 }
      );
    }

    const storeId = s(order.store_id);

    const orderOptionsPack = await loadOrderOptionsForAdmin({
      sb,
      storeId,
      order,
    });

    const { data: customer } = order.customer_id
      ? await sb
          .from("customers")
          .select(
            `
            id,
            full_name,
            email,
            phone_e164,
            gender,
            birth_date,
            created_at,
            updated_at,
            total_orders,
            total_spent,
            last_order_at
          `
          )
          .eq("id", order.customer_id)
          .maybeSingle()
      : { data: null };

    const [
      customerAddressRes,
      storeStatusRes,
      baseStatusRes,
      statusHistoryRes,
      shippingCarrierRes,
      couponRes,
      auditLogsRes,
      orderAdminNoteRes,
    ] = await Promise.all([
      order.address_id
        ? sb
            .from("customer_addresses")
            .select(
              `
              id,
              label,
              recipient_name,
              phone_e164,
              address_line1,
              address_line2,
              postal_code,
              notes,
              lat,
              lng,
              is_default,
              created_at,
              updated_at,
              city_id,
              district_id,
              country_id,
              ref_cities (
                id,
                name_ar,
                name_en
              ),
              ref_districts (
                id,
                name_ar,
                name_en
              ),
              ref_countries (
                id,
                iso2,
                name_ar,
                name_en
              )
            `
            )
            .eq("id", order.address_id)
            .eq("customer_id", order.customer_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),

      order.store_status_id
        ? sb
            .from("store_order_statuses")
            .select(
              `
              id,
              store_id,
              base_status_key,
              name,
              slug,
              icon,
              color,
              sort_order,
              is_active,
              notify_customer,
              message_template,
              email_template,
              sms_template,
              created_at,
              updated_at
            `
            )
            .eq("id", order.store_status_id)
            .eq("store_id", storeId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),

      order.base_status_key
        ? sb
            .from("order_status_bases")
            .select(
              `
              key,
              name_ar,
              name_en,
              icon,
              color,
              sort_order,
              is_active,
              is_system,
              created_at,
              updated_at
            `
            )
            .eq("key", order.base_status_key)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),

      sb
        .from("order_status_history")
        .select(
          `
          id,
          store_id,
          order_id,
          from_base_status_key,
          to_base_status_key,
          from_store_status_id,
          to_store_status_id,
          changed_by_store_user_id,
          note,
          created_at
        `
        )
        .eq("order_id", order.id)
        .eq("store_id", storeId)
        .order("created_at", { ascending: false }),

      order.shipping_carrier_id
        ? sb
            .from("shipping_carriers")
            .select(
              `
              id,
              code,
              name,
              logo_url,
              provider_kind,
              status
            `
            )
            .eq("id", order.shipping_carrier_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),

      order.cart_id
        ? sb
            .from("cart_coupons")
            .select("coupon_id,code,discount_amount")
            .eq("store_id", storeId)
            .eq("cart_id", order.cart_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),

      sb
        .from("audit_logs")
        .select(
          `
          id,
          store_id,
          actor_type,
          actor_id,
          action,
          entity_type,
          entity_id,
          before_data,
          after_data,
          created_at
        `
        )
        .eq("store_id", storeId)
        .eq("entity_type", "order")
        .eq("entity_id", order.id)
        .order("created_at", { ascending: true }),

      sb
        .from("order_admin_notes")
        .select(
          `
          id,
          store_id,
          order_id,
          note,
          created_by_store_user_id,
          updated_by_store_user_id,
          created_at,
          updated_at
        `
        )
        .eq("store_id", storeId)
        .eq("order_id", order.id)
        .maybeSingle(),
    ]);

    let couponType: string | null = null;
    let couponCode: string | null = couponRes.data?.code
      ? String(couponRes.data.code)
      : null;
    let couponDiscountAmount: number | null =
      couponRes.data?.discount_amount != null
        ? Number(couponRes.data.discount_amount)
        : null;
    let couponAmount: number | null = null;

    if (couponRes.data?.coupon_id) {
      const { data: couponMeta } = await sb
        .from("coupons")
        .select("id,code,discount_type,amount")
        .eq("id", couponRes.data.coupon_id)
        .maybeSingle();

      if (couponMeta) {
        if (!couponCode && couponMeta.code) {
          couponCode = String(couponMeta.code);
        }

        couponAmount =
          couponMeta.amount != null ? Number(couponMeta.amount) : null;

        const rawType = s(couponMeta.discount_type).toUpperCase();

        if (
          rawType === "P" ||
          rawType === "PERCENTAGE" ||
          rawType === "PERCENT"
        ) {
          couponType = "percentage";
        } else if (rawType) {
          couponType = "fixed";
        }
      }
    }

    const productIds = Array.from(
      new Set(
        (Array.isArray(order.order_items) ? order.order_items : [])
          .map((item: any) => item?.product_id)
          .filter(Boolean)
      )
    );

    const variantIds = Array.from(
      new Set(
        (Array.isArray(order.order_items) ? order.order_items : [])
          .map((item: any) => item?.variant_id)
          .filter(Boolean)
      )
    );

    const historyRows = Array.isArray(statusHistoryRes.data)
      ? statusHistoryRes.data
      : [];

    const auditLogsRows = Array.isArray(auditLogsRes.data)
      ? auditLogsRes.data
      : [];

    const noteRow = orderAdminNoteRes.data ?? null;

    const historyStoreUserIds = historyRows
      .map((x: any) => s(x?.changed_by_store_user_id))
      .filter(Boolean);

    const auditStoreUserIds = auditLogsRows
      .filter((x: any) => s(x?.actor_type) === "store_user")
      .map((x: any) => s(x?.actor_id))
      .filter(Boolean);

    const noteStoreUserIds = [
      s(noteRow?.created_by_store_user_id),
      s(noteRow?.updated_by_store_user_id),
    ].filter(Boolean);

    const storeUserIds = Array.from(
      new Set([
        ...historyStoreUserIds,
        ...auditStoreUserIds,
        ...noteStoreUserIds,
      ])
    );

    const [{ data: products }, { data: variants }, { data: storeUsers }] =
      await Promise.all([
        productIds.length
          ? sb
              .from("products")
              .select(
                `
                id,
                store_id,
                name,
                status,
                brand_id,
                product_type,
                created_at,
                updated_at
              `
              )
              .eq("store_id", storeId)
              .in("id", productIds)
          : Promise.resolve({ data: [] as any[] }),

        variantIds.length
          ? sb
              .from("product_variants")
              .select(
                `
                id,
                product_id,
                sku,
                barcode,
                price,
                sale_price,
                stock_quantity,
                unlimited_quantity,
                created_at,
                updated_at
              `
              )
              .in("id", variantIds)
          : Promise.resolve({ data: [] as any[] }),

        storeUserIds.length
          ? sb
              .from("store_users")
              .select("id,name,email,role")
              .eq("store_id", storeId)
              .in("id", storeUserIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

    const { data: productMedia } = productIds.length
      ? await sb
          .from("product_media")
          .select(
            `
            id,
            product_id,
            original_url,
            thumbnail_url,
            alt,
            is_default,
            sort_order
          `
          )
          .eq("store_id", storeId)
          .in("product_id", productIds)
          .order("is_default", { ascending: false })
          .order("sort_order", { ascending: true })
      : { data: [] as any[] };

    const productMap = new Map((products ?? []).map((p: any) => [p.id, p]));
    const variantMap = new Map((variants ?? []).map((v: any) => [v.id, v]));
    const storeUserMap = new Map((storeUsers ?? []).map((u: any) => [u.id, u]));

    const mediaMap = new Map<string, any>();
    for (const media of productMedia ?? []) {
      if (!mediaMap.has(media.product_id)) {
        mediaMap.set(media.product_id, media);
      }
    }

    const items = (order.order_items ?? []).map((item: any) => {
      const product = item.product_id
        ? productMap.get(item.product_id) ?? null
        : null;

      const variant = item.variant_id
        ? variantMap.get(item.variant_id) ?? null
        : null;

      const media = item.product_id
        ? mediaMap.get(item.product_id) ?? null
        : null;

      return {
        ...item,
        product,
        variant,
        image_url: media?.thumbnail_url || media?.original_url || null,
      };
    });

    const statusHistory = historyRows.map((row: any) => {
      const actor = row?.changed_by_store_user_id
        ? storeUserMap.get(row.changed_by_store_user_id) ?? null
        : null;

      return {
        ...row,
        actor_name: actor?.name ?? null,
        actor_email: actor?.email ?? null,
        actor_role: actor?.role ?? null,
        actor_type: actor ? "store_user" : null,
      };
    });

    const auditLogs = auditLogsRows.map((row: any) => {
      const actor =
        s(row?.actor_type) === "store_user" && row?.actor_id
          ? storeUserMap.get(row.actor_id) ?? null
          : null;

      return {
        ...row,
        actor_name: actor?.name ?? null,
        actor_email: actor?.email ?? null,
        actor_role: actor?.role ?? null,
      };
    });

    const orderAdminNote = noteRow
      ? {
          ...noteRow,
          created_by_name: noteRow.created_by_store_user_id
            ? storeUserMap.get(noteRow.created_by_store_user_id)?.name ?? null
            : null,
          updated_by_name: noteRow.updated_by_store_user_id
            ? storeUserMap.get(noteRow.updated_by_store_user_id)?.name ?? null
            : null,
        }
      : null;

    const isDraft =
      s(order.status).toLowerCase() === "draft" ||
      s(order.base_status_key).toLowerCase() === "draft";

    return NextResponse.json({
      ...order,
      is_draft: isDraft,
      customers: customer ?? null,
      order_items: items,
      customer_address: customerAddressRes.data ?? null,
      current_store_status: storeStatusRes.data ?? null,
      current_base_status: baseStatusRes.data ?? null,
      status_history: statusHistory,
      shipping_carrier: shippingCarrierRes.data ?? null,
      shipping_snapshot: order.shipping_snapshot ?? null,

      order_options: orderOptionsPack.lines,
      orderOptions: orderOptionsPack.lines,
      order_options_fee: orderOptionsPack.fee,
      orderOptionsFee: orderOptionsPack.fee,
      order_options_base: orderOptionsPack.base,
      orderOptionsBase: orderOptionsPack.base,
      order_options_tax: orderOptionsPack.tax,
      orderOptionsTax: orderOptionsPack.tax,
      order_options_total: orderOptionsPack.total,
      orderOptionsTotal: orderOptionsPack.total,

      audit_logs: auditLogs,
      order_admin_note: orderAdminNote,
      coupon_code: couponCode,
      coupon_type: couponType,
      coupon_amount: couponAmount,
      coupon_discount_amount:
        couponDiscountAmount != null
          ? couponDiscountAmount
          : Number(order.discount_amount ?? 0),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unexpected server error" },
      { status: 500 }
    );
  }
}