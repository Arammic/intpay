import { useNavigate } from "react-router-dom";
import { Send, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/UserAvatar";
import type { ScannedUserData } from "@/api/userLookup";

interface Props {
  user: ScannedUserData | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function ScannedUserDialog({ user, open, onOpenChange }: Props) {
  const nav = useNavigate();
  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Account found</DialogTitle>
          <DialogDescription>Scanned via QR · IntPay</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <div className="relative">
            <UserAvatar user={user} size="lg" className="h-20 w-20 text-xl ring-2 ring-primary/20" />
            <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-secondary text-secondary-foreground ring-2 ring-background">
              <ShieldCheck className="h-3.5 w-3.5" />
            </span>
          </div>
          <div>
            <p className="font-display text-lg font-bold leading-tight">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <p className="text-xs text-muted-foreground">{user.handle}</p>
          </div>

        </div>

        <DialogFooter className="mt-4 flex-row justify-center gap-3">
          <Button
            className="w-full sm:flex-1 sm:max-w-[240px] bg-gradient-primary text-primary-foreground font-label"
            onClick={() => {
              onOpenChange(false);
              nav(
                `/intent/new?q=${encodeURIComponent(user.name)}&to=${encodeURIComponent(user.id)}`,
              );
            }}
          >
            <Send className="mr-1.5 h-4 w-4" /> Send money
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
