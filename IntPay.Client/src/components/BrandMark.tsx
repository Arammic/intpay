import { BRAND_LOGO_SRC, BRAND_NAME, BRAND_SLOGAN } from "@/lib/brand";

interface Props {
  compact?: boolean;
}

export function BrandMark({ compact = false }: Props) {
  return (
    <div className="flex items-center gap-2.5">
      <img
        src={BRAND_LOGO_SRC}
        alt="IntPay logo"
        className={compact ? "h-8 w-auto object-contain" : "h-10 w-auto object-contain"}
      />
      <div>
        <p className={compact ? "font-display text-base font-bold" : "font-display text-lg font-bold"}>{BRAND_NAME}</p>
        {!compact && <p className="font-label text-[10px] uppercase tracking-widest text-muted-foreground">{BRAND_SLOGAN}</p>}
      </div>
    </div>
  );
}
