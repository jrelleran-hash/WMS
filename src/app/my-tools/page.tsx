
"use client";

import { useMemo } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import type { Timestamp } from "firebase/firestore";
import { Wrench } from "lucide-react";

const statusVariant: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
    Available: "default",
    "In Use": "secondary",
    Assigned: "secondary",
    "Under Maintenance": "destructive",
};

export default function MyToolsPage() {
    const { tools, loading } = useData();
    const { userProfile } = useAuth();

    const myTools = useMemo(() => {
        if (!userProfile) return [];
        return tools.filter(t => t.assignedToUserId === userProfile.uid || t.currentBorrowRecord?.borrowedBy === userProfile.uid);
    }, [tools, userProfile]);

    const formatDate = (date?: Date | Timestamp) => {
        if (!date) return 'N/A';
        const jsDate = date instanceof Timestamp ? date.toDate() : date;
        return format(jsDate, 'PP');
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

            <Card>
                <CardHeader>
                    <CardTitle>Your Tools ({myTools.length})</CardTitle>
                    <CardDescription>
                        You are responsible for the following tools. Please ensure they are returned on time and in good condition.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Tool</TableHead>
                            <TableHead>Serial #</TableHead>
                            <TableHead>Status</TableHead>
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
                        ) : myTools.length > 0 ? (
                            myTools.map((tool) => (
                            <TableRow key={tool.id}>
                                <TableCell className="font-medium">{tool.name}</TableCell>
                                <TableCell>{tool.serialNumber}</TableCell>
                                <TableCell>
                                <Badge variant={statusVariant[tool.status]}>
                                    {tool.status}
                                </Badge>
                                </TableCell>
                                <TableCell>
                                {tool.status === 'In Use' ? formatDate(tool.currentBorrowRecord?.dueDate) : 'N/A'}
                                </TableCell>
                            </TableRow>
                            ))
                        ) : (
                            <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">
                                You do not have any tools assigned or borrowed.
                            </TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
