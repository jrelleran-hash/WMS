
"use client";

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusCircle, MoreHorizontal, Truck, Calendar as CalendarIcon, AlertTriangle } from 'lucide-react';
import { format, addYears, isBefore, startOfToday, differenceInDays } from 'date-fns';

import { useData } from '@/context/data-context';
import { useToast } from '@/hooks/use-toast';
import { addVehicle, updateVehicle } from '@/services/data-service';
import type { Vehicle } from '@/types';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const vehicleSchema = z.object({
  type: z.string().min(1, "Vehicle type is required."),
  plateNumber: z.string().min(1, "Plate number is required."),
  make: z.string().min(1, "Make is required."),
  model: z.string().min(1, "Model is required."),
  year: z.coerce.number().int().min(1900, "Invalid year.").max(new Date().getFullYear() + 1, "Invalid year."),
  weightLimit: z.string().optional(),
  sizeLimit: z.string().optional(),
  description: z.string().optional(),
  registrationDate: z.date().optional(),
  registrationExpiryDate: z.date().optional(),
});


type VehicleFormValues = z.infer<typeof vehicleSchema>;

const statusVariant: { [key: string]: "default" | "secondary" | "destructive" } = {
    Available: "default",
    "In Use": "secondary",
    "Under Maintenance": "destructive",
};

