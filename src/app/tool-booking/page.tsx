
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
import { Book, Calendar as CalendarIcon, CheckCircle, User, ChevronsUpDown, Check, PlusCircle, Wrench, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { createToolBookingRequest, addWorker } from "@/services/data-service";
import { DateRange } from "react-day-picker";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuthorization } from "@/hooks/use-authorization";
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';

const bookingSchema = z.object({
  toolIds: z.array(z.string()).min(1, "Please select at least one tool."),
  requestedForId: z.string().min(1, "Please select the worker this tool is for."),
  bookingType: z.enum(["Borrow", "Accountability"]),
  dateRange: z.object({
    from: z.date().optional(),
    to: z.date().optional(),
  }).optional(),
  notes: z.string().optional(),
}).refine((data) => {
    if (data.bookingType === 'Borrow') {
        return !!data.dateRange?.from && !!data.dateRange?.to;
    }
    return true;
}, {
    message: "Date range is required for borrowing.",
    path: ["dateRange"],
}).refine((data) => {
    if (data.bookingType === 'Borrow' && data.dateRange?.from && data.dateRange?.to) {
        return data.dateRange.from <= data.dateRange.to;
    }
    return true;
}, {
    message: "End date must be on or after the start date.",
    path: ["dateRange"],
});


type BookingFormValues = z.infer<typeof bookingSchema>;

const workerSchema = z.object({
    name: z.string().min(1, "Worker name is required."),
    role: z.string().min(1, "Worker role/position is required."),
});

type WorkerFormValues = z.infer<typeof workerSchema>;


export default function ToolBookingPage() {
  const { tools, workers, loading, refetchData } = useData();
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [userPopoverOpen, setUserPopoverOpen] = useState(false);
  const [toolPopoverOpen, setToolPopoverOpen] = useState(false);
  const [isAddWorkerOpen, setIsAddWorkerOpen] = useState(false);

  const availableTools = useMemo(() => tools.filter(t => t.status === "Available"), [tools]);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      bookingType: "Borrow",
      toolIds: [],
    }
  });

  const workerForm = useForm<WorkerFormValues>({
      resolver: zodResolver(workerSchema),
  });
  
  const { control, handleSubmit, register, formState: { errors }, watch, setValue } = form;
  
  const bookingType = watch("bookingType");
  const selectedToolIds = watch("toolIds");

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
      for (const toolId of data.toolIds) {
        await createToolBookingRequest({
            toolId: toolId,
            requestedById: userProfile.uid,
            requestedForId: data.requestedForId,
            bookingType: data.bookingType,
            startDate: data.dateRange?.from,
            endDate: data.dateRange?.to,
            notes: data.notes,
        });
      }
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
  
  const onAddWorkerSubmit = async (data: WorkerFormValues) => {
      try {
          const newWorker = await addWorker(data);
          toast({
              title: "Worker Added",
              description: `${data.name} has been added to the list.`,
          });
          await refetchData();
          setIsAddWorkerOpen(false);
          workerForm.reset();
          setValue("requestedForId", newWorker.id); // Auto-select the new worker
      } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Failed to add worker.";
          toast({ variant: "destructive", title: "Error", description: errorMessage });
      }
  }


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
      <div className="flex items-center justify-between gap-4">
        <div>
            <h1 className="text-2xl font-bold font-headline tracking-tight">Tool Booking</h1>
            <p className="text-muted-foreground">Request to borrow a tool for a specific period.</p>
        </div>
         <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
                <Link href="/tool-wishlist">
                    <Heart className="mr-2 h-4 w-4" /> Tool Wishlist
                </Link>
            </Button>
        </div>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>New Booking Request</CardTitle>
          <CardDescription>Select a tool and the desired dates for your booking.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Booking Type</Label>
              <Controller
                name="bookingType"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select booking type..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Borrow">Borrow (Temporary)</SelectItem>
                      <SelectItem value="Accountability">Accountability</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Tool(s)</Label>
               <Controller
                name="toolIds"
                control={control}
                render={({ field }) => (
                  <Popover open={toolPopoverOpen} onOpenChange={setToolPopoverOpen}>
                    <PopoverTrigger asChild>
                       <Button variant="outline" role="combobox" className="w-full justify-between h-auto">
                           <div className="flex flex-wrap gap-1">
                                {selectedToolIds.length > 0 ? selectedToolIds.map(toolId => {
                                    const tool = availableTools.find(t => t.id === toolId);
                                    return <Badge key={toolId} variant="secondary">{tool?.name}</Badge>
                                }) : "Select tools..."}
                           </div>
                           <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                       </Button>
                    </PopoverTrigger>
                     <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                          <CommandInput placeholder="Search tools..." />
                          <CommandList>
                            <CommandEmpty>No tools found.</CommandEmpty>
                            <CommandGroup>
                              {availableTools.map((tool) => (
                                <CommandItem
                                  key={tool.id}
                                  value={tool.name}
                                  onSelect={() => {
                                    const currentToolIds = field.value || [];
                                    const newToolIds = currentToolIds.includes(tool.id)
                                      ? currentToolIds.filter(id => id !== tool.id)
                                      : [...currentToolIds, tool.id];
                                    field.onChange(newToolIds);
                                  }}
                                >
                                  <Check className={cn("mr-2 h-4 w-4", field.value?.includes(tool.id) ? "opacity-100" : "opacity-0")} />
                                  {tool.name} ({tool.serialNumber})
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                    </PopoverContent>
                  </Popover>
                )}
              />
              {errors.toolIds && <p className="text-sm text-destructive">{errors.toolIds.message}</p>}
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
                          ? workers.find((worker) => worker.id === field.value)?.name
                          : "Select a worker..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput placeholder="Search worker..." />
                        <CommandEmpty>
                          <Button variant="ghost" className="w-full" onClick={() => { setUserPopoverOpen(false); setIsAddWorkerOpen(true); }}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add New Worker
                          </Button>
                        </CommandEmpty>
                        <CommandList>
                          <CommandGroup>
                            {workers.map((worker) => (
                              <CommandItem
                                value={worker.name}
                                key={worker.id}
                                onSelect={() => {
                                  field.onChange(worker.id)
                                  setUserPopoverOpen(false)
                                }}
                              >
                                <Check
                                  className={cn("mr-2 h-4 w-4", field.value === worker.id ? "opacity-100" : "opacity-0")}
                                />
                                {worker.name}
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

            {bookingType === 'Borrow' && (
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
            )}

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
      
       <Dialog open={isAddWorkerOpen} onOpenChange={setIsAddWorkerOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Add New Worker</DialogTitle>
                    <DialogDescription>
                        Add a new worker to the list for tool assignments.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={workerForm.handleSubmit(onAddWorkerSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="worker-name">Worker Name</Label>
                        <Input id="worker-name" {...workerForm.register("name")} />
                        {workerForm.formState.errors.name && <p className="text-sm text-destructive">{workerForm.formState.errors.name.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="worker-role">Role / Position</Label>
                        <Input id="worker-role" {...workerForm.register("role")} />
                        {workerForm.formState.errors.role && <p className="text-sm text-destructive">{workerForm.formState.errors.role.message}</p>}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setIsAddWorkerOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={workerForm.formState.isSubmitting}>
                            {workerForm.formState.isSubmitting ? "Adding..." : "Add Worker"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    </div>
  );
}
