import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";

interface Props {
  title: string;
  subtitle?: string;
  fallback?: string;
  right?: React.ReactNode;
}

export function PageHeader({ title, subtitle, fallback = "/app", right }: Props) {
  const nav = useNavigate();
  const back = () => {
    if (window.history.length > 1) nav(-1);
    else nav(fallback);
  };
  return (
    <header className="relative flex items-center sticky top-0 z-30 -mx-4 sm:-mx-6 px-2 sm:px-4 h-14 bg-background/85 backdrop-blur-xl">
      <button
        onClick={back}
        aria-label="Back"
        className="relative z-10 inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground/80 hover:text-foreground hover:bg-foreground/5 transition-colors"
      >
        <ArrowLeft className="h-5 w-5" strokeWidth={2.25} />
      </button>
      <div className="absolute inset-x-0 flex flex-col items-center justify-center pointer-events-none px-14">
        <h1 className="font-display text-[17px] font-semibold leading-tight tracking-tight truncate max-w-full">{title}</h1>
        {subtitle && <p className="text-[11px] text-muted-foreground truncate font-label max-w-full">{subtitle}</p>}
      </div>
      <div className="ml-auto relative z-10 flex items-center">{right}</div>
    </header>
  );
}
