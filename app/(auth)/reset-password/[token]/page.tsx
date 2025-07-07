'use client';

import { use, useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/toast';
import { AuthForm } from '@/components/auth-form';
import { SubmitButton } from '@/components/submit-button';
import { resetPassword } from '../../password-reset-actions';

export default function Page({
  params,
}: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [isSuccessful, setIsSuccessful] = useState(false);
  const router = useRouter();

  const [state, formAction] = useActionState<
    {
      status:
        | 'idle'
        | 'in_progress'
        | 'success'
        | 'failed'
        | 'invalid_data'
        | 'invalid_token';
    },
    FormData
  >(resetPassword, {
    status: 'idle',
  });

  useEffect(() => {
    if (state.status === 'failed') {
      toast({
        type: 'error',
        description: 'Не удалось сбросить пароль!',
      });
    } else if (state.status === 'invalid_data') {
      toast({
        type: 'error',
        description: 'Пожалуйста, введите действительный пароль!',
      });
    } else if (state.status === 'invalid_token') {
      toast({
        type: 'error',
        description: 'Недействительная или истёкшая ссылка для сброса!',
      });
    } else if (state.status === 'success') {
      toast({
        type: 'success',
        description: 'Пароль успешно обновлён!',
      });
      setIsSuccessful(true);
      setTimeout(() => {
        router.push('/login');
      }, 1500);
    }
  }, [state.status, router]);

  const handleSubmit = (formData: FormData) => {
    formData.append('token', token);
    formAction(formData);
  };

  return (
    <div className="flex h-dvh w-screen items-start pt-12 md:pt-0 md:items-center justify-center bg-background">
      <div className="w-full max-w-md overflow-hidden rounded-2xl flex flex-col gap-12">
        <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
          <h3 className="text-xl font-semibold dark:text-zinc-50">
            Новый пароль
          </h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            Введите ваш новый пароль
          </p>
        </div>
        <AuthForm action={handleSubmit} hideEmail>
          <SubmitButton isSuccessful={isSuccessful}>
            Обновить пароль
          </SubmitButton>
        </AuthForm>
      </div>
    </div>
  );
} 