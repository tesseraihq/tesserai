import { Button, Card, Container, Heading, HStack, SimpleGrid, Text } from "@chakra-ui/react";
import { ColorModeButton } from "@/components/ui/color-mode";

const patterns = [
  { name: "Herringbone runner", shafts: 4, orders: 18 },
  { name: "Overshot coverlet", shafts: 4, orders: 7 },
  { name: "Summer & winter", shafts: 6, orders: 3 },
];

export default function Home() {
  return (
    <Container maxW="5xl" py="10">
      <HStack justify="space-between" mb="8">
        <Heading size="2xl">Patterns</Heading>
        <HStack>
          <ColorModeButton />
          <Button>New pattern</Button>
        </HStack>
      </HStack>
      <SimpleGrid columns={{ base: 1, md: 3 }} gap="4">
        {patterns.map((p) => (
          <Card.Root key={p.name} variant="outline">
            <Card.Body gap="1">
              <Card.Title>{p.name}</Card.Title>
              <Text color="fg.muted" textStyle="sm">
                {p.shafts} shafts · {p.orders} open orders
              </Text>
            </Card.Body>
            <Card.Footer justifyContent="flex-end">
              <Button variant="outline" size="sm">Preview</Button>
              <Button size="sm">Open</Button>
            </Card.Footer>
          </Card.Root>
        ))}
      </SimpleGrid>
    </Container>
  );
}
