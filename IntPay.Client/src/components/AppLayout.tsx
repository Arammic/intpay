import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AppProvider, useApp } from "@/lib/store";
import { BottomNav } from "@/components/BottomNav";
import { MoreSheet } from "@/components/MoreSheet";
import { TopUpDialog } from "@/components/TopUpDialog";
import { HelpersDock } from "@/components/HelpersDock";

function UrlUserSessionSync() {
  const location = useLocation();
  const { state, currentUser, switchUser } = useApp();

  useEffect(() => {
    const match = location.pathname.match(/^\/app\/user\/([^/]+)/);
    if (!match) return;
    const rawUserId = decodeURIComponent(match[1]);
    const aliasMap: Record<string, string> = {
      "1": "1",
      "2": "usr_sara",
      "3": "usr_jordan",
      "4": "usr_mira",
      "5": "usr_nico",
    };
    const resolvedUserId = aliasMap[rawUserId] ?? rawUserId;
    if (resolvedUserId === currentUser.id) return;
    if (!state.users.some((u) => u.id === resolvedUserId)) return;
    switchUser(resolvedUserId);
  }, [location.pathname, currentUser.id, state.users, switchUser]);

  return null;
}

function AppShell() {
  const [moreOpen, setMoreOpen] = useState(false);
  const [topUp, setTopUp] = useState(false);

  return (
    <>
      <UrlUserSessionSync />
      <main className="min-h-screen pb-24">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <Outlet />
        </div>
      </main>

      <HelpersDock />
      <BottomNav onMoreClick={() => setMoreOpen(true)} />

      <MoreSheet
        open={moreOpen}
        onOpenChange={setMoreOpen}
        onTopUp={() => setTopUp(true)}
      />
      <TopUpDialog open={topUp} onOpenChange={setTopUp} />
    </>
  );
}

export default function AppLayout() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
