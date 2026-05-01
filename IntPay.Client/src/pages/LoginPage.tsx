import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getProfile,
  type ProfileDto,
  initialsFromName,
} from "@/api/profileApi";
import { setStoredUserId } from "@/lib/currentUserContext";
import { AppLoader } from "@/components/AppLoader";
import { BrandMark } from "@/components/BrandMark";
import { ArrowLeft, ArrowRight, Users } from "lucide-react";

const CANDIDATE_IDS = [1, 2, 3, 4, 5];

export default function LoginPage() {
  const nav = useNavigate();
  const [users, setUsers] = useState<ProfileDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const results = await Promise.all(
        CANDIDATE_IDS.map((id) => getProfile(id)),
      );
      if (!alive) return;
      const ok = results.map((r) => r.data).filter((u): u is ProfileDto => !!u);
      setUsers(ok);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const pick = (id: number) => {
    setStoredUserId(id);
    nav(`/app/user/${id}`, { replace: true });
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <BrandMark />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => nav("/")}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card/70 px-3 py-1 text-[11px] font-label uppercase tracking-wider text-muted-foreground backdrop-blur-sm transition-colors hover:bg-card hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to app
            </button>
            <span className="font-label text-[10px] uppercase tracking-widest text-muted-foreground">
              Demo login
            </span>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card/70 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold leading-tight">
                Choose a profile
              </h1>
              <p className="text-sm text-muted-foreground">
                Pick a demo user to enter the IntPay dashboard.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="py-10">
              <AppLoader label="Loading users" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-sm text-destructive">
              Couldn't load any demo users. Check the backend connection.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {users.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => pick(u.id)}
                    className="group flex w-full items-center gap-3 rounded-2xl border border-border bg-surface/60 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:bg-card"
                  >
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-primary text-primary-foreground font-display font-bold">
                      {initialsFromName(u.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-base font-semibold truncate">
                        {u.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        @{u.username || `user-${u.id}`} · {u.email}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
