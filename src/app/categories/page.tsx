
"use client";

import React, { useState, useEffect, useMemo, ChangeEvent, KeyboardEvent } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PlusCircle, MoreHorizontal, ChevronRight, X } from "lucide-react";

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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouter } from "next/navigation";

const categorySchema = z.object({
  name: z.string().min(1, "Category name is required."),
  parentId: z.string().optional(),
});

const multiCategorySchema = z.object({
    parentId: z.string().optional(),
    subcategories: z.array(z.object({
        name: z.string().min(1, "Subcategory name is required.")
    })).min(1, "At least one subcategory is required.")
});


type CategoryFormValues = z.infer<typeof categorySchema>;
type MultiCategoryFormValues = z.infer<typeof multiCategorySchema>;


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

function CategoryRow({ category, level = 0, onEdit, onDelete, onAddSubCategory, canManage }: { category: HierarchicalCategory, level?: number, onEdit: (category: ProductCategory) => void, onDelete: (categoryId: string) => void, onAddSubCategory: (parentCategory: ProductCategory) => void, canManage: boolean }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <React.Fragment>
            <TableRow>
                <TableCell style={{ paddingLeft: `${level * 1.5 + 1}rem` }} onClick={() => canManage && onEdit(category)} className={cn(canManage && "cursor-pointer")}>
                     <div className="flex items-center gap-2">
                        {category.subcategories.length > 0 ? (
                            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                                <CollapsibleTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 -ml-2" onClick={(e) => e.stopPropagation()}>
                                        <ChevronRight className={cn("h-4 w-4 transition-transform", isOpen && "rotate-90")} />
                                        <span className="sr-only">Toggle subcategories</span>
                                    </Button>
                                </CollapsibleTrigger>
                            </Collapsible>
                        ) : (
                          <span className="w-6 h-6"></span> 
                        )}
                        <span className={cn("font-medium")}>{category.name}</span>
                    </div>
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
                        <DropdownMenuItem onClick={() => onAddSubCategory(category)}>Add Sub-category</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(category)}>Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete(category.id)} className="text-destructive">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                    </DropdownMenu>
                </TableCell>
                )}
            </TableRow>
             {isOpen && category.subcategories.map(subCategory => (
                <CategoryRow key={subCategory.id} category={subCategory} level={level + 1} onEdit={onEdit} onDelete={onDelete} onAddSubCategory={onAddSubCategory} canManage={canManage} />
            ))}
        </React.Fragment>
    )
}


