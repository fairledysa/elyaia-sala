//apps/merchant/src/app/(theme-editor)/themes/[themeId]/customize/theme-options/_components/FieldRenderer.tsx
"use client";

import React from "react";
import type { Field } from "./types";

import SwitchField from "./fields/SwitchField";
import ColorField from "./fields/ColorField";
import TextField from "./fields/TextField";
import UrlField from "./fields/UrlField";
import NumberField from "./fields/NumberField";
import DropdownField from "./fields/DropdownField";
import RadioField from "./fields/RadioField";
import ImageField from "./fields/ImageField";

type Props = {
  field: Field;
  value: any;
  onChange: (name: string, value: any) => void;
};

export default function FieldRenderer({ field, value, onChange }: Props) {
  // مهم: لا نمرر key داخل props
  const name = field.name;
  const label = field.label;
  const description = field.description;

  switch (field.type) {
    case "switch":
      return (
        <SwitchField
          name={name}
          label={label}
          description={description}
          value={!!value}
          onChange={onChange}
          defaultChecked={field.defaultChecked}
        />
      );

    case "text":
      return (
        <TextField
          name={name}
          label={label}
          description={description}
          value={value}
          onChange={onChange}
          placeholder={field.placeholder}
          minLength={field.minLength}
          maxLength={field.maxLength}
          defaultValue={field.defaultValue}
        />
      );

    case "url":
      return (
        <UrlField
          name={name}
          label={label}
          description={description}
          value={value}
          onChange={onChange}
          placeholder={field.placeholder}
          defaultValue={field.defaultValue}
        />
      );

    case "number":
      return (
        <NumberField
          name={name}
          label={label}
          description={description}
          value={value}
          onChange={onChange}
          placeholder={field.placeholder}
          defaultValue={field.defaultValue}
        />
      );

    case "dropdown":
      return (
        <DropdownField
          name={name}
          label={label}
          description={description}
          value={value}
          onChange={onChange}
          options={field.options}
          defaultValue={field.defaultValue}
        />
      );

    case "radio":
      return (
        <RadioField
          name={name}
          label={label}
          description={description}
          value={value}
          onChange={onChange}
          options={field.options}
          defaultValue={field.defaultValue}
        />
      );

    case "image":
      return (
        <ImageField
          name={name}
          label={label}
          description={description}
          value={value}
          onChange={onChange}
        />
      );

    case "color":
      return (
        <ColorField
          name={name}
          label={label}
          description={description}
          value={value}
          onChange={onChange}
          defaultValue={field.defaultValue}
        />
      );

    default:
      return null;
  }
}
