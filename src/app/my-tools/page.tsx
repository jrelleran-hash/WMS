
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
import { Wrench, Heart, Book, Users as UsersIcon } from "lucide-react";
import { useAuthorization } from "@/hooks/use-authorization";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { ToolBookingRequest, UserProfile } from "@/types";


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


export default function MyToolsPage() {
    const { tools, toolBookingRequests, users, workers, loading, refetchData } = useData();
    const { userProfile, loading: authLoading } = useAuth();
    const { canView } = useAuthorization({ page: '/my-tools' });
    const router = useRouter();
    const { toast } = useToast();

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

            <Tabs defaultValue="accountability" className="pt-4">
                <TabsList>
                    <TabsTrigger value="accountability">Accountability ({assignedTools.length})</TabsTrigger>
                    <TabsTrigger value="borrowed">Borrowed ({borrowedTools.length})</TabsTrigger>
                    <TabsTrigger value="requests">My Requests ({myRequests.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="accountability">
                     <Card>
                        <CardHeader>
                            <CardTitle>Accountable Tools</CardTitle>
                            <CardDescription>
                                These tools are under your long-term care.
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
                                    </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        You do not have any tools assigned to you.
                                    </TableCell>
                                    </TableRow>
                                )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="borrowed">
                      <Card>
                        <CardHeader>
                            <CardTitle>Borrowed Tools</CardTitle>
                            <CardDescription>
                                Tools you have temporarily checked out.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
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
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="requests">
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
                                    <TableHead>For (Type)</TableHead>
                                    <TableHead>Booking Type</TableHead>
                                    <TableHead>Date Requested</TableHead>
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
                                            <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                                {getRequestorTypeName(request) === 'User' ? <UsersIcon className="w-3 h-3"/> : <Wrench className="w-3 h-3"/>}
                                                {getRequestorTypeName(request)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{request.bookingType}</Badge>
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
                                    <TableCell colSpan={6} className="h-24 text-center">
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
        </div>
    );
}
