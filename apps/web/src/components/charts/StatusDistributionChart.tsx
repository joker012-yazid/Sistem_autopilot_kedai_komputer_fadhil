"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { EmptyState } from "@/features/caredesk/ui/shared";
import { ClipboardList } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  "NEW JOB": "#3568b8",
  "WAITING FADHIL REVIEW": "#b86e13",
  "WAITING CUSTOMER CONFIRMATION": "#a890d8",
  "IN PROGRESS": "#1e7a78",
  "NOT PROCEED": "#697179",
  "READY PICKUP": "#1f7a4d",
  "UNCLAIMED": "#b22929",
  "COMPLETE": "#46515d",
};

interface StatusItem {
  status: string;
  count: number;
}

export function StatusDistributionChart({ data }: { data: StatusItem[] }) {
  const chartData = data.filter((d) => d.count > 0);

  if (chartData.length === 0) {
    return (
      <div className="panel" style={{ minHeight: 280, display: "grid", placeItems: "center" }}>
        <EmptyState
          title="Tiada data"
          detail="Data akan muncul selepas job pertama dihasilkan."
          icon={<ClipboardList size={28} />}
        />
      </div>
    );
  }

  return (
    <div className="panel" style={{ minHeight: 280 }}>
      <h3 style={{ marginBottom: 12 }}>Status Distribution</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={3}
            dataKey="count"
            nameKey="status"
            stroke="none"
          >
            {chartData.map((entry) => (
              <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || "#697179"} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [`${value} job`, name]}
            contentStyle={{
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-md)",
              color: "var(--ink)",
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            formatter={(value: string) => (
              <span style={{ fontSize: "var(--text-sm)", color: "var(--ink)" }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
