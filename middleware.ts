import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // 获取请求路径
  const path = request.nextUrl.pathname

  // 如果是API请求，让API路由处理权限验证
  if (path.startsWith("/api/")) {
    return NextResponse.next()
  }

  // 如果是静态资源，直接放行
  if (
    path.includes(".") || // 文件扩展名
    path.startsWith("/_next/") ||
    path.startsWith("/favicon.ico")
  ) {
    return NextResponse.next()
  }

  // 如果已经在首页，无需重定向以避免循环
  if (path === "/" || path === "") {
    return NextResponse.next()
  }

  // 检查成员密钥是否设置
  // 注意：这里无法直接访问环境变量，需要通过请求头传递
  const memberKeyHeader = request.headers.get("x-member-key-required")

  // 如果成员密钥未设置，允许公开访问
  if (memberKeyHeader === "false") {
    return NextResponse.next()
  }

  // middleware 不再检查 cookies 或 token，让客户端页面自己处理认证逻辑
  // 对于需要权限的页面，客户端组件会在页面加载时检查 localStorage 中的 token
  // 并根据需要重定向到登录页面
  return NextResponse.next()
}

// 配置匹配的路径
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
