import { BRAND_ORANGE, BRAND_ORANGE_DARK } from "../constants/colors";

export default function Button({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{ background: BRAND_ORANGE, color: "#fff", border: "none", borderRadius: 999, padding: "10px 18px", fontWeight: 500 }}
      onMouseOver={(e) => (e.currentTarget.style.background = BRAND_ORANGE_DARK)}
    >
      {children}
    </button>
  );
}
