import { type NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  try {
    // 检查环境变量是否设置（不返回实际值，只返回是否设置）
    const hasMemberKey = Boolean(process.env.MEMBER_KEY && process.env.MEMBER_KEY.trim() !== "")
    const hasAdminKey = Boolean(process.env.ADMIN_KEY && process.env.ADMIN_KEY.trim() !== "")
    
    // 返回配置状态
    return NextResponse.json({
      hasMemberKey,
      hasAdminKey,
      // 如果没有设置任何key，标记为允许公开访问
      allowPublicAccess: !hasMemberKey
    })
  } catch (error) {
    console.error("获取配置状态失败:", error)
    return NextResponse.json({ error: "获取配置失败" }, { status: 500 })
  }
} 