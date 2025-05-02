/**
 * Utility functions for domain-based language and URL handling
 */

// Get the base domain (omate.org or omate.net) based on current hostname
export function getBaseDomain(): string {
  if (typeof window === "undefined") return "omate.net" // Default for server-side rendering

  try {
    const hostname = window.location.hostname

    if (hostname.endsWith("omate.org")) {
      return "omate.org"
    } else {
      return "omate.net" // Default to .net for any other domain
    }
  } catch (error) {
    console.error("Error determining base domain:", error)
    return "omate.net" // Fallback to .net on error
  }
}

// Get the default language based on the domain
export function getDefaultLanguage(): "zh-CN" | "en" {
  try {
    const baseDomain = getBaseDomain()
    return baseDomain === "omate.org" ? "zh-CN" : "en"
  } catch (error) {
    console.error("Error determining default language:", error)
    return "en" // Fallback to English on error
  }
}

// Adjust external links based on the current domain
export function adjustExternalLink(url: string): string {
  try {
    const baseDomain = getBaseDomain()

    // If the URL contains omate.xxx, adjust it to match the current domain
    if (url.includes("omate.")) {
      // Replace any omate.xxx with the current base domain
      return url.replace(/omate\.[a-z]+/g, baseDomain)
    }

    return url
  } catch (error) {
    console.error("Error adjusting external link:", error)
    return url // Return original URL on error
  }
}

// Get the API base URL based on the current domain
export function getApiBaseUrl(): string {
  try {
    const baseDomain = getBaseDomain()
    return `https://cards.${baseDomain}`
  } catch (error) {
    console.error("Error determining API base URL:", error)
    return "https://cards.omate.net" // Fallback to .net on error
  }
}
