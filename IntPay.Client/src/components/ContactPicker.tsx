import { useEffect, useMemo, useState } from "react";
import { Search, MoreVertical, Lock, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import {
  searchProfiles,
  initialsFromName,
  type ProfileContact,
} from "@/api/profileApi";
import { useCurrentUserContext } from "@/lib/currentUserContext";

/** Public row shape returned via onSelect so the parent can render real data. */
export interface ContactPickerRow {
  id: string;
  name: string;
  username: string;
  email: string;
  initials: string;
}

interface Props {
  selectedId: string | null;
  onSelect: (row: ContactPickerRow) => void;
  initialQuery?: string;
}

type Tab = "contacts" | "businesses";

function toRow(c: ProfileContact): ContactPickerRow {
  return {
    id: String(c.id),
    name: c.name,
    username: c.username,
    email: c.email,
    initials: initialsFromName(c.name),
  };
}

export function ContactPicker({ selectedId, onSelect, initialQuery = "" }: Props) {
  const [tab, setTab] = useState<Tab>("contacts");
  const [query, setQuery] = useState(initialQuery);
  const [debounced, setDebounced] = useState(initialQuery.trim());
  const { profile } = useCurrentUserContext();

  useEffect(() => {
    const next = initialQuery ?? "";
    setQuery(next);
    setDebounced(next.trim());
  }, [initialQuery]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const { data: apiResults = [], isFetching } = useQuery({
    queryKey: ["profiles.search", debounced],
    enabled: debounced.length > 0 && tab === "contacts",
    queryFn: async (): Promise<ProfileContact[]> => {
      const r = await searchProfiles(debounced);
      if (!r.isSucess) throw new Error(r.error.join(", "));
      return r.data ?? [];
    },
    placeholderData: (prev) => prev ?? [],
  });

  const list = useMemo<ContactPickerRow[]>(() => {
    if (tab === "businesses") return [];
    if (!debounced) return (profile?.contacts ?? []).map(toRow);
    return apiResults.map(toRow);
  }, [tab, debounced, profile, apiResults]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or username..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 h-11 rounded-xl bg-card border-border"
        />
      </div>

      <div className="flex gap-5 px-1">
        {(["contacts", "businesses"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "pb-1.5 text-sm font-medium capitalize transition-base relative",
              tab === t
                ? "text-foreground after:absolute after:left-0 after:right-0 after:-bottom-px after:h-0.5 after:rounded-full after:bg-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {isFetching && debounced && (
        <p className="text-[11px] text-muted-foreground -mt-1">Searching…</p>
      )}

      <div className="space-y-2 max-h-[44vh] overflow-y-auto pr-1">
        {list.map((u) => {
          const selected = selectedId === u.id;
          return (
            <button
              key={u.id}
              type="button"
              onClick={() => onSelect(u)}
              className={cn(
                "w-full text-left rounded-2xl bg-card px-3 py-2.5 flex items-center gap-3 transition-base",
                "hover:bg-card/80",
                selected && "ring-1 ring-primary/40 bg-primary/5",
              )}
            >
              <div className="h-10 w-10 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 bg-gradient-to-br from-muted to-card text-foreground/80">
                {u.initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate leading-tight">
                  {u.name}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  {u.username && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary/12 text-primary font-label">
                      @{u.username}
                    </span>
                  )}
                  <Lock className="h-2.5 w-2.5 text-muted-foreground" />
                  <span className="text-[10px] font-label text-muted-foreground truncate">
                    {u.email}
                  </span>
                </div>
              </div>
              {selected ? (
                <Check className="h-4 w-4 text-primary mr-1" />
              ) : (
                <MoreVertical className="h-4 w-4 text-muted-foreground/60" />
              )}
            </button>
          );
        })}
        {list.length === 0 && !isFetching && (
          <p className="text-xs text-center text-muted-foreground py-8">
            {tab === "businesses"
              ? "No business contacts yet."
              : debounced
                ? `No people found for “${debounced}”.`
                : "No saved contacts. Search by name or username."}
          </p>
        )}
      </div>
    </div>
  );
}