export default function CategoriesPage() {
  const { productCategories, loading, refetchData } = useData();
  const { userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const { toast } = useToast();
  
  const [suggestion, setSuggestion] = useState('');

  const canManage = useMemo(() => userProfile?.role === "Admin" || userProfile?.role === "Manager", [userProfile]);

  useEffect(() => {
    if (!authLoading && userProfile && !canManage) {
        toast({
            variant: "destructive",
            title: "Unauthorized",
            description: "You do not have permission to access this page.",
        });
        router.push('/');
    }
  }, [authLoading, userProfile, canManage, router, toast]);

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
    
    // Sort subcategories alphabetically
    Object.values(categoryMap).forEach(category => {
        category.subcategories.sort((a, b) => a.name.localeCompare(b.name));
    });
    
    // Sort top-level categories alphabetically
    topLevel.sort((a, b) => a.name.localeCompare(b.name));

    return topLevel;
  }, [productCategories]);


  const form = useForm<MultiCategoryFormValues>({
    resolver: zodResolver(multiCategorySchema),
     defaultValues: {
      parentId: undefined,
      subcategories: [{ name: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "subcategories"
  });

  const editForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
  });
  
  useEffect(() => {
    if (editingCategory) {
      editForm.reset({
        name: editingCategory.name,
        parentId: editingCategory.parentId || undefined,
      });
    } else {
      editForm.reset();
    }
  }, [editingCategory, editForm]);


  const onAddSubmit = async (data: MultiCategoryFormValues) => {
    try {
        let successCount = 0;
        for (const subcategory of data.subcategories) {
            await addProductCategory(subcategory.name, data.parentId);
            successCount++;
        }
      
      toast({ title: "Success", description: `${successCount} categor${successCount > 1 ? 'ies' : 'y'} added successfully.` });
      setIsAddDialogOpen(false);
      form.reset();
      await refetchData();
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : "Failed to add categories.";
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

  const handleAddSubCategoryClick = (parentCategory: ProductCategory) => {
    form.reset({ parentId: parentCategory.id, subcategories: [{ name: '' }] });
    setIsAddDialogOpen(true);
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

  const handleCategoryNameChange = (e: ChangeEvent<HTMLInputElement>, currentForm: any, fieldName: string = "name") => {
    const value = toTitleCase(e.target.value);
    currentForm.setValue(fieldName, value, { shouldValidate: true });

    if (value) {
        const foundSuggestion = productCategories.find(cat =>
            cat.name.toLowerCase().startsWith(value.toLowerCase())
        );
        if (foundSuggestion && foundSuggestion.name.toLowerCase() !== value.toLowerCase()) {
            setSuggestion(foundSuggestion.name);
        } else {
            setSuggestion('');
        }
    } else {
        setSuggestion('');
    }
  };
  
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, currentForm: any, fieldName: string = "name") => {
    if ((e.key === 'Tab' || e.key === 'ArrowRight') && suggestion) {
        e.preventDefault();
        currentForm.setValue(fieldName, suggestion, { shouldValidate: true });
        setSuggestion('');
    }
  };
  
  if (authLoading || !userProfile || !canManage) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <p className="text-muted-foreground">You don't have permission to view this page.</p>
      </div>
    );
  }


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
                if(!isOpen) {
                  form.reset({ parentId: undefined, subcategories: [{ name: "" }] });
                  setSuggestion('');
                }
              }}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1 w-full md:w-auto" onClick={() => form.reset({ parentId: undefined, subcategories: [{ name: '' }] })}>
                    <PlusCircle />
                    Add Category
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Add New Category</DialogTitle>
                    <DialogDescription>Fill in the details for the new category or sub-categories.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={form.handleSubmit(onAddSubmit)} className="space-y-4">
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
                                        <SelectItem value="null">None (Top-level)</SelectItem>
                                        {productCategories.map(cat => (
                                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Category / Sub-category Names</Label>
                        {fields.map((item, index) => (
                           <div key={item.id} className="flex items-center gap-2">
                                <Input
                                    {...form.register(`subcategories.${index}.name` as const)}
                                    placeholder={`Sub-category ${index + 1}`}
                                    onChange={(e) => handleCategoryNameChange(e, form, `subcategories.${index}.name`)}
                                    onKeyDown={(e) => handleKeyDown(e, form, `subcategories.${index}.name`)}
                                    autoComplete="off"
                                />
                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1}>
                                    <X className="h-4 w-4" />
                                </Button>
                           </div>
                        ))}
                         {form.formState.errors.subcategories && <p className="text-sm text-destructive">{form.formState.errors.subcategories.message || form.formState.errors.subcategories.root?.message}</p>}
                    </div>

                    <Button type="button" variant="outline" size="sm" onClick={() => append({ name: "" })}>
                        <PlusCircle className="mr-2 h-4 w-4"/>
                        Add another
                    </Button>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button type="button" variant="outline">Cancel</Button>
                      </DialogClose>
                      <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? "Adding..." : "Add Categories"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-22rem)]">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>Category Name</TableHead>
                  {canManage && (
                    <TableHead className="w-20">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 15 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      {canManage && <TableCell><Skeleton className="h-8 w-8" /></TableCell>}
                    </TableRow>
                  ))
                ) : (
                  hierarchicalCategories.map((category) => (
                    <CategoryRow key={category.id} category={category} onEdit={handleEditClick} onDelete={handleDeleteClick} onAddSubCategory={handleAddSubCategoryClick} canManage={canManage} />
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
      
      {canManage && (
        <>
          <Dialog open={isEditDialogOpen} onOpenChange={(isOpen) => {
              setIsEditDialogOpen(isOpen);
              if(!isOpen) {
                  setEditingCategory(null);
                  editForm.reset();
                  setSuggestion('');
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
                     <div className="relative">
                        <Input
                            id="edit-name"
                            {...editForm.register("name")}
                            onChange={(e) => handleCategoryNameChange(e, editForm)}
                            onKeyDown={(e) => handleKeyDown(e, editForm)}
                            autoComplete="off"
                            className="bg-transparent z-10 relative"
                        />
                        {suggestion && editForm.getValues("name") && (
                            <Input
                                className="absolute inset-0 text-muted-foreground z-0"
                                value={suggestion}
                                disabled
                            />
                        )}
                    </div>
                      {editForm.formState.errors.name && <p className="text-sm text-destructive">{editForm.formState.errors.name.message}</p>}
                  </div>
                   <div className="space-y-2">
                      <Label htmlFor="edit-parentId">Parent Category (Optional)</Label>
                        <Controller
                            name="parentId"
                            control={editForm.control}
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value || undefined}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="None (Top-level)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="null">None (Top-level)</SelectItem>
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
