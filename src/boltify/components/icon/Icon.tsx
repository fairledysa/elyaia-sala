// apps/merchant/src/boltify/components/icon/Icon.tsx
import { forwardRef, HTMLAttributes, memo, ReactNode } from "react";
import classNames from "classnames";
import pascalcase from "pascalcase";
import * as SvgIcon from "./svg-icons";
import * as Huge from "./huge";
import { TIcons } from "@/types/icons.type";
import { TColors } from "@/types/colors.type";
import { TFontSizes } from "@/types/fontSizes.type";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface IRefWrapperProps extends Record<string, any> {
  children: ReactNode;
}

const RefWrapper = forwardRef<HTMLSpanElement, IRefWrapperProps>(
  ({ children }, ref) => {
    if (ref) {
      return (
        <span ref={ref} data-only-ref="true">
          {children}
        </span>
      );
    }
    return children;
  }
);
RefWrapper.displayName = "RefWrapper";

export interface IIconProps extends HTMLAttributes<HTMLSpanElement> {
  icon: TIcons;
  className?: string;
  color?: TColors;
  size?: TFontSizes;
}

const Icon = forwardRef<HTMLSpanElement, IIconProps>((props, ref) => {
  const { icon, className, color, size, ...rest } = props;

  const IconName = pascalcase(icon);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  // @ts-ignore
  const SvgIconWrapper = SvgIcon[IconName];

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  // @ts-ignore
  const HugeWrapper = Huge[IconName];

  const colorClass: Record<TColors, string> = {
    primary: "text-primary-500",
    secondary: "text-secondary-500",
    zinc: "text-zinc-500",
    red: "text-red-500",
    amber: "text-amber-500",
    lime: "text-lime-500",
    emerald: "text-emerald-500",
    sky: "text-sky-500",
    blue: "text-blue-500",
    violet: "text-violet-500",
  };

  const CLASS_NAMES = classNames(
    "svg-icon",
    [`${color && colorClass[color]}`],
    { [`${size as TFontSizes}`]: typeof size !== "undefined" },
    className
  );

  // ✅ فلترة props الخطيرة اللي تسبب تحذيرات/hydration
  const {
    ["data-name"]: _dataName,
    ["data-component-name"]: _dataComponent,
    ...safeRest
  } = rest as any;

  if (typeof SvgIconWrapper === "function") {
    return (
      <RefWrapper ref={ref}>
        <SvgIconWrapper
          className={CLASS_NAMES}
          // eslint-disable-next-line react/jsx-props-no-spreading
          {...safeRest}
        />
      </RefWrapper>
    );
  }

  if (typeof HugeWrapper === "function") {
    return (
      <RefWrapper ref={ref}>
        <HugeWrapper
          className={CLASS_NAMES}
          // eslint-disable-next-line react/jsx-props-no-spreading
          {...safeRest}
        />
      </RefWrapper>
    );
  }

  return null;
});
Icon.displayName = "Icon";

export default memo(Icon);
