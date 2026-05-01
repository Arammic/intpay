import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { MockQrCode } from "@/components/MockQrCode";
import { encodeUserQr } from "@/api/userLookup";
import { ReceiveDialog } from "@/components/ReceiveDialog";
import { UserAvatar } from "@/components/UserAvatar";
import { toast } from "sonner";
import {
  ChevronRight,
  Copy,
  Lock,
  Mail,
  Share2,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet as WalletIcon,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AppLoader } from "@/components/AppLoader";
import {
  useCurrentUserContext,
  profileInitials,
} from "@/lib/currentUserContext";
import { initialsFromName, type ProfileContact } from "@/api/profileApi";
import { UserActivity } from "@/components/UserActivity";

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2.5 flex items-center gap-1.5 font-display text-base font-bold">
        {Icon && <Icon className="h-4 w-4 text-primary" />}
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function ProfileApiPage() {
  const [contactsOpen, setContactsOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [contactQrOpen, setContactQrOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ProfileContact | null>(null);

  const { userId, profile, isLoading, error } = useCurrentUserContext();

  if (isLoading && !profile) {
    return (
      <div className="mx-auto w-full max-w-xl pb-10 -mt-2">
        <PageHeader title="Profile" subtitle="Points & activity" fallback="/" />
        <div className="pt-10">
          <AppLoader size="md" label="Loading profile" />
        </div>
      </div>
    );
  }

  const name = profile?.name ?? "Unknown user";
  const email = profile?.email ?? "—";
  const username = profile?.username ?? "";
  const points = profile?.points ?? 0;
  const vault = profile?.vaultBalance ?? 0;
  const lockMoney = profile?.lockMoney ?? 0;
  const shareLink = profile?.link ?? "";
  const allContacts: ProfileContact[] = profile?.contacts ?? [];
  const savedContacts = allContacts;

  const profileAvatar = {
    name,
    initials: profileInitials(name),
    avatarColor: "purple" as const,
  };

  const copyLine = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      toast.success("Link copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  const openContactQr = (contact: ProfileContact) => {
    setSelectedContact(contact);
    setContactQrOpen(true);
  };

  return (
    <div className="mx-auto w-full max-w-xl pb-10 -mt-2">
      <PageHeader title="Profile" subtitle="Points & activity" fallback="/" />

      <div className="pt-4 space-y-5">
        {error.length > 0 && (
          <section className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 space-y-1">
            <p className="text-sm font-medium text-destructive">
              Failed to load profile
            </p>
            {error.map((m) => (
              <p key={m} className="text-xs text-muted-foreground">
                {m}
              </p>
            ))}
          </section>
        )}

        {/* Identity */}
        <section className="flex flex-col items-center text-center gap-3 pt-2">
          <div className="relative">
            <UserAvatar
              user={profileAvatar}
              size="lg"
              className="h-20 w-20 text-xl ring-2 ring-primary/20"
            />
            <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-secondary text-secondary-foreground ring-2 ring-background">
              <ShieldCheck className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <p className="font-display text-xl font-bold leading-tight">
              {name}
            </p>
            {username && (
              <p className="text-sm text-muted-foreground">@{username}</p>
            )}
            <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {email}
            </p>
            <p className="text-[11px] text-muted-foreground">ID: {userId}</p>
          </div>
        </section>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/15">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <p className="font-label text-[10px] uppercase text-muted-foreground">
                Points
              </p>
            </div>
            <p className="mt-2 font-display text-2xl font-bold tabular-nums">
              {points}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-tertiary/15">
                <WalletIcon className="h-4 w-4 text-tertiary" />
              </div>
              <p className="font-label text-[10px] uppercase text-muted-foreground">
                Free
              </p>
            </div>
            <p className="mt-2 font-display text-xl font-bold tabular-nums">
              ${vault.toFixed(0)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-secondary/15">
                <Lock className="h-4 w-4 text-secondary" />
              </div>
              <p className="font-label text-[10px] uppercase text-muted-foreground">
                Locked
              </p>
            </div>
            <p className="mt-2 font-display text-xl font-bold tabular-nums">
              ${lockMoney.toFixed(0)}
            </p>
          </div>
        </div>

        <Button variant="outline" className="w-full font-label" asChild>
          <Link to="/features">Go to Point Catalog</Link>
        </Button>

        {/* Saved Contacts */}
        <Section title="Saved Contacts" icon={Users}>
          <button
            type="button"
            onClick={() => setContactsOpen(true)}
            className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left shadow-sm transition-base hover:bg-card/80 active:scale-[0.99]"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-base font-semibold">
                {savedContacts.length} saved{" "}
                {savedContacts.length === 1 ? "person" : "people"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Open your saved contacts list
              </p>
            </div>
            {savedContacts.length > 0 && (
              <div className="hidden -space-x-2 sm:flex">
                {savedContacts.slice(0, 3).map((c) => (
                  <UserAvatar
                    key={c.id}
                    user={{
                      name: c.name,
                      initials: initialsFromName(c.name),
                      avatarColor: "purple",
                    }}
                    size="sm"
                    className="ring-2 ring-card"
                  />
                ))}
              </div>
            )}
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        </Section>

        <Section title="Share Account" icon={Share2}>
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <button
                type="button"
                onClick={() => setReceiveOpen(true)}
                aria-label="Open my QR code"
                className="rounded-lg ring-offset-background transition-base hover:opacity-90 hover:ring-2 hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <MockQrCode label={encodeUserQr(userId)} />
              </button>
              <div className="w-full flex-1 space-y-2">
                <p className="font-label text-[10px] uppercase text-muted-foreground">
                  Share link
                </p>
                <code className="block break-all rounded-md bg-muted/50 p-2 text-[11px]">
                  {shareLink || "-"}
                </code>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={copyLine}
                    className="font-label"
                  >
                    <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy link
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setReceiveOpen(true)}
                    className="bg-gradient-primary text-primary-foreground font-label"
                  >
                    Show my QR
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Section>
        <UserActivity userId={userId} title="Latest Activity" />
      </div>

      <Sheet open={contactsOpen} onOpenChange={setContactsOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[85vh] overflow-y-auto rounded-t-3xl"
        >
          <div className="mx-auto w-full max-w-xl">
            <SheetHeader className="mb-4 text-left">
              <SheetTitle className="flex items-center gap-2 font-display text-lg">
                <Users className="h-4 w-4 text-primary" />
                Saved Contacts
              </SheetTitle>
              <SheetDescription>
                {savedContacts.length === 0
                  ? "You haven't saved anyone yet."
                  : `${savedContacts.length} ${savedContacts.length === 1 ? "person" : "people"} ready for quick access.`}
              </SheetDescription>
            </SheetHeader>

            {savedContacts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No saved accounts yet.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {savedContacts.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => openContactQr(c)}
                      className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left shadow-sm transition-base hover:bg-card/80"
                    >
                      <UserAvatar
                        user={{
                          name: c.name,
                          initials: initialsFromName(c.name),
                          avatarColor: "purple",
                        }}
                        size="md"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold leading-tight">
                          {c.name}{" "}
                          {c.username && (
                            <span className="font-normal text-muted-foreground">
                              @{c.username}
                            </span>
                          )}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {c.email}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <Button variant="outline" className="mt-4 w-full font-label" asChild>
              <Link to="/search" onClick={() => setContactsOpen(false)}>
                Find more people
              </Link>
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <ReceiveDialog
        open={receiveOpen}
        onOpenChange={setReceiveOpen}
        account={{
          id: String(userId),
          name,
          email,
          initials: profileInitials(name),
        }}
      />
      {selectedContact && (
        <ReceiveDialog
          open={contactQrOpen}
          onOpenChange={setContactQrOpen}
          account={{
            id: String(selectedContact.id),
            name: selectedContact.name,
            email: selectedContact.email,
            initials: initialsFromName(selectedContact.name),
          }}
        />
      )}
    </div>
  );
}
