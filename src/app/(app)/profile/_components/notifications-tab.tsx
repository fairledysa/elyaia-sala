// apps/merchant/src/app/(app)/profile/_components/notifications-tab.tsx
"use client";

import Card, {
  CardBody,
  CardHeader,
  CardHeaderChild,
  CardTitle,
  CardSubTitle,
} from "@/components/ui/Card";

export default function NotificationsTab() {
  return (
    <Card>
      <CardHeader>
        <CardHeaderChild>
          <CardTitle>
            <div>
              <div>الإشعارات</div>
              <CardSubTitle>
                قريبًا: إعدادات إشعارات البريد والواتساب.
              </CardSubTitle>
            </div>
          </CardTitle>
        </CardHeaderChild>
      </CardHeader>
      <CardBody>
        <div className="text-sm text-zinc-600">
          سيتم تطويرها في بطاقة مستقلة لاحقًا.
        </div>
      </CardBody>
    </Card>
  );
}