export default function VehiclesPage() {
  const { vehicles, loading, refetchData } = useData();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const { toast } = useToast();

  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
  });

  const editForm = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
  });

  useEffect(() => {
    if(isAddDialogOpen) {
      form.reset();
    }
  }, [isAddDialogOpen, form]);
  
  useEffect(() => {
    if(editingVehicle) {
      editForm.reset({
        ...editingVehicle,
        registrationDate: editingVehicle.registrationDate ? new Date(editingVehicle.registrationDate) : undefined,
        registrationExpiryDate: editingVehicle.registrationExpiryDate ? new Date(editingVehicle.registrationExpiryDate) : undefined,
      });
      setIsEditDialogOpen(true);
    } else {
      setIsEditDialogOpen(false);
    }
  }, [editingVehicle, editForm]);


  const onSubmit = async (data: VehicleFormValues) => {
    try {
      await addVehicle(data);
      toast({
        title: 'Vehicle Added',
        description: `${data.make} ${data.model} has been added to your fleet.`,
      });
      setIsAddDialogOpen(false);
      await refetchData();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add vehicle.',
      });
    }
  };
  
  const onEditSubmit = async (data: VehicleFormValues) => {
    if (!editingVehicle) return;
    try {
        await updateVehicle(editingVehicle.id, data);
        toast({ title: "Success", description: "Vehicle updated successfully." });
        setEditingVehicle(null);
        await refetchData();
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Failed to update vehicle."});
    }
  }

  const handleRegistrationDateChange = (date: Date | undefined, currentForm: any) => {
    currentForm.setValue("registrationDate", date);
    if(date) {
        currentForm.setValue("registrationExpiryDate", addYears(date, 1));
    }
  }
  
  const formatDate = (date: any) => {
    if(!date) return 'N/A';
    return format(date.toDate ? date.toDate() : new Date(date), 'PPP');
  }
  
  const getExpiryStatus = (expiryDate?: Date): { color: string, message: string } | null => {
    if (!expiryDate) return null;
    const today = startOfToday();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = differenceInDays(expiry, today);

    if (isBefore(expiry, today)) {
        return { color: 'text-destructive', message: `Expired ${-daysUntilExpiry} days ago` };
    }
    if (daysUntilExpiry <= 60) {
        return { color: 'text-yellow-500', message: `Expires in ${daysUntilExpiry} days` };
    }
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-headline tracking-tight">
            Vehicle Management
          </h1>
          <p className="text-muted-foreground">
            Manage your fleet of vehicles for logistics operations.
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Vehicle
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Vehicle</DialogTitle>
              <DialogDescription>
                Enter the details of the new vehicle.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Vehicle Type</Label>
                  <Input id="type" {...form.register("type")} placeholder="e.g. Passenger Type, 6-Wheeler Truck" />
                  {form.formState.errors.type && <p className="text-sm text-destructive">{form.formState.errors.type.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="plateNumber">Plate Number</Label>
                    <Input id="plateNumber" {...form.register("plateNumber")} />
                    {form.formState.errors.plateNumber && <p className="text-sm text-destructive">{form.formState.errors.plateNumber.message}</p>}
                </div>
              </div>

               <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="make">Make</Label>
                    <Input id="make" {...form.register("make")} />
                    {form.formState.errors.make && <p className="text-sm text-destructive">{form.formState.errors.make.message}</p>}
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="model">Model</Label>
                    <Input id="model" {...form.register("model")} />
                    {form.formState.errors.model && <p className="text-sm text-destructive">{form.formState.errors.model.message}</p>}
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="year">Year</Label>
                    <Input id="year" type="number" {...form.register("year")} />
                    {form.formState.errors.year && <p className="text-sm text-destructive">{form.formState.errors.year.message}</p>}
                </div>
               </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="weightLimit">Weight Limit (Optional)</Label>
                        <Input id="weightLimit" {...form.register("weightLimit")} placeholder="e.g. Up to 200 kg" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="sizeLimit">Size Limit (Optional)</Label>
                        <Input id="sizeLimit" {...form.register("sizeLimit")} placeholder="e.g. 3.2 x 1.9 x 2.3 ft" />
                    </div>
                </div>
                
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Registration Date (Optional)</Label>
                        <Controller
                            control={form.control}
                            name="registrationDate"
                            render={({ field }) => (
                               <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={(d) => handleRegistrationDateChange(d, form)} initialFocus /></PopoverContent>
                               </Popover>
                            )}
                        />
                    </div>
                     <div className="space-y-2">
                        <Label>Registration Expiry Date</Label>
                         <Controller
                            control={form.control}
                            name="registrationExpiryDate"
                            render={({ field }) => (
                               <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                               </Popover>
                            )}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="description">Description / Suitable for (Optional)</Label>
                    <Textarea id="description" {...form.register("description")} placeholder="e.g. Cheapest 4-wheel option. Max. of 4 Passengers Only." />
                </div>


              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Add Vehicle</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vehicle Fleet</CardTitle>
          <CardDescription>A list of all registered vehicles.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Plate Number</TableHead>
                <TableHead className="hidden md:table-cell">Expiry Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : (
                vehicles.map((vehicle) => {
                  const expiryStatus = getExpiryStatus(vehicle.registrationExpiryDate?.toDate());
                  return (
                  <TableRow key={vehicle.id} onClick={() => setEditingVehicle(vehicle)} className="cursor-pointer">
                    <TableCell>
                        <div className="font-medium">{vehicle.make} {vehicle.model} ({vehicle.year})</div>
                        <div className="text-sm text-muted-foreground">{vehicle.type}</div>
                    </TableCell>
                    <TableCell>{vehicle.plateNumber}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <span>{formatDate(vehicle.registrationExpiryDate)}</span>
                        {expiryStatus && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <AlertTriangle className={cn("h-4 w-4", expiryStatus.color)} />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{expiryStatus.message}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[vehicle.status] || 'default'}>{vehicle.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                       <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                       </Button>
                    </TableCell>
                  </TableRow>
                )})
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
       <Dialog open={isEditDialogOpen} onOpenChange={(open) => !open && setEditingVehicle(null)}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Vehicle</DialogTitle>
              <DialogDescription>
                Update the details of the vehicle.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-type">Vehicle Type</Label>
                  <Input id="edit-type" {...editForm.register("type")} />
                  {editForm.formState.errors.type && <p className="text-sm text-destructive">{editForm.formState.errors.type.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="edit-plateNumber">Plate Number</Label>
                    <Input id="edit-plateNumber" {...editForm.register("plateNumber")} />
                    {editForm.formState.errors.plateNumber && <p className="text-sm text-destructive">{editForm.formState.errors.plateNumber.message}</p>}
                </div>
              </div>

               <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="edit-make">Make</Label>
                    <Input id="edit-make" {...editForm.register("make")} />
                    {editForm.formState.errors.make && <p className="text-sm text-destructive">{editForm.formState.errors.make.message}</p>}
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="edit-model">Model</Label>
                    <Input id="edit-model" {...editForm.register("model")} />
                    {editForm.formState.errors.model && <p className="text-sm text-destructive">{editForm.formState.errors.model.message}</p>}
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="edit-year">Year</Label>
                    <Input id="edit-year" type="number" {...editForm.register("year")} />
                    {editForm.formState.errors.year && <p className="text-sm text-destructive">{editForm.formState.errors.year.message}</p>}
                </div>
               </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="edit-weightLimit">Weight Limit (Optional)</Label>
                        <Input id="edit-weightLimit" {...editForm.register("weightLimit")} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="edit-sizeLimit">Size Limit (Optional)</Label>
                        <Input id="edit-sizeLimit" {...editForm.register("sizeLimit")} />
                    </div>
                </div>
                
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Registration Date (Optional)</Label>
                        <Controller
                            control={editForm.control}
                            name="registrationDate"
                            render={({ field }) => (
                               <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={(d) => handleRegistrationDateChange(d, editForm)} initialFocus /></PopoverContent>
                               </Popover>
                            )}
                        />
                    </div>
                     <div className="space-y-2">
                        <Label>Registration Expiry Date</Label>
                         <Controller
                            control={editForm.control}
                            name="registrationExpiryDate"
                            render={({ field }) => (
                               <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                               </Popover>
                            )}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="edit-description">Description / Suitable for (Optional)</Label>
                    <Textarea id="edit-description" {...editForm.register("description")} />
                </div>


              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingVehicle(null)}
                >
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
    </div>
  );
}
