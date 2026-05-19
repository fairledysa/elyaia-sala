// FILE: api/feedback/[id]/delete/route.ts

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getStoreIdFromSession } from "@/lib/auth/getStoreId";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const storeId = await getStoreIdFromSession();
    const sb = supabaseAdmin();

    const { error } = await sb
      .from("review_entries")
      .delete()
      .eq("id", id)
      .eq("store_id", storeId);

    if (error) {
      return Response.json({ ok: false, error: error.message }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (error: any) {
    return Response.json(
      { ok: false, error: error?.message || "UNHANDLED_DELETE_ERROR" },
      { status: 500 }
    );
  }
}