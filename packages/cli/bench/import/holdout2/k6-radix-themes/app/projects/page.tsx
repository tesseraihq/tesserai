import { Box, Container, Flex, Heading, Text } from "@radix-ui/themes";
import { BuoyCard } from "@/components/BuoyCard";

const buoys = [
  { id: "TP-014", site: "Monterey Bay", battery: 82, status: "online" as const },
  { id: "TP-022", site: "Point Reyes", battery: 19, status: "degraded" as const },
  { id: "TP-031", site: "Half Moon Bay", battery: 0, status: "offline" as const },
];

export default function ProjectsPage() {
  return (
    <Container size="3" px="5" py="7">
      <Flex direction="column" gap="1" mb="6">
        <Heading size="7">Buoys</Heading>
        <Text size="2" color="gray">
          3 deployed · last sync 2 min ago
        </Text>
      </Flex>
      <Box style={{ display: "grid", gap: "var(--space-4)", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
        {buoys.map((b) => (
          <BuoyCard key={b.id} {...b} />
        ))}
      </Box>
    </Container>
  );
}
