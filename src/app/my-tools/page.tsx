
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
import { Wrench, Heart, Book } from "lucide-react";
import { useAuthorization } from "@/hooks/use-authorization";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";


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
    const { tools, toolBookingRequests, users, loading, refetchData } = useData();
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
        </div>
    );
}
