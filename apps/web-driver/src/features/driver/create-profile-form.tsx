import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/auth-context';
import { useCreateDriverMutation } from './use-driver-queries';
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
  } = useForm<CreateProfileInput>({ resolver: zodResolver(createProfileSchema) });

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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Create Driver Profile</CardTitle>
          <CardDescription>Set up your vehicle details to start accepting rides</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-1">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Driver"
                {...register('name')}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="vehiclePlate">Vehicle Plate</Label>
              <Input
                id="vehiclePlate"
                type="text"
                placeholder="51A-123.45"
                {...register('vehiclePlate')}
              />
              {errors.vehiclePlate && (
                <p className="text-xs text-destructive">{errors.vehiclePlate.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="vehicleModel">Vehicle Model</Label>
              <Input
                id="vehicleModel"
                type="text"
                placeholder="Toyota Vios 2022"
                {...register('vehicleModel')}
              />
              {errors.vehicleModel && (
                <p className="text-xs text-destructive">{errors.vehicleModel.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : 'Save profile'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
