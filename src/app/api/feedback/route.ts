// FILE: apps/merchant/src/app/api/feedback/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getStoreIdFromSession } from "@/lib/auth/getStoreId";

function s(v: unknown) {
  return String(v ?? "").trim();
}

function n(v: unknown, fallback = 0) {
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
}

function formatRelativeAr(value: unknown) {
  const iso = s(value);
  if (!iso) return "-";

  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";

  const diffMs = Date.now() - d.getTime();
  const sec = Math.max(0, Math.floor(diffMs / 1000));
  const min = Math.floor(sec / 60);
  const hour = Math.floor(min / 60);
  const day = Math.floor(hour / 24);

  if (sec < 60) return "منذ لحظات";
  if (min < 60) return `منذ ${min} دقيقة`;
  if (hour < 24) return `منذ ${hour} ساعة`;
  if (day < 30) return `منذ ${day} يوم`;

  return d.toLocaleDateString("ar-SA");
}

function isShippingReview(row: any) {
  const reviewType = s(row?.review_type).toLowerCase();
  const targetType = s(row?.target_type).toLowerCase();
  const body = s(row?.body);

  return (
    reviewType === "comment" &&
    (targetType === "store" || targetType === "shipping") &&
    body.startsWith("تقييم الشحن:")
  );
}

function isSupportContact(row: any) {
  const reviewType = s(row?.review_type).toLowerCase();
  const targetType = s(row?.target_type).toLowerCase();
  const body = s(row?.body);

  return (
    reviewType === "comment" &&
    targetType === "store" &&
    body.startsWith("طلب تواصل من خدمة العملاء")
  );
}

function cleanSupportContactBody(body: unknown) {
  return s(body).replace(/^طلب تواصل من خدمة العملاء\s*/m, "").trim();
}

function cleanShippingBody(body: unknown) {
  return s(body).replace(/^تقييم الشحن:\s*[1-5]\s*\/\s*5\s*/m, "").trim();
}

function shippingRating(body: unknown) {
  const text = s(body);
  const match = text.match(/تقييم الشحن:\s*([1-5])\s*\/\s*5/);
  return match?.[1] ? Number(match[1]) : null;
}

function toFeedbackType(row: any) {
  const reviewType = s(row?.review_type).toLowerCase();
  const targetType = s(row?.target_type).toLowerCase();

  if (isSupportContact(row)) return "support_contact";
  if (isShippingReview(row)) return "shipping_review";

  if (reviewType === "question") {
    if (targetType === "product") return "product_question";
    return "page_question";
  }

  if (targetType === "product") return "product_review";
  if (targetType === "shipping") return "shipping_review";

  return "store_review";
}

function buildSubject(row: any, productName: string | null) {
  const type = toFeedbackType(row);
  const targetType = s(row?.target_type).toLowerCase();

  if (type === "support_contact") {
    return {
      subject_title: "خدمة العملاء",
      subject_subtitle: "طلب تواصل من العميل",
    };
  }

  if (type === "product_review") {
    return {
      subject_title: productName || "منتج",
      subject_subtitle: "تقييم المنتج",
    };
  }

  if (type === "product_question") {
    return {
      subject_title: productName || "منتج",
      subject_subtitle: "سؤال على منتج",
    };
  }

  if (type === "page_question") {
    if (targetType === "page") {
      return {
        subject_title: s(row?.title) || "صفحة تعريفية",
        subject_subtitle: "سؤال على صفحة",
      };
    }

    if (targetType === "category") {
      return {
        subject_title: s(row?.title) || "قسم",
        subject_subtitle: "سؤال على قسم",
      };
    }

    return {
      subject_title: "المتجر",
      subject_subtitle: "سؤال",
    };
  }

  if (type === "shipping_review") {
    return {
      subject_title: "الشحن",
      subject_subtitle: "تقييم تجربة الشحن والتوصيل",
    };
  }

  return {
    subject_title: "المتجر",
    subject_subtitle: "تقييم المتجر",
  };
}

