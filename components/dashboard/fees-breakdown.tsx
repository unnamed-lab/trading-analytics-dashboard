import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const data = [
  { name: "Trading Fees", value: 720, color: "hsl(187, 100%, 50%)" },
  { name: "Funding Fees", value: 340, color: "hsl(187, 80%, 35%)" },
  { name: "Withdrawal Fees", value: 144, color: "hsl(222, 25%, 25%)" },
];

const FeesBreakdown = () => {
  return (
    <div className="rounded-lg border border-border bg-card p-5 flex flex-col gap-3">
      <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
        Fees Breakdown
      </span>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius={35}
              outerRadius={55}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
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
              formatter={(value: number) => [`$${value.toFixed(2)}`, ""]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-col gap-1.5">
        {data.map((d) => (
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
            <span className="font-mono text-foreground">${d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FeesBreakdown;
