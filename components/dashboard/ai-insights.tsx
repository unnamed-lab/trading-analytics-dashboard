import { Sparkles, AlertTriangle } from "lucide-react";

const AIInsights = () => {
  return (
    <div className="rounded-lg border border-border bg-card p-5 flex flex-col gap-5 h-full">
      <div className="flex items-center gap-3">
        <span className="rounded bg-primary px-2.5 py-1 text-xs font-bold tracking-wider text-primary-foreground uppercase">
          AI Insights
        </span>
        <span className="text-xs text-muted-foreground">
          Updated 5 mins ago
        </span>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex gap-3">
          <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-sm text-foreground mb-1">
              High Win Rate on Asian Session
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your performance during the Asian trading session (00:00 - 08:00
              UTC) shows a significantly higher win rate (72%) compared to NY
              session. Consider increasing position sizing during these hours.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-sm text-foreground mb-1">
              Stop Loss Discipline
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Analysis of your last 10 losing trades indicates average hold time
              exceeds your winning trades by 45%. Review stop-loss adherence.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIInsights;
