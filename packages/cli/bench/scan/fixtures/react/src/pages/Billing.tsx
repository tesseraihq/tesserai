import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const doc = `Use <Button variant="link"> for inline actions.`;

export function Billing({ open }: { open: boolean }) {
  return open ? (
    <Alert intent="danger" sx={{ borderRadius: 2, p: 3 }}>
      <AlertTitle className="font-bold tracking-wide">Payment failed</AlertTitle>
      <Button variant="link" intent="danger">Retry</Button>
    </Alert>
  ) : null;
}
