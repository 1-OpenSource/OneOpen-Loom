import { useEffect, useId, useMemo, useRef, useState } from "react";

export interface SearchableOption {
  label: string;
  value: string;
}

interface SearchableSelectProps {
  label?: string;
  options: SearchableOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
}

export default function SearchableSelect({
  label,
  options,
  value,
  onChange,
  placeholder = "Search…",
  emptyLabel = "No matches",
  disabled = false
}: SearchableSelectProps) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = useMemo(() => options.find((option) => option.value === value) ?? null, [options, value]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return options;
    }
    return options.filter((option) => option.label.toLowerCase().includes(needle));
  }, [options, query]);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
    }
  }, [isOpen]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const labelId = `${id}-label`;
  const accessibleName = label?.trim() || placeholder;

  return (
    <div
      className={`field searchable-select ${isOpen ? "is-open" : ""} ${label?.trim() ? "" : "searchable-select-nolabel"}`.trim()}
      ref={rootRef}
    >
      {label?.trim() ? <span id={labelId}>{label}</span> : null}
      <div className="searchable-select-control">
        <input
          id={id}
          type="search"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={`${id}-listbox`}
          aria-labelledby={label?.trim() ? labelId : undefined}
          aria-label={label?.trim() ? undefined : accessibleName}
          aria-autocomplete="list"
          disabled={disabled}
          placeholder={selected && !isOpen ? selected.label : placeholder}
          value={isOpen ? query : selected?.label ?? ""}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            setQuery("");
          }}
        />
        {value ? (
          <button
            type="button"
            className="searchable-select-clear"
            aria-label={`Clear ${accessibleName}`}
            disabled={disabled}
            onClick={() => {
              onChange("");
              setQuery("");
              setIsOpen(false);
            }}
          >
            Clear
          </button>
        ) : null}
      </div>

      {isOpen ? (
        <div className="searchable-select-menu" id={`${id}-listbox`} role="listbox">
          {filtered.length === 0 ? <div className="searchable-select-empty">{emptyLabel}</div> : null}
          {filtered.map((option) => (
            <button
              key={option.value || "__empty"}
              type="button"
              role="option"
              className={`searchable-select-option ${option.value === value ? "is-selected" : ""}`}
              aria-selected={option.value === value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
                setQuery("");
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
