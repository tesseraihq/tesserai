/** @jsxImportSource theme-ui */
import type { ReactNode } from "react"
import { Box, Button, Container, Flex, useColorMode } from "theme-ui"

export function Layout({ children }: { children: ReactNode }) {
  const [mode, setMode] = useColorMode()
  return (
    <Box>
      <Flex
        as="header"
        sx={{ px: 4, py: 3, alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid", borderColor: "border" }}
      >
        <span sx={{ fontFamily: "heading", fontSize: 4 }}>Saltmarsh</span>
        <Button variant="ghost" onClick={() => setMode(mode === "light" ? "dark" : "light")}>
          {mode === "light" ? "Dark" : "Light"}
        </Button>
      </Flex>
      <Container as="main" sx={{ px: 4, py: 6 }}>
        {children}
      </Container>
    </Box>
  )
}
