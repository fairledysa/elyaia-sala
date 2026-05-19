// apps/merchant/src/app/(app)/profile/_components/profile-tab.tsx
"use client";

import { useFormik } from "formik";

import Card, {
  CardBody,
  CardHeader,
  CardHeaderChild,
  CardTitle,
  CardSubTitle,
} from "@/components/ui/Card";
import Label from "@/components/form/Label";
import Input from "@/components/form/Input";
import Description from "@/components/form/Description";
import Button from "@/components/ui/Button";

export default function ProfileTab({
  initialName,
  initialEmail,
}: {
  initialName: string;
  initialEmail: string;
}) {
  const formik = useFormik({
    initialValues: {
      name: initialName || "",
      email: initialEmail || "",
    },
    onSubmit: async () => {
      // لاحقًا: تحديث الاسم/البيانات في user_metadata أو جدول profile
      alert("حاليًا: UI فقط. التحديث الحقيقي بنربطه لاحقًا.");
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardHeaderChild>
          <CardTitle>
            <div>
              <div>الملف الشخصي</div>
              <CardSubTitle>إدارة بيانات الحساب الأساسية.</CardSubTitle>
            </div>
          </CardTitle>
        </CardHeaderChild>
      </CardHeader>

      <CardBody>
        <form onSubmit={formik.handleSubmit} className="flex flex-col gap-8">
          {/* الاسم */}
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 lg:col-span-3 xl:col-span-2">
              <Label htmlFor="name">الاسم</Label>
            </div>
            <div className="col-span-12 lg:col-span-9 xl:col-span-5">
              <Input
                id="name"
                name="name"
                placeholder="اكتب الاسم"
                aria-describedby="profile-name-desc"
                value={formik.values.name}
                onChange={formik.handleChange}
              />
              <Description id="profile-name-desc" className="mt-2">
                اسم العرض داخل لوحة التحكم.
              </Description>
            </div>
          </div>

          {/* البريد */}
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 lg:col-span-3 xl:col-span-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
            </div>
            <div className="col-span-12 lg:col-span-9 xl:col-span-5">
              <Input
                id="email"
                name="email"
                type="email"
                dir="ltr"
                aria-describedby="profile-email-desc"
                value={formik.values.email}
                onChange={formik.handleChange}
                disabled
              />
              <Description id="profile-email-desc" className="mt-2">
                تعديل البريد يكون من تبويب “الأمان” .
              </Description>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="solid" aria-label="Save" type="submit">
              حفظ
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
