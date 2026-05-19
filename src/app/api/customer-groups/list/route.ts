// app/api/customer-groups/list/route.ts
import { NextRequest, NextResponse } from "next/server";
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

type StoreCustomerRow = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  phone_e164?: string | null;
  gender?: string | null;
  birth_date?: string | null;
  created_at?: string | null;
  total_orders?: number | null;
  total_spent?: number | null;
  last_order_at?: string | null;
};

function toNumber(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function daysBetweenFromNow(dateValue?: string | null) {
  if (!dateValue) return null;
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return null;

  const now = new Date();
  const diff = now.getTime() - d.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function inNumberRange(
  actual: number,
  operator?: string | null,
  value?: string | null,
  minValue?: string | null,
  maxValue?: string | null
) {
  const op = String(operator ?? ">").trim();
  const main = toNumber(value ?? minValue);
  const max = toNumber(maxValue);

  if (op === "between") {
    if (main !== null && actual < main) return false;
    if (max !== null && actual > max) return false;
    return true;
  }

  if (main === null) return true;
  if (op === ">") return actual > main;
  if (op === "<") return actual < main;
  if (op === "=") return actual === main;

  return true;
}

function inDateRange(
  actual?: string | null,
  minValue?: string | null,
  maxValue?: string | null
) {
  if (!actual) return false;

  const actualDate = new Date(actual);
  if (Number.isNaN(actualDate.getTime())) return false;

  if (minValue) {
    const minDate = new Date(`${minValue}T00:00:00.000Z`);
    if (!Number.isNaN(minDate.getTime()) && actualDate < minDate) return false;
  }

  if (maxValue) {
    const maxDate = new Date(`${maxValue}T23:59:59.999Z`);
    if (!Number.isNaN(maxDate.getTime()) && actualDate > maxDate) return false;
  }

  return true;
}

function inDaysRange(
  actualDate?: string | null,
  minValue?: string | null,
  maxValue?: string | null
) {
  const days = daysBetweenFromNow(actualDate);
  if (days === null) return false;

  const min = toNumber(minValue);
  const max = toNumber(maxValue);

  if (min !== null && days < min) return false;
  if (max !== null && days > max) return false;

  return true;
}

function customerMatchesAllConditions(
  customer: StoreCustomerRow,
  conditions: ConditionInput[]
) {
  for (const c of conditions) {
    if (c.id === "doesnt_have_email") {
      const email = String(customer.email ?? "").trim();
      if (email) return false;
      continue;
    }

    if (c.id === "doesnt_have_orders") {
      const totalOrders = Number(customer.total_orders ?? 0);
      if (totalOrders !== 0) return false;
      continue;
    }

    if (c.id === "gender") {
      const expected = String(c.value ?? c.min_value ?? "")
        .trim()
        .toLowerCase();
      const actual = String(customer.gender ?? "")
        .trim()
        .toLowerCase();

      if (!expected) continue;
      if (actual !== expected) return false;
      continue;
    }

    if (c.id === "total_orders") {
      const actual = Number(customer.total_orders ?? 0);
      if (!inNumberRange(actual, c.operator, c.value, c.min_value, c.max_value)) {
        return false;
      }
      continue;
    }

    if (c.id === "total_sales") {
      const actual = Number(customer.total_spent ?? 0);
      if (!inNumberRange(actual, c.operator, c.value, c.min_value, c.max_value)) {
        return false;
      }
      continue;
    }

    if (c.id === "birthday") {
      if (!inDateRange(customer.birth_date, c.min_value, c.max_value)) {
        return false;
      }
      continue;
    }

    if (c.id === "joining_date") {
      if (!inDateRange(customer.created_at, c.min_value, c.max_value)) {
        return false;
      }
      continue;
    }

    if (c.id === "latest_purchase") {
      if (!inDaysRange(customer.last_order_at, c.min_value, c.max_value)) {
        return false;
      }
      continue;
    }
  }

  return true;
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

async function getStoreCustomers(storeId: string) {
  const admin = supabaseAdmin();

  const { data, error } = await admin
    .from("customers")
    .select(`
      id,
      full_name,
      email,
      phone_e164,
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
    .eq("store_customers.store_id", storeId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as StoreCustomerRow[];
}

export async function GET(req: NextRequest) {
  try {
    const storeId = await resolveStoreId();

    if (!storeId) {
      return NextResponse.json([], { status: 200 });
    }

    const customerId = String(req.nextUrl.searchParams.get("customer_id") ?? "").trim();

    const admin = supabaseAdmin();

    const { data: groups, error: groupsError } = await admin
      .from("customer_groups")
      .select("id,name,icon,created_at,conditions")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });

    if (groupsError) {
      return NextResponse.json({ error: groupsError.message }, { status: 500 });
    }

    const storeCustomers = await getStoreCustomers(storeId);

    let memberGroupIds = new Set<string>();

    if (customerId) {
      const { data: memberships, error: membershipsError } = await admin
        .from("customer_group_members")
        .select("group_id")
        .eq("store_id", storeId)
        .eq("customer_id", customerId);

      if (membershipsError) {
        return NextResponse.json({ error: membershipsError.message }, { status: 500 });
      }

      memberGroupIds = new Set(
        (memberships ?? [])
          .map((row: any) => String(row?.group_id ?? "").trim())
          .filter(Boolean)
      );
    }

    const result = (groups ?? []).map((g: any) => {
      const conditions = Array.isArray(g.conditions) ? g.conditions : [];
      const matched = storeCustomers.filter((customer) =>
        customerMatchesAllConditions(customer, conditions)
      );

      return {
        id: g.id,
        name: g.name,
        icon: g.icon ?? "👥",
        created_at: g.created_at,
        customers_count: matched.length,
        conditions,
        is_member: memberGroupIds.has(String(g.id)),
      };
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to load groups" },
      { status: 500 }
    );
  }
}