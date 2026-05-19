'use client';

import { createContext, useContext, useMemo, useState, useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

import useFakeUserAPI from '@/app/api/useFakeUserAPI';

import { TUser } from '@/mocks/users.mock';

export interface IAuthContextProps {
	isLoading: boolean;
	onLogin: (
		username: TUser['username'],
		password: TUser['password'],
		rememberMe: boolean,
	) => Promise<void>;
	userData: TUser | null;
	usernameStorage: string | null;
	tokenStorage: string | null;
	onLogout: (isRedirect: boolean) => Promise<void>;
}

const AuthContext = createContext<IAuthContextProps>({} as IAuthContextProps);

type AuthProviderProps = {
	children: ReactNode;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
	const router = useRouter();

	const getStorageItem = (key: string) =>
		(typeof window !== 'undefined' ? localStorage.getItem(key) : null) ??
		(typeof window !== 'undefined' ? sessionStorage.getItem(key) : null);

	const tokenStorage = getStorageItem('token');
	const usernameStorage = getStorageItem('username');

	const { response, isLoading, getCheckUser } = useFakeUserAPI(usernameStorage as string);
	const [userData, setUserData] = useState<TUser | null>(null);

	// On mount, restore userData from localStorage if available
	useEffect(() => {
		const stored =
			localStorage.getItem('userData') ?? sessionStorage.getItem('userData');
		if (stored) {
			try {
				const parsed = JSON.parse(stored);
				setUserData(parsed);
			} catch {
				/* empty */
			}
		}
	}, []);

	// Optionally, update userData state when response changes and usernameStorage exists (for hydration)
	useEffect(() => {
		if (response && usernameStorage) {
			setUserData(response as TUser);
		}
	}, [response, usernameStorage]);

	// call this function when you want to authenticate the user
	const onLogin: IAuthContextProps['onLogin'] = async (username, password, rememberMe) => {
		await getCheckUser(username, password).then(async (user) => {
			const storage = rememberMe ? localStorage : sessionStorage;
			storage.setItem('username', String(username));
			storage.setItem('token', 'XXXXX');
			setUserData(user as TUser);
			storage.setItem('userData', JSON.stringify(user));

			// بدل navigate('/customer')
			router.push('/customer');
		});
	};

	// call this function to sign out logged-in user
	const onLogout: IAuthContextProps['onLogout'] = async (isRedirect = true) => {
		localStorage.removeItem('username');
		localStorage.removeItem('token');
		localStorage.removeItem('userData');
		sessionStorage.removeItem('username');
		sessionStorage.removeItem('token');
		sessionStorage.removeItem('userData');
		setUserData(null);

		if (isRedirect) {
			// بدل navigate('../login', { replace: true })
			router.replace('/login');
		}
	};

	const value: IAuthContextProps = useMemo(
		() => ({
			usernameStorage,
			tokenStorage,
			onLogin,
			onLogout,
			userData,
			isLoading,
		}),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[usernameStorage, userData, tokenStorage, isLoading],
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
	return useContext(AuthContext);
};
