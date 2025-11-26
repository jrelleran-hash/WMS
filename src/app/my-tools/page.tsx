
"use client";

import { useMemo, useEffect } from "react";
import { useData } from "@/context/data-context";
import { useAuth } from "@/hooks/use-auth";
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
import { Wrench } from "lucide-react";
import { useAuthorization } from "@/hooks/use-authorization";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

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


export default function MyToolsPage() {
    const { tools, loading } = useData();
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
        return tools.filter(t => t.assignedToUserId === userProfile.uid);
    }, [tools, userProfile]);
    
    const borrowedTools = useMemo(() => {
        if (!userProfile) return [];
        return tools.filter(t => t.status === 'In Use' && t.currentBorrowRecord?.borrowedBy === userProfile.uid);
    }, [tools, userProfile]);

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
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Wrench className="h-8 w-8 text-primary" />
                <div>
                    <h1 className="text-2xl font-bold font-headline tracking-tight">
                        My Tools
                    </h1>
                    <p className="text-muted-foreground">
                        A list of all tools currently assigned to you or borrowed by you.
                    </p>
                </div>
            </div>

            <Tabs defaultValue="accountability">
                <TabsList>
                    <TabsTrigger value="accountability">Accountability ({assignedTools.length})</TabsTrigger>
                    <TabsTrigger value="borrowed">Borrowed ({borrowedTools.length})</TabsTrigger>
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
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="borrowed">
                      <Card>
                        <CardHeader>
                            <CardTitle>Borrowed Tools</CardTitle>
                            <CardDescription>
                                Tools you have temporarily checked out. Please return them on time.
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
            </Tabs>
        </div>
    );
}
