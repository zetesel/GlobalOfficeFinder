interface FlagChipProps {
  code: string;
}

export default function FlagChip({ code }: FlagChipProps) {
  return (
    <span
      className="gof-flagchip"
      aria-label={`Country code ${code}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 30,
        height: 20,
        padding: "0 6px",
        borderRadius: 4,
        background: "var(--ink)",
        color: "#fff",
        fontFamily: "var(--font-head)",
        fontWeight: 700,
        fontSize: 11,
        letterSpacing: "0.04em",
      }}
    >
      {code}
    </span>
  );
}
