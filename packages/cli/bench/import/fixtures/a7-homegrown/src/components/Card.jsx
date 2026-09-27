import { HAIRLINE } from "../constants/colors";

export default function Card({ children }) {
  return <div style={{ background: "#fff", border: `1px solid ${HAIRLINE}`, borderRadius: 14, padding: 20 }}>{children}</div>;
}
