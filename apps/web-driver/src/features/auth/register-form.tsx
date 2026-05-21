import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterInput } from '@rocket/contracts';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from './auth-context';
import { useRegisterMutation } from './use-auth-mutations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function RegisterForm({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const mutation = useRegisterMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    mode: 'onTouched',
    defaultValues: { role: 'DRIVER' },
  });

  const onSubmit = (data: RegisterInput) => {
    mutation.mutate(data, {
      onSuccess: (res) => {
        login(res);
        toast.success(`Welcome, ${res.user.name}! Set up your driver profile to get started.`);
        navigate('/');
      },
      onError: () => {
        toast.error('Registration failed. Email may already be in use.');
      },
    });
  };

  return (
    <Card className="w-full max-w-sm border-white/70 bg-white/80 shadow-xl backdrop-blur-lg">
      <CardHeader>
        <CardTitle>Driver registration</CardTitle>
        <CardDescription>Create a driver account to start earning</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="name">
              Full name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="John Driver"
              autoComplete="name"
              autoFocus
              aria-invalid={errors.name ? true : undefined}
              {...register('name')}
            />
            {errors.name && (
              <p role="alert" className="text-xs font-medium text-destructive">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reg-email">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="reg-email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              aria-invalid={errors.email ? true : undefined}
              {...register('email')}
            />
            {errors.email && (
              <p role="alert" className="text-xs font-medium text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reg-password">
              Password <span className="text-destructive">*</span>
            </Label>
            <PasswordInput
              id="reg-password"
              placeholder="Min 6 characters"
              autoComplete="new-password"
              aria-invalid={errors.password ? true : undefined}
              {...register('password')}
            />
            {errors.password ? (
              <p role="alert" className="text-xs font-medium text-destructive">
                {errors.password.message}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Use at least 6 characters.</p>
            )}
          </div>

          {/* role is hidden — always DRIVER for this app */}
          <input type="hidden" {...register('role')} value="DRIVER" />

          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {mutation.isPending ? 'Creating account…' : 'Create account'}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="cursor-pointer rounded font-medium text-primary underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Sign in
            </button>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
