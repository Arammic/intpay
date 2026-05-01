import { PageHeader } from "@/components/PageHeader";
import { POINTS_FEATURE_CATALOG } from "@/lib/pointsCatalog";
import { TriangleAlert } from "lucide-react";

export default function FeatureCatalogPage() {
  const rewardRules = POINTS_FEATURE_CATALOG.filter((r) => r.points > 0);
  const warningRules = POINTS_FEATURE_CATALOG.filter((r) => r.points < 0);

  const renderRuleList = (rules: typeof POINTS_FEATURE_CATALOG) => (
    <ul className="space-y-2">
      {rules.map((rule) => {
        return (
          <li key={rule.id} className="rounded-xl border border-border p-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-sm">{rule.title}</p>
                <span className={rule.points > 0 ? "text-xs font-label text-secondary tabular-nums" : "text-xs font-label text-destructive tabular-nums"}>
                  {rule.points > 0 ? `+${rule.points}` : rule.points} pts
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">{rule.description}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{rule.repeatable ? "Repeatable rule" : "One-time rule"}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="pb-10 -mt-2">
      <PageHeader title="Point Catalog" subtitle="How to gain or lose points" fallback="/" />

      <div className="pt-4 space-y-4">
        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-label text-xs uppercase text-muted-foreground">Prices / Rewards (+)</h2>
          </div>
          {renderRuleList(rewardRules)}
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-label text-xs uppercase text-muted-foreground flex items-center gap-1">
              <TriangleAlert className="h-3.5 w-3.5 text-destructive" /> Warnings (-)
            </h2>
          </div>
          {renderRuleList(warningRules)}
        </section>
      </div>
    </div>
  );
}
