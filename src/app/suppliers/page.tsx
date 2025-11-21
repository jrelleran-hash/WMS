
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PlusCircle, MoreHorizontal, Check, ChevronsUpDown, X } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { updateSupplier, deleteSupplier, addSupplier } from "@/services/data-service";
import type { Supplier, Product } from "@/types";
import { useData } from "@/context/data-context";
import { validateEmailAction } from "../orders/actions";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

// Supplier Schema
const supplierSchema = z.object({
  name: z.string().min(1, "Supplier name is required."),
  contactPerson: z.string().min(1, "Contact person is required."),
  email: z.string().email("Invalid email address.").optional().or(z.literal('')),
  phone: z.string().optional(),
  cellphoneNumber: z.string().optional(),
  address: z.string().min(1, "Address is required."),
  type: z.string().min(1, "Supplier type is required."),
  notes: z.string().optional(),
  suppliedProductIds: z.array(z.string()).optional(),
});

type SupplierFormValues = z.infer<typeof supplierSchema>;

const supplierStatusVariant: { [key in Supplier['status']]: "default" | "secondary" | "destructive" | "outline" } = {
  Pending: "secondary",
  Approved: "default",
  Rejected: "destructive",
};


const toTitleCase = (str: string) => {
  if (!str) return "";
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
  );
};


