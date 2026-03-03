// FILE: src/app/page.tsx
import Link from "next/link";

export default function HomePage() {
  return (
    <main dir="rtl" style={styles.page}>
      {/* خلفية */}
      <div aria-hidden style={styles.bgGrid} />
      <div aria-hidden style={styles.bgGlow1} />
      <div aria-hidden style={styles.bgGlow2} />

      {/* هيدر */}
      <header style={styles.header}>
        <div style={styles.brand}>
          <div style={styles.logoMark}>E</div>
          <div>
            <div style={styles.brandName}>Elyaia</div>
            <div style={styles.brandTag}>
              تشغيل المشاغل وتتبع التصنيع بالباركود
            </div>
          </div>
        </div>

        <nav style={styles.nav}>
          <a href="#services" style={styles.navLink}>
            خدماتنا
          </a>
          <a href="#contact" style={styles.navLink}>
            تواصل معنا
          </a>
          <Link href="/login" style={{ ...styles.btn, ...styles.btnPrimary }}>
            دخول
          </Link>
        </nav>
      </header>

      {/* هيرو */}
      <section style={styles.hero}>
        <div style={styles.heroCard}>
          <div style={styles.badge}>نظام إنتاج للمشاغل • عبايات</div>

          <h1 style={styles.h1}>
            تتبّع كل قطعة من <span style={styles.h1Accent}>الطباعة</span> إلى{" "}
            <span style={styles.h1Accent}>الشحن</span>… بالمسح فقط
          </h1>

          <p style={styles.p}>
            اطبع بطاقات الإنتاج بنقرة واحدة (A4: 4 قطع)، وامشِ بالمراحل حسب
            إعداداتك: قص → (تطريز) → خياطة → أزرار → كاوية → شحن. كل مسح يحدّث
            الحالة، ويحسب التكلفة، ويخصم الخامات، ويضيف رصيد الموظف تلقائيًا.
          </p>

          <div style={styles.ctaRow}>
            <Link href="/login" style={{ ...styles.btn, ...styles.btnPrimary }}>
              دخول لوحة التحكم
            </Link>

            <a href="#services" style={{ ...styles.btn, ...styles.btnGhost }}>
              استعرض خدماتنا
            </a>

            <a
              href="mailto:info@elyaia.com"
              style={{ ...styles.btn, ...styles.btnSoft }}
            >
              تواصل سريع
            </a>
          </div>

          <div style={styles.statsRow}>
            <div style={styles.stat}>
              <div style={styles.statNum}>⚡</div>
              <div style={styles.statText}>مسح QR للتنفيذ</div>
            </div>
            <div style={styles.stat}>
              <div style={styles.statNum}>🧾</div>
              <div style={styles.statText}>طباعة بطاقات A4</div>
            </div>
            <div style={styles.stat}>
              <div style={styles.statNum}>📦</div>
              <div style={styles.statText}>مخزون + استهلاك خامات</div>
            </div>
            <div style={styles.stat}>
              <div style={styles.statNum}>💳</div>
              <div style={styles.statText}>محفظة ورواتب</div>
            </div>
          </div>
        </div>
      </section>

      {/* خدماتنا */}
      <section id="services" style={styles.section}>
        <div style={styles.sectionHead}>
          <h2 style={styles.h2}>خدماتنا</h2>
          <p style={styles.sectionSub}>
            كل شيء تحتاجه لتشغيل المشغل بشكل منظم، واضح، وسريع.
          </p>
        </div>

        <div style={styles.grid}>
          <ServiceCard
            icon="🖨️"
            title="طباعة الإنتاج بنقرة واحدة"
            desc="تفكيك الطلب إلى قطع، وطباعة (A4: 4 بطاقات) لكل منتج مع رقم الطلب والمقاس والملاحظات وQR."
          />
          <ServiceCard
            icon="🔁"
            title="مراحل قابلة للتخصيص"
            desc="ابنِ المراحل بطريقتك (قص/تطريز/خياطة/أزرار/كاوية/شحن) مع شروط مثل (إذا مطرزة)."
          />
          <ServiceCard
            icon="📲"
            title="تنفيذ بالمسح للموظفين"
            desc="كل موظف له حساب. يمسح القطعة وينفذ المرحلة، والنظام يسجل الوقت والمسؤول ويحدّث الحالة فورًا."
          />
          <ServiceCard
            icon="🧵"
            title="استهلاك خامات ومخزون"
            desc="حدد استهلاك القماش لكل منتج (مثلاً 3 متر نواعم) وخصم تلقائي عند مرحلة القص أو أي مرحلة تحددها."
          />
          <ServiceCard
            icon="💰"
            title="تكاليف مراحل + محفظة موظف"
            desc="تكلفة لكل مرحلة (مثال القص 7 ريال). عند الإنجاز يتم إضافة الرصيد لمحفظة الموظف تلقائيًا."
          />
          <ServiceCard
            icon="📊"
            title="تقارير وتشغيل ذكي"
            desc="تتبع الطلبات والقطع لحظيًا، إنتاجية الموظفين، التأخيرات، والتكاليف، مع سجل تغييرات كامل."
          />
        </div>
      </section>

      {/* تواصل */}
      <section id="contact" style={styles.section}>
        <div style={styles.contactCard}>
          <div>
            <h2 style={styles.h2}>تواصل معنا</h2>
            <p style={styles.sectionSub}>
              خدمة العملاء جاهزة — راسلنا على البريد التالي:
            </p>
          </div>

          <div style={styles.contactRow}>
            <a href="mailto:info@elyaia.com" style={styles.mail}>
              info@elyaia.com
            </a>
            <Link href="/login" style={{ ...styles.btn, ...styles.btnPrimary }}>
              دخول
            </Link>
          </div>
        </div>

        <footer style={styles.footer}>
          <span>© {new Date().getFullYear()} Elyaia</span>
          <span style={styles.footerDot}>•</span>
          <a href="mailto:info@elyaia.com" style={styles.footerLink}>
            info@elyaia.com
          </a>
        </footer>
      </section>
    </main>
  );
}

