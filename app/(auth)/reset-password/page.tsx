'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/toast';
import { AuthForm } from '@/components/auth-form';
import { SubmitButton } from '@/components/submit-button';
import { requestPasswordReset } from '../password-reset-actions';

export default function Page() {
  const [isSuccessful, setIsSuccessful] = useState(false);
  const router = useRouter();

  const [state, formAction] = useActionState<
    { status: 'idle' | 'in_progress' | 'success' | 'failed' | 'invalid_data' },
    FormData
  >(requestPasswordReset, {
    status: 'idle',
  });

  useEffect(() => {
    if (state.status === 'failed') {
      toast({
        type: 'error',
        description: 'Не удалось отправить письмо для сброса пароля!',
      });
    } else if (state.status === 'invalid_data') {
      toast({
        type: 'error',
        description: 'Пожалуйста, введите действительный email!',
      });
    } else if (state.status === 'success') {
      toast({
        type: 'success',
        description: 'Письмо для сброса пароля отправлено!',
      });
      setIsSuccessful(true);
      setTimeout(() => {
        router.push('/login');
      }, 1500);
    }
  }, [state.status, router]);

  return (
    <div className="flex h-dvh w-screen items-start pt-12 md:pt-0 md:items-center justify-center bg-background">
      <div className="w-full max-w-md overflow-hidden rounded-2xl flex flex-col gap-12">
        <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
          <h3 className="text-xl font-semibold dark:text-zinc-50">
            Сброс пароля
          </h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            Введите ваш email, чтобы получить ссылку для сброса пароля
          </p>
        </div>
        <AuthForm action={formAction} hidePassword>
          <SubmitButton isSuccessful={isSuccessful}>Отправить ссылку</SubmitButton>
        </AuthForm>
      </div>
    </div>
  );
} 