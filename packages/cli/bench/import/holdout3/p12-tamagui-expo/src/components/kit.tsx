import { Button, H2, Paragraph, styled, Text, YStack } from 'tamagui'

export const Card = styled(YStack, {
  backgroundColor: '$backgroundStrong',
  borderColor: '$borderColor',
  borderWidth: 1,
  borderRadius: '$true',
  padding: '$4',
  gap: '$2',
})

export const Heading = styled(H2, {
  fontFamily: '$heading',
  color: '$color',
})

export const Muted = styled(Paragraph, {
  color: '$colorMuted',
  size: '$3',
})

export const PrimaryButton = styled(Button, {
  backgroundColor: '$accentBackground',
  color: '$accentColor',
  borderRadius: '$true',
  pressStyle: { opacity: 0.85 },
})

const pillColor = { new: '$success', downloading: '$warning', failed: '$danger' } as const

export function StatusPill({ state }: { state: keyof typeof pillColor }) {
  return (
    <Text color={pillColor[state]} fontSize="$2" fontWeight="600" textTransform="uppercase">
      {state}
    </Text>
  )
}
