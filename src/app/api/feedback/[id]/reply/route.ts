// FILE: apps/merchant/src/app/api/feedback/[id]/reply/route.ts

import { supabaseAdmin } from "@/lib/supabase/admin";
 
import { getStoreIdFromSession } from "@/lib/auth/getStoreId";
import { sendFeedbackReplyEmail } from "@/lib/email/sendFeedbackReplyEmail";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const reviewId = String(id ?? "").trim();

    if (!reviewId) {
      return Response.json(
        { ok: false, error: "REVIEW_ID_REQUIRED" },
        { status: 400 }
      );
    }

    let bodyJson: any = null;
    try {
      bodyJson = await req.json();
    } catch {
      bodyJson = null;
    }

    const replyBody = String(bodyJson?.reply ?? "").trim();

    if (!replyBody) {
      return Response.json(
        { ok: false, error: "REPLY_BODY_REQUIRED" },
        { status: 400 }
      );
    }

    const storeId = await getStoreIdFromSession();
    const supabase = supabaseAdmin();

    const { data: review, error: reviewError } = await supabase
      .from("review_entries")
      .select(`
        id,
        store_id,
        body,
        title,
        author_name,
        author_email,
        customer_id,
        order_id,
        order_item_id
      `)
      .eq("id", reviewId)
      .eq("store_id", storeId)
      .single();

    if (reviewError || !review) {
      return Response.json(
        { ok: false, error: "REVIEW_NOT_FOUND", detail: reviewError?.message },
        { status: 404 }
      );
    }

    const { data: existingReply } = await supabase
      .from("review_replies")
      .select("id")
      .eq("review_id", reviewId)
      .eq("store_id", storeId)
      .eq("author_type", "admin")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let savedReplyId: string | null = null;

    if (existingReply?.id) {
      const { data: updatedReply, error: updateError } = await supabase
        .from("review_replies")
        .update({
          body: replyBody,
          status: "published",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingReply.id)
        .select("id")
        .single();

      if (updateError) {
        return Response.json(
          {
            ok: false,
            error: "REPLY_UPDATE_FAILED",
            detail: updateError.message,
          },
          { status: 500 }
        );
      }

      savedReplyId = updatedReply?.id ?? existingReply.id;
    } else {
      const { data: insertedReply, error: insertError } = await supabase
        .from("review_replies")
        .insert({
          review_id: reviewId,
          store_id: storeId,
          author_type: "admin",
          body: replyBody,
          status: "published",
        })
        .select("id")
        .single();

      if (insertError) {
        return Response.json(
          {
            ok: false,
            error: "REPLY_INSERT_FAILED",
            detail: insertError.message,
          },
          { status: 500 }
        );
      }

      savedReplyId = insertedReply?.id ?? null;
    }

    const { count: repliesCount } = await supabase
      .from("review_replies")
      .select("*", { count: "exact", head: true })
      .eq("review_id", reviewId)
      .eq("store_id", storeId)
      .eq("status", "published");

    await supabase
      .from("review_entries")
      .update({
        reply_count: Number(repliesCount ?? 0),
        updated_at: new Date().toISOString(),
      })
      .eq("id", reviewId)
      .eq("store_id", storeId);

    let customerName = String(review.author_name ?? "عميلنا العزيز").trim();
    let toEmail = String(review.author_email ?? "").trim();
    let subjectTitle = String(review.title ?? "").trim();

    if (review.customer_id) {
      const { data: customer } = await supabase
        .from("customers")
        .select("full_name, email")
        .eq("id", review.customer_id)
        .maybeSingle();

      if (customer?.full_name) {
        customerName = String(customer.full_name).trim();
      }

      if (customer?.email) {
        toEmail = String(customer.email).trim();
      }
    }

    if (!subjectTitle && review.order_item_id) {
      const { data: orderItem } = await supabase
        .from("order_items")
        .select("name")
        .eq("id", review.order_item_id)
        .maybeSingle();

      if (orderItem?.name) {
        subjectTitle = String(orderItem.name).trim();
      }
    }

    if (!subjectTitle && review.order_id) {
      const { data: order } = await supabase
        .from("orders")
        .select("public_no")
        .eq("id", review.order_id)
        .maybeSingle();

      if (order?.public_no) {
        subjectTitle = `طلب #${order.public_no}`;
      }
    }

    if (!subjectTitle) {
      subjectTitle = "استفسارك";
    }

    let emailResult: any = null;

    if (toEmail) {
      emailResult = await sendFeedbackReplyEmail({
        to: toEmail,
        customerName,
        storeName: "المتجر",
        subjectTitle,
        originalMessage: String(review.body ?? ""),
        replyBody,
      });
    }

    return Response.json({
      ok: true,
      reply_id: savedReplyId,
      email_sent: Boolean(emailResult?.ok),
      email_skipped: !toEmail,
    });
  } catch (error: any) {
    return Response.json(
      {
        ok: false,
        error: error?.message || "UNEXPECTED_ERROR",
      },
      { status: 500 }
    );
  }
}