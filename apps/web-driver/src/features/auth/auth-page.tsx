import { useState } from 'react';
import { BrandMark } from '@/components/brand-mark';
import { LoginForm } from './login-form';
import { RegisterForm } from './register-form';

type AuthView = 'login' | 'register';

export function AuthPage() {
  const [view, setView] = useState<AuthView>('login');

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-7 bg-gradient-to-br from-slate-50 via-emerald-50 to-green-100 p-4">
      <BrandMark subtitle="Driver" />
      {view === 'login' ? (
        <LoginForm onSwitchToRegister={() => setView('register')} />
      ) : (
        <RegisterForm onSwitchToLogin={() => setView('login')} />
      )}
      <p className="text-xs text-muted-foreground">Go online · Accept rides · Earn</p>
    </div>
  );
}
