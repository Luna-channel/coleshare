import { type NextRequest, NextResponse } from "next/server"
import { Permission } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const permission = searchParams.get("permission") as Permission

  if (!permission || !Object.values(Permission).includes(permission)) {
    return NextResponse.json({ error: "无效的权限类型" }, { status: 400 })
  }

  const authHeader = req.headers.get("authorization") || ""
  const token = authHeader.replace("Bearer ", "")

  // 验证token
  if (permission === Permission.WRITE) {
    const adminKey = process.env.ADMIN_KEY
    if (!adminKey || token !== adminKey) {
      return NextResponse.json({ error: "无效的管理员令牌" }, { status: 403 })
    }
  } else if (permission === Permission.READ) {
    const memberKey = process.env.MEMBER_KEY
    // 如果MEMBER_KEY为空，允许公开访问
    if (memberKey && memberKey.trim() !== "" && token !== memberKey) {
      return NextResponse.json({ error: "无效的成员令牌" }, { status: 403 })
    }
  }

  return NextResponse.json({ success: true })
}
