import { type NextRequest, NextResponse } from "next/server"
import { withAdminAuth } from "@/lib/auth"
import { resetContentSortOrder, ContentType } from "@/lib/db"

// 重置角色卡排序（删除所有sort_order值）
export const POST = withAdminAuth(async (req: NextRequest) => {
  try {
    console.log("收到重置排序请求")

    // 调用数据库函数重置角色卡排序
    await resetContentSortOrder(ContentType.CHARACTER_CARD)

    console.log("角色卡排序已重置为默认排序")

    return NextResponse.json({ 
      success: true,
      message: "角色卡排序已重置为默认排序"
    })

  } catch (error) {
    console.error("重置排序失败:", error)
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : "重置排序失败" 
    }, { status: 500 })
  }
})