// FILE: apps/merchant/src/boltify/tailwindcss/colors.tailwind.ts

type TColorItem = {
	'50': string;
	'100': string;
	'200': string;
	'300': string;
	'400': string;
	'500': string;
	'600': string;
	'700': string;
	'800': string;
	'900': string;
	'950': string;
};

interface DefaultColors {
	inherit: string;
	current: string;
	transparent: string;
	black: string;
	white: string;
	slate: TColorItem;
	gray: TColorItem;
	zinc: TColorItem;
	neutral: TColorItem;
	stone: TColorItem;
	red: TColorItem;
	orange: TColorItem;
	amber: TColorItem;
	yellow: TColorItem;
	lime: TColorItem;
	green: TColorItem;
	emerald: TColorItem;
	teal: TColorItem;
	cyan: TColorItem;
	sky: TColorItem;
	blue: TColorItem;
	indigo: TColorItem;
	violet: TColorItem;
	purple: TColorItem;
	fuchsia: TColorItem;
	pink: TColorItem;
	rose: TColorItem;
}

interface AllColor extends DefaultColors {
	primary: {
		50: '#eef8f7';
		100: '#d9efec';
		200: '#b7ded8';
		300: '#86c5bb';
		400: '#4f9f92';
		500: '#0d3b45';
		600: '#0b3540';
		700: '#092f37';
		800: '#082832';
		900: '#062129';
		950: '#031317';
	};
	secondary: {
		50: '#fdfbf4';
		100: '#faf4e1';
		200: '#f3e7c1';
		300: '#e8d6a8';
		400: '#d8be78';
		500: '#c6a456';
		600: '#a9823e';
		700: '#8a6a2e';
		800: '#684f24';
		900: '#4c391b';
		950: '#2b1f0f';
	};
}

/** ✅ SSR safe */
const isBrowser =
	typeof window !== 'undefined' &&
	typeof document !== 'undefined' &&
	typeof getComputedStyle !== 'undefined';

const root = isBrowser ? document.documentElement : null;

const cssVar = (name: string, fallback = ''): string => {
	if (!root) return fallback;
	const v = getComputedStyle(root).getPropertyValue(name).trim();
	return v || fallback;
};

