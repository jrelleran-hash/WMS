
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PlusCircle, MoreHorizontal, CornerDownRight, ChevronRight } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
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
import { addProductCategory, updateProductCategory, deleteProductCategory } from "@/services/data-service";
import { useData } from "@/context/data-context";
import { useAuth } from "@/hooks/use-auth";
import type { ProductCategory } from "@/types";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const categorySchema = z.object({
  name: z.string().min(1, "Category name is required."),
  parentId: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

interface HierarchicalCategory extends ProductCategory {
    subcategories: HierarchicalCategory[];
}

const toTitleCase = (str: string) => {
  if (!str) return "";
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
  );
};

function CategoryRow({ category, level = 0, onEdit, onDelete, canManage }: { category: HierarchicalCategory, level?: number, onEdit: (category: ProductCategory) => void, onDelete: (categoryId: string) => void, canManage: boolean }) {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <React.Fragment>
            <TableRow onClick={() => canManage && onEdit(category)} className={cn(canManage && "cursor-pointer")}>
                <TableCell style={{ paddingLeft: `${level * 1.5 + 1}rem` }}>
                    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="flex items-center gap-2">
                        {category.subcategories.length > 0 && (
                            <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 -ml-2" onClick={(e) => e.stopPropagation()}>
                                    <ChevronRight className={cn("h-4 w-4 transition-transform", isOpen && "rotate-90")} />
                                    <span className="sr-only">Toggle subcategories</span>
                                </Button>
                            </CollapsibleTrigger>
                        )}
                        <span className="font-medium">{category.name}</span>
                    </Collapsible>
                </TableCell>
                {canManage && (
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
                        <DropdownMenuItem onClick={() => onEdit(category)}>Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete(category.id)} className="text-destructive">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                    </DropdownMenu>
                </TableCell>
                )}
            </TableRow>
            <CollapsibleContent asChild>
                 <React.Fragment>
                    {category.subcategories.map(subCategory => (
                        <CategoryRow key={subCategory.id} category={subCategory} level={level + 1} onEdit={onEdit} onDelete={onDelete} canManage={canManage} />
                    ))}
                </React.Fragment>
            </CollapsibleContent>
        </React.Fragment>
    )
}


