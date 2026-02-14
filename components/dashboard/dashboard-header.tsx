import { Search, RefreshCw, Download } from "lucide-react";

const DashboardHeader = () => {
  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xs">◆</span>
          </div>
          <span className="font-bold text-sm tracking-wide text-foreground uppercase">
            Deriverse Analytics
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:flex items-center rounded border border-border bg-secondary px-3 py-1.5 gap-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              placeholder="Search wallet or tx hash.."
              className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-48"
            />
          </div>
          <button className="p-2 rounded hover:bg-secondary text-muted-foreground transition-colors sm:hidden">
            <Search className="h-4 w-4" />
          </button>
          <button className="p-2 rounded hover:bg-secondary text-muted-foreground transition-colors">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button className="hidden sm:flex p-2 rounded hover:bg-secondary text-muted-foreground transition-colors">
            <Download className="h-4 w-4" />
          </button>
          <button className="flex items-center gap-2 rounded bg-primary px-3 sm:px-4 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity">
            <span className="h-4 w-4 rounded-sm bg-primary-foreground/20 flex items-center justify-center text-[10px]">
              ◎
            </span>
            <span className="hidden sm:inline">Connect</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
