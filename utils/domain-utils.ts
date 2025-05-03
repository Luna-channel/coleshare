/**
 * Utility functions for domain handling and URL generation
 */

// Get the current hostname
export function getBaseDomain(): string {
  if (typeof window === "undefined") return "omate.net" // Default for server-side rendering

  try {
    return window.location.hostname
  } catch (error) {
    console.error("Error determining base domain:", error)
    return "omate.net" // Fallback to .net on error
  }
}

export function getBaseUrl(): string {
  if (typeof window === "undefined") return "omate.net"
  try {
    return window.location.origin
  } catch (error) {
    console.error("Error determining base URL:", error)
    return "omate.net" // Fallback to .net on error
  }
}

// Default language is always 中文 now
export function getDefaultLanguage(): "zh-CN" {
  return "zh-CN"
}

// Simply return the original URL as no domain adjustment needed
export function adjustExternalLink(url: string): string {
  return url
}

// Get the API base URL using the current hostname
export function getApiBaseUrl(): string {
  try {
    return getBaseUrl()
  } catch (error) {
    console.error("Error determining API base URL:", error)
    return "https://cards.omate.net" // Fallback on error
  }
}