export default function CategoriesPage() {
  const { productCategories, loading, refetchData } = useData();
  const { userProfile } = useAuth();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const { toast } = useToast();

  const canManage = userProfile?.role === "Admin" || userProfile?.role === "Manager";

  const hierarchicalCategories = useMemo(() => {
    const categoryMap: Record<string, HierarchicalCategory> = {};
    const topLevel: HierarchicalCategory[] = [];

    productCategories.forEach(category => {
        categoryMap[category.id] = { ...category, subcategories: [] };
    });

    Object.values(categoryMap).forEach(category => {
        if (category.parentId && categoryMap[category.parentId]) {
            categoryMap[category.parentId].subcategories.push(category);
        } else {
            topLevel.push(category);
        }
    });
    return topLevel;
  }, [productCategories]);


  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
  });

  const editForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
  });
  
  useEffect(() => {
    if (editingCategory) {
      editForm.reset(editingCategory);
    } else {
      editForm.reset();
    }
  }, [editingCategory, editForm]);


  const onAddSubmit = async (data: CategoryFormValues) => {
    try {
      await addProductCategory(data.name, data.parentId);
      toast({ title: "Success", description: "Category added successfully." });
      setIsAddDialogOpen(false);
      form.reset();
      await refetchData();
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : "Failed to add category.";
      toast({ variant: "destructive", title: "Error", description: errorMessage });
    }
  };

  const onEditSubmit = async (data: CategoryFormValues) => {
    if (!editingCategory) return;
    try {
      await updateProductCategory(editingCategory.id, data.name, data.parentId);
      toast({ title: "Success", description: "Category updated successfully." });
      setIsEditDialogOpen(false);
      setEditingCategory(null);
      await refetchData();
    } catch (error) {
       console.error(error);
       toast({ variant: "destructive", title: "Error", description: "Failed to update category." });
    }
  };

  const handleEditClick = (category: ProductCategory) => {
    setEditingCategory(category);
    setIsEditDialogOpen(true);
  };
  
  const handleDeleteClick = (categoryId: string) => {
    setDeletingCategoryId(categoryId);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingCategoryId) return;
    try {
      await deleteProductCategory(deletingCategoryId);
      toast({ title: "Success", description: "Category deleted successfully." });
      await refetchData();
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: "Failed to delete category." });
    } finally {
      setIsDeleteDialogOpen(false);
      setDeletingCategoryId(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle>Product Categories</CardTitle>
            <CardDescription>Manage your product categories and sub-categories.</CardDescription>
          </div>
          {canManage && (
            <div className="flex gap-2 mt-4 md:mt-0">
              <Dialog open={isAddDialogOpen} onOpenChange={(isOpen) => {
                setIsAddDialogOpen(isOpen);
                if(!isOpen) form.reset();
              }}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1 w-full md:w-auto">
                    <PlusCircle />
                    Add Category
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add New Category</DialogTitle>
                    <DialogDescription>Fill in the details for the new category.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={form.handleSubmit(onAddSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Category Name</Label>
                      <Input 
                        id="name" 
                        {...form.register("name")} 
                        onChange={(e) => {
                          const { value } = e.target;
                          form.setValue("name", toTitleCase(value), { shouldValidate: true });
                        }}
                      />
                      {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
                    </div>
                     <div className="space-y-2">
                      <Label htmlFor="parentId">Parent Category (Optional)</Label>
                        <Controller
                            name="parentId"
                            control={form.control}
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="None (Top-level)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">None (Top-level)</SelectItem>
                                        {productCategories.map(cat => (
                                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </div>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button type="button" variant="outline">Cancel</Button>
                      </DialogClose>
                      <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? "Adding..." : "Add Category"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </CardHeader>
        <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category Name</TableHead>
                  {canManage && (
                    <TableHead>
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      {canManage && <TableCell><Skeleton className="h-8 w-8" /></TableCell>}
                    </TableRow>
                  ))
                ) : (
                  hierarchicalCategories.map((category) => (
                    <CategoryRow key={category.id} category={category} onEdit={handleEditClick} onDelete={handleDeleteClick} canManage={canManage} />
                  ))
                )}
              </TableBody>
            </Table>
        </CardContent>
      </Card>
      
      {canManage && (
        <>
          <Dialog open={isEditDialogOpen} onOpenChange={(isOpen) => {
              setIsEditDialogOpen(isOpen);
              if(!isOpen) {
                  setEditingCategory(null);
                  editForm.reset();
              }
          }}>
              <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                  <DialogTitle>Edit Category</DialogTitle>
                  {editingCategory && <DialogDescription>Update the details for {editingCategory.name}.</DialogDescription>}
                  </DialogHeader>
                  <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                  <div className="space-y-2">
                      <Label htmlFor="edit-name">Category Name</Label>
                      <Input 
                      id="edit-name" 
                      {...editForm.register("name")} 
                      onChange={(e) => {
                          const { value } = e.target;
                          editForm.setValue("name", toTitleCase(value), { shouldValidate: true });
                      }}
                      />
                      {editForm.formState.errors.name && <p className="text-sm text-destructive">{editForm.formState.errors.name.message}</p>}
                  </div>
                   <div className="space-y-2">
                      <Label htmlFor="edit-parentId">Parent Category (Optional)</Label>
                        <Controller
                            name="parentId"
                            control={editForm.control}
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value || ''}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="None (Top-level)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">None (Top-level)</SelectItem>
                                        {productCategories.filter(cat => cat.id !== editingCategory?.id).map(cat => (
                                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </div>
                  <DialogFooter>
                      <DialogClose asChild>
                      <Button type="button" variant="outline">Cancel</Button>
                      </DialogClose>
                      <Button type="submit" disabled={!editForm.formState.isValid || editForm.formState.isSubmitting}>
                      {editForm.formState.isSubmitting ? "Saving..." : "Save Changes"}
                      </Button>
                  </DialogFooter>
                  </form>
              </DialogContent>
          </Dialog>
      
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete this category and all its sub-categories.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteConfirm} className={buttonVariants({ variant: "destructive" })}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </>
  );
}
