import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge as StatusPill } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import styles from "./Billing.module.css";
import type { Invoice } from "@/types";

const tone = { paid: "success", open: "warning", void: "neutral" } as const;
const copy = "Click <Button intent=\"danger\">Cancel plan</Button> to stop billing.";

/**
 * Billing page.
 * @example
 *   <Billing invoices={[]} onCancel={() => {}} />
 *   // renders <Button intent="danger" className="rounded-none"> in the footer
 */
export function Billing({ invoices, onCancel }: { invoices: Invoice[]; onCancel: () => Promise<void> }) {
  const [confirming, setConfirming] = useState(false);
  const [sort, setSort] = useState<keyof Invoice>("id");
  const rows = [...invoices].sort((a, b) => (a[sort] < b[sort] ? -1 : 1));
  const pastDue = rows.some((r) => r.status === "open");

  return (
    <section className="space-y-6" title={copy}>
      {pastDue && (
        <Alert intent="warning" variant="soft" className="rounded-[6px] border-l-4 border-amber-500">
          <AlertTitle>Payment past due</AlertTitle>
          <AlertDescription className="text-[13px] leading-5">
            Update your card to keep your plan.
          </AlertDescription>
        </Alert>
      )}
      <table className={styles.table}>
        <tbody>
          {rows.map((inv) => (
            <tr key={inv.id}>
              <td>{inv.id}</td>
              <td>
                <StatusPill intent={tone[inv.status]} className={styles.pill}>
                  {inv.status}
                </StatusPill>
              </td>
              <td className="text-right">
                <Button variant="link" size="sm" onClick={() => setSort("amount")} className="h-auto p-0 text-[#1a1a1a]">
                  ${(inv.amount / 100).toFixed(2)}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            intent="danger"
            onClick={() => {
              if (rows.length > 0) setConfirming(true);
            }}
            className={cn("w-full sm:w-auto", {
              "border-2": pastDue,
            })}
          >
            Cancel plan
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Cancel your plan?</DialogTitle>
          </DialogHeader>
          <DialogFooter className="bg-muted/50 px-6 py-4">
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Keep plan
            </Button>
            <Button
              intent="danger"
              onClick={async () => {
                await onCancel();
                setConfirming(false);
              }}
            >
              Yes, cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
