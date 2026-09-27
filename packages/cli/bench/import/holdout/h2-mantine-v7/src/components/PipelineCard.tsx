import { Alert, Badge, Button, Card, Code, Group, Text } from '@mantine/core';

type Props = { name: string; status: 'healthy' | 'failing'; lastRun: string };

export function PipelineCard({ name, status, lastRun }: Props) {
  return (
    <Card>
      <Group justify="space-between" mb="xs">
        <Code>{name}</Code>
        <Badge variant="light" color={status === 'healthy' ? 'ocean' : 'red'}>
          {status}
        </Badge>
      </Group>
      <Text size="sm" c="dimmed">
        Last run {lastRun}
      </Text>
      {status === 'failing' && (
        <Alert color="red" variant="light" mt="md" title="Schema drift">
          Column <Code>user_agent</Code> changed type upstream.
        </Alert>
      )}
      <Group mt="md" gap="xs">
        <Button>Run now</Button>
        <Button variant="default">Logs</Button>
      </Group>
    </Card>
  );
}
