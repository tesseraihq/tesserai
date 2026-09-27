import { ConfigProvider, theme } from "antd";
import { useState } from "react";
import { lightTheme } from "./theme/antd";
import { Routes } from "./routes";

export default function App() {
  const [dark, setDark] = useState(false);
  return (
    <ConfigProvider theme={{ ...lightTheme, algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm }}>
      <Routes onToggleDark={() => setDark((d) => !d)} />
    </ConfigProvider>
  );
}
