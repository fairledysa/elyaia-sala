// FILE: apps/merchant/src/mocks/users.mock.ts

export type TUser = {
  id: string;
  username: string;
  email: string;
  name: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  image?: string;
  role?: string;
  position?: string;
  status?: "active" | "inactive" | "blocked" | string;
  password?: string;
  [key: string]: any;
};

const USERS: TUser[] = [
  {
    id: "1",
    username: "admin",
    email: "admin@example.com",
    name: "Admin User",
    fullName: "Admin User",
    role: "admin",
    position: "Administrator",
    status: "active",
    password: "admin",
  },
];

export default USERS;