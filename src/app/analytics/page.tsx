
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DollarSign, ShoppingCart, Users, Package } from "lucide-react";
import { KpiCard } from "@/components/analytics/kpi-card";
import { SalesChart } from "@/components/analytics/sales-chart";
import { ActivityChart } from "@/components/analytics/activity-chart";
import { TopProducts } from "@/components/analytics/top-products";
import { ActiveClients } from "@/components/analytics/active-clients";
import { useData } from "@/context/data-context";
import { formatCurrency } from "@/lib/currency";
import { useAuthorization } from "@/hooks/use-authorization";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";


export default function AnalyticsPage() {
  const { orders, clients, products, issuances, loading } = useData();
  const { canView } = useAuthorization({ page: '/analytics' });
  const { loading: authLoading } = useAuth();
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

  const totalRevenue = orders.reduce((acc, order) => acc + order.total, 0);
  
  if (authLoading || !canView) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <p className="text-muted-foreground">Access Denied. Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold font-headline tracking-tight">
          Performance Analytics
        </h1>
        <p className="text-muted-foreground">
          Detailed insights into your business performance.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Revenue"
          value={formatCurrency(totalRevenue)}
          icon={<DollarSign className="size-5 text-muted-foreground" />}
          loading={loading}
        />
        <KpiCard
          title="Total Orders"
          value={orders.length.toString()}
          icon={<ShoppingCart className="size-5 text-muted-foreground" />}
          loading={loading}
        />
        <KpiCard
          title="Total Clients"
          value={clients.length.toString()}
          icon={<Users className="size-5 text-muted-foreground" />}
          loading={loading}
        />
        <KpiCard
          title="Total Products"
          value={products.length.toString()}
          icon={<Package className="size-5 text-muted-foreground" />}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SalesChart orders={orders} loading={loading} />
        <ActivityChart orders={orders} issuances={issuances} loading={loading} />
      </div>
      
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <TopProducts orders={orders} loading={loading} />
        <ActiveClients orders={orders} loading={loading} />
      </div>

    </div>
  );
}
