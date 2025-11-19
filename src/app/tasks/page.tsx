
"use client";

import { useState, useMemo, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useData } from "@/context/data-context";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { addTask, updateTaskStatus } from "@/services/data-service";
import type { Task } from "@/types";
import { format } from "date-fns";
import { BarChart, ResponsiveContainer, XAxis, YAxis, Bar, PieChart, Pie, Cell } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle, MoreHorizontal, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const taskSchema = z.object({
  title: z.string().min(1, "Task title is required."),
  description: z.string().optional(),
  assignedToId: z.string().min(1, "Please assign this task to a staff member."),
  startDate: z.date().optional(),
  dueDate: z.date().optional(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

const statusVariant: { [key in Task['status']]: "default" | "secondary" | "destructive" } = {
    'To-Do': "secondary",
    'In Progress': "default",
    'Completed': "default",
};

const chartColors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

const chartConfig = {
    completed: { label: "Completed", color: "hsl(var(--chart-1))" },
    inProgress: { label: "In Progress", color: "hsl(var(--chart-2))" },
    toDo: { label: "To-Do", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig;


function StaffKpiDashboard() {
    const { tasks, users, loading } = useData();

    const staffKpis = useMemo(() => {
        return users.map(user => {
            const userTasks = tasks.filter(t => t.assignedToId === user.uid);
            const completed = userTasks.filter(t => t.status === 'Completed').length;
            const inProgress = userTasks.filter(t => t.status === 'In Progress').length;
            const toDo = userTasks.filter(t => t.status === 'To-Do').length;
            const overdue = userTasks.filter(t => t.status !== 'Completed' && t.dueDate && t.dueDate.toDate() < new Date()).length;
            
            return {
                userId: user.uid,
                name: `${'user.firstName'} ${'user.lastName'}`,
                total: userTasks.length,
                completed,
                inProgress,
                toDo,
                overdue,
                completionRate: userTasks.length > 0 ? (completed / userTasks.length) * 100 : 0,
            }
        });
    }, [users, tasks]);

    const overallStats = useMemo(() => {
        const total = tasks.length;
        const completed = tasks.filter(t => t.status === 'Completed').length;
        const inProgress = tasks.filter(t => t.status === 'In Progress').length;
        const toDo = tasks.filter(t => t.status === 'To-Do').length;
        return [
            { name: 'Completed', value: completed, fill: 'var(--color-completed)' },
            { name: 'In Progress', value: inProgress, fill: 'var(--color-inProgress)' },
            { name: 'To-Do', value: toDo, fill: 'var(--color-toDo)' },
        ];
    }, [tasks]);

    if(loading) {
        return <Skeleton className="h-[400px] w-full" />
    }

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
             <Card className="lg:col-span-1">
                <CardHeader>
                    <CardTitle>Overall Task Status</CardTitle>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                                <Pie data={overallStats} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                    {overallStats.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </CardContent>
             </Card>
             <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle>Staff Performance</CardTitle>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className="h-64">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={staffKpis} layout="vertical" margin={{ left: 10, right: 20 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={80} fontSize={12} />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Bar dataKey="completionRate" stackId="a" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} name="Completion Rate (%)" />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </CardContent>
             </Card>
        </div>
    )
}


export default function TasksPage() {
    const { tasks, users, loading, refetchData } = useData();
    const { userProfile } = useAuth();
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const { toast } = useToast();

    const form = useForm<TaskFormValues>({
        resolver: zodResolver(taskSchema),
    });
    
    const onSubmit = async (data: TaskFormValues) => {
        try {
            await addTask(data);
            toast({ title: "Success", description: "New task has been created and assigned." });
            setIsAddDialogOpen(false);
            form.reset();
            await refetchData();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Failed to create task.";
            toast({ variant: "destructive", title: "Error", description: errorMessage });
        }
    };
    
    const handleStatusChange = async (taskId: string, status: Task['status']) => {
        try {
            await updateTaskStatus(taskId, status);
            toast({ title: "Success", description: "Task status updated."});
            await refetchData();
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Failed to update task status."});
        }
    };

    const myTasks = useMemo(() => tasks.filter(t => t.assignedToId === userProfile?.uid), [tasks, userProfile]);
    const allTasks = tasks; // For admins/managers

    const canManageTasks = userProfile?.role === 'Admin' || userProfile?.role === 'Manager';

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold font-headline tracking-tight">Task Management</h1>
                    <p className="text-muted-foreground">Monitor and manage warehouse tasks and staff KPIs.</p>
                </div>
                {canManageTasks && (
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" />Create Task</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create New Task</DialogTitle>
                                <DialogDescription>Fill in the details and assign the task to a staff member.</DialogDescription>
                            </DialogHeader>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="title">Task Title</Label>
                                    <Input id="title" {...form.register("title")} />
                                    {form.formState.errors.title && <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">Description (Optional)</Label>
                                    <Textarea id="description" {...form.register("description")} />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                     <div className="space-y-2">
                                        <Label htmlFor="assignedToId">Assign To</Label>
                                        <Controller
                                            name="assignedToId"
                                            control={form.control}
                                            render={({ field }) => (
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <SelectTrigger><SelectValue placeholder="Select staff..." /></SelectTrigger>
                                                    <SelectContent>
                                                        {users.map(u => (
                                                            <SelectItem key={u.uid} value={u.uid}>{u.firstName} {u.lastName}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        />
                                        {form.formState.errors.assignedToId && <p className="text-sm text-destructive">{form.formState.errors.assignedToId.message}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Start Date (Optional)</Label>
                                        <Controller
                                            control={form.control}
                                            name="startDate"
                                            render={({ field }) => (
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                                            </Popover>
                                            )}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Due Date (Optional)</Label>
                                    <Controller
                                        control={form.control}
                                        name="dueDate"
                                        render={({ field }) => (
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                                        </Popover>
                                        )}
                                    />
                                </div>
                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                                    <Button type="submit" disabled={form.formState.isSubmitting}>Create Task</Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            <Tabs defaultValue={canManageTasks ? "kpi" : "my-tasks"}>
                <TabsList>
                    {canManageTasks && <TabsTrigger value="kpi">KPIs</TabsTrigger>}
                    {canManageTasks && <TabsTrigger value="all-tasks">All Tasks</TabsTrigger>}
                    <TabsTrigger value="my-tasks">My Tasks</TabsTrigger>
                </TabsList>
                {canManageTasks && (
                    <TabsContent value="kpi">
                        <StaffKpiDashboard />
                    </TabsContent>
                )}
                {canManageTasks && (
                    <TabsContent value="all-tasks">
                        <TaskTable tasks={allTasks} loading={loading} onStatusChange={handleStatusChange} />
                    </TabsContent>
                )}
                 <TabsContent value="my-tasks">
                    <TaskTable tasks={myTasks} loading={loading} onStatusChange={handleStatusChange} />
                 </TabsContent>
            </Tabs>
        </div>
    )
}

function TaskTable({ tasks, loading, onStatusChange }: { tasks: Task[], loading: boolean, onStatusChange: (taskId: string, status: Task['status']) => void }) {

    const sortedTasks = useMemo(() => {
        return [...tasks].sort((a, b) => {
            const statusOrder = { 'In Progress': 0, 'To-Do': 1, 'Completed': 2 };
            if (statusOrder[a.status] !== statusOrder[b.status]) {
                return statusOrder[a.status] - statusOrder[b.status];
            }
            return b.createdAt.toMillis() - a.createdAt.toMillis();
        });
    }, [tasks]);

    return (
        <Card>
            <CardContent className="pt-6">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Task</TableHead>
                            <TableHead>Assigned To</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Start Date</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                             Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
                                </TableRow>
                            ))
                        ) : sortedTasks.length > 0 ? (
                            sortedTasks.map(task => (
                                <TableRow key={task.id}>
                                    <TableCell className="font-medium">{task.title}</TableCell>
                                    <TableCell>{task.assignedToName}</TableCell>
                                    <TableCell><Badge variant={statusVariant[task.status]}>{task.status}</Badge></TableCell>
                                    <TableCell>{task.startDate ? format(task.startDate.toDate(), 'PPP') : 'N/A'}</TableCell>
                                    <TableCell>{task.dueDate ? format(task.dueDate.toDate(), 'PPP') : 'N/A'}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem 
                                                    disabled={task.status === 'In Progress'} 
                                                    onSelect={() => onStatusChange(task.id, 'In Progress')}
                                                >
                                                    Start Task
                                                </DropdownMenuItem>
                                                <DropdownMenuItem 
                                                    disabled={task.status === 'Completed'} 
                                                    onSelect={() => onStatusChange(task.id, 'Completed')}
                                                >
                                                    Mark as Completed
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">No tasks found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
