
"use server";

import { doc, getDoc, updateDoc, arrayUnion, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Product } from "@/types";

export async function getProductByIdAction(productId: string): Promise<Product | null> {
    try {
        const productRef = doc(db, "inventory", productId);
        const productDoc = await getDoc(productRef);

        if (productDoc.exists()) {
            const data = productDoc.data();
            return {
                id: productDoc.id,
                ...data,
                lastUpdated: data.lastUpdated,
                history: data.history?.map((h: any) => ({...h, dateUpdated: h.dateUpdated}))
            } as Product;
        } else {
            return null;
        }
    } catch (error) {
        console.error("Error fetching product by ID:", error);
        return null;
    }
}

export async function updateProductAction(productId: string, updatedData: Partial<Product>): Promise<{ success: boolean; message?: string }> {
    try {
        const productRef = doc(db, "inventory", productId);

        const updatePayload: any = {
            ...updatedData,
            lastUpdated: Timestamp.now(),
        };

        if (updatedData.stock !== undefined) {
            updatePayload.history = arrayUnion({
                date: new Date().toISOString().split('T')[0],
                stock: updatedData.stock,
                dateUpdated: Timestamp.now(),
            });
        }

        await updateDoc(productRef, updatePayload);

        return { success: true };
    } catch (error) {
        console.error("Error updating product:", error);
        return { success: false, message: "Failed to update product. Please try again." };
    }
}
