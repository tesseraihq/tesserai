import { Badge, Button, Card, Code, Flex, Heading, Text } from "@radix-ui/themes";

type Props = { id: string; site: string; battery: number; status: "online" | "degraded" | "offline" };

const badgeColor = { online: "green", degraded: "amber", offline: "red" } as const;

export function BuoyCard({ id, site, battery, status }: Props) {
  return (
    <Card size="2">
      <Flex direction="column" gap="3">
        <Flex justify="between" align="center">
          <Code variant="ghost">{id}</Code>
          <Badge color={badgeColor[status]}>{status}</Badge>
        </Flex>
        <Heading size="4">{site}</Heading>
        <Text size="2" color="gray">
          Battery {battery}%
        </Text>
        <Flex gap="2" justify="end">
          <Button variant="soft">History</Button>
          <Button>Open</Button>
        </Flex>
      </Flex>
    </Card>
  );
}
