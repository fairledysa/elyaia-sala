// FILE: apps/merchant/src/app/(app)/feedback/_components/types.ts

export type FeedbackType =
  | "store_review"
  | "product_review"
  | "shipping_review"
  | "support_contact"
  | "product_question"
  | "page_question";

export type FeedbackMedia = {
  id: string;
  file_url: string;
  thumbnail_url?: string | null;
  alt_text?: string | null;
  media_type?: "image" | "video" | string | null;
  sort_order?: number | null;
};

export type FeedbackItem = {
  id: string;

  type: FeedbackType;

  target_type?: string | null;
  review_type?: string | null;

  subject_title: string;
  subject_subtitle?: string | null;
  subject_image?: string | null;

  product_name?: string | null;
  product_image?: string | null;

  order_no?: string | null;

  customer_name: string;
  customer_avatar?: string | null;
  customer_label?: string | null;

  rating?: number | null;
  content?: string | null;

  media?: FeedbackMedia[];

  reply?: string | null;
  replied_by?: string | null;
  replied_at_human?: string | null;

  is_published: boolean;

  created_at_human: string;
  created_at?: string | null;
};