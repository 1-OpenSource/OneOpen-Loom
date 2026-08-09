import type { SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: Array<{ label: string; value: string }>;
}

export default function Select({ label, options, id, className = "", ...props }: SelectProps) {
  const select = (
    <select id={id ?? label?.toLowerCase().replace(/\s+/g, "-")} {...props}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );

  if (!label) {
    return select;
  }

  return (
    <label className={`field ${className}`} htmlFor={id ?? label.toLowerCase().replace(/\s+/g, "-")}>
      <span>{label}</span>
      {select}
    </label>
  );
}
