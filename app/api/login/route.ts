import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { key, type } = body

    if (!key || !type || !["admin", "member"].includes(type)) {
      return NextResponse.json({ error: "无效的请求参数" }, { status: 400 })
    }

    // 验证密钥
    const validKey = type === "admin" ? process.env.ADMIN_KEY : process.env.MEMBER_KEY

    if (!validKey || key !== validKey) {
      return NextResponse.json({ error: "密钥无效" }, { status: 403 })
    }

    // 返回成功响应
    return NextResponse.json({
      success: true,
      token: key,
    })
  } catch (error) {
    console.error("登录失败:", error)
    return NextResponse.json({ error: "登录失败" }, { status: 500 })
  }
}
