
"use client";

import { useState, useEffect } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PlusCircle, Calendar as CalendarIcon, Truck, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useData } from "@/context/data-context";
import { useAuthorization } from "@/hooks/use-authorization";
import { useAuth } from "@/hooks/use-auth";

const segmentSchema = z.object({
  serviceType: z.enum(["Standard", "Express", "Bulk"]),
  pickupAddress: z.string().min(1, "Pickup address is required."),
  deliveryAddress: z.string().min(1, "Delivery address is required."),
  itemDescription: z.string().min(1, "Item description is required."),
  specialInstructions: z.string().optional(),
});

const bookingSchema = z.object({
  bookingType: z.enum(["Inbound", "Outbound", "Demobilization"]),
  vehicleId: z.string().min(1, "Vehicle is required."),
  pickupDate: z.date({ required_error: "Pickup date is required." }),
  segments: z.array(segmentSchema).min(1, "At least one segment is required."),
});

type BookingFormValues = z.infer<typeof bookingSchema>;


export default function LogisticsBookingPage() {
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const { toast } = useToast();
  const { vehicles, loading } = useData();
  const { canView } = useAuthorization({ page: '/logistics-booking' });
  const { loading: authLoading } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (!authLoading && !canView) {
      toast({
        variant: "destructive",
        title: "Unauthorized",
        description: "You do not have permission to view this page.",
      });
      router.push('/');
    }
  }, [authLoading, canView, router, toast]);
  
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      segments: [{
        serviceType: 'Standard',
        pickupAddress: '',
        deliveryAddress: '',
        itemDescription: '',
        specialInstructions: '',
      }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "segments",
  });

  const onSubmit = (data: BookingFormValues) => {
    console.log(data);
    toast({
      title: "Booking Created",
      description: "Your logistics booking has been successfully created.",
    });
    setIsBookingDialogOpen(false);
    form.reset();
  };
  
  if (authLoading || !canView) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <p className="text-muted-foreground">Access Denied. Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-headline tracking-tight">
            Logistics Booking
          </h1>
          <p className="text-muted-foreground">
            Schedule new inbound or outbound shipments.
          </p>
        </div>
        <Dialog
          open={isBookingDialogOpen}
          onOpenChange={(open) => {
              if(!open) form.reset();
              setIsBookingDialogOpen(open);
          }}
        >
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" />
              New Booking
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>Create New Logistics Booking</DialogTitle>
              <DialogDescription>
                Fill in the details for the shipment, adding segments for each leg of the journey.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                 <div className="space-y-2">
                  <Label>Booking Type</Label>
                  <Controller
                    name="bookingType"
                    control={form.control}
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select booking type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Inbound">Inbound</SelectItem>
                          <SelectItem value="Outbound">Outbound</SelectItem>
                           <SelectItem value="Demobilization">Demobilization</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {form.formState.errors.bookingType && <p className="text-sm text-destructive">{form.formState.errors.bookingType.message}</p>}
                </div>
                 <div className="space-y-2">
                  <Label>Vehicle</Label>
                  <Controller
                    name="vehicleId"
                    control={form.control}
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select vehicle" />
                        </SelectTrigger>
                        <SelectContent>
                          {loading ? (
                            <SelectItem value="loading" disabled>Loading...</SelectItem>
                          ) : (
                            vehicles.map(v => (
                              <SelectItem key={v.id} value={v.id}>{v.make} {v.model} ({v.plateNumber})</SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  />
                   {form.formState.errors.vehicleId && <p className="text-sm text-destructive">{form.formState.errors.vehicleId.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label>Preferred Pickup Date</Label>
                     <Controller
                        control={form.control}
                        name="pickupDate"
                        render={({ field }) => (
                           <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                )}
                                >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                                />
                            </PopoverContent>
                            </Popover>
                        )}
                     />
                    {form.formState.errors.pickupDate && <p className="text-sm text-destructive">{form.formState.errors.pickupDate.message}</p>}
                </div>
              </div>
              
              <div className="space-y-4">
                <Label className="text-base font-semibold">Booking Segments</Label>
                {fields.map((field, index) => (
                  <div key={field.id} className="space-y-4 rounded-md border p-4 relative">
                    <div className="flex justify-between items-center">
                      <h4 className="font-semibold">Segment {index + 1}</h4>
                       {fields.length > 1 && (
                         <Button type="button" variant="ghost" size="icon" className="h-7 w-7 absolute top-2 right-2" onClick={() => remove(index)}>
                            <Trash2 className="text-destructive" />
                        </Button>
                       )}
                    </div>
                     <div className="space-y-2">
                      <Label>Service Type</Label>
                      <Controller
                        name={`segments.${index}.serviceType`}
                        control={form.control}
                        render={({ field }) => (
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select service type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Standard">Standard</SelectItem>
                              <SelectItem value="Express">Express</SelectItem>
                              <SelectItem value="Bulk">Bulk</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor={`pickupAddress-${index}`}>Pickup Address</Label>
                            <Textarea
                                id={`pickupAddress-${index}`}
                                {...form.register(`segments.${index}.pickupAddress`)}
                            />
                            {form.formState.errors.segments?.[index]?.pickupAddress && <p className="text-sm text-destructive">{form.formState.errors.segments[index]?.pickupAddress?.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor={`deliveryAddress-${index}`}>Delivery Address</Label>
                            <Textarea
                                id={`deliveryAddress-${index}`}
                                {...form.register(`segments.${index}.deliveryAddress`)}
                            />
                            {form.formState.errors.segments?.[index]?.deliveryAddress && <p className="text-sm text-destructive">{form.formState.errors.segments[index]?.deliveryAddress?.message}</p>}
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor={`itemDescription-${index}`}>Item Description</Label>
                        <Textarea
                        id={`itemDescription-${index}`}
                        placeholder="e.g., 2 boxes of construction materials, 50kg total"
                        {...form.register(`segments.${index}.itemDescription`)}
                        />
                        {form.formState.errors.segments?.[index]?.itemDescription && <p className="text-sm text-destructive">{form.formState.errors.segments[index]?.itemDescription?.message}</p>}
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor={`specialInstructions-${index}`}>Special Instructions</Label>
                        <Textarea
                        id={`specialInstructions-${index}`}
                        placeholder="e.g., Handle with care, contact person on site is..."
                        {...form.register(`segments.${index}.specialInstructions`)}
                        />
                    </div>
                  </div>
                ))}
                 <Button type="button" variant="outline" size="sm" onClick={() => append({ serviceType: 'Standard', pickupAddress: '', deliveryAddress: '', itemDescription: '' })}>
                    <PlusCircle className="mr-2" /> Add Segment
                </Button>
              </div>

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsBookingDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Create Booking</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Existing Bookings</CardTitle>
          <CardDescription>
            A list of all your scheduled bookings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Pickup</TableHead>
                <TableHead>Delivery</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                        No bookings created yet.
                    </TableCell>
                </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
