
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Timestamp } from "firebase/firestore";
import { Wrench, Heart, Book, Users as UsersIcon, HardHat, User } from "lucide-react";
import { useAuthorization } from "@/hooks/use-authorization";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { ToolBookingRequest, UserProfile, Tool } from "@/types";


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

const requestStatusVariant: { [key in ToolBookingRequest['status']]: "default" | "secondary" | "destructive" } = {
    Pending: "secondary",
    Approved: "default",
    Rejected: "destructive",
};


export default function MyToolsPage() {
    const { tools, toolBookingRequests, users, workers, loading, refetchData } = useData();
    const { userProfile, loading: authLoading } = useAuth();
    const { canView } = useAuthorization({ page: '/my-tools' });
    const router = useRouter();
    const { toast } = useToast();
    const [modalContent, setModalContent] = useState<"accountability" | "borrowed" | "requests" | null>(null);


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
        return tools.filter(t => t.status === "Assigned" && t.assignedToUserId === userProfile.uid);
    }, [tools, userProfile]);
    
    const borrowedTools = useMemo(() => {
        if (!userProfile) return [];
        return tools.filter(t => t.status === 'In Use' && t.currentBorrowRecord?.borrowedBy === userProfile.uid);
    }, [tools, userProfile]);

    const myRequests = useMemo(() => {
        if (!userProfile) return [];
        return toolBookingRequests.filter(r => r.createdById === userProfile.uid);
    }, [toolBookingRequests, userProfile]);
    
    const getRequestorTypeName = (request: ToolBookingRequest) => {
        const isUser = users.some(u => u.uid === request.requestedForId);
        if (isUser) return "User";
        const isWorker = workers.some(w => w.id === request.requestedForId);
        if(isWorker) return "Worker";
        return "Unknown";
    }

    const formatDate = (date?: Date | Timestamp) => {
        if (!date) return 'N/A';
        const jsDate = date instanceof Timestamp ? date.toDate() : date;
        return format(jsDate, 'PP');
    }
    
    if (authLoading || loading || !userProfile) {
        return (
          <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
            <p className="text-muted-foreground">Loading your tools...</p>
          </div>
        );
    }

    const modalTitle = {
        accountability: "Accountable Tools",
        borrowed: "Borrowed Tools",
        requests: "My Tool Requests"
    };

    const modalDescription = {
        accountability: "These tools are under your long-term care.",
        borrowed: "Tools you have temporarily checked out.",
        requests: "A history of your tool booking requests."
    };

    return (
        <>
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
                     <div className="flex items-center gap-2">
                        <Button variant="outline" asChild>
                            <Link href="/tool-booking">
                                <Book className="mr-2 h-4 w-4" /> Tool Booking
                            </Link>
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href="/tool-wishlist">
                                <Heart className="mr-2 h-4 w-4" /> Tool Wishlist
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3 pt-4">
                <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setModalContent('accountability')}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Accountability</CardTitle>
                        <User className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-headline">{assignedTools.length}</div>
                        <p className="text-xs text-muted-foreground">Tools under your long-term care</p>
                    </CardContent>
                </Card>
                <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setModalContent('borrowed')}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Borrowed</CardTitle>
                        <HardHat className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-headline">{borrowedTools.length}</div>
                        <p className="text-xs text-muted-foreground">Tools temporarily checked out</p>
                    </CardContent>
                </Card>
                <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setModalContent('requests')}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">My Requests</CardTitle>
                        <Book className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-headline">{myRequests.length}</div>
                        <p className="text-xs text-muted-foreground">Total requests submitted</p>
                    </CardContent>
                </Card>
            </div>
        </div>
        
        <Dialog open={!!modalContent} onOpenChange={(open) => !open && setModalContent(null)}>
            <DialogContent className="max-w-4xl">
                 <DialogHeader>
                    <DialogTitle>{modalContent ? modalTitle[modalContent] : ''}</DialogTitle>
                    <DialogDescription>
                        {modalContent ? modalDescription[modalContent] : ''}
                    </DialogDescription>
                </DialogHeader>

                <div className="max-h-[60vh] overflow-y-auto">
                {modalContent === 'accountability' && (
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Tool</TableHead>
                            <TableHead>Serial #</TableHead>
                            <TableHead>Condition</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {loading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell colSpan={3}>
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
                            </TableRow>
                            ))
                        ) : (
                            <TableRow>
                            <TableCell colSpan={3} className="h-24 text-center">
                                You do not have any tools assigned to you.
                            </TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                )}
                
                {modalContent === 'borrowed' && (
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Tool</TableHead>
                            <TableHead>Serial #</TableHead>
                            <TableHead>Date Borrowed</TableHead>
                            <TableHead>Due Date</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {loading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell colSpan={4}>
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
                                    {formatDate(tool.currentBorrowRecord?.dateBorrowed)}
                                </TableCell>
                                <TableCell>
                                    {formatDate(tool.currentBorrowRecord?.dueDate)}
                                </TableCell>
                            </TableRow>
                            ))
                        ) : (
                            <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">
                                You have not borrowed any tools.
                            </TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                )}

                {modalContent === 'requests' && (
                     <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Tool</TableHead>
                            <TableHead>Requested For</TableHead>
                            <TableHead>Booking Type</TableHead>
                            <TableHead>Start Date</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead>Status</TableHead>
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
                        ) : myRequests.length > 0 ? (
                            myRequests.map((request) => (
                            <TableRow key={request.id}>
                                <TableCell className="font-medium">{request.toolName}</TableCell>
                                <TableCell>{request.requestedForName}</TableCell>
                                <TableCell>
                                    <Badge variant="outline">{request.bookingType}</Badge>
                                </TableCell>
                                <TableCell>{request.bookingType === 'Borrow' ? formatDate(request.startDate) : 'N/A'}</TableCell>
                                <TableCell>{request.bookingType === 'Borrow' ? formatDate(request.endDate) : 'N/A'}</TableCell>
                                <TableCell>
                                    <Badge variant={requestStatusVariant[request.status]}>
                                        {request.status}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                            ))
                        ) : (
                            <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                You have not made any tool requests.
                            </TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                )}
                </div>
                 <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="outline">Close</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    );
}
