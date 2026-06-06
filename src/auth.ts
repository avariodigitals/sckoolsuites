import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { queryOne } from "@/lib/db";
import { roleDefaultRoute } from "@/lib/constants";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// User type for auth
interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  password: string;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger }: { token: any; user: any; trigger?: string }) {
      if (user) {
        token.role = user.role;
      }
      // Re-fetch user data on session update
      if (trigger === "update" || token.sub) {
        const dbUser = await queryOne<{ name: string }>(
          `SELECT r.name 
           FROM "user" u 
           JOIN role r ON u.role_id = r.id 
           WHERE u.id = $1`,
          [token.sub]
        );
        if (dbUser) {
          token.role = dbUser.name;
        }
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role as string) ?? "";
      }
      return session;
    },
    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      // For relative URLs, return as-is to stay on same domain
      if (url.startsWith("/")) return url;
      
      // If URL is already absolute and matches baseUrl, allow it
      if (url.startsWith(baseUrl)) return url;
      
      // For any other case, default to baseUrl
      return baseUrl;
    },
  },
  providers: [
    Credentials({
      name: "Email + Password",
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials: Record<string, unknown>) => {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await queryOne<AuthUser>(
          `SELECT u.id, u.name, u.email, u.password, u.is_active, r.name as role
           FROM "user" u
           JOIN role r ON u.role_id = r.id
           WHERE LOWER(u.email) = LOWER($1)`,
          [parsed.data.email]
        );

        if (!user || !user.is_active) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.password);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          defaultRoute: roleDefaultRoute[user.role as keyof typeof roleDefaultRoute],
        };
      },
    }),
  ],
});
