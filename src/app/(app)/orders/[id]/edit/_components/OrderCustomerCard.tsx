// FILE: apps/merchant/src/app/(app)/orders/[id]/edit/_components/OrderCustomerCard.tsx
"use client";

import {
  ClipboardCopy,
  Mail,
  MessageCircle,
  MessageSquare,
  Phone,
  UserCircle2,
  Pencil,
  Plus,
  Search,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Modal, {
  ModalBody,
  ModalFooter,
  ModalFooterChild,
  ModalHeader,
} from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import type { CustomerMini, OrderDetails } from "../OrderEditPageClient";
import { s } from "../OrderEditPageClient";

type SearchCustomerItem = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  phone_e164?: string | null;
  birth_date?: string | null;
  gender?: string | null;
};

function ActionCircle({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="adm-order-edit-actionCircle"
    >
      {children}
    </button>
  );
}

function splitName(fullName: string) {
  const clean = s(fullName);
  if (!clean) return { firstName: "", lastName: "" };

  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return {
      firstName: parts[0] || "",
      lastName: "",
    };
  }

  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" "),
  };
}

function CustomerEditModal({
  open,
  orderId,
  currentCustomer,
  onClose,
  onSaved,
}: {
  open: boolean;
  orderId: string;
  currentCustomer: CustomerMini | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);

  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SearchCustomerItem[]>([]);
  const [showCreateFields, setShowCreateFields] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");

  const initialName = splitName(s(currentCustomer?.full_name));

  const [firstName, setFirstName] = useState(initialName.firstName);
  const [lastName, setLastName] = useState(initialName.lastName);
  const [phone, setPhone] = useState(s(currentCustomer?.phone_e164));
  const [email, setEmail] = useState(s(currentCustomer?.email));
  const [birthDate, setBirthDate] = useState(s(currentCustomer?.birth_date));
  const [gender, setGender] = useState(s(currentCustomer?.gender));

  useEffect(() => {
    if (!open) return;

    const parsed = splitName(s(currentCustomer?.full_name));
    setSearch("");
    setResults([]);
    setShowCreateFields(false);
    setSelectedCustomerId("");
    setFirstName(parsed.firstName);
    setLastName(parsed.lastName);
    setPhone(s(currentCustomer?.phone_e164));
    setEmail(s(currentCustomer?.email));
    setBirthDate(s(currentCustomer?.birth_date));
    setGender(s(currentCustomer?.gender));
  }, [open, currentCustomer]);

  useEffect(() => {
    if (!open) return;

    const q = s(search);
    if (q.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearching(true);

        const res = await fetch(
          `/api/orders/customer-search?q=${encodeURIComponent(q)}`,
          {
            cache: "no-store",
            credentials: "include",
          }
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || "تعذر البحث عن العملاء");
        }

        setResults(Array.isArray(data?.rows) ? data.rows : []);
      } catch (e: any) {
        setResults([]);
        alert(s(e?.message) || "تعذر البحث عن العملاء");
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [search, open]);

  const fullName = useMemo(() => {
    return [s(firstName), s(lastName)].filter(Boolean).join(" ").trim();
  }, [firstName, lastName]);

  function fillFromCustomer(row: SearchCustomerItem) {
    const parsed = splitName(s(row.full_name));
    setSelectedCustomerId(s(row.id));
    setFirstName(parsed.firstName);
    setLastName(parsed.lastName);
    setPhone(s(row.phone_e164));
    setEmail(s(row.email));
    setBirthDate(s(row.birth_date));
    setGender(s(row.gender));
    setShowCreateFields(true);
  }

  async function save() {
    try {
      if (!selectedCustomerId && !fullName) {
        alert("أدخل اسم العميل");
        return;
      }

      if (!selectedCustomerId && !phone) {
        alert("أدخل رقم الجوال");
        return;
      }

      setSaving(true);

      const body = selectedCustomerId
        ? { customer_id: selectedCustomerId }
        : {
            customer: {
              full_name: fullName,
              phone_e164: s(phone) || null,
              email: s(email) || null,
              birth_date: s(birthDate) || null,
              gender: s(gender) || null,
            },
          };

      const res = await fetch(`/api/orders/${orderId}/customer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "فشل تحديث العميل");
      }

      await onSaved();
      onClose();
    } catch (e: any) {
      alert(s(e?.message) || "فشل تحديث العميل");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={open} setIsOpen={() => onClose()} isStaticBackdrop isScrollable>
      <ModalHeader>تعديل بيانات العميل</ModalHeader>

      <ModalBody>
        <div className="space-y-6" dir="rtl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <Button
              variant="solid"
              color="primary"
              dimension="lg"
              className="shrink-0"
              onClick={() => {
                setSelectedCustomerId("");
                setShowCreateFields(true);
                setFirstName("");
                setLastName("");
                setPhone("");
                setEmail("");
                setBirthDate("");
                setGender("");
              }}
            >
              <span className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />
                إضافة عميل جديد
              </span>
            </Button>

            <div className="relative flex-1">
              <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="البحث في قائمة العملاء ..."
                className="h-12 w-full rounded-lg border border-zinc-200 bg-white pr-10 pl-4 text-right text-sm outline-none"
              />
            </div>
          </div>

          {search.length >= 2 ? (
            <div className="rounded-xl border border-zinc-200 bg-white">
              {searching ? (
                <div className="px-4 py-4 text-sm text-zinc-500">
                  جارٍ البحث...
                </div>
              ) : results.length === 0 ? (
                <div className="px-4 py-4 text-sm text-zinc-400">
                  لا يوجد عميل مطابق
                </div>
              ) : (
                <div className="max-h-[220px] overflow-y-auto">
                  {results.map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => fillFromCustomer(row)}
                      className="flex w-full items-center justify-between border-b border-zinc-100 px-4 py-3 text-right last:border-b-0 hover:bg-zinc-50"
                    >
                      <div className="text-right">
                        <div className="text-sm font-medium text-zinc-800">
                          {s(row.full_name) || "بدون اسم"}
                        </div>
                        {s(row.email) ? (
                          <div className="mt-1 text-xs text-zinc-400">
                            {s(row.email)}
                          </div>
                        ) : null}
                      </div>

                      <div className="text-sm text-zinc-500" dir="ltr">
                        {s(row.phone_e164) || "-"}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {showCreateFields ? (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="الاسم الأول"
                  className="h-12 rounded-lg border border-zinc-200 bg-white px-4 text-right text-sm outline-none"
                />

                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="اسم العائلة"
                  className="h-12 rounded-lg border border-zinc-200 bg-white px-4 text-right text-sm outline-none"
                />
              </div>

              <div className="grid grid-cols-[90px_1fr] overflow-hidden rounded-lg border border-zinc-200">
                <div className="flex items-center justify-center border-l border-zinc-200 bg-zinc-50 text-sm text-zinc-700">
                  <span dir="ltr">+966</span>
                </div>

                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="5678 234 051"
                  className="h-12 bg-white px-4 text-left text-sm outline-none"
                  dir="ltr"
                />
              </div>

              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="البريد الالكتروني (اختياري)"
                className="h-12 rounded-lg border border-zinc-200 bg-white px-4 text-right text-sm outline-none"
              />

              <input
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                type="date"
                className="h-12 rounded-lg border border-zinc-200 bg-white px-4 text-right text-sm outline-none"
              />

              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="h-12 rounded-lg border border-zinc-200 bg-white px-4 text-right text-sm outline-none"
              >
                <option value="">اختر النوع</option>
                <option value="male">ذكر</option>
                <option value="female">أنثى</option>
              </select>
            </>
          ) : null}
        </div>
      </ModalBody>

      <ModalFooter className="gap-4">
        <ModalFooterChild className="w-full">
          <Button
            className="w-full"
            variant="outline"
            color="zinc"
            dimension="lg"
            onClick={onClose}
            isDisable={saving}
          >
            إلغاء
          </Button>
        </ModalFooterChild>

        <ModalFooterChild className="w-full">
          <Button
            className="w-full"
            variant="solid"
            color="primary"
            dimension="lg"
            onClick={save}
            isLoading={saving}
            isDisable={saving}
          >
            حفظ
          </Button>
        </ModalFooterChild>
      </ModalFooter>
    </Modal>
  );
}

export default function OrderCustomerCard({
  order,
  customer,
  onUpdated,
}: {
  order: OrderDetails;
  customer: CustomerMini | null;
  onUpdated: () => Promise<void> | void;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);

  const name = s(customer?.full_name) || "العميل";
  const phone = s(customer?.phone_e164) || "-";
  const email = s(customer?.email);

  function goToCustomer() {
    if (!order?.customer_id) return;
    router.push(`/customers/${order.customer_id}`);
  }

  return (
    <>
      <section className="adm-order-edit-card adm-order-edit-customer">
        <div className="adm-order-edit-card__head">
          <h3 className="adm-order-edit-card__title">العميل</h3>

          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="adm-order-edit-btn adm-order-edit-btn--outline"
          >
            تعديل العميل
            <Pencil className="h-4 w-4" />
          </button>
        </div>

        <div className="adm-order-edit-customer__body">
          <div className="adm-order-edit-customer__avatar">
            <UserCircle2 className="h-12 w-12" />
          </div>

          <div className="adm-order-edit-customer__info">
            <button
              type="button"
              onClick={goToCustomer}
              className="adm-order-edit-customer__name"
            >
              {name}
            </button>

            <div className="adm-order-edit-customer__phone" dir="ltr">
              {phone}
            </div>

            <div className="adm-order-edit-customer__actions">
              <ActionCircle
                label="اتصال"
                onClick={() => {
                  if (!phone || phone === "-") return;
                  window.location.href = `tel:${phone}`;
                }}
              >
                <Phone className="h-4 w-4" />
              </ActionCircle>

              <ActionCircle
                label="بريد"
                onClick={() => {
                  if (!email) return;
                  window.location.href = `mailto:${email}`;
                }}
              >
                <Mail className="h-4 w-4" />
              </ActionCircle>

              <ActionCircle
                label="رسائل"
                onClick={() => {
                  if (!phone || phone === "-") return;
                  window.location.href = `sms:${phone}`;
                }}
              >
                <MessageSquare className="h-4 w-4" />
              </ActionCircle>

              <ActionCircle
                label="واتساب"
                onClick={() => {
                  if (!phone || phone === "-") return;
                  const clean = phone.replace("+", "");
                  window.open(`https://wa.me/${clean}`, "_blank");
                }}
              >
                <MessageCircle className="h-4 w-4" />
              </ActionCircle>

              <ActionCircle
                label="نسخ"
                onClick={() => {
                  if (!phone || phone === "-") return;
                  void navigator.clipboard.writeText(phone);
                }}
              >
                <ClipboardCopy className="h-4 w-4" />
              </ActionCircle>
            </div>
          </div>
        </div>
      </section>

      <CustomerEditModal
        open={editOpen}
        orderId={order.id}
        currentCustomer={customer}
        onClose={() => setEditOpen(false)}
        onSaved={onUpdated}
      />
    </>
  );
}