import React from "react";

export type FieldBase = {
  key?: string; // unique key in UI (optional)
  name: string; // form name/id
  label: string;
  description?: string;

  // ✅ values plumbing
  defaultValue?: any;
};

export type SwitchFieldT = FieldBase & {
  type: "switch";
  defaultChecked?: boolean;
};

export type ColorFieldT = FieldBase & { type: "color"; defaultValue?: string };

export type TextFieldT = FieldBase & {
  type: "text";
  placeholder?: string;
  minLength?: number;
  maxLength?: number;
  defaultValue?: string;
};

export type UrlFieldT = FieldBase & {
  type: "url";
  placeholder?: string;
  defaultValue?: string;
};

export type NumberFieldT = FieldBase & {
  type: "number";
  placeholder?: string;
  defaultValue?: number | string;
};

export type DropdownFieldT = FieldBase & {
  type: "dropdown";
  options: Array<{ label: string; value: string }>;
  defaultValue?: string;
};

export type RadioFieldT = FieldBase & {
  type: "radio";
  options: Array<{ label: string; value: string }>;
  defaultValue?: string;
};

export type ImageFieldT = FieldBase & { type: "image" };

export type Field =
  | SwitchFieldT
  | ColorFieldT
  | TextFieldT
  | UrlFieldT
  | NumberFieldT
  | DropdownFieldT
  | RadioFieldT
  | ImageFieldT;

export type SectionDef =
  | { type: "section"; title: string; fields: Field[] }
  | { type: "divider" }
  | { type: "static"; title?: string; node: React.ReactNode }
  | {
      type: "repeatable";
      title: string;
      key?: string;
      template: Field[];
      initialItems?: number;
    };
