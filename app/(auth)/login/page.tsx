'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useState } from 'react';
import { toast } from '@/components/toast';

import { AuthForm } from '@/components/auth-form';
import { SubmitButton } from '@/components/submit-button';

import { login, type LoginActionState } from '../actions';

export default function Page() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [isSuccessful, setIsSuccessful] = useState(false);

  const [state, formAction] = useActionState<LoginActionState, FormData>(
    login,
    {
      status: 'idle',
    },
  );

  useEffect(() => {
    console.log('🔄 [LOGIN_PAGE] State changed:', state.status);

    if (state.status === 'failed') {
      console.log('❌ [LOGIN_PAGE] Login failed, showing error toast');
      toast({
        type: 'error',
        description: 'Введены некорректные данные!',
      });
    } else if (state.status === 'invalid_data') {
      console.log('❌ [LOGIN_PAGE] Invalid data, showing error toast');
      toast({
        type: 'error',
        description: 'Введены некорректные данные!',
      });
    } else if (state.status === 'success') {
      console.log('✅ [LOGIN_PAGE] Login successful, refreshing router');
      setIsSuccessful(true);
      router.refresh();
    }
  }, [state.status]);

  const handleSubmit = (formData: FormData) => {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    console.log('📝 [LOGIN_PAGE] Form submitted');
    console.log('📧 [LOGIN_PAGE] Email from form:', email);
    console.log(
      '🔑 [LOGIN_PAGE] Password from form:',
      password ? '[HIDDEN]' : '[MISSING]',
    );

    setEmail(email);
    formAction(formData);
  };

  return (
    <div className="flex h-dvh w-screen items-start pt-12 md:pt-0 md:items-center justify-center bg-background">
      <div className="w-full max-w-md overflow-hidden rounded-2xl flex flex-col gap-12">
        <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
          <h3 className="text-xl font-semibold dark:text-zinc-50">
            Ассистент тестов
          </h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            Используйте свой email и пароль для входа
          </p>
        </div>
        <AuthForm action={handleSubmit} defaultEmail={email}>
          <SubmitButton isSuccessful={isSuccessful}>Войти</SubmitButton>
          <p className="text-center text-sm text-gray-600 mt-4 dark:text-zinc-400">
            {'Нет аккаунта? '}
            <Link
              href="/register"
              className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
            >
              Зарегистрируйтесь
            </Link>
            {' бесплатно.'}
          </p>
          <p className="text-center text-sm text-gray-600 dark:text-zinc-400">
            <Link
              href="/reset-password"
              className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
            >
              Забыли пароль?
            </Link>
          </p>
        </AuthForm>
      </div>
    </div>
  );
}
