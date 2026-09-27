/** @jsxImportSource theme-ui */
import type { HeadFC } from "gatsby"
import { Grid, Heading, Text } from "theme-ui"
import { Layout } from "../components/Layout"
import { RecipeCard } from "../components/RecipeCard"

export default function IndexPage() {
  return (
    <Layout>
      <Heading as="h1" sx={{ variant: "styles.h1", mb: 2 }}>
        From the marsh
      </Heading>
      <Text as="p" variant="muted" sx={{ mb: 5 }}>
        Seasonal cooking from the North Norfolk coast.
      </Text>
      <Grid columns={[1, 2, 3]} gap={4}>
        <RecipeCard title="Samphire with brown butter" minutes={10} summary="Blanch, drain, butter." />
        <RecipeCard title="Sea-buckthorn curd" minutes={40} summary="Sharp, bright, keeps a week." />
        <RecipeCard title="Smoked mackerel pâté" minutes={15} summary="Horseradish is not optional." status="untested" />
      </Grid>
    </Layout>
  )
}

export const Head: HeadFC = () => <title>Saltmarsh Journal</title>
