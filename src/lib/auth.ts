import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import dbConnect from "./db";
import User from "./models/User";
import { verifyPassword } from "./password";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        await dbConnect();
        const user = await User.findOne({ email: credentials.email.toLowerCase().trim() });
        if (!user) return null;
        const ok = await verifyPassword(credentials.password, user.passwordHash);
        if (!ok) return null;
        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          unitPreference: user.unitPreference,
        } as unknown as { id: string; name: string; email: string; role: string; unitPreference: string };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as unknown as { id: string; role: string; unitPreference: string };
        token.id = u.id;
        token.role = u.role;
        token.unitPreference = u.unitPreference;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string; role?: string; unitPreference?: string }).id = token.id as string;
        (session.user as { id?: string; role?: string; unitPreference?: string }).role = token.role as string;
        (session.user as { id?: string; role?: string; unitPreference?: string }).unitPreference = token.unitPreference as string;
      }
      return session;
    },
  },
};

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: "athlete" | "instructor";
      unitPreference: "kg" | "lb";
    };
  }
  interface JWT {
    id: string;
    role: "athlete" | "instructor";
    unitPreference: "kg" | "lb";
  }
}
