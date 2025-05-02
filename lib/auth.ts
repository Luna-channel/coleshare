import { type NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"

// 权限类型
export enum Permission {
  READ = "read",
  WRITE = "write",
}

// 验证访问权限
export function checkPermission(req: NextRequest, permission: Permission): boolean {
  // 首先检查是否有管理员权限（管理员权限包含所有权限）
  const authHeader = req.headers.get("authorization") || ""
  const token = authHeader.replace("Bearer ", "")
  const adminKey = process.env.ADMIN_KEY

  // 如果有管理员密钥且令牌匹配，无论请求什么权限都通过验证
  if (adminKey && token === adminKey) {
    console.log("管理员权限验证通过");
    return true
  }

  // 如果是特别请求管理员权限但验证没通过，直接返回 false
  if (permission === Permission.WRITE) {
    console.log("非管理员权限，无法执行写操作");
    return false
  }

  // 检查成员权限
  const memberKey = process.env.MEMBER_KEY

  // 如果成员密钥为空，允许公开访问
  if (!memberKey || memberKey.trim() === "") {
    console.log("成员密钥未设置，允许公开访问");
    return true
  }

  // 否则检查成员令牌
  return token === memberKey
}

// 中间件：验证管理员权限
export function withAdminAuth(handler: Function) {
  return async (req: NextRequest) => {
    if (!checkPermission(req, Permission.WRITE)) {
      return NextResponse.json({ error: "无权限访问" }, { status: 403 })
    }

    return handler(req)
  }
}

// 中间件：验证成员权限
export function withMemberAuth(handler: Function) {
  return async (req: NextRequest) => {
    if (!checkPermission(req, Permission.READ)) {
      return NextResponse.json({ error: "无权限访问" }, { status: 403 })
    }

    return handler(req)
  }
}

// 客户端权限检查
export async function checkClientPermission(permission: Permission): Promise<boolean> {
  try {
    // 先检查是否有管理员权限
    const adminToken = localStorage.getItem("adminToken")
    if (adminToken) {
      const adminResponse = await fetch(`/api/auth/verify?permission=write`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      })
      
      // 如果有管理员权限，则自动通过所有权限检查
      if (adminResponse.ok) {
        console.log("客户端管理员权限验证通过");
        return true
      }
    }
    
    // 如果没有管理员权限且需要成员权限，检查成员令牌
    if (permission === Permission.READ) {
      const memberToken = localStorage.getItem("memberToken")
      if (memberToken) {
        const memberResponse = await fetch(`/api/auth/verify?permission=read`, {
          headers: {
            Authorization: `Bearer ${memberToken}`,
          },
        })
        return memberResponse.ok
      }
    }

    return false
  } catch (error) {
    console.error("权限检查失败:", error)
    return false
  }
}