export async function GET(req: NextRequest) {
  try {
    const storeId = await getStoreIdFromSession();
    const supabase = supabaseAdmin();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, n(searchParams.get("page"), 1));
    const pageSize = Math.max(
      1,
      Math.min(100, n(searchParams.get("pageSize"), 20)),
    );
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const countQuery = await supabase
      .from("review_entries")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId);

    const total = countQuery.count ?? 0;

    const { data: rows, error } = await supabase
      .from("review_entries")
      .select(
        `
        id,
        store_id,
        target_type,
        target_id,
        customer_id,
        order_id,
        order_item_id,
        review_type,
        rating,
        title,
        body,
        author_name,
        author_email,
        is_guest,
        status,
        created_at,
        updated_at,
        published_at,
        customers (
          id,
          full_name,
          email
        ),
        orders (
          id,
          public_no
        ),
        order_items (
          id,
          name,
          product_id
        ),
        review_replies (
          id,
          body,
          created_at,
          author_type
        )
      `,
      )
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("feedback GET error", error);
      return NextResponse.json({
        items: [],
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
          hasPrev: page > 1,
          hasNext: page < Math.ceil(total / pageSize),
        },
      });
    }

    const reviewIds = (rows ?? [])
      .map((row: any) => s(row?.id))
      .filter(Boolean);

    const reviewMediaMap = new Map<string, any[]>();

    if (reviewIds.length > 0) {
      const { data: reviewMedia, error: reviewMediaError } = await supabase
        .from("review_media")
        .select(
          "id,review_id,file_url,thumbnail_url,alt_text,media_type,sort_order",
        )
        .eq("store_id", storeId)
        .in("review_id", reviewIds)
        .order("sort_order", { ascending: true });

      if (!reviewMediaError && Array.isArray(reviewMedia)) {
        for (const media of reviewMedia) {
          const reviewId = s(media?.review_id);
          if (!reviewId) continue;

          const arr = reviewMediaMap.get(reviewId) || [];
          arr.push({
            id: s(media?.id),
            file_url: s(media?.file_url),
            thumbnail_url: s(media?.thumbnail_url) || null,
            alt_text: s(media?.alt_text) || null,
            media_type: s(media?.media_type) || "image",
            sort_order: Number.isFinite(Number(media?.sort_order))
              ? Number(media.sort_order)
              : 0,
          });

          reviewMediaMap.set(reviewId, arr);
        }
      }
    }

    const productIds = new Set<string>();

    for (const row of rows ?? []) {
      const targetType = s(row?.target_type).toLowerCase();
      const targetId = s(row?.target_id);
      const orderItemProductId = s((row?.order_items as any)?.product_id);

      if (targetType === "product" && targetId) productIds.add(targetId);
      if (orderItemProductId) productIds.add(orderItemProductId);
    }

    const productIdList = Array.from(productIds);
    const productsMap = new Map<string, any>();
    const mediaMap = new Map<string, string>();

    if (productIdList.length > 0) {
      const { data: products } = await supabase
        .from("products")
        .select("id, name")
        .in("id", productIdList);

      for (const p of products ?? []) {
        productsMap.set(String(p.id), p);
      }

      const { data: media } = await supabase
        .from("product_media")
        .select("product_id, original_url, thumbnail_url, is_default, sort_order")
        .in("product_id", productIdList)
        .order("is_default", { ascending: false })
        .order("sort_order", { ascending: true });

      for (const m of media ?? []) {
        const pid = s(m.product_id);
        if (!pid || mediaMap.has(pid)) continue;
        mediaMap.set(pid, s(m.thumbnail_url) || s(m.original_url) || "");
      }
    }

    const items = (rows ?? []).map((row: any) => {
      const type = toFeedbackType(row);

      const orderNo = row?.orders?.public_no
        ? String(row.orders.public_no)
        : null;

      const customerName =
        s(row?.customers?.full_name) || s(row?.author_name) || "";

      const isGuest = Boolean(row?.is_guest);
      const customerDisplayName = customerName || (isGuest ? "زائر" : "عميل");

      const targetProductId =
        s(row?.target_type).toLowerCase() === "product"
          ? s(row?.target_id)
          : s(row?.order_items?.product_id);

      const productRow = targetProductId
        ? productsMap.get(targetProductId)
        : null;

      const productName = s(productRow?.name) || s(row?.order_items?.name) || null;

      const productImage =
        targetProductId ? mediaMap.get(targetProductId) || null : null;

      const replies = Array.isArray(row?.review_replies)
        ? [...row.review_replies].sort((a, b) => {
            const da = new Date(a?.created_at ?? 0).getTime();
            const db = new Date(b?.created_at ?? 0).getTime();
            return db - da;
          })
        : [];

      const latestReply = replies[0] ?? null;
      const subject = buildSubject(row, productName);

      const content =
        type === "support_contact"
          ? cleanSupportContactBody(row?.body)
          : type === "shipping_review"
            ? cleanShippingBody(row?.body)
            : s(row?.body);

      return {
        id: String(row.id),
        type,

        target_type: row?.target_type ?? null,
        review_type: row?.review_type ?? null,

        subject_title: subject.subject_title,
        subject_subtitle: subject.subject_subtitle,
        subject_image: productImage,

        product_name: productName,
        product_image: productImage,

        order_no: orderNo,

        customer_name: customerDisplayName,
        customer_avatar: null,
        customer_label: isGuest ? "زائر" : "عميل",

        is_guest: isGuest,

        rating:
          type === "shipping_review"
            ? shippingRating(row?.body)
            : row?.rating == null || row?.rating === ""
              ? null
              : Number(row.rating),

        content: content || null,

        media: reviewMediaMap.get(String(row.id)) || [],

        reply: latestReply?.body ? String(latestReply.body) : null,
        replied_by: latestReply?.author_type === "admin" ? "رد المتجر" : null,
        replied_at_human: latestReply?.created_at
          ? formatRelativeAr(latestReply.created_at)
          : null,

        is_published: s(row?.status) === "published",

        created_at_human: formatRelativeAr(row?.created_at),
        created_at: row?.created_at ?? null,
      };
    });

    const totalPages = Math.ceil(total / pageSize);

    return NextResponse.json({
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasPrev: page > 1,
        hasNext: page < totalPages,
      },
    });
  } catch (e) {
    console.error("feedback GET fatal", e);
    return NextResponse.json({
      items: [],
      pagination: {
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0,
        hasPrev: false,
        hasNext: false,
      },
    });
  }
}