'use server';

import { randomBytes } from 'crypto';
import { hashSync } from 'bcrypt-ts';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { getUser } from '@/lib/db/queries';
import { user } from '@/lib/db/schema';
import { sendPasswordResetEmailNodemailer } from '@/lib/email';

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

// Password Reset Request Action
export const requestPasswordReset = async (
  _: { status: 'idle' | 'in_progress' | 'success' | 'failed' | 'invalid_data' },
  formData: FormData,
): Promise<{
  status: 'idle' | 'in_progress' | 'success' | 'failed' | 'invalid_data';
}> => {
  try {
    const email = formData.get('email') as string;
    if (!email) {
      return { status: 'invalid_data' };
    }

    const [existingUser] = await getUser(email);
    if (!existingUser) {
      // Return success even if user doesn't exist to prevent email enumeration
      return { status: 'success' };
    }

    const resetToken = randomBytes(32).toString('hex');
    await db
      .update(user)
      .set({ passwordResetToken: resetToken })
      .where(eq(user.email, email));

    const { data, error } = await sendPasswordResetEmailNodemailer(
      email,
      resetToken,
    );
    if (error) {
      return { status: 'failed' };
    }

    return { status: 'success' };
  } catch (error) {
    console.error('Failed to request password reset:', error);
    return { status: 'failed' };
  }
};

// Password Reset Action
export const resetPassword = async (
  _: {
    status:
      | 'idle'
      | 'in_progress'
      | 'success'
      | 'failed'
      | 'invalid_data'
      | 'invalid_token';
  },
  formData: FormData,
): Promise<{
  status:
    | 'idle'
    | 'in_progress'
    | 'success'
    | 'failed'
    | 'invalid_data'
    | 'invalid_token';
}> => {
  try {
    const token = formData.get('token') as string;
    const password = formData.get('password') as string;

    if (!token || !password) {
      return { status: 'invalid_data' };
    }

    const [userWithToken] = await db
      .select()
      .from(user)
      .where(eq(user.passwordResetToken, token));

    if (!userWithToken) {
      return { status: 'invalid_token' };
    }

    const hashedPassword = hashSync(password, 10);
    await db
      .update(user)
      .set({
        password: hashedPassword,
        passwordResetToken: null,
      })
      .where(eq(user.id, userWithToken.id));

    return { status: 'success' };
  } catch (error) {
    console.error('Failed to reset password:', error);
    return { status: 'failed' };
  }
}; 