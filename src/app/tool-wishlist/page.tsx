
"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Heart, PlusCircle, Trash2, Check, MoreHorizontal, X, Users as UsersIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { addToolToWishlist, getToolWishlist, deleteToolFromWishlist, updateToolWishStatus, addTool } from "@/services/data-service";
import type { ToolWish } from "@/types";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useRouter } from 'next/navigation';

const wishlistStatusVariant: { [key in ToolWish['status']]: "default" | "secondary" | "destructive" } = {
    Pending: "secondary",
    Approved: "default",
    Rejected: "destructive",
};

const wishlistSchema = z.object({
    toolName: z.string().min(3, "Tool name must be at least 3 characters long."),
    reason: z.string().optional(),
});
type WishlistFormValues = z.infer<typeof wishlistSchema>;

export default function ToolWishlistPage() {
    const { userProfile, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const [wishlist, setWishlist] = useState<ToolWish[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [deletingWishId, setDeletingWishId] = useState<string | null>(null);
    const [isAddToolOpen, setIsAddToolOpen] = useState(false);
    const router = useRouter();

    const form = useForm<WishlistFormValues>({
        resolver: zodResolver(wishlistSchema),
    });

     const toolForm = useForm<{name: string}>({
        defaultValues: { name: "" }
    });

    const fetchWishlist = useCallback(async () => {
        setLoading(true);
        const wishes = await getToolWishlist();
        setWishlist(wishes);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchWishlist();
    }, [fetchWishlist]);

    const onSubmit = async (data: WishlistFormValues) => {
        if (!userProfile) {
            toast({ variant: "destructive", title: "Error", description: "You must be logged in to add to the wishlist." });
            return;
        }
        try {
            await addToolToWishlist({
                ...data,
                requestedByUid: userProfile.uid,
                requestedByName: `${userProfile.firstName} ${userProfile.lastName}`,
            });
            toast({ title: "Success", description: "Your wish has been added to the list!" });
            form.reset();
            await fetchWishlist();
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Failed to add your wish." });
        }
    };
    
    const handleDeleteClick = (wishId: string) => {
        setDeletingWishId(wishId);
        setIsDeleteDialogOpen(true);
    };
    
    const handleDeleteConfirm = async () => {
        if (!deletingWishId) return;
        try {
            await deleteToolFromWishlist(deletingWishId);
            toast({ title: "Success", description: "Wishlist item removed." });
            await fetchWishlist();
        } catch (error) {
             toast({ variant: "destructive", title: "Error", description: "Failed to remove wishlist item." });
        } finally {
            setIsDeleteDialogOpen(false);
            setDeletingWishId(null);
        }
    }

     const handleStatusUpdate = async (wishId: string, status: ToolWish['status']) => {
        try {
            await updateToolWishStatus(wishId, status);
            toast({ title: "Success", description: "Wishlist item updated." });
            await fetchWishlist();
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Failed to update wishlist item." });
        }
    }
    
     const handleApproveWish = (toolName: string) => {
        setTimeout(() => {
            toolForm.setValue('name', toolName);
            setIsAddToolOpen(true);
        }, 150);
    };

    const onAddToolSubmit = async (data: {name: string}) => {
        try {
            await addTool({ name: data.name, condition: 'Good' });
            toast({ title: "Success", description: `Tool "${data.name}" added successfully.`});
            setIsAddToolOpen(false);
            router.push('/tools');
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Failed to add tool."});
        }
    };
    
     const formatDate = (date: Date) => {
        if (!date) return 'N/A';
        return format(date, 'PP');
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold font-headline tracking-tight">Tool Wishlist</h1>
                    <p className="text-muted-foreground">Request new tools for the team.</p>
                </div>
                 <Button variant="outline" onClick={() => router.push('/my-tools')}>
                    <UsersIcon className="mr-2 h-4 w-4" /> My Tools
                </Button>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Heart className="h-5 w-5" /> Add a Wish</CardTitle>
                            <CardDescription>What tool would make your job easier?</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="toolName">Tool Name</Label>
                                    <Input id="toolName" {...form.register("toolName")} placeholder="e.g., Cordless Drill" />
                                    {form.formState.errors.toolName && <p className="text-sm text-destructive">{form.formState.errors.toolName.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="reason">Reason (Optional)</Label>
                                    <Textarea id="reason" {...form.register("reason")} placeholder="e.g., To hold screws while on a ladder."/>
                                </div>
                                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                                    <PlusCircle className="mr-2"/>
                                    Add to Wishlist
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
                <div className="md:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Team Wishlist</CardTitle>
                            <CardDescription>Tools requested by the team for future procurement.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tool</TableHead>
                                        <TableHead>Requested By</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading || authLoading ? (
                                        Array.from({ length: 4 }).map((_, i) => (
                                            <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                                        ))
                                    ) : wishlist.length > 0 ? (
                                        wishlist.map(wish => {
                                            const canDelete = (userProfile?.role === 'Admin') || (wish.requestedByUid === userProfile?.uid);
                                            const canApprove = userProfile?.role === 'Admin' || userProfile?.role === 'Manager' || userProfile?.role === 'Approver';
                                            return (
                                            <TableRow key={wish.id}>
                                                <TableCell className="font-medium">{wish.toolName}</TableCell>
                                                <TableCell>{wish.requestedByName}</TableCell>
                                                <TableCell>{formatDate(wish.createdAt)}</TableCell>
                                                <TableCell>
                                                    <Badge variant={wishlistStatusVariant[wish.status]}>{wish.status}</Badge>
                                                </TableCell>
                                            </TableRow>
                                        )})
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center">The wishlist is empty. Be the first to add something!</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently remove this item from the wishlist.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm}>Remove</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <Dialog open={isAddToolOpen} onOpenChange={setIsAddToolOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Tool from Wishlist</DialogTitle>
                        <DialogDescription>A wish has been approved! Please fill in any additional details for this new tool.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={toolForm.handleSubmit(onAddToolSubmit)} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="tool-name-wish">Tool Name</Label>
                            <Input id="tool-name-wish" {...toolForm.register('name')} />
                        </div>
                        <DialogFooter>
                             <Button type="button" variant="ghost" onClick={() => setIsAddToolOpen(false)}>Cancel</Button>
                             <Button type="submit">Add Tool to Inventory</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
