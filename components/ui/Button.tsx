// components/ui/Button.tsx
import { ButtonHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger"
}

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  const variants = {
    primary: "bg-green-700 hover:bg-green-800 text-white",
    secondary: "bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700",
    danger: "bg-red-900 hover:bg-red-800 text-red-200 border border-red-800",
  }
  return (
    <button
      className={cn(
        "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
        variants[variant],
        className
      )}
      {...props}
    />
  )
}
