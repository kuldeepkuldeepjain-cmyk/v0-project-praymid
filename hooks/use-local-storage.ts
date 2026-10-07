"use client"

import { useCallback, useEffect, useState } from "react"

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((current: T) => T)) => void] {
  const [value, setValue] = useState(initialValue)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    try {
      const storedValue = window.localStorage.getItem(key)
      if (storedValue !== null) setValue(JSON.parse(storedValue) as T)
    } catch {
      window.localStorage.removeItem(key)
    } finally {
      setIsInitialized(true)
    }
  }, [key])

  useEffect(() => {
    if (!isInitialized) return
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Storage may be unavailable or full; keep the in-memory preference.
    }
  }, [isInitialized, key, value])

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== key || event.newValue === null) return
      try {
        setValue(JSON.parse(event.newValue) as T)
      } catch {
        window.localStorage.removeItem(key)
      }
    }

    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [key])

  const updateValue = useCallback((nextValue: T | ((current: T) => T)) => {
    setValue((current) => (typeof nextValue === "function"
      ? (nextValue as (current: T) => T)(current)
      : nextValue))
  }, [])

  return [value, updateValue]
}
