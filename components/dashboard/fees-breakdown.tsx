import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useTradeAnalytics, useAllTrades } from "@/hooks/use-trade-queries";
import { LogType } from "@deriverse/kit";

interface FeeData {
  name: string;
  value: number;
  color: string;
  type: "trading" | "funding" | "withdrawal" | "other";
}

const FeesBreakdown = () => {
  const { data: analytics } = useTradeAnalytics();
  const { data: trades } = useAllTrades();

  const feeData = useMemo((): FeeData[] => {
    // First try to use analytics data
    if (analytics?.fees) {
      const fees = analytics.fees;
      const result: FeeData[] = [];

      if (fees.totalFees > 0) {
        result.push({
          name: "Trading Fees",
          value: fees.totalFees,
          color: "hsl(187, 100%, 50%)",
          type: "trading",
        });
      }

      return result;
    }

    // Fallback: calculate from trades
    if (trades && trades.length > 0) {
      const tradingFees = trades
        .filter((t) => t.discriminator === 11 || t.discriminator === 19)
        .reduce((sum, t) => sum + (t.fees?.total || 0), 0);

      const fundingPayments = trades
        .filter((t) => t.discriminator === LogType.perpFunding)
        .reduce((sum, t) => sum + Math.abs(t.fundingPayments || 0), 0);

      const socializedLoss = trades
        .filter((t) => t.discriminator === LogType.perpSocLoss)
        .reduce((sum, t) => sum + Math.abs(t.socializedLoss || 0), 0);

      const withdrawalFees = trades
        .filter((t) => t.logType === "withdraw")
        .reduce((sum, t) => sum + Math.abs(t.fees?.total || 0), 0);

      const result: FeeData[] = [];

      if (tradingFees > 0) {
        result.push({
          name: "Trading Fees",
          value: tradingFees,
          color: "hsl(187, 100%, 50%)",
          type: "trading",
        });
      }

      if (fundingPayments > 0) {
        result.push({
          name: "Funding Payments",
          value: fundingPayments,
          color: "hsl(187, 80%, 35%)",
          type: "funding",
        });
      }

      if (socializedLoss > 0) {
        result.push({
          name: "Socialized Loss",
          value: socializedLoss,
          color: "hsl(0, 70%, 50%)",
          type: "other",
        });
      }

      if (withdrawalFees > 0) {
        result.push({
          name: "Withdrawal Fees",
          value: withdrawalFees,
          color: "hsl(222, 25%, 25%)",
          type: "other",
        });
      }

      return result;
    }

    return [];
  }, [analytics, trades]);

  const totalFees = useMemo(() => {
    return feeData.reduce((sum, item) => sum + item.value, 0);
  }, [feeData]);

  if (feeData.length === 0 || totalFees === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-5 flex flex-col gap-3">
        <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
          Fees Breakdown
        </span>
        <div className="h-32 flex items-center justify-center text-muted-foreground">
          No fee data available
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
          Fees Breakdown
        </span>
        <span className="text-xs font-mono text-foreground">
          Total: ${totalFees.toFixed(4)}
        </span>
      </div>

      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={feeData}
              innerRadius={35}
              outerRadius={55}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {feeData.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(222, 40%, 8%)",
                border: "1px solid hsl(222, 25%, 16%)",
                borderRadius: 4,
                color: "hsl(210, 20%, 90%)",
                fontSize: 12,
              }}
              formatter={(value: number, name: string) => [
                `$${value.toFixed(6)}`,
                name,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-col gap-1.5">
        {feeData.map((d) => (
          <div
            key={d.name}
            className="flex items-center justify-between text-xs"
          >
            <div className="flex items-center gap-2">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: d.color }}
              />
              <span className="text-muted-foreground">{d.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-foreground">
                ${d.value.toFixed(6)}
              </span>
              <span className="text-muted-foreground">
                ({((d.value / totalFees) * 100).toFixed(1)}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FeesBreakdown;
