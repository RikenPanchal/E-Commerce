"use client";

import { useState, type SVGProps } from "react";

interface FormFieldProps {
  id: string;
  label: string;
  type: "text" | "email" | "password";
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoComplete?: string;
  placeholder?: string;
}

function EyeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...props}>
      <path
        d="M2.25 12s3.75-7 9.75-7 9.75 7 9.75 7-3.75 7-9.75 7-9.75-7-9.75-7Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EyeOffIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...props}>
      <path
        d="M3 3l18 18M10.58 10.58a3 3 0 0 0 4.24 4.24M6.53 6.65C4.3 8.2 2.25 12 2.25 12s3.75 7 9.75 7c1.97 0 3.66-.75 5.03-1.72M9.88 4.55A10.7 10.7 0 0 1 12 4.25c6 0 9.75 7.75 9.75 7.75a17.5 17.5 0 0 1-2.34 3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FormField({
  id,
  label,
  type,
  value,
  onChange,
  error,
  autoComplete,
  placeholder,
}: FormFieldProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const isPasswordField = type === "password";
  const inputType = isPasswordField && isRevealed ? "text" : type;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={inputType}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`w-full rounded-md border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-rose-400 aria-[invalid=true]:border-red-500 ${
            isPasswordField ? "pr-10" : ""
          }`}
        />
        {isPasswordField ? (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setIsRevealed((previous) => !previous)}
            aria-label={isRevealed ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-foreground/40 transition-colors hover:text-foreground"
          >
            {isRevealed ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
          </button>
        ) : null}
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-sm text-red-500">
          {error}
        </p>
      ) : null}
    </div>
  );
}