const colors: AllColor = {
	inherit: cssVar('--color-inherit', 'inherit'),
	current: cssVar('--color-current', 'currentColor'),
	transparent: cssVar('--color-transparent', 'transparent'),
	black: cssVar('--color-black', '#000'),
	white: cssVar('--color-white', '#fff'),

	slate: {
		50: cssVar('--color-slate-50'),
		100: cssVar('--color-slate-100'),
		200: cssVar('--color-slate-200'),
		300: cssVar('--color-slate-300'),
		400: cssVar('--color-slate-400'),
		500: cssVar('--color-slate-500'),
		600: cssVar('--color-slate-600'),
		700: cssVar('--color-slate-700'),
		800: cssVar('--color-slate-800'),
		900: cssVar('--color-slate-900'),
		950: cssVar('--color-slate-950'),
	},
	gray: {
		50: cssVar('--color-gray-50'),
		100: cssVar('--color-gray-100'),
		200: cssVar('--color-gray-200'),
		300: cssVar('--color-gray-300'),
		400: cssVar('--color-gray-400'),
		500: cssVar('--color-gray-500'),
		600: cssVar('--color-gray-600'),
		700: cssVar('--color-gray-700'),
		800: cssVar('--color-gray-800'),
		900: cssVar('--color-gray-900'),
		950: cssVar('--color-gray-950'),
	},
	zinc: {
		50: cssVar('--color-zinc-50'),
		100: cssVar('--color-zinc-100'),
		200: cssVar('--color-zinc-200'),
		300: cssVar('--color-zinc-300'),
		400: cssVar('--color-zinc-400'),
		500: cssVar('--color-zinc-500'),
		600: cssVar('--color-zinc-600'),
		700: cssVar('--color-zinc-700'),
		800: cssVar('--color-zinc-800'),
		900: cssVar('--color-zinc-900'),
		950: cssVar('--color-zinc-950'),
	},
	neutral: {
		50: cssVar('--color-neutral-50'),
		100: cssVar('--color-neutral-100'),
		200: cssVar('--color-neutral-200'),
		300: cssVar('--color-neutral-300'),
		400: cssVar('--color-neutral-400'),
		500: cssVar('--color-neutral-500'),
		600: cssVar('--color-neutral-600'),
		700: cssVar('--color-neutral-700'),
		800: cssVar('--color-neutral-800'),
		900: cssVar('--color-neutral-900'),
		950: cssVar('--color-neutral-950'),
	},
	stone: {
		50: cssVar('--color-stone-50'),
		100: cssVar('--color-stone-100'),
		200: cssVar('--color-stone-200'),
		300: cssVar('--color-stone-300'),
		400: cssVar('--color-stone-400'),
		500: cssVar('--color-stone-500'),
		600: cssVar('--color-stone-600'),
		700: cssVar('--color-stone-700'),
		800: cssVar('--color-stone-800'),
		900: cssVar('--color-stone-900'),
		950: cssVar('--color-stone-950'),
	},
	red: {
		50: cssVar('--color-red-50'),
		100: cssVar('--color-red-100'),
		200: cssVar('--color-red-200'),
		300: cssVar('--color-red-300'),
		400: cssVar('--color-red-400'),
		500: cssVar('--color-red-500'),
		600: cssVar('--color-red-600'),
		700: cssVar('--color-red-700'),
		800: cssVar('--color-red-800'),
		900: cssVar('--color-red-900'),
		950: cssVar('--color-red-950'),
	},
	orange: {
		50: cssVar('--color-orange-50'),
		100: cssVar('--color-orange-100'),
		200: cssVar('--color-orange-200'),
		300: cssVar('--color-orange-300'),
		400: cssVar('--color-orange-400'),
		500: cssVar('--color-orange-500'),
		600: cssVar('--color-orange-600'),
		700: cssVar('--color-orange-700'),
		800: cssVar('--color-orange-800'),
		900: cssVar('--color-orange-900'),
		950: cssVar('--color-orange-950'),
	},
	amber: {
		50: cssVar('--color-amber-50'),
		100: cssVar('--color-amber-100'),
		200: cssVar('--color-amber-200'),
		300: cssVar('--color-amber-300'),
		400: cssVar('--color-amber-400'),
		500: cssVar('--color-amber-500'),
		600: cssVar('--color-amber-600'),
		700: cssVar('--color-amber-700'),
		800: cssVar('--color-amber-800'),
		900: cssVar('--color-amber-900'),
		950: cssVar('--color-amber-950'),
	},
	yellow: {
		50: cssVar('--color-yellow-50'),
		100: cssVar('--color-yellow-100'),
		200: cssVar('--color-yellow-200'),
		300: cssVar('--color-yellow-300'),
		400: cssVar('--color-yellow-400'),
		500: cssVar('--color-yellow-500'),
		600: cssVar('--color-yellow-600'),
		700: cssVar('--color-yellow-700'),
		800: cssVar('--color-yellow-800'),
		900: cssVar('--color-yellow-900'),
		950: cssVar('--color-yellow-950'),
	},
	lime: {
		50: cssVar('--color-lime-50'),
		100: cssVar('--color-lime-100'),
		200: cssVar('--color-lime-200'),
		300: cssVar('--color-lime-300'),
		400: cssVar('--color-lime-400'),
		500: cssVar('--color-lime-500'),
		600: cssVar('--color-lime-600'),
		700: cssVar('--color-lime-700'),
		800: cssVar('--color-lime-800'),
		900: cssVar('--color-lime-900'),
		950: cssVar('--color-lime-950'),
	},
	green: {
		50: cssVar('--color-green-50'),
		100: cssVar('--color-green-100'),
		200: cssVar('--color-green-200'),
		300: cssVar('--color-green-300'),
		400: cssVar('--color-green-400'),
		500: cssVar('--color-green-500'),
		600: cssVar('--color-green-600'),
		700: cssVar('--color-green-700'),
		800: cssVar('--color-green-800'),
		900: cssVar('--color-green-900'),
		950: cssVar('--color-green-950'),
	},
	emerald: {
		50: cssVar('--color-emerald-50'),
		100: cssVar('--color-emerald-100'),
		200: cssVar('--color-emerald-200'),
		300: cssVar('--color-emerald-300'),
		400: cssVar('--color-emerald-400'),
		500: cssVar('--color-emerald-500'),
		600: cssVar('--color-emerald-600'),
		700: cssVar('--color-emerald-700'),
		800: cssVar('--color-emerald-800'),
		900: cssVar('--color-emerald-900'),
		950: cssVar('--color-emerald-950'),
	},
	teal: {
		50: cssVar('--color-teal-50'),
		100: cssVar('--color-teal-100'),
		200: cssVar('--color-teal-200'),
		300: cssVar('--color-teal-300'),
		400: cssVar('--color-teal-400'),
		500: cssVar('--color-teal-500'),
		600: cssVar('--color-teal-600'),
		700: cssVar('--color-teal-700'),
		800: cssVar('--color-teal-800'),
		900: cssVar('--color-teal-900'),
		950: cssVar('--color-teal-950'),
	},
	cyan: {
		50: cssVar('--color-cyan-50'),
		100: cssVar('--color-cyan-100'),
		200: cssVar('--color-cyan-200'),
		300: cssVar('--color-cyan-300'),
		400: cssVar('--color-cyan-400'),
		500: cssVar('--color-cyan-500'),
		600: cssVar('--color-cyan-600'),
		700: cssVar('--color-cyan-700'),
		800: cssVar('--color-cyan-800'),
		900: cssVar('--color-cyan-900'),
		950: cssVar('--color-cyan-950'),
	},
	sky: {
		50: cssVar('--color-sky-50'),
		100: cssVar('--color-sky-100'),
		200: cssVar('--color-sky-200'),
		300: cssVar('--color-sky-300'),
		400: cssVar('--color-sky-400'),
		500: cssVar('--color-sky-500'),
		600: cssVar('--color-sky-600'),
		700: cssVar('--color-sky-700'),
		800: cssVar('--color-sky-800'),
		900: cssVar('--color-sky-900'),
		950: cssVar('--color-sky-950'),
	},
	blue: {
		50: cssVar('--color-blue-50'),
		100: cssVar('--color-blue-100'),
		200: cssVar('--color-blue-200'),
		300: cssVar('--color-blue-300'),
		400: cssVar('--color-blue-400'),
		500: cssVar('--color-blue-500'),
		600: cssVar('--color-blue-600'),
		700: cssVar('--color-blue-700'),
		800: cssVar('--color-blue-800'),
		900: cssVar('--color-blue-900'),
		950: cssVar('--color-blue-950'),
	},
	indigo: {
		50: cssVar('--color-indigo-50'),
		100: cssVar('--color-indigo-100'),
		200: cssVar('--color-indigo-200'),
		300: cssVar('--color-indigo-300'),
		400: cssVar('--color-indigo-400'),
		500: cssVar('--color-indigo-500'),
		600: cssVar('--color-indigo-600'),
		700: cssVar('--color-indigo-700'),
		800: cssVar('--color-indigo-800'),
		900: cssVar('--color-indigo-900'),
		950: cssVar('--color-indigo-950'),
	},
	violet: {
		50: cssVar('--color-violet-50'),
		100: cssVar('--color-violet-100'),
		200: cssVar('--color-violet-200'),
		300: cssVar('--color-violet-300'),
		400: cssVar('--color-violet-400'),
		500: cssVar('--color-violet-500'),
		600: cssVar('--color-violet-600'),
		700: cssVar('--color-violet-700'),
		800: cssVar('--color-violet-800'),
		900: cssVar('--color-violet-900'),
		950: cssVar('--color-violet-950'),
	},
	purple: {
		50: cssVar('--color-purple-50'),
		100: cssVar('--color-purple-100'),
		200: cssVar('--color-purple-200'),
		300: cssVar('--color-purple-300'),
		400: cssVar('--color-purple-400'),
		500: cssVar('--color-purple-500'),
		600: cssVar('--color-purple-600'),
		700: cssVar('--color-purple-700'),
		800: cssVar('--color-purple-800'),
		900: cssVar('--color-purple-900'),
		950: cssVar('--color-purple-950'),
	},
	fuchsia: {
		50: cssVar('--color-fuchsia-50'),
		100: cssVar('--color-fuchsia-100'),
		200: cssVar('--color-fuchsia-200'),
		300: cssVar('--color-fuchsia-300'),
		400: cssVar('--color-fuchsia-400'),
		500: cssVar('--color-fuchsia-500'),
		600: cssVar('--color-fuchsia-600'),
		700: cssVar('--color-fuchsia-700'),
		800: cssVar('--color-fuchsia-800'),
		900: cssVar('--color-fuchsia-900'),
		950: cssVar('--color-fuchsia-950'),
	},
	pink: {
		50: cssVar('--color-pink-50'),
		100: cssVar('--color-pink-100'),
		200: cssVar('--color-pink-200'),
		300: cssVar('--color-pink-300'),
		400: cssVar('--color-pink-400'),
		500: cssVar('--color-pink-500'),
		600: cssVar('--color-pink-600'),
		700: cssVar('--color-pink-700'),
		800: cssVar('--color-pink-800'),
		900: cssVar('--color-pink-900'),
		950: cssVar('--color-pink-950'),
	},
	rose: {
		50: cssVar('--color-rose-50'),
		100: cssVar('--color-rose-100'),
		200: cssVar('--color-rose-200'),
		300: cssVar('--color-rose-300'),
		400: cssVar('--color-rose-400'),
		500: cssVar('--color-rose-500'),
		600: cssVar('--color-rose-600'),
		700: cssVar('--color-rose-700'),
		800: cssVar('--color-rose-800'),
		900: cssVar('--color-rose-900'),
		950: cssVar('--color-rose-950'),
	},
	primary: {
		50: '#eef8f7',
		100: '#d9efec',
		200: '#b7ded8',
		300: '#86c5bb',
		400: '#4f9f92',
		500: '#0d3b45',
		600: '#0b3540',
		700: '#092f37',
		800: '#082832',
		900: '#062129',
		950: '#031317',
	},
	secondary: {
		50: '#fdfbf4',
		100: '#faf4e1',
		200: '#f3e7c1',
		300: '#e8d6a8',
		400: '#d8be78',
		500: '#c6a456',
		600: '#a9823e',
		700: '#8a6a2e',
		800: '#684f24',
		900: '#4c391b',
		950: '#2b1f0f',
	},
};

export default colors;