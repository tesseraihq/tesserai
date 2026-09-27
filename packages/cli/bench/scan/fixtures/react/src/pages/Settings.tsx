import * as React from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";

const styles = { danger: "bg-red-600 text-white" };

export default function Settings() {
  const [v, setV] = React.useState("");
  return (
    <form className="grid gap-4">
      <Input value={v} onChange={(e) => setV(e.target.value)} className="h-12 px-5" />
      <Input size="sm" placeholder="Search" />
      <Button type="submit" className="bg-red-600 hover:bg-red-700 rounded-none">
        Remove
      </Button>
      <Button className="rounded-none" size="lg">Upgrade</Button>
      <Button className="rounded-none mt-2">Invite</Button>
      <Button style={{ borderRadius: 0, marginTop: 8 }}>Export</Button>
      <Badge intent="warning">Beta</Badge>
      <Button className={styles.danger}>Danger</Button>
    </form>
  );
}
