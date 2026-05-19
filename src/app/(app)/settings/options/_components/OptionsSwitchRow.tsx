//5) app/(app)/settings/options/_components/OptionsSwitchRow.tsx
"use client";

import OptionsRow from "./OptionsRow";

type Props = {
  title: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
};

export default function OptionsSwitchRow({
  title,
  description,
  checked,
  onChange,
}: Props) {
  return (
    <OptionsRow
      title={title}
      description={description}
      right={
        <button
          type="button"
          onClick={() => onChange(!checked)}
          className={[
            "relative h-7 w-12 rounded-full transition",
            checked ? "bg-emerald-500" : "bg-slate-300",
          ].join(" ")}
          aria-pressed={checked}
        >
          <span
            className={[
              "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all",
              checked ? "right-1" : "right-6",
            ].join(" ")}
          />
        </button>
      }
    />
  );
}