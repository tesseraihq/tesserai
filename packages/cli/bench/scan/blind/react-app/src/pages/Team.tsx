import { useState, type ChangeEvent, type ReactNode } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input as TextField } from "@/components/ui/input";
import { twMerge } from "tailwind-merge";
import clsx from "clsx";
import type { Member } from "@/types";

const initials = (name: string) => name.split(" ").map((p) => p[0]).join("");

// Not the design system's button: a row that lays buttons out.
function ButtonRow({ children }: { children: ReactNode }) {
  return <div className="flex gap-2">{children}</div>;
}

export default function Team({ members, canInvite }: { members: Member[]; canInvite: boolean }) {
  const [query, setQuery] = useState("");
  const [email, setEmail] = useState<string>("");
  const pick = <T,>(xs: T[], n: number): T[] => xs.slice(0, n);
  const shown = pick(members.filter((m) => m.name.toLowerCase().includes(query)), 50);

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader className="gap-4 space-y-0">
        <CardTitle className="uppercase tracking-wide text-xs">Team</CardTitle>
        <TextField
          value={query}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
          placeholder="Search people…"
          size="sm"
          className="ml-auto w-64"
        />
      </CardHeader>
      <CardContent className="divide-y p-0">
        {shown.map((m) => (
          <div key={m.id} className="flex items-center gap-3 px-6 py-3">
            <Avatar size={m.role === "owner" ? "lg" : "md"} className="rounded-lg">
              <AvatarImage src={m.avatarUrl} alt="" />
              <AvatarFallback className="bg-[#ff0000] text-white">{initials(m.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{m.name}</p>
              <p className="text-muted-foreground text-sm">{m.email}</p>
            </div>
            {m.role !== "member" ? (
              <Badge variant="outline" className="capitalize">{m.role}</Badge>
            ) : null}
            <ButtonRow>
              <Button
                variant="ghost"
                size="sm"
                className={twMerge(
                  "text-muted-foreground",
                  m.role === "owner" && "cursor-not-allowed opacity-40",
                )}
              >
                Edit
              </Button>
              <Button variant="ghost" size="sm" intent="danger" disabled={m.role === "owner"} className="text-muted-foreground">
                Remove
              </Button>
            </ButtonRow>
          </div>
        ))}
      </CardContent>
      {canInvite && (
        <form
          className="flex gap-2 border-t p-6"
          onSubmit={(e) => {
            e.preventDefault();
            setEmail("");
          }}
        >
          <TextField type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={clsx("h-10", { "border-destructive": email.length > 0 && !email.includes("@") })} />
          <Button type="submit" className="h-10 w-full rounded-none!">Invite</Button>
        </form>
      )}
    </Card>
  );
}
