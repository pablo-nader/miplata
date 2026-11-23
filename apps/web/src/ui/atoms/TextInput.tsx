import type { InputHTMLAttributes } from "react";
import "./text-input.css";

export function TextInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  const classes = ["text-input", className].filter(Boolean).join(" ");
  return <input className={classes} {...rest} />;
}
