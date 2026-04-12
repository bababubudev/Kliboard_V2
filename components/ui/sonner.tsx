"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--surface-container-high)",
          "--normal-text": "var(--foreground)",
          "--normal-border": "var(--ghost-border)",
          "--success-bg": "var(--surface-container-high)",
          "--success-text": "var(--primary)",
          "--success-border": "var(--ghost-border)",
          "--error-bg": "var(--surface-container-high)",
          "--error-text": "var(--destructive)",
          "--error-border": "var(--ghost-border)",
          "--border-radius": "var(--radius-md)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "shadow-[0px_8px_24px_rgba(0,0,0,0.25)] text-sm font-sans",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
