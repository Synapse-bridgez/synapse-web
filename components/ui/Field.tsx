"use client";
import { BG3, BORDER, DIM } from "@/lib/constants";

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}

export function Field({ label, value, onChange, placeholder, type = "text" }: FieldProps) {
  return (
    <div>
      <div
        style={{
          fontSize: 9,
          color: DIM,
          fontFamily: "'IBM Plex Mono', monospace",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          background: BG3,
          border: `1px solid ${BORDER}`,
          color: "#eee",
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 11,
          padding: "7px 10px",
          outline: "none",
          transition: "border-color 0.15s",
        }}
        onFocus={(e) => (e.target.style.borderColor = "rgba(245,166,35,0.45)")}
        onBlur={(e) => (e.target.style.borderColor = BORDER)}
      />
    </div>
  );
}
