
"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useData } from "@/context/data-context";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { addTask, updateTask, deleteTask } from "@/services/data-service";
import type { Task, Subtask } from "@/types";
import { format } from "date-fns";
import { ResponsiveContainer, XAxis, YAxis, Bar, BarChart, PieChart, Pie, Cell, Legend } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle, MoreHorizontal, Calendar as CalendarIcon, Trash2, X, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import type { DateRange } from "react-day-picker";


const subtaskSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Subtask title cannot be empty."),
  completed: z.boolean(),
  dateRange: z.object({
    from: z.date().optional(),
    to: z.date().optional(),
  }).optional(),
});

const taskSchema = z.object({
  title: z.string().min(1, "Task title is required."),
  description: z.string().optional(),
  priority: z.enum(["Critical", "High", "Medium", "Low"]),
  assignedToId: z.string().min(1, "Please assign this task to a staff member."),
  dueDate: z.date().optional(),
  supervisorNotes: z.string().optional(),
  progress: z.number().min(0).max(100).optional(),
  subtasks: z.array(subtaskSchema).optional(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

const statusVariant: { [key in Task['status']]: "default" | "secondary" | "destructive" | "outline" } = {
    'Pending': "secondary",
    'In Progress': "default",
    'Completed': "default",
    'Delayed': "destructive",
};

const priorityVariant: { [key in Task['priority']]: "default" | "secondary" | "destructive" | "outline" } = {
    'Critical': "destructive",
    'High': "secondary",
    'Medium': "default",
    'Low': "outline",
};

const chartConfig = {
    completed: { label: "Completed", color: "hsl(var(--chart-1))" },
    inProgress: { label: "In Progress", color: "hsl(var(--chart-2))" },
    pending: { label: "Pending", color: "hsl(var(--chart-3))" },
    delayed: { label: "Delayed", color: "hsl(var(--chart-5))" },
} satisfies ChartConfig;


function StaffKpiDashboard() {
    const { tasks, users, loading } = useData();

    const staffKpis = useMemo(() => {
        return users.map(user => {
            const userTasks = tasks.filter(t => t.assignedToId === user.uid);
            const completed = userTasks.filter(t => t.status === 'Completed').length;
            const overdue = userTasks.filter(t => t.status !== 'Completed' && t.dueDate && t.dueDate.toDate() < new Date()).length;
            
            return {
                userId: user.uid,
                name: `${'user.firstName'} ${'user.lastName'}`,
                total: userTasks.length,
                completed,
                overdue,
                completionRate: userTasks.length > 0 ? (completed / userTasks.length) * 100 : 0,
            }
        });
    }, [users, tasks]);

    const overallStats = useMemo(() => {
        const total = tasks.length;
        const completed = tasks.filter(t => t.status === 'Completed').length;
        const inProgress = tasks.filter(t => t.status === 'In Progress').length;
        const pending = tasks.filter(t => t.status === 'Pending').length;
        const delayed = tasks.filter(t => t.status === 'Delayed').length;
        return [
            { name: 'Completed', value: completed, fill: 'var(--color-completed)' },
            { name: 'In Progress', value: inProgress, fill: 'var(--color-inProgress)' },
            { name: 'Pending', value: pending, fill: 'var(--color-pending)' },
            { name: 'Delayed', value: delayed, fill: 'var(--color-delayed)' },
        ];
    }, [tasks]);

    if(loading) {
        return <Skeleton className="h-[400px] w-full" />
    }

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
             <Card className="lg:col-span-1 flex flex-col">
                <CardHeader>
                    <CardTitle>Overall Task Status</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex items-center justify-center">
                    <ChartContainer config={chartConfig} className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                                <Pie data={overallStats} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label>
                                    {overallStats.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <ChartLegend content={<ChartLegendContent />} />
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
                    <ChartContainer config={chartConfig} className="h-72">
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
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
    const { toast } = useToast();

    const form = useForm<TaskFormValues>({
        resolver: zodResolver(taskSchema),
        defaultValues: {
            priority: "Medium",
        }
    });
    
    useEffect(() => {
        if(isAddDialogOpen) {
            form.reset({
                priority: "Medium",
                title: "",
                description: "",
                assignedToId: "",
                dueDate: undefined,
                supervisorNotes: "",
                progress: 0,
                subtasks: [],
            });
        }
    }, [isAddDialogOpen, form]);
    
    useEffect(() => {
        if(selectedTask) {
            form.reset({
                title: selectedTask.title,
                description: selectedTask.description,
                priority: selectedTask.priority,
                assignedToId: selectedTask.assignedToId,
                dueDate: selectedTask.dueDate ? selectedTask.dueDate.toDate() : undefined,
                supervisorNotes: selectedTask.supervisorNotes,
                progress: selectedTask.progress,
                subtasks: selectedTask.subtasks?.map(st => ({...st, dateRange: { from: st.startDate?.toDate(), to: st.dueDate?.toDate()}})) || [],
            });
        }
    }, [selectedTask, form]);


    const onSubmit = async (data: TaskFormValues) => {
        if (!userProfile) {
            toast({ variant: "destructive", title: "Error", description: "You must be logged in to create a task."});
            return;
        }

        const taskData = {
            ...data,
            createdBy: `${userProfile.firstName} ${userProfile.lastName}`
        }

        try {
            if(selectedTask) {
                await updateTask(selectedTask.id, taskData);
                toast({ title: "Success", description: "Task has been updated." });
                setSelectedTask(null);
            } else {
                await addTask(taskData);
                toast({ title: "Success", description: "New task has been created and assigned." });
                setIsAddDialogOpen(false);
            }
            await refetchData();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : `Failed to ${selectedTask ? 'update' : 'create'} task.`;
            toast({ variant: "destructive", title: "Error", description: errorMessage });
        }
    };
    
    const handleStatusChange = async (taskId: string, status: Task['status']) => {
        try {
            await updateTask(taskId, { status });
            toast({ title: "Success", description: "Task status updated."});
            await refetchData();
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Failed to update task status."});
        }
    };
    
    const handleProgressChange = async (taskId: string, progress: number) => {
         try {
            await updateTask(taskId, { progress });
            await refetchData();
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Failed to update task progress."});
        }
    }
    
    const handleDeleteClick = (taskId: string) => {
        setDeletingTaskId(taskId);
        setIsDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!deletingTaskId) return;
        try {
            await deleteTask(deletingTaskId);
            toast({ title: "Success", description: "Task deleted successfully." });
            await refetchData();
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Failed to delete task." });
        } finally {
            setIsDeleteDialogOpen(false);
            setDeletingTaskId(null);
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
                        <DialogContent className="sm:max-w-xl">
                            <DialogHeader>
                                <DialogTitle>Create New Task</DialogTitle>
                                <DialogDescription>Fill in the details and assign the task to a staff member.</DialogDescription>
                            </DialogHeader>
                            <TaskForm form={form} onSubmit={onSubmit} users={users} onClose={() => setIsAddDialogOpen(false)} />
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
                        <TaskTable tasks={allTasks} loading={loading} onStatusChange={handleStatusChange} onProgressChange={handleProgressChange} onEdit={setSelectedTask} onDelete={handleDeleteClick} />
                    </TabsContent>
                )}
                 <TabsContent value="my-tasks">
                    <TaskTable tasks={myTasks} loading={loading} onStatusChange={handleStatusChange} onProgressChange={handleProgressChange} onEdit={setSelectedTask} onDelete={handleDeleteClick} />
                 </TabsContent>
            </Tabs>
            
            <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Edit Task</DialogTitle>
                        <DialogDescription>Update the details for this task.</DialogDescription>
                    </DialogHeader>
                    <TaskForm form={form} onSubmit={onSubmit} users={users} onClose={() => setSelectedTask(null)} />
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete this task.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} className={buttonVariants({ variant: "destructive" })}>
                            Delete Task
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

function TaskForm({ form, onSubmit, users, onClose }: { form: any, onSubmit: (data: TaskFormValues) => Promise<void>, users: any[], onClose: () => void }) {
    const { watch, control, register, setValue } = form;
    const [newSubtask, setNewSubtask] = useState("");
    const [openSubtaskPopovers, setOpenSubtaskPopovers] = useState<Record<number, boolean>>({});
    
    const { fields, append, remove } = useFieldArray({
      control,
      name: "subtasks",
    });

    const subtasks = watch("subtasks", []);
    
    const progress = useMemo(() => {
        if (!subtasks || subtasks.length === 0) return watch('progress') || 0;
        const completedCount = subtasks.filter((s: Subtask) => s.completed).length;
        return Math.round((completedCount / subtasks.length) * 100);
    }, [subtasks, watch]);

    useEffect(() => {
        if (subtasks && subtasks.length > 0) {
            const completedCount = subtasks.filter((s: any) => s.completed).length;
            const totalSubtasks = subtasks.length;
            const newProgress = totalSubtasks > 0 ? Math.round((completedCount / totalSubtasks) * 100) : 0;
            setValue('progress', newProgress, { shouldDirty: true });
        }
    }, [subtasks, setValue]);


    const handleAddSubtask = () => {
        if (newSubtask.trim() !== "") {
            append({ id: `new-${Date.now()}`, title: newSubtask.trim(), completed: false, dateRange: { from: undefined, to: undefined } });
            setNewSubtask("");
        }
    };
    
    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
            <div className="space-y-2">
                <Label htmlFor="title">Task Title</Label>
                <Input id="title" {...register("title")} />
                {form.formState.errors.title && <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea id="description" {...register("description")} />
            </div>
            <div className="space-y-2">
                <Label>Subtasks</Label>
                <div className="space-y-2">
                    {fields.map((field, index) => (
                        <div key={field.id} className="flex items-center gap-2">
                            <Controller
                                name={`subtasks.${index}.completed`}
                                control={control}
                                render={({ field: checkboxField }) => (
                                    <Checkbox
                                        checked={checkboxField.value}
                                        onCheckedChange={checkboxField.onChange}
                                    />
                                )}
                            />
                            <Popover open={openSubtaskPopovers[index]} onOpenChange={(open) => setOpenSubtaskPopovers(prev => ({...prev, [index]: open}))}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className={cn("flex-1 justify-start font-normal h-auto", form.watch(`subtasks.${index}.completed`) && "line-through text-muted-foreground")}>
                                        <div className="flex flex-col items-start">
                                            <span>{watch(`subtasks.${index}.title`)}</span>
                                            {watch(`subtasks.${index}.dateRange.from`) && (
                                                 <span className="text-xs text-muted-foreground">
                                                    {format(watch(`subtasks.${index}.dateRange.from`), 'PP')} - {watch(`subtasks.${index}.dateRange.to`) ? format(watch(`subtasks.${index}.dateRange.to`), 'PP') : ''}
                                                </span>
                                            )}
                                        </div>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Subtask Title</Label>
                                            <Input {...register(`subtasks.${index}.title`)} />
                                        </div>
                                         <div className="space-y-2">
                                            <Label>Date Range</Label>
                                             <Controller
                                                name={`subtasks.${index}.dateRange`}
                                                control={control}
                                                render={({ field: dateField }) => (
                                                    <Calendar
                                                        initialFocus
                                                        mode="range"
                                                        defaultMonth={dateField.value?.from}
                                                        selected={dateField.value as DateRange}
                                                        onSelect={dateField.onChange}
                                                        numberOfMonths={1}
                                                    />
                                                )}
                                            />
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>

                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    <Input
                        value={newSubtask}
                        onChange={(e) => setNewSubtask(e.target.value)}
                        placeholder="Add a new subtask..."
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddSubtask();
                            }
                        }}
                    />
                    <Button type="button" onClick={handleAddSubtask}>Add</Button>
                </div>
            </div>
             <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <Label htmlFor="progress">Progress</Label>
                    <span className="text-sm font-medium text-muted-foreground">{progress || 0}%</span>
                </div>
                 <Progress value={progress || 0} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="assignedToId">Assign To</Label>
                    <Controller
                        name="assignedToId"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger><SelectValue placeholder="Select staff..." /></SelectTrigger>
                                <SelectContent>
                                    {users.map(u => (
                                        <SelectItem key={u.uid} value={u.uid}>{`${u.firstName} ${u.lastName}`}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                    {form.formState.errors.assignedToId && <p className="text-sm text-destructive">{form.formState.errors.assignedToId.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label>Priority</Label>
                    <Controller
                        name="priority"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Critical">Critical</SelectItem>
                                    <SelectItem value="High">High</SelectItem>
                                    <SelectItem value="Medium">Medium</SelectItem>
                                    <SelectItem value="Low">Low</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                    />
                </div>
            </div>
            <div className="space-y-2">
                <Label>Due Date</Label>
                <Controller
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                         <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    )}
                />
            </div>
             <div className="space-y-2">
                <Label htmlFor="supervisorNotes">Supervisor Notes (Optional)</Label>
                <Textarea id="supervisorNotes" {...register("supervisorNotes")} />
            </div>
            <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Saving..." : "Save Task"}</Button>
            </DialogFooter>
        </form>
    );
}


function TaskTable({ tasks, loading, onStatusChange, onProgressChange, onEdit, onDelete }: { tasks: Task[], loading: boolean, onStatusChange: (taskId: string, status: Task['status']) => void, onProgressChange: (taskId: string, progress: number) => void, onEdit: (task: Task) => void, onDelete: (taskId: string) => void }) {

    const sortedTasks = useMemo(() => {
        return [...tasks].sort((a, b) => {
            const statusOrder = { 'In Progress': 0, 'Delayed': 1, 'Pending': 2, 'Completed': 3 };
            if (statusOrder[a.status] !== statusOrder[b.status]) {
                return statusOrder[a.status] - statusOrder[b.status];
            }
            return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0);
        });
    }, [tasks]);

    return (
        <Card>
            <CardContent className="pt-6">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[30%]">Task</TableHead>
                            <TableHead>Priority</TableHead>
                            <TableHead>Assigned To</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead className="w-[150px]">Progress</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                             Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell>
                                </TableRow>
                            ))
                        ) : sortedTasks.length > 0 ? (
                            sortedTasks.map(task => (
                                <TableRow key={task.id} onClick={() => onEdit(task)} className="cursor-pointer">
                                    <TableCell className="font-medium">{task.title}</TableCell>
                                    <TableCell><Badge variant={priorityVariant[task.priority]}>{task.priority}</Badge></TableCell>
                                    <TableCell>{task.assignedToName}</TableCell>
                                    <TableCell>{task.dueDate ? format(task.dueDate.toDate(), 'PPP') : 'N/A'}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Progress value={task.progress || 0} />
                                            <span className="text-xs font-mono w-8 text-right">{task.progress || 0}%</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <Select 
                                                defaultValue={task.status}
                                                onValueChange={(value) => onStatusChange(task.id, value as Task['status'])}
                                            >
                                                <SelectTrigger className="w-[120px] h-8 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                     {(["Pending", "In Progress", "Completed", "Delayed"] as Task['status'][]).map(s => (
                                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                                     ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}><MoreHorizontal /></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuItem onSelect={() => onEdit(task)}>Edit Details</DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="text-destructive" onSelect={() => onDelete(task.id)}>Delete Task</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">No tasks found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
