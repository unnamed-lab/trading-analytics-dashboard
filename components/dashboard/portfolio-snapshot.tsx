const PortfolioSnapshot = () => {
  return (
    <div className="rounded-lg border border-border bg-card p-5 flex flex-col gap-4 h-full">
      <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
        Portfolio Snapshot
      </span>

      <div>
        <span className="text-xs text-muted-foreground">
          Total Account Value
        </span>
        <p className="font-mono text-3xl font-bold text-foreground">
          $45,230.00
        </p>
      </div>

      <div>
        <span className="text-xs text-muted-foreground">{"Today's PnL"}</span>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-xl font-bold text-profit">
            +$450.20
          </span>
          <span className="text-sm text-profit">(+1.02%)</span>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-muted-foreground">Margin Usage</span>
          <span className="font-mono text-xs text-foreground">24%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: "24%" }}
          />
        </div>
      </div>
    </div>
  );
};

export default PortfolioSnapshot;
