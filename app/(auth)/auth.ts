import { compare } from 'bcrypt-ts';
import NextAuth, { type User, type Session } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

import { getUser } from '@/lib/db/queries';

import { authConfig } from './auth.config';

interface ExtendedSession extends Session {
  user: User;
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {},
      async authorize({ email, password }: any) {
        console.log('🔐 [AUTH] Starting authorization process');
        console.log('📧 [AUTH] Email provided:', email);
        console.log(
          '🔑 [AUTH] Password provided:',
          password ? '[HIDDEN]' : '[MISSING]',
        );

        try {
          console.log('🔍 [AUTH] Searching for user in database...');
          const users = await getUser(email);
          console.log('👥 [AUTH] Users found:', users.length);

          if (users.length === 0) {
            console.log('❌ [AUTH] No user found with email:', email);
            return null;
          }

          const user = users[0];
          console.log('✅ [AUTH] User found:', {
            id: user.id,
            email: user.email,
          });
          console.log('🔐 [AUTH] User has password:', !!user.password);

          if (!user.password) {
            console.log('❌ [AUTH] User has no password set');
            return null;
          }

          console.log('🔍 [AUTH] Comparing passwords...');
          // biome-ignore lint: Forbidden non-null assertion.
          const passwordsMatch = await compare(password, user.password!);
          console.log('🔐 [AUTH] Password match result:', passwordsMatch);

          if (!passwordsMatch) {
            console.log('❌ [AUTH] Password does not match');
            return null;
          }

          console.log(
            '✅ [AUTH] Authorization successful for user:',
            user.email,
          );
          return user as any;
        } catch (error) {
          console.error('💥 [AUTH] Error during authorization:', error);
          // Return null instead of throwing error to prevent middleware failure
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      console.log('🔄 [JWT] JWT callback called');
      console.log(
        '👤 [JWT] User:',
        user ? { id: user.id, email: user.email } : 'null',
      );
      console.log('🎫 [JWT] Token:', { id: token.id, email: token.email });

      if (user) {
        token.id = user.id;
        console.log('✅ [JWT] User ID added to token:', user.id);
      }

      return token;
    },
    async session({ session, token }) {
      console.log('🔄 [SESSION] Session callback called');
      if (!session.user) {
        session.user = {
          id: '',
          email: '',
          emailVerified: null,
        } as any;
      }
      session.user.id = token.id as string;
      session.user.email = token.email as string;
      console.log('✅ [SESSION] User ID added to session:', token.id);
      return session;
    },
  },
});
