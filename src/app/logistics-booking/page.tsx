
"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PlusCircle, Calendar as CalendarIcon, Truck, ArrowRight, Package } from "lucide-react";
import { format } from "date-fns";

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

const bookingSchema = z.object({
  bookingType: z.enum(["Inbound", "Outbound", "Demobilization"]),
  serviceType: z.enum(["Standard", "Express", "Bulk"]),
  vehicleId: z.string().min(1, "Vehicle is required."),
  pickupAddress: z.string().min(1, "Pickup address is required."),
  deliveryAddress: z.string().min(1, "Delivery address is required."),
  pickupDate: z.date({ required_error: "Pickup date is required." }),
  itemDescription: z.string().min(1, "Item description is required."),
  specialInstructions: z.string().optional(),
});

const backloadSchema = z.object({
    hasBackload: z.boolean().default(false),
    serviceType: z.string().optional(),
    pickupAddress: z.string().optional(),
    deliveryAddress: z.string().optional(),
    itemDescription: z.string().optional(),
    specialInstructions: z.string().optional(),
}).refine(data => {
    if (data.hasBackload) {
        return data.pickupAddress && data.deliveryAddress && data.itemDescription && data.serviceType;
    }
    return true;
}, {
    message: "Please fill all backload fields if selected.",
    path: ["pickupAddress"],
});


type BookingFormValues = z.infer<typeof bookingSchema>;
type BackloadFormValues = z.infer<typeof backloadSchema>;

export default function LogisticsBookingPage() {
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [isBackloadDialogOpen, setIsBackloadDialogOpen] = useState(false);
  const { toast } = useToast();
  const { vehicles, loading } = useData();
  const [mainBookingData, setMainBookingData] = useState<BookingFormValues | null>(null);

  const mainForm = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
  });

  const backloadForm = useForm<BackloadFormValues>({
    resolver: zodResolver(backloadSchema),
    defaultValues: {
        hasBackload: false,
    },
  });

  const handleNext = async () => {
    const isValid = await mainForm.trigger();
    if (isValid) {
      setMainBookingData(mainForm.getValues());
      setIsBookingDialogOpen(false);
      setIsBackloadDialogOpen(true);
    }
  };

  const handleBack = () => {
      setIsBackloadDialogOpen(false);
      setIsBookingDialogOpen(true);
  }

  const onSubmit = (backloadData: BackloadFormValues) => {
    const finalData = {
        mainBooking: mainBookingData,
        backload: backloadData.hasBackload ? backloadData : null,
    }
    console.log(finalData);
    toast({
      title: "Booking Created",
      description: "Your logistics booking has been successfully created.",
    });
    setIsBackloadDialogOpen(false);
    mainForm.reset();
    backloadForm.reset();
  };

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
              if(!open) mainForm.reset();
              setIsBookingDialogOpen(open);
          }}
        >
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" />
              New Booking
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Logistics Booking (Step 1 of 2)</DialogTitle>
              <DialogDescription>
                Fill in the details for the primary shipment.
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Booking Type</Label>
                  <Controller
                    name="bookingType"
                    control={mainForm.control}
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
                </div>
                <div className="space-y-2">
                  <Label>Service Type</Label>
                  <Controller
                    name="serviceType"
                    control={mainForm.control}
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
                 <div className="space-y-2">
                  <Label>Vehicle</Label>
                  <Controller
                    name="vehicleId"
                    control={mainForm.control}
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
                   {mainForm.formState.errors.vehicleId && <p className="text-sm text-destructive">{mainForm.formState.errors.vehicleId.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pickupAddress">Pickup Address</Label>
                  <Textarea
                    id="pickupAddress"
                    {...mainForm.register("pickupAddress")}
                  />
                  {mainForm.formState.errors.pickupAddress && <p className="text-sm text-destructive">{mainForm.formState.errors.pickupAddress.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deliveryAddress">Delivery Address</Label>
                  <Textarea
                    id="deliveryAddress"
                    {...mainForm.register("deliveryAddress")}
                  />
                   {mainForm.formState.errors.deliveryAddress && <p className="text-sm text-destructive">{mainForm.formState.errors.deliveryAddress.message}</p>}
                </div>
              </div>
                <div className="space-y-2">
                    <Label>Preferred Pickup Date</Label>
                     <Controller
                        control={mainForm.control}
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
                    {mainForm.formState.errors.pickupDate && <p className="text-sm text-destructive">{mainForm.formState.errors.pickupDate.message}</p>}
                </div>

              <div className="space-y-2">
                <Label htmlFor="itemDescription">Item Description</Label>
                <Textarea
                  id="itemDescription"
                  placeholder="e.g., 2 boxes of construction materials, 50kg total"
                  {...mainForm.register("itemDescription")}
                />
                 {mainForm.formState.errors.itemDescription && <p className="text-sm text-destructive">{mainForm.formState.errors.itemDescription.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialInstructions">Special Instructions</Label>
                <Textarea
                  id="specialInstructions"
                  placeholder="e.g., Handle with care, contact person on site is..."
                  {...mainForm.register("specialInstructions")}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsBookingDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="button" onClick={handleNext}>Next <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

       <Dialog open={isBackloadDialogOpen} onOpenChange={(open) => {
            if(!open) backloadForm.reset();
            setIsBackloadDialogOpen(open);
        }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Backload Booking (Step 2 of 2)</DialogTitle>
            <DialogDescription>
              Optional: Add delivery details for a backload to maximize this trip.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={backloadForm.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>Service Type</Label>
                  <Controller
                    name="serviceType"
                    control={backloadForm.control}
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
                  <Label htmlFor="backloadPickupAddress">Backload Pickup Address</Label>
                  <Textarea
                    id="backloadPickupAddress"
                    {...backloadForm.register("pickupAddress")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="backloadDeliveryAddress">Backload Delivery Address</Label>
                  <Textarea
                    id="backloadDeliveryAddress"
                    {...backloadForm.register("deliveryAddress")}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="backloadItemDescription">Backload Item Description</Label>
                <Textarea
                  id="backloadItemDescription"
                  {...backloadForm.register("itemDescription")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="backloadSpecialInstructions">Backload Special Instructions</Label>
                <Textarea
                  id="backloadSpecialInstructions"
                  {...backloadForm.register("specialInstructions")}
                />
              </div>

               {backloadForm.formState.errors.root && <p className="text-sm text-destructive">{backloadForm.formState.errors.root.message}</p>}

              <DialogFooter className="!justify-between">
                 <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                >
                  Back
                </Button>
                <div className="flex gap-2">
                    <Button type="submit" variant="secondary" onClick={() => backloadForm.setValue('hasBackload', false)}>Skip & Create</Button>
                    <Button type="submit" onClick={() => backloadForm.setValue('hasBackload', true)}>Create Booking</Button>
                </div>
              </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>


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