export default function SuppliersPage() {
  const { suppliers, products, loading, refetchData } = useData();
  const { toast } = useToast();

  // Dialog states
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [isEditSupplierOpen, setIsEditSupplierOpen] = useState(false);
  const [isDeleteSupplierOpen, setIsDeleteSupplierOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  
  // Data states
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deletingSupplierId, setDeletingSupplierId] = useState<string | null>(null);
  const [emailValidation, setEmailValidation] = useState<{ isValid: boolean; reason?: string; error?: string } | null>(null);
  const [isEmailChecking, setIsEmailChecking] = useState(false);
  const [isProductPopoverOpen, setIsProductPopoverOpen] = useState(false);
  
  // Forms
  const supplierForm = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    mode: 'onBlur',
    defaultValues: {
        suppliedProductIds: [],
    }
  });
  
  const editSupplierForm = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    mode: 'onBlur',
  });
  
  useEffect(() => {
    if (!isAddSupplierOpen) {
      supplierForm.reset({ suppliedProductIds: [] });
       setEmailValidation(null);
    }
     if (!isEditSupplierOpen) {
        editSupplierForm.reset();
        setEmailValidation(null);
        setEditingSupplier(null);
     }
  }, [isAddSupplierOpen, isEditSupplierOpen, supplierForm, editSupplierForm]);

  useEffect(() => {
    if (editingSupplier) {
      editSupplierForm.reset({
        ...editingSupplier,
        suppliedProductIds: editingSupplier.suppliedProductIds || []
      });
    } else {
      editSupplierForm.reset();
    }
  }, [editingSupplier, editSupplierForm]);

  const filteredSuppliers = useMemo(() => {
    if (activeTab === 'all') return suppliers;
    return suppliers.filter(s => s.status && s.status.toLowerCase() === activeTab);
  }, [suppliers, activeTab]);

  
  // Supplier handlers
  const handleEmailBlur = useCallback(async (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        setEmailValidation(null);
        return;
    }
    setIsEmailChecking(true);
    setEmailValidation(null);
    try {
        const result = await validateEmailAction({ email });
        setEmailValidation(result);
    } catch (error) {
        console.error("Email validation error:", error);
        setEmailValidation({ isValid: false, error: "Validation failed." });
    } finally {
        setIsEmailChecking(false);
    }
  }, []);

  const onAddSupplierSubmit = async (data: SupplierFormValues) => {
    try {
      await addSupplier(data);
      toast({ title: "Success", description: "Supplier added and is pending approval." });
      setIsAddSupplierOpen(false);
      await refetchData();
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add supplier. Please try again.",
      });
    }
  };

  const onEditSupplierSubmit = async (data: SupplierFormValues) => {
    if (!editingSupplier) return;
    try {
      await updateSupplier(editingSupplier.id, data);
      toast({ title: "Success", description: "Supplier updated successfully." });
      setIsEditSupplierOpen(false);
      await refetchData();
    } catch (error) {
       console.error(error);
       toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update supplier. Please try again.",
      });
    }
  };

  const handleStatusUpdate = async (supplierId: string, status: Supplier['status']) => {
    try {
        await updateSupplier(supplierId, { status });
        toast({ title: "Success", description: `Supplier has been ${status.toLowerCase()}.`});
        await refetchData();
    } catch(error) {
        toast({ variant: "destructive", title: "Error", description: "Failed to update supplier status." });
    }
  }

  const handleEditSupplierClick = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setIsEditSupplierOpen(true);
  };
  
  const handleDeleteSupplierClick = (supplierId: string) => {
    setDeletingSupplierId(supplierId);
    setIsDeleteSupplierOpen(true);
  };

  const handleDeleteSupplierConfirm = async () => {
    if (!deletingSupplierId) return;
    try {
      await deleteSupplier(deletingSupplierId);
      toast({ title: "Success", description: "Supplier deleted successfully." });
      await refetchData();
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete supplier. Please try again.",
      });
    } finally {
      setIsDeleteSupplierOpen(false);
      setDeletingSupplierId(null);
    }
  };

  const formatDate = (date: Date | Timestamp) => {
    const jsDate = date instanceof Timestamp ? date.toDate() : date;
    return format(jsDate, 'PPpp');
  };

  const renderEmailValidation = () => {
    if (isEmailChecking) {
        return <p className="text-xs text-muted-foreground">Checking email...</p>;
    }
    if (emailValidation) {
        return <p className={`text-xs ${emailValidation.isValid ? 'text-green-500' : 'text-destructive'}`}>{emailValidation.reason}</p>;
    }
    return null;
  };

  const ProductMultiSelect = ({ form }: {form: any}) => {
    const selectedIds = form.watch("suppliedProductIds") || [];
    const selectedProducts = useMemo(() => products.filter(p => selectedIds.includes(p.id)), [selectedIds]);

    const handleSelect = (productId: string) => {
        const newSelectedIds = selectedIds.includes(productId)
            ? selectedIds.filter((id: string) => id !== productId)
            : [...selectedIds, productId];
        form.setValue("suppliedProductIds", newSelectedIds);
    }

    return (
        <div className="space-y-2">
            <Label>Items Supplied</Label>
             <Popover open={isProductPopoverOpen} onOpenChange={setIsProductPopoverOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between h-auto min-h-10"
                    >
                         <div className="flex flex-wrap gap-1">
                            {selectedProducts.length > 0 ? selectedProducts.map(p => (
                                <Badge key={p.id} variant="secondary">{p.name}</Badge>
                            )) : "Select products..."}
                         </div>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                        <CommandInput placeholder="Search products..." />
                        <CommandList>
                            <CommandEmpty>No products found.</CommandEmpty>
                            <CommandGroup>
                                {products.map(product => (
                                    <CommandItem
                                        key={product.id}
                                        value={product.name}
                                        onSelect={() => handleSelect(product.id)}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                selectedIds.includes(product.id) ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        {product.name}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    )
  }


  return (
    <>
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold font-headline tracking-tight">Suppliers</h1>
        <p className="text-muted-foreground">Manage your supplier database and onboarding.</p>
      </div>
       <Dialog open={isAddSupplierOpen} onOpenChange={setIsAddSupplierOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <PlusCircle />
              Add Supplier
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Supplier</DialogTitle>
              <DialogDescription>Fill in the details for the new supplier. It will require approval before being active.</DialogDescription>
            </DialogHeader>
            <form onSubmit={supplierForm.handleSubmit(onAddSupplierSubmit)} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Supplier Name</Label>
                    <Input id="name" {...supplierForm.register("name")} onChange={(e) => {
                        const { value } = e.target;
                        supplierForm.setValue("name", toTitleCase(value), { shouldValidate: true });
                    }} />
                    {supplierForm.formState.errors.name && <p className="text-sm text-destructive">{supplierForm.formState.errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="type">Supplier Type</Label>
                    <Input id="type" placeholder="e.g. Local, International, Service Provider" {...supplierForm.register("type")} />
                    {supplierForm.formState.errors.type && <p className="text-sm text-destructive">{supplierForm.formState.errors.type.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="contactPerson">Contact Person</Label>
                    <Input id="contactPerson" {...supplierForm.register("contactPerson")} onChange={(e) => {
                        const { value } = e.target;
                        supplierForm.setValue("contactPerson", toTitleCase(value), { shouldValidate: true });
                    }} />
                    {supplierForm.formState.errors.contactPerson && <p className="text-sm text-destructive">{supplierForm.formState.errors.contactPerson.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="email">Email (Optional)</Label>
                    <Input 
                        id="email" 
                        type="email" 
                        {...supplierForm.register("email")}
                        onBlur={(e) => handleEmailBlur(e.target.value)}
                    />
                    {supplierForm.formState.errors.email && <p className="text-sm text-destructive">{supplierForm.formState.errors.email.message}</p>}
                    {renderEmailValidation()}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone (Optional)</Label>
                        <Input id="phone" type="tel" {...supplierForm.register("phone")} />
                        {supplierForm.formState.errors.phone && <p className="text-sm text-destructive">{supplierForm.formState.errors.phone.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="cellphoneNumber">Cellphone #</Label>
                        <Input id="cellphoneNumber" type="tel" {...supplierForm.register("cellphoneNumber")} />
                        {supplierForm.formState.errors.cellphoneNumber && <p className="text-sm text-destructive">{supplierForm.formState.errors.cellphoneNumber.message}</p>}
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input id="address" {...supplierForm.register("address")} />
                    {supplierForm.formState.errors.address && <p className="text-sm text-destructive">{supplierForm.formState.errors.address.message}</p>}
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea id="notes" {...supplierForm.register("notes")} />
                </div>
                
                <ProductMultiSelect form={supplierForm} />

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsAddSupplierOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={supplierForm.formState.isSubmitting}>
                    {supplierForm.formState.isSubmitting ? "Adding..." : "Add Supplier"}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
        </Dialog>
    </div>
    <Card>
        <CardHeader>
          <CardTitle>All Suppliers</CardTitle>
          <CardDescription>A list of all your product suppliers.</CardDescription>
        </CardHeader>
        <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="pending">Pending</TabsTrigger>
                    <TabsTrigger value="approved">Approved</TabsTrigger>
                    <TabsTrigger value="rejected">Rejected</TabsTrigger>
                </TabsList>
                <Table>
                  <TableHeader>
                      <TableRow>
                      <TableHead>Supplier Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="hidden md:table-cell">Contact Person</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>
                          <span className="sr-only">Actions</span>
                      </TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {loading ? (
                      Array.from({ length: 8 }).map((_, i) => (
                          <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                          <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                          </TableRow>
                      ))
                      ) : (
                      filteredSuppliers.map((supplier) => (
                          <TableRow key={supplier.id} onClick={() => handleEditSupplierClick(supplier)} className="cursor-pointer">
                          <TableCell>
                              <div className="font-medium">{supplier.name}</div>
                              <div className="text-sm text-muted-foreground md:hidden">{supplier.contactPerson}</div>
                          </TableCell>
                          <TableCell>{supplier.type}</TableCell>
                          <TableCell className="hidden md:table-cell">{supplier.contactPerson}</TableCell>
                          <TableCell><Badge variant={supplierStatusVariant[supplier.status]}>{supplier.status}</Badge></TableCell>
                          <TableCell className="text-right">
                              <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                  <Button aria-haspopup="true" size="icon" variant="ghost" onClick={(e) => e.stopPropagation()}>
                                  <MoreHorizontal />
                                  <span className="sr-only">Toggle menu</span>
                                  </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => handleEditSupplierClick(supplier)}>Edit</DropdownMenuItem>
                                   {supplier.status === 'Pending' && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => handleStatusUpdate(supplier.id, "Approved")}>Approve</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleStatusUpdate(supplier.id, "Rejected")} className="text-destructive">Reject</DropdownMenuItem>
                                    </>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleDeleteSupplierClick(supplier.id)} className="text-destructive">Delete</DropdownMenuItem>
                              </DropdownMenuContent>
                              </DropdownMenu>
                          </TableCell>
                          </TableRow>
                      ))
                      )}
                  </TableBody>
                </Table>
            </Tabs>
        </CardContent>
    </Card>
      
    <Dialog open={isEditSupplierOpen} onOpenChange={setIsEditSupplierOpen}>
        <DialogContent className="sm:max-w-lg">
            <DialogHeader>
            <DialogTitle>Edit Supplier</DialogTitle>
            {editingSupplier && <DialogDescription>Update the details for {editingSupplier.name}.</DialogDescription>}
            </DialogHeader>
            <form onSubmit={editSupplierForm.handleSubmit(onEditSupplierSubmit)} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="edit-name">Supplier Name</Label>
                    <Input id="edit-name" {...editSupplierForm.register("name")} onChange={(e) => {
                        const { value } = e.target;
                        editSupplierForm.setValue("name", toTitleCase(value), { shouldValidate: true });
                    }} />
                    {editSupplierForm.formState.errors.name && <p className="text-sm text-destructive">{editSupplierForm.formState.errors.name.message}</p>}
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="edit-type">Supplier Type</Label>
                    <Input id="edit-type" placeholder="e.g. Local, International, Service Provider" {...editSupplierForm.register("type")} />
                    {editSupplierForm.formState.errors.type && <p className="text-sm text-destructive">{editSupplierForm.formState.errors.type.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="edit-contactPerson">Contact Person</Label>
                    <Input id="edit-contactPerson" {...editSupplierForm.register("contactPerson")} onChange={(e) => {
                        const { value } = e.target;
                        editSupplierForm.setValue("contactPerson", toTitleCase(value), { shouldValidate: true });
                    }} />
                    {editSupplierForm.formState.errors.contactPerson && <p className="text-sm text-destructive">{editSupplierForm.formState.errors.contactPerson.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="edit-email">Email</Label>
                    <Input 
                    id="edit-email" 
                    type="email" 
                    {...editSupplierForm.register("email")}
                    onBlur={(e) => handleEmailBlur(e.target.value)}
                    />
                    {editSupplierForm.formState.errors.email && <p className="text-sm text-destructive">{editSupplierForm.formState.errors.email.message}</p>}
                    {renderEmailValidation()}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="edit-phone">Phone (Optional)</Label>
                        <Input id="edit-phone" type="tel" {...editSupplierForm.register("phone")} />
                        {editSupplierForm.formState.errors.phone && <p className="text-sm text-destructive">{editSupplierForm.formState.errors.phone.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-cellphoneNumber">Cellphone #</Label>
                        <Input id="edit-cellphoneNumber" type="tel" {...editSupplierForm.register("cellphoneNumber")} />
                        {editSupplierForm.formState.errors.cellphoneNumber && <p className="text-sm text-destructive">{editSupplierForm.formState.errors.cellphoneNumber.message}</p>}
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="edit-address">Address</Label>
                    <Input id="edit-address" {...editSupplierForm.register("address")} />
                    {editSupplierForm.formState.errors.address && <p className="text-sm text-destructive">{editSupplierForm.formState.errors.address.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="edit-notes">Notes (Optional)</Label>
                    <Textarea id="edit-notes" {...editSupplierForm.register("notes")} />
                </div>

                <ProductMultiSelect form={editSupplierForm} />
                
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsEditSupplierOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={!editSupplierForm.formState.isValid || editSupplierForm.formState.isSubmitting}>
                    {editSupplierForm.formState.isSubmitting ? "Saving..." : "Save Changes"}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
        </Dialog>
    
    <AlertDialog open={isDeleteSupplierOpen} onOpenChange={setIsDeleteSupplierOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete this
            supplier from your records.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDeleteSupplierConfirm}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

    