
"use client";

import { useState, useMemo, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, addDays } from "date-fns";

import { useData } from "@/context/data-context";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Book, Calendar as CalendarIcon, CheckCircle, User, ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { createToolBookingRequest } from "@/services/data-service";
import { DateRange } from "react-day-picker";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

const bookingSchema = z.object({
  toolId: z.string().min(1, "Please select a tool."),
  requestedForId: z.string().min(1, "Please select the user this tool is for."),
  dateRange: z.object({
    from: z.date({ required_error: "A start date is required." }),
    to: z.date({ required_error: "An end date is required." }),
  }),
  notes: z.string().optional(),
}).refine((data) => data.dateRange.from <= data.dateRange.to, {
  message: "End date must be after start date.",
  path: ["dateRange"],
});

type BookingFormValues = z.infer<typeof bookingSchema>;

export default function ToolBookingPage() {
  const { tools, users, loading, refetchData } = useData();
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [userPopoverOpen, setUserPopoverOpen] = useState(false);


  const availableTools = useMemo(() => tools.filter(t => t.status === "Available"), [tools]);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
  });
  
  const { control, handleSubmit, register, formState: { errors }, watch, setValue } = form;

  const onSubmit = async (data: BookingFormValues) => {
    if (!userProfile) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "You must be logged in to create a request."
        });
        return;
    }
    try {
      await createToolBookingRequest({
        toolId: data.toolId,
        requestedById: userProfile.uid, // The person creating the request
        requestedForId: data.requestedForId, // The person who will use the tool
        startDate: data.dateRange.from,
        endDate: data.dateRange.to,
        notes: data.notes,
      });
      setIsSubmitted(true);
      form.reset();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to submit booking request.";
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    }
  };

  if (isSubmitted) {
    return (
        <div className="flex items-center justify-center h-full">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <CheckCircle className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="mt-4">Request Submitted</CardTitle>
                    <CardDescription>
                        Your tool booking request has been sent for approval. You can check the status in the Tool Management page.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={() => setIsSubmitted(false)}>Submit Another Request</Button>
                </CardContent>
            </Card>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-headline tracking-tight">Tool Booking</h1>
        <p className="text-muted-foreground">Request to borrow a tool for a specific period.</p>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>New Booking Request</CardTitle>
          <CardDescription>Select a tool and the desired dates for your booking.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
             <div className="space-y-2">
                <Label>Tool</Label>
                 <Controller
                    name="toolId"
                    control={control}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger><SelectValue placeholder="Select a tool..." /></SelectTrigger>
                            <SelectContent>
                                {availableTools.map(tool => (
                                    <SelectItem key={tool.id} value={tool.id}>
                                        {tool.name} ({tool.serialNumber})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                />
                {errors.toolId && <p className="text-sm text-destructive">{errors.toolId.message}</p>}
             </div>
              <div className="space-y-2">
                <Label>Requested For (Worker)</Label>
                 <Controller
                    name="requestedForId"
                    control={control}
                    render={({ field }) => (
                         <Popover open={userPopoverOpen} onOpenChange={setUserPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                variant="outline"
                                role="combobox"
                                className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                                >
                                {field.value
                                    ? users.find((user) => user.uid === field.value)?.firstName + ' ' + users.find((user) => user.uid === field.value)?.lastName
                                    : "Select a user..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command>
                                    <CommandInput placeholder="Search user..." />
                                    <CommandEmpty>No user found.</CommandEmpty>
                                    <CommandList>
                                        <CommandGroup>
                                        {users.map((user) => (
                                            <CommandItem
                                                value={`${user.firstName} ${user.lastName}`}
                                                key={user.uid}
                                                onSelect={() => {
                                                    field.onChange(user.uid)
                                                    setUserPopoverOpen(false)
                                                }}
                                                >
                                                <Check
                                                    className={cn("mr-2 h-4 w-4", field.value === user.uid ? "opacity-100" : "opacity-0")}
                                                />
                                                {user.firstName} {user.lastName}
                                            </CommandItem>
                                        ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    )}
                    />
                {errors.requestedForId && <p className="text-sm text-destructive">{errors.requestedForId.message}</p>}
             </div>
             <div className="space-y-2">
                <Label>Booking Dates</Label>
                <Controller
                    name="dateRange"
                    control={control}
                    render={({ field }) => (
                         <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    id="date"
                                    variant={"outline"}
                                    className={cn("w-full justify-start text-left font-normal", !field.value?.from && "text-muted-foreground")}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {field.value?.from ? (
                                        field.value.to ? (
                                        <>
                                            {format(field.value.from, "LLL dd, y")} -{" "}
                                            {format(field.value.to, "LLL dd, y")}
                                        </>
                                        ) : (
                                        format(field.value.from, "LLL dd, y")
                                        )
                                    ) : (
                                        <span>Pick a date range</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={field.value?.from}
                                    selected={field.value as DateRange}
                                    onSelect={field.onChange}
                                    numberOfMonths={2}
                                />
                            </PopoverContent>
                        </Popover>
                    )}
                />
                 {errors.dateRange && <p className="text-sm text-destructive">{errors.dateRange.root?.message || errors.dateRange.from?.message || errors.dateRange.to?.message}</p>}
             </div>
             <div className="space-y-2">
                <Label htmlFor="notes">Notes/Reason (Optional)</Label>
                <Textarea id="notes" {...register("notes")} />
             </div>
             <div className="pt-4 flex justify-end">
                <Button type="submit" disabled={loading}>
                    <Book className="mr-2 h-4 w-4" />
                    Submit Request
                </Button>
             </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
