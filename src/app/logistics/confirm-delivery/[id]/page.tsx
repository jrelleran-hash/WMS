
"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import dynamic from 'next/dynamic';
import type SignatureCanvas from "react-signature-canvas";

import { getShipmentByIdAction } from "@/app/logistics/actions";
import { updateShipmentStatus } from "@/services/data-service";
import type { Shipment } from "@/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Camera, CheckCircle, PackageCheck } from "lucide-react";

const DynamicSignatureCanvas = dynamic(() => import('react-signature-canvas'), { ssr: false });

const deliveryConfirmationSchema = z.object({
  recipientSignature: z.any().refine(val => val, { message: "Signature is required." }),
  deliveryProof: typeof window !== 'undefined' ? z.instanceof(FileList).refine(files => files.length > 0, "A photo is required.") : z.any(),
});

type DeliveryConfirmationFormValues = z.infer<typeof deliveryConfirmationSchema>;

export default function ConfirmDeliveryPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const [shipment, setShipment] = useState<Shipment | null>(null);
    const [loading, setLoading] = useState(true);
    const sigPadRef = useRef<SignatureCanvas>(null);

    const { register, handleSubmit, setValue, formState: { errors } } = useForm<DeliveryConfirmationFormValues>({
        resolver: zodResolver(deliveryConfirmationSchema),
    });

    useEffect(() => {
        const shipmentId = params.id as string;
        if (shipmentId) {
            getShipmentByIdAction(shipmentId)
                .then(data => {
                    if (data) {
                        setShipment(data);
                    } else {
                        toast({ variant: "destructive", title: "Error", description: "Shipment not found." });
                        router.push('/logistics');
                    }
                })
                .finally(() => setLoading(false));
        }
    }, [params.id, router, toast]);

    const onSubmit = async (data: DeliveryConfirmationFormValues) => {
        if (!shipment || !sigPadRef.current) return;

        if (sigPadRef.current.isEmpty()) {
            toast({ variant: "destructive", title: "Error", description: "Signature cannot be empty." });
            return;
        }

        // Placeholder for actual file upload
        const photoUrl = "https://picsum.photos/seed/delivery/600/400";
        const signatureUrl = sigPadRef.current.toDataURL();

        try {
            await updateShipmentStatus(shipment.id, 'Delivered', { photoUrl, signatureUrl });
            toast({ title: "Success", description: "Delivery confirmed successfully!" });
            router.push('/logistics');
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Failed to confirm delivery." });
        }
    };
    
    if (loading) {
        return (
            <div className="space-y-4">
                 <Skeleton className="h-8 w-1/4" />
                 <Skeleton className="h-6 w-1/2" />
                 <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-40 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-1/4 ml-auto" />
                    </CardContent>
                 </Card>
            </div>
        )
    }

    if (!shipment) return null;

    return (
        <div className="space-y-4">
            <div>
                 <h1 className="text-2xl font-bold font-headline tracking-tight">Confirm Delivery</h1>
                <p className="text-muted-foreground">
                    Shipment #{shipment.shipmentNumber} for {shipment.issuance.client.clientName}
                </p>
            </div>
            <Card>
                 <CardHeader>
                    <CardTitle className="flex items-center gap-2"><PackageCheck /> Delivery Confirmation</CardTitle>
                    <CardDescription>Please provide proof of delivery by capturing the recipient's signature and a photo of the delivered items.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="space-y-2">
                            <Label>Recipient Signature</Label>
                            <div className="w-full h-48 border rounded-md bg-muted/20">
                                <DynamicSignatureCanvas
                                    ref={sigPadRef}
                                    canvasProps={{ className: 'w-full h-full' }}
                                    onEnd={() => setValue('recipientSignature', sigPadRef.current?.toDataURL())}
                                />
                            </div>
                            {errors.recipientSignature && <p className="text-sm text-destructive">{errors.recipientSignature.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="deliveryProof" className="flex items-center gap-2"><Camera />Proof of Delivery (Photo)</Label>
                            <Input id="deliveryProof" type="file" accept="image/*" capture="environment" {...register("deliveryProof")} />
                            {errors.deliveryProof && <p className="text-sm text-destructive">{errors.deliveryProof.message}</p>}
                        </div>
                        <div className="flex justify-end gap-2">
                             <Button type="button" variant="outline" onClick={() => router.push('/logistics')}>Cancel</Button>
                            <Button type="submit">
                                <CheckCircle className="mr-2" />
                                Confirm Delivery
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
