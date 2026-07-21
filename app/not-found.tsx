import Link from "next/link";
import { AMBER, BG1, BG2, BORDER, DIM } from "@/lib/constants";

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: `linear-gradient(180deg, ${BG2}, ${BG1})`,
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 560,
          padding: 24,
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
          background: BG1,
          boxShadow: `0 0 0 1px rgba(245,166,35,0.05), 0 18px 80px rgba(0,0,0,0.45)`,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "5px 10px",
            border: `1px solid ${BORDER}`,
            background: "rgba(245,166,35,0.08)",
            color: AMBER,
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          404
        </div>

        <h1 style={{ margin: "16px 0 10px", fontSize: 28, color: "#fff" }}>Route not found</h1>

        <p style={{ margin: 0, color: DIM, lineHeight: 1.6 }}>
          The page you requested could not be located. Head back to the Synapse core dashboard to
          continue.
        </p>

        <Link
          href="/"
          style={{
            display: "inline-block",
            marginTop: 18,
            padding: "10px 16px",
            background: AMBER,
            color: "#0A0B0D",
            textDecoration: "none",
            fontWeight: 700,
            fontFamily: "'IBM Plex Mono', monospace",
            letterSpacing: "0.08em",
          }}
        >
          Return home
        </Link>
      </section>
    </main>
  );
}
