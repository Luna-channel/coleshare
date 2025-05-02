import { type NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  try {
    // 获取环境变量中的成员密钥
    const memberKey = process.env.MEMBER_KEY || ""
    
    // 设置纯文本响应
    return new Response(memberKey, {
      headers: {
        "Content-Type": "text/plain",
      },
    })
  } catch (error) {
    console.error("获取成员密钥失败:", error)
    return new Response("", {
      status: 500,
      headers: {
        "Content-Type": "text/plain",
      },
    })
  }
} 