function ServiceCard(props: { icon: string; title: string; desc: string }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardTop}>
        <div style={styles.icon}>{props.icon}</div>
        <div style={styles.cardTitle}>{props.title}</div>
      </div>
      <div style={styles.cardDesc}>{props.desc}</div>
      <div style={styles.cardHint}>اضغط “دخول” للبدء</div>
    </div>
  );
}

/** ستايل Gen Z (بدون اعتماد على Tailwind) */
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: "24px",
    color: "#0b0f19",
    background:
      "linear-gradient(180deg, #ffffff 0%, #f7f7ff 35%, #ffffff 100%)",
    position: "relative",
    overflow: "hidden",
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans Arabic", "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji"',
  },
  bgGrid: {
    position: "absolute",
    inset: 0,
    backgroundImage:
      "linear-gradient(to right, rgba(20,20,40,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(20,20,40,0.05) 1px, transparent 1px)",
    backgroundSize: "56px 56px",
    maskImage: "radial-gradient(circle at 50% 10%, black 0%, transparent 60%)",
    pointerEvents: "none",
  },
  bgGlow1: {
    position: "absolute",
    width: 520,
    height: 520,
    right: -140,
    top: -160,
    background:
      "radial-gradient(circle, rgba(122, 92, 255, 0.22), transparent 60%)",
    filter: "blur(10px)",
    pointerEvents: "none",
  },
  bgGlow2: {
    position: "absolute",
    width: 620,
    height: 620,
    left: -200,
    bottom: -240,
    background:
      "radial-gradient(circle, rgba(0, 202, 255, 0.18), transparent 60%)",
    filter: "blur(12px)",
    pointerEvents: "none",
  },

  header: {
    maxWidth: 1100,
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    padding: "10px 12px",
    borderRadius: 18,
    background: "rgba(255,255,255,0.65)",
    border: "1px solid rgba(20,20,40,0.10)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
    backdropFilter: "blur(10px)",
    position: "sticky",
    top: 16,
    zIndex: 10,
  },
  brand: { display: "flex", alignItems: "center", gap: 12 },
  logoMark: {
    width: 42,
    height: 42,
    borderRadius: 14,
    display: "grid",
    placeItems: "center",
    fontWeight: 800,
    color: "white",
    background: "linear-gradient(135deg, #7a5cff, #00caff)",
    boxShadow: "0 10px 18px rgba(122,92,255,0.25)",
  },
  brandName: { fontWeight: 800, letterSpacing: -0.4 },
  brandTag: { fontSize: 12, opacity: 0.75, marginTop: 2 },

  nav: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  navLink: {
    padding: "10px 12px",
    borderRadius: 12,
    textDecoration: "none",
    color: "rgba(10, 16, 28, 0.82)",
    border: "1px solid rgba(20,20,40,0.10)",
    background: "rgba(255,255,255,0.55)",
  },

  hero: { maxWidth: 1100, margin: "26px auto 0", padding: "18px 0 8px" },
  heroCard: {
    borderRadius: 26,
    padding: "26px 22px",
    background: "rgba(255,255,255,0.72)",
    border: "1px solid rgba(20,20,40,0.10)",
    boxShadow: "0 16px 50px rgba(0,0,0,0.08)",
    backdropFilter: "blur(10px)",
  },
  badge: {
    display: "inline-flex",
    gap: 8,
    alignItems: "center",
    padding: "8px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    background: "rgba(122,92,255,0.10)",
    border: "1px solid rgba(122,92,255,0.20)",
    color: "#2a1f69",
  },
  h1: {
    margin: "14px 0 10px",
    fontSize: 40,
    lineHeight: 1.12,
    letterSpacing: -1.1,
  },
  h1Accent: {
    background: "linear-gradient(135deg, #7a5cff, #00caff)",
    WebkitBackgroundClip: "text",
    color: "transparent",
    fontWeight: 900,
  },
  p: {
    margin: 0,
    fontSize: 15.5,
    lineHeight: 1.8,
    opacity: 0.88,
    maxWidth: 900,
  },

  ctaRow: {
    marginTop: 16,
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "center",
  },
  btn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "11px 14px",
    borderRadius: 14,
    textDecoration: "none",
    fontWeight: 800,
    border: "1px solid rgba(20,20,40,0.12)",
    transition: "transform .15s ease, box-shadow .15s ease",
    willChange: "transform",
  },
  btnPrimary: {
    color: "white",
    background: "linear-gradient(135deg, #7a5cff, #00caff)",
    boxShadow: "0 14px 26px rgba(122,92,255,0.22)",
  },
  btnGhost: {
    background: "rgba(255,255,255,0.65)",
    color: "#0b0f19",
  },
  btnSoft: {
    background: "rgba(0, 202, 255, 0.10)",
    color: "#004a57",
    borderColor: "rgba(0, 202, 255, 0.25)",
  },

  statsRow: {
    marginTop: 18,
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 10,
  },
  stat: {
    borderRadius: 18,
    padding: "12px 12px",
    background: "rgba(255,255,255,0.65)",
    border: "1px solid rgba(20,20,40,0.10)",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  statNum: { fontSize: 18 },
  statText: { fontSize: 13, opacity: 0.85, fontWeight: 700 },

  section: { maxWidth: 1100, margin: "32px auto 0", paddingBottom: 34 },
  sectionHead: { marginBottom: 14 },
  h2: { margin: 0, fontSize: 26, letterSpacing: -0.6 },
  sectionSub: { margin: "8px 0 0", opacity: 0.8, lineHeight: 1.8 },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 12,
    marginTop: 14,
  },
  card: {
    borderRadius: 22,
    padding: "16px 14px",
    background: "rgba(255,255,255,0.72)",
    border: "1px solid rgba(20,20,40,0.10)",
    boxShadow: "0 12px 34px rgba(0,0,0,0.07)",
  },
  cardTop: { display: "flex", alignItems: "center", gap: 10 },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    display: "grid",
    placeItems: "center",
    background: "rgba(122,92,255,0.12)",
    border: "1px solid rgba(122,92,255,0.20)",
    fontSize: 18,
  },
  cardTitle: { fontWeight: 900, letterSpacing: -0.3 },
  cardDesc: { marginTop: 10, opacity: 0.82, lineHeight: 1.75, fontSize: 14 },
  cardHint: { marginTop: 12, fontSize: 12, opacity: 0.6, fontWeight: 700 },

  contactCard: {
    borderRadius: 26,
    padding: "18px 16px",
    background: "rgba(255,255,255,0.72)",
    border: "1px solid rgba(20,20,40,0.10)",
    boxShadow: "0 16px 50px rgba(0,0,0,0.08)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    flexWrap: "wrap",
  },
  contactRow: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
  },
  mail: {
    padding: "12px 14px",
    borderRadius: 14,
    textDecoration: "none",
    fontWeight: 900,
    color: "#0b0f19",
    background: "rgba(255,255,255,0.75)",
    border: "1px solid rgba(20,20,40,0.12)",
  },

  footer: {
    marginTop: 14,
    display: "flex",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.7,
    flexWrap: "wrap",
  },
  footerDot: { opacity: 0.35 },
  footerLink: { color: "#0b0f19", textDecoration: "none", fontWeight: 800 },

  // ملاحظة: Grid يتكسر على الشاشات الصغيرة بواسطة media query في globals.css عادة.
};

// ملاحظة: لو تبي استجابة ممتازة للموبايل بدون Tailwind، ضف هذي في globals.css:
// @media (max-width: 980px){ .grid3 { grid-template-columns: 1fr !important; } }
