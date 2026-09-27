/** @jsxImportSource theme-ui */
import { Button, Card, Heading, Text } from "theme-ui"

type Props = {
  title: string
  minutes: number
  summary: string
  status?: "tested" | "untested"
}

export function RecipeCard({ title, minutes, summary, status = "tested" }: Props) {
  return (
    <Card>
      <Heading as="h3" sx={{ fontSize: 4, mb: 2 }}>
        {title}
      </Heading>
      <Text as="p" variant="muted" sx={{ mb: 3 }}>
        {minutes} min · {summary}
      </Text>
      <Text as="p" sx={{ fontSize: 1, mb: 3, color: status === "tested" ? "success" : "error" }}>
        {status === "tested" ? "Kitchen-tested" : "Not yet tested"}
      </Text>
      <Button>Open recipe</Button>
    </Card>
  )
}
