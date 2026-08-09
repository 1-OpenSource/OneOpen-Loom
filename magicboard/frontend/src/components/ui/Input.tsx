import { Eye, EyeOff } from "lucide-react";
import type { InputHTMLAttributes } from "react";
import { useId, useState } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Show an eye toggle for password fields. Defaults to true when type is password. */
  revealable?: boolean;
}

export default function Input({
  label,
  id,
  className = "",
  type = "text",
  revealable,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? `${label.toLowerCase().replace(/\s+/g, "-")}-${generatedId}`;
  const canReveal = revealable ?? type === "password";
  const [visible, setVisible] = useState(false);
  const inputType = canReveal && type === "password" ? (visible ? "text" : "password") : type;

  return (
    <label className={`field ${className}`} htmlFor={inputId}>
      <span>{label}</span>
      {canReveal && type === "password" ? (
        <div className="field-input-wrap">
          <input id={inputId} type={inputType} {...props} />
          <button
            type="button"
            className="field-reveal-toggle"
            onClick={() => setVisible((value) => !value)}
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            tabIndex={0}
          >
            {visible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      ) : (
        <input id={inputId} type={inputType} {...props} />
      )}
    </label>
  );
}
