/**
 * 设置cookie
 */
export function setCookie(
  name: string,
  value: string,
  options: {
    path?: string
    maxAge?: number
    sameSite?: 'Strict' | 'Lax' | 'None'
    secure?: boolean
  } = {}
) {
  const { path = '/', maxAge = 2592000, sameSite = 'Strict', secure = false } = options
  
  document.cookie = `${name}=${value}; path=${path}; max-age=${maxAge}; SameSite=${sameSite}${
    secure ? '; Secure' : ''
  }`
}

/**
 * 获取cookie
 */
export function getCookie(name: string): string | undefined {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift()
  }
  
  return undefined
}

/**
 * 删除cookie
 */
export function deleteCookie(name: string, path = '/') {
  document.cookie = `${name}=; path=${path}; expires=Thu, 01 Jan 1970 00:00:00 GMT`
} 