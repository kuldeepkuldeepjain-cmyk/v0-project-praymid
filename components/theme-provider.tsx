"use client"

import * as React from "react"

interface ThemeProviderProps {
  children: React.ReactNode
  attribute?: string
  defaultTheme?: string
  enableSystem?: boolean
  storageKey?: string
}

const ThemeContext = React.createContext<{
  theme: string
  setTheme: (theme: string) => void
}>({
  theme: "light",
  setTheme: () => {},
})

export function ThemeProvider({ 
  children, 
  defaultTheme = "light",
  attribute = "class",
}: ThemeProviderProps) {
  const [theme, setTheme] = React.useState(defaultTheme)

  React.useEffect(() => {
    if (attribute === "class") {
      document.documentElement.classList.toggle("dark", theme === "dark")
    }
  }, [theme, attribute])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = React.useContext(ThemeContext)
  if (!context) {
    return { theme: "light", setTheme: () => {} }
  }
  return context
}
