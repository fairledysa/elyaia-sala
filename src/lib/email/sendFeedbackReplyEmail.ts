// FILE: apps/merchant/src/lib/email/sendFeedbackReplyEmail.ts

type SendFeedbackReplyEmailInput = {
  to: string;
  customerName?: string | null;
  storeName?: string | null;
  subjectTitle?: string | null;
  originalMessage?: string | null;
  replyBody: string;
};

function esc(v: unknown) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendFeedbackReplyEmail(
  input: SendFeedbackReplyEmailInput
) {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.RESEND_FROM_EMAIL ||
    process.env.RESEND_FROM ||
    "onboarding@resend.dev";

  if (!apiKey) {
    console.warn("Missing RESEND_API_KEY");
    return { ok: false, skipped: true, reason: "MISSING_RESEND_API_KEY" };
  }

  const to = String(input.to ?? "").trim();
  if (!to) {
    return { ok: false, skipped: true, reason: "MISSING_TO" };
  }

  const customerName = esc(input.customerName || "عميلنا العزيز");
  const storeName = esc(input.storeName || "المتجر");
  const subjectTitle = esc(input.subjectTitle || "رد جديد على استفسارك");
  const originalMessage = esc(input.originalMessage || "");
  const replyBody = esc(input.replyBody || "");

  const subject = `رد جديد من ${storeName}`;

  const html = `
  <div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;background:#f8fafc;padding:24px;">
    <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
      <div style="padding:20px 24px;background:#111827;color:#ffffff;font-size:20px;font-weight:700;">
        ${storeName}
      </div>

      <div style="padding:24px;">
        <div style="font-size:18px;font-weight:700;color:#111827;margin-bottom:12px;">
          مرحباً ${customerName}
        </div>

        <div style="font-size:14px;line-height:1.9;color:#374151;margin-bottom:18px;">
          تم إرسال رد جديد بخصوص ${subjectTitle}.
        </div>

        ${
          originalMessage
            ? `
          <div style="margin-bottom:12px;font-size:13px;color:#6b7280;font-weight:700;">رسالتك:</div>
          <div style="margin-bottom:20px;padding:14px 16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;font-size:14px;line-height:1.9;color:#111827;">
            ${originalMessage}
          </div>
        `
            : ""
        }

        <div style="margin-bottom:12px;font-size:13px;color:#6b7280;font-weight:700;">رد المتجر:</div>
        <div style="padding:14px 16px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;font-size:14px;line-height:1.9;color:#111827;">
          ${replyBody}
        </div>

        <div style="margin-top:24px;font-size:12px;color:#9ca3af;">
          هذه رسالة إشعار تلقائية من المتجر.
        </div>
      </div>
    </div>
  </div>
  `;

  const text = [
    `مرحباً ${input.customerName || "عميلنا العزيز"}`,
    ``,
    `تم إرسال رد جديد من ${input.storeName || "المتجر"}.`,
    ``,
    input.originalMessage ? `رسالتك: ${input.originalMessage}` : "",
    ``,
    `رد المتجر: ${input.replyBody}`,
  ]
    .filter(Boolean)
    .join("\n");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      text,
    }),
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    console.error("sendFeedbackReplyEmail failed", json);
    return { ok: false, error: json };
  }

  return { ok: true, data: json };
}