import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { roleDefaultRoute } from "@/lib/constants";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger }: { token: any; user: any; trigger?: string }) {
      if (user) {
        token.role = user.role;
        token.schoolId = user.schoolId ?? null;
        token.mustChangePassword = user.mustChangePassword ?? false;
      }
      // Refresh token data on sign-in or explicit session update only.
      // Avoiding a DB query here on every request removes a major latency
      // cost when running the dev server against a remote database.
      if (trigger === "update" || user) {
        const userId = user ? Number(user.id) : Number(token.sub);
        const dbUser = await prisma.user.findUnique({
          where: { id: userId },
          include: { role: true },
        });
        if (dbUser) {
          token.role = dbUser.role.name;
          token.name = dbUser.name;
          token.avatarUrl = dbUser.avatarUrl ?? "";
          token.schoolId = (dbUser as any).schoolId ?? null;
          token.mustChangePassword = (dbUser as any).mustChangePassword ?? false;
        }
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (session.user) {
        session.user.id = token.sub ? Number(token.sub) : 0;
        session.user.name = (token.name as string) ?? session.user.name ?? "";
        session.user.role = (token.role as string) ?? "";
        session.user.avatarUrl = (token.avatarUrl as string) ?? "";
        session.user.schoolId = (token.schoolId as string | null) ?? null;
        session.user.mustChangePassword = (token.mustChangePassword as boolean) ?? false;
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

        const user = await prisma.user.findFirst({
          where: { email: { equals: parsed.data.email, mode: "insensitive" } },
          include: { role: true },
        });

        if (!user || !user.isActive) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.password);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role.name,
          defaultRoute: roleDefaultRoute[user.role.name as keyof typeof roleDefaultRoute],
          schoolId: (user as any).schoolId ?? null,
          mustChangePassword: (user as any).mustChangePassword ?? false,
        };
      },
    }),
  ],
});
