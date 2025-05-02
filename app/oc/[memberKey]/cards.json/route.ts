import { type NextRequest, NextResponse } from "next/server"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ memberKey?: string }> }
) {
  try {
    // 获取memberKey，使用await处理参数
    const { memberKey = "" } = await params;
    
    if (!memberKey) {
      console.error("缺少memberKey参数");
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }
    
    // 重定向到带有memberKey的API端点
    return NextResponse.redirect(new URL(`/api/${memberKey}/cards`, req.url))
  } catch (error) {
    console.error("重定向到带有memberKey的API端点失败:", error)
    return NextResponse.json({ error: "请求处理失败" }, { status: 500 })
  }
} 