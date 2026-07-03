import { useEffect, useId, useRef, useState } from "react";

export interface DropdownOption {
  value: string;
  label: string;
  count?: number;
}

interface DropdownProps {
  label: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  width?: number | string;
}

export default function Dropdown({
  label,
  value,
  options,
  onChange,
  width,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const listboxId = useId();
  const cur = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const style = {
    "--dd-width": typeof width === "number" ? `${width}px` : width,
  } as React.CSSProperties;

  return (
    <div className="gof-dd" ref={ref} style={style}>
      <button
        type="button"
        className={"gof-pill" + (value ? " is-active" : "")}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{cur ? cur.label : label}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          className="gof-dd-chevron"
          aria-hidden="true"
        >
          <path
            d="M3 4.5L6 7.5L9 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      </button>
      {open && (
        <div
          className="gof-dd-menu"
          role="listbox"
          id={listboxId}
          aria-label={label}
        >
          {options.map((o) => (
            <button
              key={o.value || "__all__"}
              type="button"
              role="option"
              aria-selected={o.value === value}
              className={
                "gof-dd-item" + (o.value === value ? " is-active" : "")
              }
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
            >
              <span>{o.label}</span>
              {o.count != null && (
                <span className="gof-dd-count">{o.count}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
