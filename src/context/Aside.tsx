'use client';

import { FC, HTMLAttributes, ReactNode, useEffect, useState } from 'react';
import classNames from 'classnames';
import useAsideStatus from '@/hooks/useAsideStatus';
import { TIcons } from '@/types/icons.type';
import Icon from '@/components/icon/Icon';

// @start-snippet:: interface
interface IAsideHeadProps extends HTMLAttributes<HTMLElement> {
	children: ReactNode;
	className?: string;
}
// @end-snippet:: interface
export const AsideHead: FC<IAsideHeadProps> = (props) => {
	const { children, className, ...rest } = props;

	return (
		<div
			data-component-name='Aside/AsideHead'
			className={classNames('flex items-center justify-between px-4 pb-2', className)}
			{...rest}>
			{children}
		</div>
	);
};

// @start-snippet:: interface
interface IAsideBodyProps extends HTMLAttributes<HTMLElement> {
	children: ReactNode;
	className?: string;
}
// @end-snippet:: interface
export const AsideBody: FC<IAsideBodyProps> = (props) => {
	const { children, className, ...rest } = props;

	return (
		<div
			data-component-name='Aside/AsideBody'
			className={classNames('h-full overflow-x-scroll px-4', 'no-scrollbar', className)}
			{...rest}>
			<div className='sticky top-0 h-4 bg-linear-to-b from-zinc-100 to-zinc-900/0 dark:from-zinc-900'></div>
			{children}
			<div className='sticky bottom-0 h-4 bg-linear-to-t from-zinc-100 to-zinc-900/0 dark:from-zinc-900'></div>
		</div>
	);
};

// @start-snippet:: interface
interface IAsideQuickContainerProps extends HTMLAttributes<HTMLElement> {
	children: ReactNode;
	className?: string;
}
// @end-snippet:: interface
export const AsideQuickContainer: FC<IAsideQuickContainerProps> = (props) => {
	const { children, className, ...rest } = props;
	const { asideStatus } = useAsideStatus();

	// ✅ امن للهيدريشن: لا نخلي SSR يقرر شيء يعتمد على العميل
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);
	const safeAsideStatus = mounted ? asideStatus : false;

	return (
		<div
			className={classNames(
				'mb-4 grid gap-2',
				{
					'grid-cols-2': safeAsideStatus,
					'grid-cols-1': !safeAsideStatus,
				},
				className,
			)}
			suppressHydrationWarning
			{...rest}>
			{children}
		</div>
	);
};

// @start-snippet:: interface
interface IAsideQuickNavProps extends HTMLAttributes<HTMLElement> {
	children: ReactNode;
	icon?: TIcons;
	className?: string;
	isActive?: boolean;
}
// @end-snippet:: interface
export const AsideQuickNav: FC<IAsideQuickNavProps> = (props) => {
	const { icon, children, className, isActive, ...rest } = props;
	const { asideStatus } = useAsideStatus();

	// ✅ امن للهيدريشن: SSR يعتبر asideStatus = false ثم بعد mount نستخدم الحقيقي
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);
	const safeAsideStatus = mounted ? asideStatus : false;

	return (
		<div
			data-component-name='Aside/AsideQuickNav'
			suppressHydrationWarning
			className={classNames(
				'flex cursor-pointer flex-col items-center justify-between gap-2 overflow-hidden rounded-xl',
				{ 'bg-primary-500 hover:bg-primary-500/50 text-zinc-900': isActive },
				{
					'bg-white text-zinc-600 hover:bg-zinc-100/25 dark:bg-zinc-950 dark:hover:bg-zinc-950/50':
						!isActive,
				},
				{ 'p-4': safeAsideStatus, 'p-2.5': !safeAsideStatus },
				'transition-colors duration-300 ease-in-out',
				className,
			)}
			{...rest}>
			<div>{icon && <Icon icon={icon} size={safeAsideStatus ? 'text-2xl' : 'text-xl'} />}</div>
			{safeAsideStatus && <div className=''>{children}</div>}
		</div>
	);
};

// @start-snippet:: interface
interface IAsideFooterProps extends HTMLAttributes<HTMLElement> {
	children: ReactNode;
	className?: string;
}
// @end-snippet:: interface
export const AsideFooter: FC<IAsideFooterProps> = (props) => {
	const { children, className, ...rest } = props;

	return (
		<div
			data-component-name='Aside/AsideFooter'
			className={classNames('px-4', className)}
			{...rest}>
			{children}
		</div>
	);
};

// @start-snippet:: interface
interface IAsideProps extends HTMLAttributes<HTMLElement> {
	children: ReactNode;
	className?: string;
}
// @end-snippet:: interface
const Aside: FC<IAsideProps> = (props) => {
	const { children, className, ...rest } = props;

	const { asideStatus } = useAsideStatus();

	// ✅ نفس الفكرة هنا عشان لا يختلف العرض/الـ classes وقت SSR
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);
	const safeAsideStatus = mounted ? asideStatus : false;

	return (
		<aside
			data-component-name='Aside'
			suppressHydrationWarning
			className={classNames(
				'peer',
				'fixed top-0 bottom-0 z-40 md:z-20',
				'flex flex-col',
				'bg-zinc-100',
				'py-2',
				'z-[100]',
				'dark:bg-zinc-900 dark:text-white',
				'transition-all duration-300 ease-in-out',
				className,
				// Mobile Design
				'max-md:w-[20rem] max-md:shadow-2xl max-md:ltr:-left-[20rem] max-md:rtl:-right-[20rem]',
				{
					'md:w-[20rem]': safeAsideStatus,
					'md:w-[5.25em]': !safeAsideStatus,
					'max-md:ltr:-left-[20rem] max-md:rtl:-right-[20rem]': !safeAsideStatus,
					'max-md:ltr:left-0 max-md:rtl:right-0': safeAsideStatus,
				},
			)}
			{...rest}>
			{children}
		</aside>
	);
};

export default Aside;
