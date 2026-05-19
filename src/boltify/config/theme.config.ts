// FILE: apps/merchant/src/boltify/config/theme.config.ts

import DARK_MODE from '@/constants/darkMode.constant';
import { TDarkMode } from '@/types/darkMode.type';
import { TRounded } from '@/types/rounded.type';
import { TColors } from '@/types/colors.type';
import { TColorIntensity } from '@/types/colorIntensities.type';
import { TBorderWidth } from '@/types/borderWidth.type';
import { TLang } from '@/types/lang.type';

type TThemeConfigs = {
	projectTitle: string;
	projectName: string;
	language: TLang;
	theme: TDarkMode;
	themeColor: TColors;
	themeColorShade: TColorIntensity;
	rounded: TRounded;
	borderWidth: TBorderWidth;
	transition: string;
	fontSize: 12 | 13 | 14 | 15 | 16 | 17 | 18;
};

const themeConfig: TThemeConfigs = {
	projectTitle: 'Bolt',
	projectName: 'React TypeScript Tailwind Admin',
	language: 'en',
	theme: DARK_MODE.SYSTEM,
	themeColor: 'primary',
	themeColorShade: '500',
	rounded: 'rounded-lg',
	borderWidth: 'border-2',
	transition: 'transition-all duration-300 ease-in-out',
	fontSize: 13,
};

export default themeConfig;