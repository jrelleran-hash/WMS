
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Timestamp } from "firebase/firestore";
import { Wrench, Heart, PlusCircle, Trash2, Check, MoreHorizontal, X } from "lucide-react";
import { useAuthorization } from "@/hooks/use-authorization";
import { useRouter } from "next/navigation";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";


const statusVariant: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
    Available: "default",
    "In Use": "secondary",
    Assigned: "secondary",
    "Under Maintenance": "destructive",
};

const conditionVariant: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
  Good: "default",
  "Needs Repair": "secondary",
  Damaged: "destructive",
};

const requestStatusVariant: { [key: string]: "default" | "secondary" | "destructive" } = {
    Pending: "secondary",
    Approved: "default",
    Rejected: "destructive",
};

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

function WishlistDialogContent({ onApprove }: { onApprove: (toolName: string) => void }) {
    const { userProfile } = useAuth();
    const { toast } = useToast();
    const [wishlist, setWishlist] = useState<ToolWish[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [deletingWishId, setDeletingWishId] = useState<string | null>(null);

    const canApprove = useMemo(() => {
        if (!userProfile) return false;
        const approverRoles: (typeof userProfile.role)[] = ['Admin', 'Manager', 'Approver'];
        return approverRoles.includes(userProfile.role);
    }, [userProfile]);
    
    const isAdmin = useMemo(() => userProfile?.role === 'Admin', [userProfile]);


    const form = useForm<WishlistFormValues>({
        resolver: zodResolver(wishlistSchema),
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
    
     const formatDate = (date: Date) => {
        if (!date) return 'N/A';
        return format(date, 'PP');
    };

    return (
        <>
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
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array.from({ length: 4 }).map((_, i) => (
                                        <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                                    ))
                                ) : wishlist.length > 0 ? (
                                    wishlist.map(wish => (
                                        <TableRow key={wish.id}>
                                            <TableCell className="font-medium">{wish.toolName}</TableCell>
                                            <TableCell>{wish.requestedByName}</TableCell>
                                            <TableCell>{formatDate(wish.createdAt)}</TableCell>
                                             <TableCell>
                                                <Badge variant={wishlistStatusVariant[wish.status]}>{wish.status}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon">
                                                            <MoreHorizontal />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        {canApprove && wish.status === 'Pending' && (
                                                            <>
                                                                <DropdownMenuItem onSelect={() => { handleStatusUpdate(wish.id, 'Approved'); onApprove(wish.toolName); }}>
                                                                    <Check className="mr-2 h-4 w-4" />
                                                                    Approve
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onSelect={() => handleStatusUpdate(wish.id, 'Rejected')} className="text-destructive">
                                                                    <X className="mr-2 h-4 w-4" />
                                                                    Reject
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}
                                                        {(isAdmin || wish.requestedByUid === userProfile?.uid) && (
                                                          <>
                                                            {(canApprove && wish.status === 'Pending') && <DropdownMenuSeparator />}
                                                            <DropdownMenuItem onClick={() => handleDeleteClick(wish.id)} className="text-destructive">
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                Delete
                                                            </DropdownMenuItem>
                                                          </>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">The wishlist is empty. Be the first to add something!</TableCell>
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
      </>
    )
}

export default function MyToolsPage() {
    const { tools, toolBookingRequests, users, loading, refetchData } = useData();
    const { userProfile, loading: authLoading } = useAuth();
    const { canView } = useAuthorization({ page: '/my-tools' });
    const router = useRouter();
    const { toast } = useToast();
    const [isWishlistOpen, setIsWishlistOpen] = useState(false);
    const [isAddToolOpen, setIsAddToolOpen] = useState(false);

    const toolForm = useForm<{name: string}>({
        defaultValues: { name: "" }
    });

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

    const assignedTools = useMemo(() => {
        if (!userProfile) return [];
        const myRequests = toolBookingRequests.filter(r => r.createdById === userProfile.uid && r.bookingType === 'Accountability' && r.status === 'Approved');
        const myRequestToolIds = new Set(myRequests.map(r => r.toolId));

        return tools
            .filter(t => t.assignedToUserId === userProfile.uid || myRequestToolIds.has(t.id))
            .map(tool => {
                const request = myRequests.find(r => r.toolId === tool.id);
                return {
                    ...tool,
                    requestedByName: request ? users.find(u => u.uid === request.createdById)?.firstName + ' ' + users.find(u => u.uid === request.createdById)?.lastName : 'N/A'
                }
            });
    }, [tools, toolBookingRequests, userProfile, users]);
    
    const borrowedTools = useMemo(() => {
        if (!userProfile) return [];
        const myRequests = toolBookingRequests.filter(r => r.createdById === userProfile.uid && r.bookingType === 'Borrow' && r.status === 'Approved');
        const myRequestToolIds = new Set(myRequests.map(r => r.toolId));

        return tools
            .filter(t => (t.status === 'In Use' && t.currentBorrowRecord?.borrowedBy === userProfile.uid) || (t.status === 'In Use' && myRequestToolIds.has(t.id)))
            .map(tool => {
                 const request = myRequests.find(r => r.toolId === tool.id);
                 return {
                    ...tool,
                    requestedByName: request ? users.find(u => u.uid === request.createdById)?.firstName + ' ' + users.find(u => u.uid === request.createdById)?.lastName : 'Direct Borrow'
                }
            });
    }, [tools, toolBookingRequests, userProfile, users]);

    const myRequests = useMemo(() => {
        if (!userProfile) return [];
        return toolBookingRequests.filter(r => r.createdById === userProfile.uid || r.requestedForId === userProfile.uid);
    }, [toolBookingRequests, userProfile]);

    const formatDate = (date?: Date | Timestamp) => {
        if (!date) return 'N/A';
        const jsDate = date instanceof Timestamp ? date.toDate() : date;
        return format(jsDate, 'PP');
    }
    
     const handleApproveWish = (toolName: string) => {
        setIsWishlistOpen(false); // Close wishlist dialog
        // Use a timeout to ensure the dialog is closed before opening the new one
        setTimeout(() => {
            toolForm.setValue('name', toolName);
            setIsAddToolOpen(true);
        }, 150);
    };

    const onAddToolSubmit = async (data: {name: string}) => {
        try {
            await addTool({ name: data.name, condition: 'Good' }); // Add other necessary fields if your schema requires them
            toast({ title: "Success", description: `Tool "${data.name}" added successfully.`});
            setIsAddToolOpen(false);
            await refetchData();
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Failed to add tool."});
        }
    };
    
    if (authLoading || !canView) {
        return (
          <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
            <p className="text-muted-foreground">Access Denied. Redirecting...</p>
          </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="sticky top-0 bg-background/95 backdrop-blur z-20 -mx-6 px-6 pb-4 -mb-4 border-b">
                <div className="flex items-center justify-between gap-4 pt-4">
                    <div className="flex items-center gap-4">
                        <Wrench className="h-8 w-8 text-primary" />
                        <div>
                            <h1 className="text-2xl font-bold font-headline tracking-tight">
                                My Tools
                            </h1>
                            <p className="text-muted-foreground">
                                A list of all tools currently assigned to you, borrowed by you, or requested by you.
                            </p>
                        </div>
                    </div>
                     <Dialog open={isWishlistOpen} onOpenChange={setIsWishlistOpen}>
                        <DialogTrigger asChild>
                           <Button variant="outline"><Heart className="mr-2 h-4 w-4" /> Tool Wishlist</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl">
                             <DialogHeader>
                                <DialogTitle>Tool Wishlist</DialogTitle>
                                <DialogDescription>
                                    Request new tools for the team.
                                </DialogDescription>
                            </DialogHeader>
                             <div className="py-4">
                                <WishlistDialogContent onApprove={handleApproveWish} />
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                 <Tabs defaultValue="accountability" className="pt-4">
                    <TabsList>
                        <TabsTrigger value="accountability">Accountability ({assignedTools.length})</TabsTrigger>
                        <TabsTrigger value="borrowed">Borrowed ({borrowedTools.length})</TabsTrigger>
                        <TabsTrigger value="requests">My Requests ({myRequests.length})</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>


            <Tabs defaultValue="accountability" className="mt-0">
                <TabsContent value="accountability" className="mt-0">
                     <Card>
                        <CardHeader>
                            <CardTitle>Accountable Tools</CardTitle>
                            <CardDescription>
                                These tools are under your long-term care or were requested by you for others.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                <TableRow>
                                    <TableHead>Tool</TableHead>
                                    <TableHead>Serial #</TableHead>
                                    <TableHead>Condition</TableHead>
                                    <TableHead>Assigned To</TableHead>
                                    <TableHead>Requested By</TableHead>
                                </TableRow>
                                </TableHeader>
                                <TableBody>
                                {loading ? (
                                    Array.from({ length: 3 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={5}>
                                        <Skeleton className="h-8 w-full" />
                                        </TableCell>
                                    </TableRow>
                                    ))
                                ) : assignedTools.length > 0 ? (
                                    assignedTools.map((tool) => (
                                    <TableRow key={tool.id}>
                                        <TableCell className="font-medium">{tool.name}</TableCell>
                                        <TableCell>{tool.serialNumber}</TableCell>
                                        <TableCell>
                                            <Badge variant={conditionVariant[tool.condition]}>
                                                {tool.condition}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{tool.assignedToUserName}</TableCell>
                                        <TableCell>{tool.requestedByName}</TableCell>
                                    </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        You do not have any tools assigned to you.
                                    </TableCell>
                                    </TableRow>
                                )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="borrowed" className="mt-0">
                      <Card>
                        <CardHeader>
                            <CardTitle>Borrowed Tools</CardTitle>
                            <CardDescription>
                                Tools you have temporarily checked out or requested for others.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                <TableRow>
                                    <TableHead>Tool</TableHead>
                                    <TableHead>Serial #</TableHead>
                                    <TableHead>Borrowed By</TableHead>
                                    <TableHead>Requested By</TableHead>
                                    <TableHead>Date Borrowed</TableHead>
                                    <TableHead>Due Date</TableHead>
                                </TableRow>
                                </TableHeader>
                                <TableBody>
                                {loading ? (
                                    Array.from({ length: 3 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={6}>
                                        <Skeleton className="h-8 w-full" />
                                        </TableCell>
                                    </TableRow>
                                    ))
                                ) : borrowedTools.length > 0 ? (
                                    borrowedTools.map((tool) => (
                                    <TableRow key={tool.id}>
                                        <TableCell className="font-medium">{tool.name}</TableCell>
                                        <TableCell>{tool.serialNumber}</TableCell>
                                        <TableCell>
                                            {tool.currentBorrowRecord?.borrowedByName}
                                        </TableCell>
                                        <TableCell>{tool.requestedByName}</TableCell>
                                        <TableCell>
                                            {formatDate(tool.currentBorrowRecord?.dateBorrowed)}
                                        </TableCell>
                                        <TableCell>
                                            {formatDate(tool.currentBorrowRecord?.dueDate)}
                                        </TableCell>
                                    </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        You have not borrowed any tools.
                                    </TableCell>
                                    </TableRow>
                                )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="requests" className="mt-0">
                    <Card>
                        <CardHeader>
                            <CardTitle>My Tool Requests</CardTitle>
                            <CardDescription>A history of your tool booking requests.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                <TableRow>
                                    <TableHead>Tool</TableHead>
                                    <TableHead>Requested For</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Date Requested</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                                </TableHeader>
                                <TableBody>
                                {loading ? (
                                    Array.from({ length: 3 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={5}>
                                        <Skeleton className="h-8 w-full" />
                                        </TableCell>
                                    </TableRow>
                                    ))
                                ) : myRequests.length > 0 ? (
                                    myRequests.map((request) => (
                                    <TableRow key={request.id}>
                                        <TableCell className="font-medium">{request.toolName}</TableCell>
                                        <TableCell>{request.requestedForName}</TableCell>
                                        <TableCell>
                                            {request.bookingType}
                                        </TableCell>
                                        <TableCell>{formatDate(request.createdAt)}</TableCell>
                                        <TableCell>
                                            <Badge variant={requestStatusVariant[request.status]}>
                                                {request.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        You have not made any tool requests.
                                    </TableCell>
                                    </TableRow>
                                )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                 </TabsContent>
            </Tabs>
            
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
                        {/* Here you could add more fields from the main "Add Tool" form if needed */}
                        <DialogFooter>
                             <Button type="button" variant="ghost" onClick={() => setIsAddToolOpen(false)}>Cancel</Button>
                             <Button type="submit">Add Tool to Inventory</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
