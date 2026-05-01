import { PageHeader } from "@/components/PageHeader";
import { useApp } from "@/lib/store";
import { UserAvatar } from "@/components/UserAvatar";
import { trustScorePercent } from "@/lib/trustScore";
import { Button } from "@/components/ui/button";

export default function UsersPage() {
  const { state, currentUser, switchUser } = useApp();

  return (
    <div className="pb-10 -mt-2">
      <PageHeader
        title="Users"
        subtitle="Split page for all mock users"
        fallback="/"
      />

      <div className="pt-4 space-y-2">
        {state.users.map((u) => {
          const trust = trustScorePercent(u.points, u.activityCount);
          return (
            <div
              key={u.id}
              className="rounded-xl border border-border bg-card p-3 flex items-center gap-3"
            >
              <UserAvatar user={u} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {u.name}{" "}
                  <span className="text-muted-foreground">{u.username}</span>
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {u.email}
                </p>
                <p className="text-[11px] mt-0.5">
                  <span className="text-primary font-label">
                    Trust {trust}%
                  </span>
                </p>
              </div>
              <Button
                size="sm"
                variant={u.id === currentUser.id ? "secondary" : "outline"}
                onClick={() => switchUser(u.id)}
                className="font-label"
              >
                {u.id === currentUser.id ? "Active" : "Switch"}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
