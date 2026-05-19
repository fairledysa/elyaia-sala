//app/layout.tsx
import type { Metadata } from "next";

 
import "./globals.css";
import "./index.css";
import "./styles.css";

 
export const metadata: Metadata = {
  title: "Merchant",
  description: "Merchant Panel",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        {/* ✅ ثبت activeTab قبل hydration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function () {
  try {
    var tab = localStorage.getItem('bolt_activeTab') || 'dashboard';
    document.documentElement.setAttribute('data-bolt-tab', tab);
  } catch (e) {}
})();
`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
