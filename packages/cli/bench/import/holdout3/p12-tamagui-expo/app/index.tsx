import { ScrollView, XStack, YStack } from 'tamagui'
import { Card, Heading, Muted, PrimaryButton, StatusPill } from '../src/components/kit'

const episodes = [
  { title: 'Night shift at the fire lookout', length: '42 min', state: 'new' as const },
  { title: 'The last smokejumper class of 1981', length: '58 min', state: 'downloading' as const },
  { title: 'Controlled burns, explained', length: '31 min', state: 'failed' as const },
]

export default function Home() {
  return (
    <ScrollView bg="$background">
      <YStack p="$4" gap="$3">
        <XStack jc="space-between" ai="center">
          <Heading>Up next</Heading>
          <PrimaryButton>Play all</PrimaryButton>
        </XStack>
        {episodes.map((e) => (
          <Card key={e.title}>
            <Heading size="$5">{e.title}</Heading>
            <Muted>{e.length}</Muted>
            <StatusPill state={e.state} />
          </Card>
        ))}
      </YStack>
    </ScrollView>
  )
}
