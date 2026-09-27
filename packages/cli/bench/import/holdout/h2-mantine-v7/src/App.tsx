import { Container, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { ColorSchemeToggle } from './components/ColorSchemeToggle';
import { PipelineCard } from './components/PipelineCard';

export function App() {
  return (
    <Container size="lg" py="xl">
      <Stack gap="lg">
        <Group justify="space-between">
          <div>
            <Title order={1}>Pipelines</Title>
            <Text c="dimmed">Ingestion jobs across all workspaces</Text>
          </div>
          <ColorSchemeToggle />
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
          <PipelineCard name="orders-daily" status="healthy" lastRun="4 min ago" />
          <PipelineCard name="clickstream" status="failing" lastRun="1 h ago" />
          <PipelineCard name="crm-sync" status="healthy" lastRun="12 min ago" />
        </SimpleGrid>
      </Stack>
    </Container>
  );
}
