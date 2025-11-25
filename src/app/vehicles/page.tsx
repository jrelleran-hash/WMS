

"use client";

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusCircle, MoreHorizontal, Truck, Calendar as CalendarIcon, AlertTriangle, Droplet } from 'lucide-react';
import { format, addYears, isBefore, startOfToday, differenceInDays, parse } from 'date-fns';

import { useData } from '@/context/data-context';
import { useToast } from '@/hooks/use-toast';
import { addVehicle, updateVehicle, deleteVehicle, addFuelLog } from '@/services/data-service';
import type { Vehicle } from '@/types';

import { Button, buttonVariants } from '@/components/ui/button';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const vehicleSchema = z.object({
  type: z.string().min(1, "Vehicle type is required."),
  plateNumber: z.string().min(1, "Plate number is required."),
  make: z.string().min(1, "Make is required."),
  model: z.string().min(1, "Model is required."),
  year: z.coerce.number().int().min(1900, "Invalid year.").max(new Date().getFullYear() + 1, "Invalid year."),
  weightLimit: z.string().optional(),
  sizeLimit: z.string().optional(),
  description: z.string().optional(),
  crNumber: z.string().optional(),
  crDate: z.date().optional(),
  latestOrNumber: z.string().optional(),
  registrationDate: z.date().optional(),
  registrationExpiryDate: z.date().optional(),
  registrationDuration: z.coerce.number().int().min(1, "Duration must be at least 1 year.").optional(),
  fuelType: z.enum(["Gasoline", "Diesel", "Electric", "Other"]).optional(),
  fuelConsumption: z.coerce.number().nonnegative("Must be a positive number").optional(),
  odometer: z.coerce.number().nonnegative("Must be a positive number").optional(),
});

const fuelLogSchema = z.object({
    date: z.date({ required_error: "Date is required." }),
    liters: z.coerce.number().min(0.1, "Liters must be greater than 0."),
    cost: z.coerce.number().min(1, "Cost must be greater than 0."),
    odometer: z.coerce.number().min(1, "Odometer reading is required."),
});


type VehicleFormValues = z.infer<typeof vehicleSchema>;
type FuelLogFormValues = z.infer<typeof fuelLogSchema>;

const statusVariant: { [key: string]: "default" | "secondary" | "destructive" } = {
    Available: "default",
    "In Use": "secondary",
    "Under Maintenance": "destructive",
};

const DatePickerInput = ({ field, placeholder, onDateChange, disabled }: { field: any, placeholder: string, onDateChange?: (date?: Date) => void, disabled?: boolean }) => {
    const [inputValue, setInputValue] = useState(field.value ? format(new Date(field.value), 'MM/dd/yyyy') : '');
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    useEffect(() => {
        setInputValue(field.value ? format(new Date(field.value), 'MM/dd/yyyy') : '');
    }, [field.value]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newInputValue = e.target.value;
        setInputValue(newInputValue);
        const parsedDate = parse(newInputValue, 'MM/dd/yyyy', new Date());
        if (!isNaN(parsedDate.getTime())) {
            field.onChange(parsedDate);
            if (onDateChange) {
                onDateChange(parsedDate);
            }
        }
    };

    const handleSelect = (date: Date | undefined) => {
        field.onChange(date);
        if (onDateChange) {
            onDateChange(date);
        }
        setInputValue(date ? format(date, 'MM/dd/yyyy') : '');
        setIsPopoverOpen(false);
    };

    return (
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <div className="relative">
                <Input
                    value={inputValue}
                    onChange={handleInputChange}
                    placeholder={placeholder}
                    className="pr-10"
                    disabled={disabled}
                />
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="absolute inset-y-0 right-0 h-full px-3" disabled={disabled}>
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    </Button>
                </PopoverTrigger>
            </div>
            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={handleSelect} initialFocus /></PopoverContent>
        </Popover>
    );
};

