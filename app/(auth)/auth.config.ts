import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: {
    signIn: '/login',
    newUser: '/',
  },
  providers: [
    // added later in auth.ts since it requires bcrypt which is only compatible with Node.js
    // while this file is also used in non-Node.js environments
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnChat = nextUrl.pathname.startsWith('/');
      const isOnRegister = nextUrl.pathname.startsWith('/register');
      const isOnLogin = nextUrl.pathname.startsWith('/login');

      console.log(
        '🔐 [AUTH_CONFIG] Authorization check for:',
        nextUrl.pathname,
      );
      console.log('👤 [AUTH_CONFIG] User logged in:', isLoggedIn);
      console.log(
        '👤 [AUTH_CONFIG] User details:',
        auth?.user ? { id: auth.user.id, email: auth.user.email } : 'null',
      );
      console.log('📍 [AUTH_CONFIG] Current path:', nextUrl.pathname);
      console.log('📍 [AUTH_CONFIG] Is on chat page:', isOnChat);
      console.log('📍 [AUTH_CONFIG] Is on register page:', isOnRegister);
      console.log('📍 [AUTH_CONFIG] Is on login page:', isOnLogin);

      if (isLoggedIn && (isOnLogin || isOnRegister)) {
        console.log(
          '🔄 [AUTH_CONFIG] Redirecting logged in user from auth pages to home',
        );
        return Response.redirect(new URL('/', nextUrl as unknown as URL));
      }

      if (isOnRegister || isOnLogin) {
        console.log('✅ [AUTH_CONFIG] Allowing access to auth pages');
        return true; // Always allow access to register and login pages
      }

      if (isOnChat) {
        if (isLoggedIn) {
          console.log('✅ [AUTH_CONFIG] Allowing logged in user to chat');
          return true;
        }
        console.log('❌ [AUTH_CONFIG] Blocking unauthenticated user from chat');
        return false; // Redirect unauthenticated users to login page
      }

      if (isLoggedIn) {
        console.log('🔄 [AUTH_CONFIG] Redirecting logged in user to home');
        return Response.redirect(new URL('/', nextUrl as unknown as URL));
      }

      console.log('✅ [AUTH_CONFIG] Allowing access to other pages');
      return true;
    },
  },
} satisfies NextAuthConfig;
