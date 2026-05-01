import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useApp } from "@/lib/store";
import { clearStoredUserId } from "@/lib/currentUserContext";
import { BrandMark } from "./BrandMark";
import { useNavigate } from "react-router-dom";
import {
  RotateCcw,
  ShieldCheck,
  ArrowDownLeft,
  LogOut,
  Users,
  Bell,
  HelpCircle,
  UserCircle,
  Search,
  Sparkles,
  ArrowUpRight,
  Gift,
  Globe,
} from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onTopUp: () => void;
}

export function MoreSheet({ open, onOpenChange, onTopUp }: Props) {
  const nav = useNavigate();
  const { resetAll } = useApp();

  const action = (
    icon: React.ReactNode,
    label: string,
    onClick?: () => void,
    sub?: string,
  ) => (
    <button
      type="button"
      onClick={() => {
        onClick?.();
        onOpenChange(false);
      }}
      className="w-full flex items-center gap-3 rounded-xl border border-border bg-surface/60 p-4 text-left hover:border-primary/50 transition-base"
    >
      <span className="h-10 w-10 rounded-lg bg-card grid place-items-center text-primary">
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <p className="font-medium text-sm">{label}</p>
        {sub && (
          <p className="text-[11px] text-muted-foreground truncate">{sub}</p>
        )}
      </span>
    </button>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-border bg-card max-h-[85vh] overflow-auto"
      >
        <div className="mx-auto w-full max-w-2xl">
          <SheetHeader className="text-left">
            <div className="flex items-center gap-3 mb-1">
              <BrandMark compact />
              <div>
                <SheetTitle className="font-display text-xl">
                  More options
                </SheetTitle>
                <SheetDescription>
                  Quick actions, profiles, and settings.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="space-y-3 mt-4">
            {action(
              <UserCircle className="h-5 w-5" />,
              "Profile",
              () => nav("/profile"),
              "Data, contact, activity",
            )}
            {action(
              <Sparkles className="h-5 w-5" />,
              "Ask IntPay",
              () => nav("/coach"),
              "Search your data + AI assistant",
            )}
            {action(
              <Search className="h-5 w-5" />,
              "Find people",
              () => nav("/search"),
              "Search accounts by name or @handle",
            )}

            {action(
              <ShieldCheck className="h-5 w-5" />,
              "Lock Money",
              () => nav("/intent/new"),
              "Send or lock money for your own intent",
            )}

            {action(
              <Gift className="h-5 w-5" />,
              "Point Catalog",
              () => nav("/features"),
              "See + rewards and - warnings",
            )}
            {/* {action(
            <ArrowDownLeft className="h-5 w-5" />,
            "Top up wallet",
            onTopUp,
            "Charge cash from a bank or card",
          )} */}
            {/* {action(
            <ArrowUpRight className="h-5 w-5" />,
            "Cash out",
            () => nav("/wallet"),
            "Return funds to your bank/paypal/card",
          )} */}
            {action(
              <Globe className="h-5 w-5" />,
              "Official website",
              () => nav("/"),
              "Go to the IntPay landing page",
            )}
            {action(
              <LogOut className="h-5 w-5" />,
              "Log out",
              () => {
                clearStoredUserId();
                nav("/login");
              },
              "Switch user",
            )}
            {/* {action(
            <Users className="h-5 w-5" />,
            "Users",
            () => nav("/users"),
            "Open users split page",
          )} */}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
