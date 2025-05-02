"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { translations } from "@/translations"
import { getDefaultLanguage } from "@/utils/domain-utils"

// Define available languages
export type Language = "en" | "zh-CN" | "zh-TW" | "ja" | "ko"

// Define language context type
type LanguageContextType = {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: string) => string
}

// Create context with default values
const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key: string) => key,
})

// Define props for LanguageProvider
interface LanguageProviderProps {
  children: ReactNode
}

// Create language provider component
export function LanguageProvider({ children }: LanguageProviderProps) {
  // Initialize language state with domain-based default
  const [language, setLanguage] = useState<Language>("en")
  const [isInitialized, setIsInitialized] = useState(false)

  // Update language and save to localStorage
  const handleSetLanguage = (newLanguage: Language) => {
    setLanguage(newLanguage)
    if (typeof window !== "undefined") {
      localStorage.setItem("language", newLanguage)
    }
  }

  // Initialize language based on domain and localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && !isInitialized) {
      const savedLanguage = localStorage.getItem("language") as Language | null
      const domainDefaultLanguage = getDefaultLanguage()

      if (savedLanguage && Object.keys(translations).includes(savedLanguage)) {
        // Use saved language if available
        setLanguage(savedLanguage)
      } else {
        // Otherwise use domain-based default language
        setLanguage(domainDefaultLanguage)
      }

      setIsInitialized(true)
    }
  }, [isInitialized])

  // Translation function
  const t = (key: string): string => {
    return translations[language]?.[key] || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

// Custom hook to use the language context
export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}
