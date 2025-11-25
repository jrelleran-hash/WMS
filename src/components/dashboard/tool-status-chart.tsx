
"use client";

import { Bar, BarChart } from "recharts";
import { useMemo } from "react";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { Tool } from "@/types";
import { cn } from "@/lib/utils";

const chartConfig = {
  Available: {
    label: "Available",
    color: "hsl(var(--chart-1))",
  },
  "In Use": {
    label: "In Use",
    color: "hsl(var(--chart-2))",
  },
  "Under Maintenance": {
    label: "Under Maintenance",
    color: "hsl(var(--destructive))",
  },
  "Assigned": {
    label: "Assigned",
    color: "hsl(var(--chart-4))",
  },
} satisfies ChartConfig;

export type ToolFilterType = "all" | "Available" | "In Use" | "Under Maintenance" | "Assigned";

interface ToolStatusChartProps {
  tools: Tool[];
  filter: ToolFilterType;
}

export function ToolStatusChart({ tools, filter }: ToolStatusChartProps) {
  
  const chartData = useMemo(() => {
    const summary: { [key in Tool['status'] | 'Assigned']: number } = {
      "Available": 0,
      "In Use": 0,
      "Under Maintenance": 0,
      "Assigned": 0,
    };
    tools.forEach(tool => {
        if(summary[tool.status] !== undefined) {
            summary[tool.status]++;
        }
    });
    
    return (Object.keys(chartConfig) as (keyof typeof chartConfig)[]).map((status) => ({
        status,
        count: summary[status as Tool['status']],
        fill: `var(--color-${status.replace(/ /g, '')})`,
        opacity: filter === 'all' || filter === status ? 1 : 0.3,
    }));
  }, [tools, filter]);

  const renderChart = () => {
    return (
       <BarChart 
          accessibilityLayer 
          data={chartData} 
          margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
          layout="vertical"
        >
        <ChartTooltip 
            cursor={false} 
            content={<ChartTooltipContent 
                indicator="dot" 
                formatter={(value, name, props) => {
                  const { status } = props.payload;
                  return (
                      <div className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">{status}</span>
                          <span className="font-medium">{value} tools</span>
                      </div>
                  )
                }} 
            />} 
        />
        <Bar dataKey="count" radius={4} />
      </BarChart>
    )
  }

  return (
    <ChartContainer config={chartConfig} className="h-[100px] w-full mt-4">
      {renderChart()}
    </ChartContainer>
  );
}
