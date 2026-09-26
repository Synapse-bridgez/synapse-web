"use client";
import { BG3, BORDER, DIM, MONO } from "@/lib/constants";

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  error?: string;
  disabled?: boolean;
}

export function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  error,
  disabled = false,
}: FieldProps) {
  const borderColor = error ? "rgba(255,90,90,0.65)" : BORDER;
  return (
    <div>
      <div
        style={{
          fontSize: 9,
          color: DIM,
          fontFamily: MONO,
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
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        style={{
          width: "100%",
          background: BG3,
          border: `1px solid ${borderColor}`,
          color: "#eee",
          fontFamily: MONO,
          fontSize: 11,
          padding: "7px 10px",
          outline: "none",
          transition: "border-color 0.15s",
          opacity: disabled ? 0.6 : 1,
        }}
        onFocus={(e) =>
          (e.target.style.borderColor = error
            ? "rgba(255,90,90,0.85)"
            : "rgba(245,166,35,0.45)")
        }
        onBlur={(e) => (e.target.style.borderColor = borderColor)}
      />
      {error && (
        <div
          role="alert"
          style={{
            fontSize: 9,
            color: "#ff5a5a",
            fontFamily: MONO,
            marginTop: 4,
            lineHeight: 1.4,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
