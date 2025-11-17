
"use server";

import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Shipment, Issuance, Product, Client } from "@/types";

async function resolveDoc<T>(docRef: any): Promise<T | null> {
    if (!docRef) return null;
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
        console.warn(`Document with ref ${docRef.path} does not exist.`);
        return null;
    }
    return { id: docSnap.id, ...docSnap.data() } as T;
}

export async function getShipmentByIdAction(shipmentId: string): Promise<Shipment | null> {
    try {
        const shipmentRef = doc(db, "shipments", shipmentId);
        const shipmentDoc = await getDoc(shipmentRef);

        if (shipmentDoc.exists()) {
            const shipmentData = shipmentDoc.data();
            
            const issuanceRef = shipmentData.issuanceRef;
            const issuanceSnap = await getDoc(issuanceRef);
             if (!issuanceSnap.exists()) return null;

            const issuanceData = issuanceSnap.data();
            const client = await resolveDoc<Client>(issuanceData.clientRef);
            if (!client) return null;
            
            const items = await Promise.all(issuanceData.items.map(async (item: any) => {
                 const product = await resolveDoc<Product>(item.productRef);
                 if (!product) return null;
                return {
                    quantity: item.quantity,
                    product: product,
                };
            }));

             if (items.some(i => i === null)) return null;

            const resolvedIssuance: Issuance = {
                ...issuanceData,
                id: issuanceRef.id,
                date: (issuanceData.date).toDate(),
                client: client,
                items: items,
            } as Issuance;

            return {
                id: shipmentDoc.id,
                ...shipmentData,
                createdAt: shipmentData.createdAt.toDate(),
                estimatedDeliveryDate: shipmentData.estimatedDeliveryDate?.toDate(),
                actualDeliveryDate: shipmentData.actualDeliveryDate?.toDate(),
                issuance: resolvedIssuance,
            } as Shipment;
        } else {
            return null;
        }
    } catch (error) {
        console.error("Error fetching shipment by ID:", error);
        return null;
    }
}
