"use client";

interface ActionButtonProps {
  label: string;
  color: string;
  onClick: () => void;
  fullWidth?: boolean;
}

export function ActionButton({ label, color, onClick, fullWidth }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: fullWidth ? undefined : 1,
        width: fullWidth ? "100%" : undefined,
        padding: "9px 12px",
        background: "transparent",
        border: `1px solid ${color}55`,
        color,
        cursor: "pointer",
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.06em",
        transition: "all 0.15s",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.background = color + "22";
        (e.currentTarget as HTMLButtonElement).style.borderColor = color + "99";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
        (e.currentTarget as HTMLButtonElement).style.borderColor = color + "55";
      }}
    >
      {label}
    </button>
  );
}
