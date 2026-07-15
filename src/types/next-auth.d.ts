import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id: number;
    role?: string;
    avatarUrl?: string | null;
    defaultRoute?: string;
    schoolId?: string | null;
    mustChangePassword?: boolean;
  }

  interface Session {
    user: {
      id: number;
      name?: string | null;
      email?: string | null;
      role: string;
      avatarUrl?: string | null;
      schoolId?: string | null;
      mustChangePassword?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    name?: string;
    avatarUrl?: string;
    schoolId?: string | null;
    mustChangePassword?: boolean;
  }
}
