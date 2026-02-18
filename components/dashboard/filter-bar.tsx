import { useState } from "react";
import { ChevronDown } from "lucide-react";

const periods = ["7D", "30D", "90D", "YTD"];

const FilterBar = ({
  activePeriod,
  setActivePeriod,
  onSideChange,
}: {
  activePeriod?: string;
  setActivePeriod?: (p: string) => void;
  onSideChange?: (sides: { long: boolean; short: boolean }) => void;
}) => {
  const [internalPeriod, setInternalPeriod] = useState("7D");
  const [sides, setSides] = useState({ long: true, short: true });

  // Use props if provided, otherwise internal state
  const currentPeriod = activePeriod ?? internalPeriod;
  const setPeriod = setActivePeriod ?? setInternalPeriod;

  const handleSideChange = (newSides: { long: boolean; short: boolean }) => {
    setSides(newSides);
    onSideChange?.(newSides);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3">
      <div className="flex items-center gap-3">
        <button className="flex items-center gap-1.5 rounded border border-border px-3 py-1.5 text-sm text-foreground hover:bg-secondary transition-colors">
          All Symbols
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <div className="flex rounded border border-border overflow-hidden">
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${currentPeriod === p
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
                }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={sides.long}
            onChange={(e) =>
              handleSideChange({ ...sides, long: e.target.checked })
            }
            className="accent-primary"
          />
          Longs
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={sides.short}
            onChange={(e) =>
              handleSideChange({ ...sides, short: e.target.checked })
            }
            className="accent-primary"
          />
          Shorts
        </label>
      </div>
    </div>
  );
};

export default FilterBar;