export default function VehiclesPage() {
  const { vehicles, loading, refetchData } = useData();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isFuelLogOpen, setIsFuelLogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [loggingFuelForVehicle, setLoggingFuelForVehicle] = useState<Vehicle | null>(null);
  const [deletingVehicleId, setDeletingVehicleId] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
     defaultValues: {
      registrationDuration: 1,
    }
  });

  const editForm = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
  });

  const fuelLogForm = useForm<FuelLogFormValues>({
    resolver: zodResolver(fuelLogSchema),
  });

  useEffect(() => {
    if(isAddDialogOpen) {
      form.reset({
        registrationDuration: 1,
      });
    }
  }, [isAddDialogOpen, form]);
  
  useEffect(() => {
    if(editingVehicle) {
      editForm.reset({
        ...editingVehicle,
        crDate: editingVehicle.crDate ? new Date(editingVehicle.crDate) : undefined,
        registrationDate: editingVehicle.registrationDate ? new Date(editingVehicle.registrationDate) : undefined,
        registrationExpiryDate: editingVehicle.registrationExpiryDate ? new Date(editingVehicle.registrationExpiryDate) : undefined,
        registrationDuration: editingVehicle.registrationDuration || 1,
      });
      setIsEditDialogOpen(true);
    } else {
      setIsEditDialogOpen(false);
    }
  }, [editingVehicle, editForm]);

  useEffect(() => {
    if(loggingFuelForVehicle) {
        fuelLogForm.reset({
            date: new Date(),
            odometer: loggingFuelForVehicle.odometer,
        });
        setIsFuelLogOpen(true);
    } else {
        setIsFuelLogOpen(false);
    }
  }, [loggingFuelForVehicle, fuelLogForm]);


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
  
  const onFuelLogSubmit = async (data: FuelLogFormValues) => {
      if (!loggingFuelForVehicle) return;
      try {
          await addFuelLog(loggingFuelForVehicle.id, data);
          toast({ title: "Success", description: "Fuel log added successfully." });
          setLoggingFuelForVehicle(null);
          await refetchData();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to add fuel log.";
        toast({ variant: "destructive", title: "Error", description: errorMessage });
      }
  }

  const handleDeleteClick = (vehicleId: string) => {
    setDeletingVehicleId(vehicleId);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingVehicleId) return;
    try {
      await deleteVehicle(deletingVehicleId);
      toast({ title: "Success", description: "Vehicle deleted successfully." });
      await refetchData();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete vehicle.",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setDeletingVehicleId(null);
    }
  };


  const handleRegistrationDateChange = (date: Date | undefined, currentForm: any) => {
    currentForm.setValue("registrationDate", date);
    const duration = currentForm.getValues("registrationDuration") || 1;
    if(date) {
        currentForm.setValue("registrationExpiryDate", addYears(date, duration));
    }
  }
  
  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>, currentForm: any) => {
    const duration = parseInt(e.target.value, 10);
    currentForm.setValue("registrationDuration", isNaN(duration) ? 1 : duration);
    const regDate = currentForm.getValues("registrationDate");
    if(regDate) {
        currentForm.setValue("registrationExpiryDate", addYears(new Date(regDate), isNaN(duration) ? 1 : duration));
    }
  }
  
  const formatDate = (date: any) => {
    if(!date) return 'N/A';
    // Handle both Firestore Timestamp and JS Date objects
    const jsDate = date.toDate ? date.toDate() : new Date(date);
    if (isNaN(jsDate.getTime())) return 'Invalid Date';
    return format(jsDate, 'PPP');
  }
  
  const getExpiryStatus = (expiryDate?: Date): { color: string, message: string } | null => {
    if (!expiryDate) return null;
    const today = startOfToday();
    const expiry = new Date(expiryDate);
    if (isNaN(expiry.getTime())) return null;
    const daysUntilExpiry = differenceInDays(expiry, today);

    if (isBefore(expiry, today)) {
        return { color: 'text-destructive', message: `Expired ${-daysUntilExpiry} days ago` };
    }
    if (daysUntilExpiry <= 60) {
        return { color: 'text-yellow-500', message: `Expires in ${daysUntilExpiry} days` };
    }
    return null;
  }

  const VehicleFormFields = ({ form: currentForm }: { form: any }) => (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">Vehicle Type</Label>
          <Input id="type" {...currentForm.register("type")} placeholder="e.g. Passenger Type, 6-Wheeler Truck" />
          {currentForm.formState.errors.type && <p className="text-sm text-destructive">{currentForm.formState.errors.type.message}</p>}
        </div>
        <div className="space-y-2">
            <Label htmlFor="plateNumber">Plate Number</Label>
            <Input id="plateNumber" {...currentForm.register("plateNumber")} />
            {currentForm.formState.errors.plateNumber && <p className="text-sm text-destructive">{currentForm.formState.errors.plateNumber.message}</p>}
        </div>
      </div>

       <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
         <div className="space-y-2">
            <Label htmlFor="make">Make</Label>
            <Input id="make" {...currentForm.register("make")} />
            {currentForm.formState.errors.make && <p className="text-sm text-destructive">{currentForm.formState.errors.make.message}</p>}
        </div>
         <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Input id="model" {...currentForm.register("model")} />
            {currentForm.formState.errors.model && <p className="text-sm text-destructive">{currentForm.formState.errors.model.message}</p>}
        </div>
         <div className="space-y-2">
            <Label htmlFor="year">Year</Label>
            <Input id="year" type="number" {...currentForm.register("year")} />
            {currentForm.formState.errors.year && <p className="text-sm text-destructive">{currentForm.formState.errors.year.message}</p>}
        </div>
       </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="weightLimit">Weight Limit (Optional)</Label>
                <Input id="weightLimit" {...currentForm.register("weightLimit")} placeholder="e.g. Up to 200 kg" />
            </div>
             <div className="space-y-2">
                <Label htmlFor="sizeLimit">Size Limit (Optional)</Label>
                <Input id="sizeLimit" {...currentForm.register("sizeLimit")} placeholder="e.g. 3.2 x 1.9 x 2.3 ft" />
            </div>
        </div>
        
        <div className="space-y-4 rounded-md border p-4">
          <h3 className="text-sm font-medium">Fuel & Odometer</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
                <Label htmlFor="fuelType">Fuel Type</Label>
                <Controller
                    control={currentForm.control}
                    name="fuelType"
                    render={({ field }) => (
                       <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger><SelectValue placeholder="Select fuel type..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Gasoline">Gasoline</SelectItem>
                                <SelectItem value="Diesel">Diesel</SelectItem>
                                <SelectItem value="Electric">Electric</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                       </Select>
                    )}
                />
            </div>
             <div className="space-y-2">
                <Label htmlFor="fuelConsumption">Avg. Consumption (L/km)</Label>
                <Input id="fuelConsumption" type="number" step="0.01" {...currentForm.register("fuelConsumption")} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="odometer">Odometer (km)</Label>
                <Input id="odometer" type="number" {...currentForm.register("odometer")} />
            </div>
          </div>
        </div>

         <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
             <div className="space-y-2">
                <Label htmlFor="crNumber">CR Number (Optional)</Label>
                <Input id="crNumber" {...currentForm.register("crNumber")} />
            </div>
             <div className="space-y-2">
                <Label>CR Date (Optional)</Label>
                <Controller
                    control={currentForm.control}
                    name="crDate"
                    render={({ field }) => (
                       <DatePickerInput field={field} placeholder="MM/DD/YYYY" />
                    )}
                />
            </div>
             <div className="space-y-2">
                <Label htmlFor="latestOrNumber">Latest OR # (Optional)</Label>
                <Input id="latestOrNumber" {...currentForm.register("latestOrNumber")} />
            </div>
        </div>
        
         <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
                <Label>Registration Date (Optional)</Label>
                <Controller
                    control={currentForm.control}
                    name="registrationDate"
                    render={({ field }) => (
                       <DatePickerInput 
                            field={field} 
                            placeholder="MM/DD/YYYY" 
                            onDateChange={(date) => handleRegistrationDateChange(date, currentForm)} 
                        />
                    )}
                />
            </div>
             <div className="space-y-2">
                <Label>Duration (Years)</Label>
                <Input type="number" {...currentForm.register("registrationDuration")} onChange={(e) => handleDurationChange(e, currentForm)} />
            </div>
             <div className="space-y-2">
                <Label>Registration Expiry Date</Label>
                 <Controller
                    control={currentForm.control}
                    name="registrationExpiryDate"
                    render={({ field }) => (
                       <DatePickerInput field={field} placeholder="Calculated..." disabled />
                    )}
                />
            </div>
        </div>

        <div className="space-y-2">
            <Label htmlFor="description">Description / Suitable for (Optional)</Label>
            <Textarea id="description" {...currentForm.register("description")} placeholder="e.g. Cheapest 4-wheel option. Max. of 4 Passengers Only." />
        </div>
    </>
  )

  return (
    <>
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
              <VehicleFormFields form={form} />
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
                <TableHead className="hidden md:table-cell">Consumption</TableHead>
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
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : (
                vehicles.map((vehicle) => {
                  const expiryStatus = getExpiryStatus(vehicle.registrationExpiryDate);
                  return (
                  <TableRow key={vehicle.id}>
                    <TableCell>
                        <div className="font-medium">{vehicle.make} {vehicle.model} ({vehicle.year})</div>
                        <div className="text-sm text-muted-foreground">{vehicle.type}</div>
                    </TableCell>
                    <TableCell>{vehicle.plateNumber}</TableCell>
                    <TableCell className="hidden md:table-cell">{vehicle.fuelConsumption ? `${vehicle.fuelConsumption} L/km` : 'N/A'}</TableCell>
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
                       <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                                  <MoreHorizontal className="h-4 w-4" />
                              </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onSelect={() => setEditingVehicle(vehicle)}>
                                Edit
                              </DropdownMenuItem>
                               <DropdownMenuItem onSelect={() => setLoggingFuelForVehicle(vehicle)}>
                                <Droplet className="mr-2 h-4 w-4" />
                                Log Fuel
                              </DropdownMenuItem>
                               <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onSelect={() => handleDeleteClick(vehicle.id)}
                              >
                                Delete
                              </DropdownMenuItem>
                          </DropdownMenuContent>
                      </DropdownMenu>
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
              <VehicleFormFields form={editForm} />
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
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this vehicle from your records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className={buttonVariants({ variant: "destructive" })}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isFuelLogOpen} onOpenChange={(open) => !open && setLoggingFuelForVehicle(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Log Fuel for {loggingFuelForVehicle?.make} {loggingFuelForVehicle?.model}</DialogTitle>
                <DialogDescription>Enter the details of the fuel purchase to calculate consumption.</DialogDescription>
            </DialogHeader>
            <form onSubmit={fuelLogForm.handleSubmit(onFuelLogSubmit)} className="space-y-4">
                <div className="space-y-2">
                    <Label>Date</Label>
                     <Controller
                        control={fuelLogForm.control}
                        name="date"
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
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="liters">Liters</Label>
                        <Input id="liters" type="number" step="0.01" {...fuelLogForm.register("liters")} />
                        {fuelLogForm.formState.errors.liters && <p className="text-sm text-destructive">{fuelLogForm.formState.errors.liters.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="cost">Total Cost</Label>
                        <Input id="cost" type="number" step="0.01" {...fuelLogForm.register("cost")} />
                        {fuelLogForm.formState.errors.cost && <p className="text-sm text-destructive">{fuelLogForm.formState.errors.cost.message}</p>}
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="odometer-log">Odometer Reading (km)</Label>
                    <Input id="odometer-log" type="number" {...fuelLogForm.register("odometer")} />
                    {fuelLogForm.formState.errors.odometer && <p className="text-sm text-destructive">{fuelLogForm.formState.errors.odometer.message}</p>}
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setLoggingFuelForVehicle(null)}>Cancel</Button>
                    <Button type="submit">Add Log</Button>
                </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
