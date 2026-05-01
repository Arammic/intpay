import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MockQrCode } from "@/components/MockQrCode";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Copy, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import {
  searchProfiles,
  initialsFromName,
  type ProfileContact,
} from "@/api/profileApi";

export default function SearchAccountPage() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<ProfileContact | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data: list = [], isFetching } = useQuery({
    queryKey: ["profiles.search", debounced],
    enabled: debounced.length > 0,
    queryFn: async () => {
      const r = await searchProfiles(debounced);
      if (!r.isSucess) throw new Error(r.error.join(", "));
      return r.data ?? [];
    },
    placeholderData: (prev) => prev ?? [],
  });

  const showDetail = (u: ProfileContact) => {
    setPicked(u);
    setOpen(true);
  };

  const line = picked?.link ?? "";
  const pickedQrPayload = picked
    ? JSON.stringify({
        id: String(picked.id),
        email: picked.email,
        name: picked.name,
        type: "receive_account",
      })
    : "";

  return (
    <div className="pb-10 -mt-2">
      <PageHeader
        title="Find people"
        subtitle="Search by name or username"
        fallback="/"
      />

      <div className="pt-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search people…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-11 pl-9"
          />
        </div>
        {isFetching && debounced && (
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…
          </p>
        )}
        {!debounced && (
          <p className="text-xs text-muted-foreground">
            Type a name or username to search.
          </p>
        )}
        <ul className="space-y-1">
          {list.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                onClick={() => showDetail(u)}
                className="w-full flex items-center justify-between gap-2 rounded-xl border border-border bg-card p-3 text-left hover:border-primary/50"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 bg-gradient-to-br from-muted to-card text-foreground/80">
                    {initialsFromName(u.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{u.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      @{u.username} · {u.email}
                    </p>
                  </div>
                </div>
                <span className="text-[11px] text-muted-foreground shrink-0">
                  #{u.id}
                </span>
              </button>
            </li>
          ))}
          {debounced && !isFetching && list.length === 0 && (
            <li className="text-xs text-center text-muted-foreground py-8">
              No people found for “{debounced}”.
            </li>
          )}
        </ul>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          {picked && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl flex items-center gap-2">
                  <div className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold bg-gradient-to-br from-muted to-card text-foreground/80">
                    {initialsFromName(picked.name)}
                  </div>
                  {picked.name}
                </DialogTitle>
                <DialogDescription>
                  @{picked.username} · {picked.email}
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col sm:flex-row gap-4 items-center py-2">
                <MockQrCode label={pickedQrPayload} />
                <div className="space-y-2 flex-1 w-full">
                  <p className="text-[11px] text-muted-foreground">Share link</p>
                  <code className="text-[10px] break-all block bg-muted/50 p-2 rounded-md">
                    {line}
                  </code>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(line);
                        toast.success("Copied");
                      } catch {
                        toast.error("Copy failed");
                      }
                    }}
                  >
                    <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy link
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
