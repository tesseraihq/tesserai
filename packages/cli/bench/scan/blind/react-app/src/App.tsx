import { lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Dashboard } from "@/pages/Dashboard";
import { Billing } from "@/pages/Billing";
import { Settings } from "@/pages/Settings";

const Landing = lazy(() => import("@/pages/Landing"));
const Team = lazy(() => import("@/pages/Team"));

export function App({ route }: { route: string }) {
  return (
    <Suspense
      fallback={<Button variant="ghost" disabled className="opacity-100 cursor-wait">Loading…</Button>}
    >
      {route === "/" ? (
        <Landing />
      ) : route === "/team" ? (
        <Team members={[]} canInvite />
      ) : route === "/billing" ? (
        <Billing invoices={[]} onCancel={async () => {}} />
      ) : route === "/settings" ? (
        <Settings saved={false} />
      ) : (
        <Dashboard invoices={[]} seats={3} />
      )}
    </Suspense>
  );
}
