//app/api/customer-groups/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type ConditionInput = {
  id: string;
  label?: string | null;
  type?: string | null;
  operator?: string | null;
  value?: string | null;
  min_value?: string | null;
  max_value?: string | null;
};

function toNumber(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function daysAgoIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

async function resolveStoreId() {
  const sb = await supabaseServer();

  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) return null;

  const { data: storeUser } = await sb
    .from("store_users")
    .select("store_id")
    .eq("auth_user_id", user.id)
    .single();

  return storeUser?.store_id ?? null;
}

async function filterCustomersByConditions(
  storeId: string,
  conditions: ConditionInput[]
) {
  const admin = supabaseAdmin();

  let query = admin
    .from("customers")
    .select(`
      id,
      email,
      gender,
      birth_date,
      created_at,
      total_orders,
      total_spent,
      last_order_at,
      store_customers!inner (
        store_id
      )
    `)
    .eq("store_customers.store_id", storeId);

  for (const c of conditions) {
    if (c.id === "doesnt_have_email") {
      query = query.or("email.is.null,email.eq.");
      continue;
    }

    if (c.id === "doesnt_have_orders") {
      query = query.eq("total_orders", 0);
      continue;
    }

    if (c.id === "gender") {
      const val = String(c.value ?? c.min_value ?? "").trim().toLowerCase();
      if (val === "male" || val === "female") {
        query = query.eq("gender", val);
      }
      continue;
    }

    if (c.id === "total_orders") {
      const op = String(c.operator ?? ">").trim();
      const value = toNumber(c.value ?? c.min_value);
      const maxValue = toNumber(c.max_value);

      if (op === "between") {
        if (value !== null) query = query.gte("total_orders", value);
        if (maxValue !== null) query = query.lte("total_orders", maxValue);
      } else if (value !== null) {
        if (op === ">") query = query.gt("total_orders", value);
        else if (op === "<") query = query.lt("total_orders", value);
        else if (op === "=") query = query.eq("total_orders", value);
      }
      continue;
    }

    if (c.id === "total_sales") {
      const op = String(c.operator ?? ">").trim();
      const value = toNumber(c.value ?? c.min_value);
      const maxValue = toNumber(c.max_value);

      if (op === "between") {
        if (value !== null) query = query.gte("total_spent", value);
        if (maxValue !== null) query = query.lte("total_spent", maxValue);
      } else if (value !== null) {
        if (op === ">") query = query.gt("total_spent", value);
        else if (op === "<") query = query.lt("total_spent", value);
        else if (op === "=") query = query.eq("total_spent", value);
      }
      continue;
    }

    if (c.id === "birthday") {
      const min = String(c.min_value ?? "").trim();
      const max = String(c.max_value ?? "").trim();

      if (min) query = query.gte("birth_date", min);
      if (max) query = query.lte("birth_date", max);
      continue;
    }

    if (c.id === "joining_date") {
      const min = String(c.min_value ?? "").trim();
      const max = String(c.max_value ?? "").trim();

      if (min) query = query.gte("created_at", `${min}T00:00:00.000Z`);
      if (max) query = query.lte("created_at", `${max}T23:59:59.999Z`);
      continue;
    }

    if (c.id === "latest_purchase") {
      const minDays = toNumber(c.min_value);
      const maxDays = toNumber(c.max_value);

      if (minDays !== null || maxDays !== null) {
        query = query.not("last_order_at", "is", null);

        if (maxDays !== null) {
          query = query.gte("last_order_at", daysAgoIso(maxDays));
        }

        if (minDays !== null) {
          query = query.lte("last_order_at", daysAgoIso(minDays));
        }
      }
      continue;
    }
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);

  return data ?? [];
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body?.name ?? "").trim();
    const icon = String(body?.icon ?? "👥").trim();
    const conditions = Array.isArray(body?.conditions) ? body.conditions : [];

    if (!name) {
      return NextResponse.json({ error: "اسم المجموعة مطلوب" }, { status: 400 });
    }

    const storeId = await resolveStoreId();

    if (!storeId) {
      return NextResponse.json({ error: "تعذر تحديد المتجر" }, { status: 401 });
    }

    const admin = supabaseAdmin();

    const { data: group, error: groupError } = await admin
      .from("customer_groups")
      .insert({
        store_id: storeId,
        name,
        icon,
        conditions,
      })
      .select("id,name,icon,created_at,conditions")
      .single();

    if (groupError) {
      return NextResponse.json({ error: groupError.message }, { status: 500 });
    }

    const customers = await filterCustomersByConditions(storeId, conditions);

    await admin
      .from("customer_group_members")
      .delete()
      .eq("group_id", group.id)
      .eq("store_id", storeId);

    if (customers.length > 0) {
      const rows = customers.map((c: any) => ({
        group_id: group.id,
        customer_id: c.id,
        store_id: storeId,
      }));

      const { error: membersError } = await admin
        .from("customer_group_members")
        .upsert(rows, { onConflict: "group_id,customer_id" });

      if (membersError) {
        return NextResponse.json({ error: membersError.message }, { status: 500 });
      }
    }

    return NextResponse.json(
      {
        ok: true,
        group: {
          id: group.id,
          name: group.name,
          icon: group.icon ?? "👥",
          created_at: group.created_at,
        },
        customers_count: customers.length,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "فشل الحفظ" },
      { status: 500 }
    );
  }
}