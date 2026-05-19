// FILE: apps/merchant/src/app/(app)/products/_components/MultiTagSelect.tsx

"use client";

import * as React from "react";
import { ChevronDown, Tag } from "lucide-react";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

type Props = {
  selected: string[];
  onChange: (next: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
};

export default function MultiTagSelect({
  selected,
  onChange,
  suggestions = [],
  placeholder = "أضف تصنيف",
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [hoverIndex, setHoverIndex] = React.useState<number>(-1);

  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return suggestions.filter(
      (s) => !selected.includes(s) && (!q || s.toLowerCase().includes(q)),
    );
  }, [suggestions, selected, query]);

  const canCreate =
    query.trim().length > 0 &&
    !selected.includes(query.trim()) &&
    !suggestions.includes(query.trim());

  React.useEffect(() => {
    function handleDocClick(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }

    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    if (open) {
      document.addEventListener("mousedown", handleDocClick);
      document.addEventListener("keydown", handleEsc);
      requestAnimationFrame(() => inputRef.current?.focus());
    }

    return () => {
      document.removeEventListener("mousedown", handleDocClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  const add = (val: string) => {
    const v = val.trim();
    if (!v || selected.includes(v)) return;
    onChange([...selected, v]);
    setQuery("");
    setHoverIndex(-1);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const max = filtered.length + (canCreate ? 1 : 0) - 1;
      setHoverIndex((idx) => Math.min(idx + 1, max));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHoverIndex((idx) => Math.max(idx - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();

      if (canCreate && hoverIndex === 0) return add(query);

      const idxInList = hoverIndex - (canCreate ? 1 : 0);

      if (idxInList >= 0 && idxInList < filtered.length) {
        return add(filtered[idxInList]);
      }

      if (canCreate) add(query);
    }
  };

  return (
    <div ref={wrapRef} className="adm-products-tags">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cx("adm-products-tags__trigger", open && "is-open")}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span>
          <Tag />
          {placeholder}
        </span>

        <ChevronDown className={cx(open && "is-open")} />
      </button>

      {open && (
        <div role="listbox" className="adm-products-tags__menu">
          <div className="adm-products-tags__search">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHoverIndex(-1);
              }}
              onKeyDown={handleKeyDown}
              placeholder="ابحث أو اكتب لإضافة"
            />
          </div>

          <div className="adm-products-tags__list">
            {canCreate && (
              <button
                type="button"
                onMouseEnter={() => setHoverIndex(0)}
                onClick={() => add(query)}
                className={cx(
                  "adm-products-tags__option",
                  hoverIndex === 0 && "is-active",
                )}
              >
                إضافة: “{query.trim()}”
              </button>
            )}

            {filtered.length === 0 && !canCreate ? (
              <div className="adm-products-tags__empty">لا توجد نتائج.</div>
            ) : (
              filtered.map((s, i) => {
                const idx = canCreate ? i + 1 : i;

                return (
                  <button
                    key={s}
                    type="button"
                    onMouseEnter={() => setHoverIndex(idx)}
                    onClick={() => add(s)}
                    className={cx(
                      "adm-products-tags__option",
                      hoverIndex === idx && "is-active",
                    )}
                  >
                    {s}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}