import { ERROR_RED } from "../constants/colors";

export default function ErrorText({ children }) {
  return <p style={{ color: ERROR_RED, fontSize: 14 }}>{children}</p>;
}
