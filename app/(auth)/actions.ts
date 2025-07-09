'use server';

import { z } from 'zod';

import { createUser, getUser } from '@/lib/db/queries';

import { signIn } from './auth';

const authFormSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export interface LoginActionState {
  status: 'idle' | 'in_progress' | 'success' | 'failed' | 'invalid_data';
}

export const login = async (
  _: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> => {
  console.log('🚀 [LOGIN] Starting login action');

  try {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    console.log('📧 [LOGIN] Email from form:', email);
    console.log(
      '🔑 [LOGIN] Password from form:',
      password ? '[HIDDEN]' : '[MISSING]',
    );

    console.log('✅ [LOGIN] Validating form data...');
    const validatedData = authFormSchema.parse({
      email,
      password,
    });
    console.log('✅ [LOGIN] Form data validation successful');

    console.log('🔐 [LOGIN] Attempting to sign in...');
    const signInResult = await signIn('credentials', {
      email: validatedData.email,
      password: validatedData.password,
      redirect: false,
    });
    console.log('🔐 [LOGIN] Sign in result:', signInResult);

    console.log('✅ [LOGIN] Login action completed successfully');
    return { status: 'success' };
  } catch (error) {
    console.error('💥 [LOGIN] Error during login:', error);

    if (error instanceof z.ZodError) {
      console.log('❌ [LOGIN] Validation error:', error.errors);
      return { status: 'invalid_data' };
    }

    console.log('❌ [LOGIN] General error, returning failed status');
    return { status: 'failed' };
  }
};

export interface RegisterActionState {
  status:
    | 'idle'
    | 'in_progress'
    | 'success'
    | 'failed'
    | 'user_exists'
    | 'invalid_data';
}

export const register = async (
  _: RegisterActionState,
  formData: FormData,
): Promise<RegisterActionState> => {
  console.log('🚀 [REGISTER] Starting register action');

  try {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    console.log('📧 [REGISTER] Email from form:', email);
    console.log(
      '🔑 [REGISTER] Password from form:',
      password ? '[HIDDEN]' : '[MISSING]',
    );

    console.log('✅ [REGISTER] Validating form data...');
    const validatedData = authFormSchema.parse({
      email,
      password,
    });
    console.log('✅ [REGISTER] Form data validation successful');

    console.log('🔍 [REGISTER] Checking if user already exists...');
    const [user] = await getUser(validatedData.email);
    console.log('👤 [REGISTER] Existing user found:', !!user);

    if (user) {
      console.log('❌ [REGISTER] User already exists:', user.email);
      return { status: 'user_exists' } as RegisterActionState;
    }

    console.log('👤 [REGISTER] Creating new user...');
    await createUser(validatedData.email, validatedData.password);
    console.log('✅ [REGISTER] User created successfully');

    console.log('🔐 [REGISTER] Signing in newly created user...');
    const signInResult = await signIn('credentials', {
      email: validatedData.email,
      password: validatedData.password,
      redirect: false,
    });
    console.log('🔐 [REGISTER] Sign in result:', signInResult);

    console.log('✅ [REGISTER] Registration completed successfully');
    return { status: 'success' };
  } catch (error) {
    console.error('💥 [REGISTER] Error during registration:', error);

    if (error instanceof z.ZodError) {
      console.log('❌ [REGISTER] Validation error:', error.errors);
      return { status: 'invalid_data' };
    }

    console.log('❌ [REGISTER] General error, returning failed status');
    return { status: 'failed' };
  }
};
