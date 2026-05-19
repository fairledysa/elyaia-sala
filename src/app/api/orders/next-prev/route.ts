///app/api/orders/next-prev/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const sb = await supabaseServer();

  const { searchParams } = new URL(req.url);

  const id = searchParams.get("id");
  const statusType = searchParams.get("status_type"); // base | store
  const statusValue = searchParams.get("status_value");

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  // 🔹 جيب الطلب الحالي
  const { data: current } = await sb
    .from("orders")
    .select("id, created_at, base_status_key, store_status_id")
    .eq("id", id)
    .single();

  if (!current) {
    return NextResponse.json({ prevId: null, nextId: null });
  }

  let query = sb
    .from("orders")
    .select("id, created_at")
    .order("created_at", { ascending: false });

  // 🔹 نفس الفلترة (اختياري)
  if (statusType === "base" && statusValue) {
    query = query.eq("base_status_key", statusValue);
  }

  if (statusType === "store" && statusValue) {
    query = query.eq("store_status_id", statusValue);
  }

  const { data: rows } = await query;

  if (!rows || rows.length === 0) {
    return NextResponse.json({ prevId: null, nextId: null });
  }

  const index = rows.findIndex((x) => x.id === id);

  const prevId = index > 0 ? rows[index - 1]?.id : null;
  const nextId =
    index >= 0 && index < rows.length - 1 ? rows[index + 1]?.id : null;

  return NextResponse.json({
    prevId,
    nextId,
  });
}