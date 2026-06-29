interface MonogramProps {
  name: string;
  size?: number;
  square?: boolean;
}

export default function Monogram({ name, size = 44, square }: MonogramProps) {
  const words = name.split(/[\s\-/&]+/).filter(Boolean);
  let initials = "";
  if (words.length > 0) {
    initials =
      words.length === 1
        ? words[0].slice(0, 2)
        : (words[0][0] || "") + (words[1][0] || "");
  }
  initials = initials.toUpperCase();

  let hueSum = 0;
  for (let i = 0; i < name.length; i++) {
    hueSum += name.charCodeAt(i);
  }
  const hue = hueSum % 360;

  const bg = `hsl(${hue} 62% 95%)`;
  const fg = `hsl(${hue} 55% 38%)`;
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        flex: "0 0 auto",
        borderRadius: square ? Math.round(size * 0.26) : "50%",
        background: bg,
        color: fg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-head)",
        fontWeight: 700,
        fontSize: size * 0.36,
        letterSpacing: "-0.02em",
        border: "1px solid rgba(0,0,0,0.04)",
      }}
    >
      {initials}
    </div>
  );
}
