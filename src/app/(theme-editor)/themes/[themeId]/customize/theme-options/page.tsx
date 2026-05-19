// FILE: apps/merchant/src/app/(theme-editor)/themes/[themeId]/customize/theme-options/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";

import { buildThemeOptionsDefs } from "./_components/defs";
import CollapsibleSection from "./_components/CollapsibleSection";
import RepeatableSection from "./_components/RepeatableSection";

const PAGE_KEY = "theme-options";

type SaveState = {
  pageKey?: string;
  showSaveButton?: boolean;
  label?: string;
  canSave?: boolean;
  saving?: boolean;
};

function safeObj(v: any) {
  if (!v) return {};
  if (typeof v === "object") return v;
  return {};
}

export default function ThemeOptionsEditorPage() {
  const params = useParams<{ themeId: string }>();
  const themeId = params.themeId;

  const [themeSchema, setThemeSchema] = useState<Record<string, any>>({});
  const defs = useMemo(() => buildThemeOptionsDefs(themeSchema), [themeSchema]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [values, setValues] = useState<Record<string, any>>({});
  const baselineRef = useRef<string>("{}");

  const isDirty = useMemo(() => {
    try {
      return JSON.stringify(values ?? {}) !== baselineRef.current;
    } catch {
      return true;
    }
  }, [values]);

  const dispatchSaveState = (patch?: Partial<SaveState>) => {
    const detail: SaveState = {
      pageKey: PAGE_KEY,
      showSaveButton: true,
      label: saving ? "جارٍ الحفظ..." : "حفظ التغييرات",
      canSave: !loading && !saving && isDirty,
      saving,
      ...(patch || {}),
    };

    window.dispatchEvent(
      new CustomEvent("theme-editor:save-state", { detail }),
    );
  };

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      dispatchSaveState({ canSave: false });

      try {
        const res = await fetch(`/api/themes/${themeId}/theme-options`, {
          method: "GET",
          cache: "no-store",
        });

        const json = await res.json().catch(() => ({}));
        const incoming = safeObj(json?.theme_options);
        const schema = safeObj(json?.theme_schema);
        const defaults = safeObj(json?.theme_default_settings);
        const merged = { ...defaults, ...incoming };

        if (!alive) return;

        setThemeSchema(schema);
        setValues(merged);
        baselineRef.current = JSON.stringify(merged ?? {});
      } catch {
        if (!alive) return;
        setThemeSchema({});
        setValues({});
        baselineRef.current = "{}";
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    if (themeId) load();

    return () => {
      alive = false;
    };
  }, [themeId]);

  useEffect(() => {
    dispatchSaveState();
  }, [loading, saving, isDirty]);

  useEffect(() => {
    function onRequest() {
      dispatchSaveState();
    }

    async function doSave() {
      if (saving || loading) return;

      setSaving(true);
      dispatchSaveState({ saving: true });

      try {
        const res = await fetch(`/api/themes/${themeId}/theme-options`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ theme_options: values }),
        });

        const json = await res.json().catch(() => ({}));
        if (!res.ok || json?.ok !== true) {
          throw new Error(json?.error || "SAVE_FAILED");
        }

        const saved = safeObj(json?.theme_options);
        const defaults = safeObj(json?.theme_default_settings);
        const merged = { ...defaults, ...saved };

        setValues(merged);
        baselineRef.current = JSON.stringify(merged ?? {});
      } catch {
        // place for toast later
      } finally {
        setSaving(false);
        dispatchSaveState({ saving: false });
      }
    }

    function onSave(e: Event) {
      const ce = e as CustomEvent<{ pageKey?: string }>;
      if (ce?.detail?.pageKey && ce.detail.pageKey !== PAGE_KEY) return;
      doSave();
    }

    window.addEventListener(
      "theme-editor:save-state:request",
      onRequest as any,
    );
    window.addEventListener("theme-editor:save", onSave as any);

    dispatchSaveState();

    return () => {
      window.removeEventListener(
        "theme-editor:save-state:request",
        onRequest as any,
      );
      window.removeEventListener("theme-editor:save", onSave as any);
    };
  }, [themeId, values, saving, loading, isDirty]);

  const onChange = (name: string, value: any) => {
    setValues((prev) => ({ ...(prev || {}), [name]: value }));
  };

  return (
    <div className="space-y-6">
      {defs.map((d, idx) => {
        if (d.type === "divider") {
          return <hr key={`div-${idx}`} className="border-gray-200" />;
        }

        if (d.type === "static") {
          return (
            <div key={`static-${idx}`} className="space-y-2">
              {d.node}
            </div>
          );
        }

        if (d.type === "repeatable") {
          return (
            <RepeatableSection
              key={d.key ?? `rep-${idx}`}
              title={d.title}
              sectionKey={d.key ?? `rep-${idx}`}
              template={d.template}
              initialItems={d.initialItems ?? 1}
              values={values}
              onChange={onChange}
            />
          );
        }

        return (
          <CollapsibleSection
            key={`sec-${idx}`}
            title={d.title}
            fields={d.fields}
            values={values}
            onChange={onChange}
          />
        );
      })}
    </div>
  );
}