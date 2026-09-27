import { ActionIcon, AppShell, Badge, Button, Card, Group, Header, SimpleGrid, Text, Title, useMantineColorScheme } from '@mantine/core';
import { IconMoonStars, IconSun } from '@tabler/icons-react';

const counts = [
  { venue: 'Riverside Hall', checkedIn: 412, capacity: 450 },
  { venue: 'Annex B', checkedIn: 96, capacity: 180 },
  { venue: 'Rooftop', checkedIn: 60, capacity: 60 },
];

export function Shell() {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  return (
    <AppShell
      padding="md"
      header={
        <Header height={56} px="md">
          <Group position="apart" h="100%">
            <Title order={4}>Tallyho</Title>
            <ActionIcon variant="default" onClick={() => toggleColorScheme()} size={32}>
              {colorScheme === 'dark' ? <IconSun size="1rem" /> : <IconMoonStars size="1rem" />}
            </ActionIcon>
          </Group>
        </Header>
      }
    >
      <Group position="apart" mb="lg">
        <div>
          <Title order={2}>Check-ins</Title>
          <Text c="dimmed" size="sm">Live from the door scanners</Text>
        </div>
        <Button>Open new venue</Button>
      </Group>
      <SimpleGrid cols={3} breakpoints={[{ maxWidth: 'sm', cols: 1 }]}>
        {counts.map((c) => (
          <Card key={c.venue}>
            <Text fw={500}>{c.venue}</Text>
            <Text c="dimmed" size="sm">{c.checkedIn} / {c.capacity}</Text>
            <Badge mt="sm" color={c.checkedIn >= c.capacity ? 'red' : 'pine'} variant="light">
              {c.checkedIn >= c.capacity ? 'Full' : 'Open'}
            </Badge>
          </Card>
        ))}
      </SimpleGrid>
    </AppShell>
  );
}
