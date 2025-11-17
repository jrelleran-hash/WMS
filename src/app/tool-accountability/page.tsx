
"use client";

import React, { useMemo, useState } from "react";
import { useData } from "@/context/data-context";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PlusCircle, ChevronsUpDown, Check } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import type { Tool } from "@/types";
import { recallTool, assignToolForAccountability } from "@/services/data-service";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

const conditionVariant: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
  Good: "default",
  "Needs Repair": "secondary",
  Damaged: "destructive",
};

const recallSchema = z.object({
    condition: z.enum(["Good", "Needs Repair", "Damaged"]),
    notes: z.string().optional(),
});
type RecallFormValues = z.infer<typeof recallSchema>;

const assignSchema = z.object({
    toolId: z.string().min(1, "Please select a tool."),
    assignedTo: z.string().min(1, "Please select a user."),
});
type AssignFormValues = z.infer<typeof assignSchema>;


export default function ToolAccountabilityPage() {
  const { tools, users, loading, refetchData } = useData();
  const { toast } = useToast();

  const [isRecallDialogOpen, setIsRecallDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [recallingTool, setRecallingTool] = useState<Tool | null>(null);
  const [toolPopoverOpen, setToolPopoverOpen] = useState(false);
  const [userPopoverOpen, setUserPopoverOpen] = useState(false);


  const recallForm = useForm<RecallFormValues>();
  const assignForm = useForm<AssignFormValues>({
    resolver: zodResolver(assignSchema),
  });

  React.useEffect(() => { 
    if (recallingTool) {
      recallForm.reset({ condition: recallingTool.condition });
      setIsRecallDialogOpen(true);
    } else {
      setIsRecallDialogOpen(false);
    }
  }, [recallingTool, recallForm]);
  
  React.useEffect(() => {
    if(!isAssignDialogOpen) {
      assignForm.reset();
    }
  }, [isAssignDialogOpen, assignForm]);

  const onRecallSubmit = async (data: RecallFormValues) => {
    if (!recallingTool) return;
    try {
        await recallTool(recallingTool.id, data.condition, data.notes);
        toast({ title: "Success", description: "Tool has been recalled."});
        setRecallingTool(null);
        await refetchData();
    } catch(error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to recall tool.";
        toast({ variant: "destructive", title: "Error", description: errorMessage });
    }
  };

  const onAssignSubmit = async (data: AssignFormValues) => {
    try {
      await assignToolForAccountability(data.toolId, data.assignedTo);
      toast({ title: "Success", description: "Tool assigned for accountability." });
      setIsAssignDialogOpen(false);
      await refetchData();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to assign tool.";
      toast({ variant: "destructive", title: "Error", description: errorMessage });
    }
  };


  const accountableTools = useMemo(() => {
    return tools.filter(t => t.status === "Assigned");
  }, [tools]);

  const availableTools = useMemo(() => {
    return tools.filter(t => t.status === "Available");
  }, [tools]);

  return (
    <>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-2xl font-bold font-headline tracking-tight">
            Tool Accountability
            </h1>
            <p className="text-muted-foreground">
            A list of all tools assigned to specific users for long-term accountability.
            </p>
        </div>
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogTrigger asChild>
             <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              New Accountability
            </Button>
          </DialogTrigger>
           <DialogContent>
            <DialogHeader>
                <DialogTitle>Assign New Accountability</DialogTitle>
                <DialogDescription>Select an available tool and assign it to a user.</DialogDescription>
            </DialogHeader>
            <form onSubmit={assignForm.handleSubmit(onAssignSubmit)} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="toolId">Available Tool</Label>
                    <Controller
                        name="toolId"
                        control={assignForm.control}
                        render={({ field }) => (
                           <Popover open={toolPopoverOpen} onOpenChange={setToolPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                                        {field.value ? availableTools.find(t => t.id === field.value)?.name : "Select a tool..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                    <Command>
                                        <CommandInput placeholder="Search tool..." />
                                        <CommandEmpty>No tool found.</CommandEmpty>
                                        <CommandList>
                                            <CommandGroup>
                                                {availableTools.map(tool => (
                                                    <CommandItem
                                                        key={tool.id}
                                                        value={tool.name}
                                                        onSelect={() => {
                                                            field.onChange(tool.id)
                                                            setToolPopoverOpen(false)
                                                        }}
                                                    >
                                                        <Check className={cn("mr-2 h-4 w-4", field.value === tool.id ? "opacity-100" : "opacity-0")} />
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
                    {assignForm.formState.errors.toolId && <p className="text-sm text-destructive">{assignForm.formState.errors.toolId.message}</p>}
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="assignedTo">Assign To</Label>
                    <Controller
                        name="assignedTo"
                        control={assignForm.control}
                        render={({ field }) => (
                            <Popover open={userPopoverOpen} onOpenChange={setUserPopoverOpen}>
                                <PopoverTrigger asChild>
                                     <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                                        {field.value ? users.find(u => u.uid === field.value)?.firstName + ' ' + users.find(u => u.uid === field.value)?.lastName : "Select a user..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                    <Command>
                                        <CommandInput placeholder="Search user..." />
                                        <CommandEmpty>No user found.</CommandEmpty>
                                        <CommandList>
                                            <CommandGroup>
                                                {users.map(user => (
                                                    <CommandItem
                                                        key={user.uid}
                                                        value={`${user.firstName} ${user.lastName}`}
                                                        onSelect={() => {
                                                            field.onChange(user.uid)
                                                            setUserPopoverOpen(false)
                                                        }}
                                                    >
                                                         <Check className={cn("mr-2 h-4 w-4", field.value === user.uid ? "opacity-100" : "opacity-0")} />
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
                    {assignForm.formState.errors.assignedTo && <p className="text-sm text-destructive">{assignForm.formState.errors.assignedTo.message}</p>}
                </div>
                 <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsAssignDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={assignForm.formState.isSubmitting}>Confirm Assignment</Button>
                </DialogFooter>
            </form>
        </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Assigned Tools</CardTitle>
          <CardDescription>
            These tools are under the care of the assigned personnel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tool</TableHead>
                <TableHead>Serial #</TableHead>
                <TableHead>Accountable Person</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : accountableTools.length > 0 ? (
                accountableTools.map((tool) => (
                  <TableRow key={tool.id}>
                    <TableCell className="font-medium">{tool.name}</TableCell>
                    <TableCell>{tool.serialNumber}</TableCell>
                    <TableCell>{tool.assignedToUserName}</TableCell>
                    <TableCell>
                      <Badge variant={conditionVariant[tool.condition]}>
                        {tool.condition}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                       <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                              </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onSelect={() => setRecallingTool(tool)}>
                                Recall Tool
                              </DropdownMenuItem>
                          </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No tools are currently assigned for accountability.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
     <Dialog open={isRecallDialogOpen} onOpenChange={(open) => !open && setRecallingTool(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Recall Tool: {recallingTool?.name}</DialogTitle>
                <DialogDescription>Recall this tool and update its condition.</DialogDescription>
            </DialogHeader>
            <form onSubmit={recallForm.handleSubmit(onRecallSubmit)} className="space-y-4">
                 <div className="space-y-2">
                    <Label htmlFor="recall-condition">New Condition</Label>
                    <Controller
                        name="condition"
                        control={recallForm.control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger><SelectValue placeholder="Select condition" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Good">Good</SelectItem>
                                    <SelectItem value="Needs Repair">Needs Repair</SelectItem>
                                    <SelectItem value="Damaged">Damaged</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="recall-notes">Notes (Optional)</Label>
                    <Textarea id="recall-notes" {...recallForm.register("notes")} />
                </div>
                 <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setRecallingTool(null)}>Cancel</Button>
                    <Button type="submit" disabled={recallForm.formState.isSubmitting}>Confirm Recall</Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
    </>
  );
}
