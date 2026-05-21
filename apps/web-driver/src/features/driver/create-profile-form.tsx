import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/auth-context';
import { useCreateDriverMutation } from './use-driver-queries';
import { BrandMark } from '@/components/brand-mark';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Extend contracts createDriverSchema locally — contracts omits `name`
const createProfileSchema = z.object({
  name: z.string().min(1, 'Display name is required'),
  vehiclePlate: z.string().min(1, 'Vehicle plate is required'),
  vehicleModel: z.string().min(1, 'Vehicle model is required'),
});

type CreateProfileInput = z.infer<typeof createProfileSchema>;

export function CreateProfileForm() {
  const { user } = useAuth();
  const mutation = useCreateDriverMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateProfileInput>({
    resolver: zodResolver(createProfileSchema),
    mode: 'onTouched',
  });

  const onSubmit = (data: CreateProfileInput) => {
    if (!user) return;
    mutation.mutate(
      { userId: user.id, ...data },
      {
        onSuccess: () => {
          toast.success('Driver profile created! You can now go online.');
        },
        onError: () => {
          toast.error('Failed to create driver profile. Please try again.');
        },
      },
    );
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-7 bg-gradient-to-br from-slate-50 via-emerald-50 to-green-100 p-4">
      <BrandMark subtitle="Driver" />
      <Card className="w-full max-w-sm border-white/70 bg-white/80 shadow-xl backdrop-blur-lg">
        <CardHeader>
          <CardTitle>Set up your vehicle</CardTitle>
          <CardDescription>Add your vehicle details to start accepting rides</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="name">
                Display name <span className="text-destructive">*</span>
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
              <Label htmlFor="vehiclePlate">
                Vehicle plate <span className="text-destructive">*</span>
              </Label>
              <Input
                id="vehiclePlate"
                type="text"
                placeholder="51A-123.45"
                aria-invalid={errors.vehiclePlate ? true : undefined}
                {...register('vehiclePlate')}
              />
              {errors.vehiclePlate && (
                <p role="alert" className="text-xs font-medium text-destructive">
                  {errors.vehiclePlate.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="vehicleModel">
                Vehicle model <span className="text-destructive">*</span>
              </Label>
              <Input
                id="vehicleModel"
                type="text"
                placeholder="Toyota Vios 2022"
                aria-invalid={errors.vehicleModel ? true : undefined}
                {...register('vehicleModel')}
              />
              {errors.vehicleModel && (
                <p role="alert" className="text-xs font-medium text-destructive">
                  {errors.vehicleModel.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              {mutation.isPending ? 'Saving…' : 'Save profile'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
