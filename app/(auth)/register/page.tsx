'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useState } from 'react';

import { AuthForm } from '@/components/auth-form';
import { SubmitButton } from '@/components/submit-button';

import { register, type RegisterActionState } from '../actions';
import { toast } from '@/components/toast';

export default function Page() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [isSuccessful, setIsSuccessful] = useState(false);

  const [state, formAction] = useActionState<RegisterActionState, FormData>(
    register,
    {
      status: 'idle',
    },
  );

  useEffect(() => {
    console.log('🔄 [REGISTER_PAGE] State changed:', state.status);

    if (state.status === 'user_exists') {
      console.log(
        '❌ [REGISTER_PAGE] User already exists, showing error toast',
      );
      toast({
        type: 'error',
        description: 'Пользователь с таким email уже существует!',
      });
    } else if (state.status === 'failed') {
      console.log(
        '❌ [REGISTER_PAGE] Registration failed, showing error toast',
      );
      toast({ type: 'error', description: 'Не удалось создать аккаунт!' });
    } else if (state.status === 'invalid_data') {
      console.log('❌ [REGISTER_PAGE] Invalid data, showing error toast');
      toast({
        type: 'error',
        description: 'Введены некорректные данные!',
      });
    } else if (state.status === 'success') {
      console.log(
        '✅ [REGISTER_PAGE] Registration successful, showing success toast and refreshing',
      );
      toast({ type: 'success', description: 'Аккаунт успешно создан!' });

      setIsSuccessful(true);
      router.refresh();
    }
  }, [state]);

  const handleSubmit = (formData: FormData) => {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    console.log('📝 [REGISTER_PAGE] Form submitted');
    console.log('📧 [REGISTER_PAGE] Email from form:', email);
    console.log(
      '🔑 [REGISTER_PAGE] Password from form:',
      password ? '[HIDDEN]' : '[MISSING]',
    );

    setEmail(email);
    formAction(formData);
  };

  return (
    <div className="flex h-dvh w-screen items-start pt-12 md:pt-0 md:items-center justify-center bg-background">
      <div className="w-full max-w-md overflow-hidden rounded-2xl gap-12 flex flex-col">
        <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
          <h3 className="text-xl font-semibold dark:text-zinc-50">
            Ассистент тестов
          </h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            Создайте аккаунт с вашим email и паролем
          </p>
        </div>
        <AuthForm action={handleSubmit} defaultEmail={email}>
          <SubmitButton isSuccessful={isSuccessful}>
            Зарегистрироваться
          </SubmitButton>
          <p className="text-center text-sm text-gray-600 mt-4 dark:text-zinc-400">
            {'Уже есть аккаунт? '}
            <Link
              href="/login"
              className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
            >
              Войти
            </Link>
          </p>
        </AuthForm>
      </div>
    </div>
  );
}
