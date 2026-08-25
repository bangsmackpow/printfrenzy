"use client";

import { useEffect, useRef } from "react";

type AutoGrowTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export function AutoGrowTextarea({ className, value, ...props }: AutoGrowTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Reset then measure so the box shrinks when text is removed and grows to fit all text.
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      className={`resize-none overflow-hidden break-words ${className ?? ""}`}
      {...props}
    />
  );
}