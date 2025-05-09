import { type NextRequest, NextResponse } from "next/server"
import { withAdminAuth } from "@/lib/auth"
import { updateContentSortOrder } from "@/lib/db"

// 更新内容排序顺序
export const POST = withAdminAuth(async (req: NextRequest) => {
  try {
    const body = await req.json()
    console.log("收到更新排序请求:", body)

    // 验证必填字段
    if (!body.items || !Array.isArray(body.items)) {
      return NextResponse.json({ error: "缺少排序项目数组" }, { status: 400 })
    }

    // 验证每个项目都有id和sort_order
    for (const item of body.items) {
      if (!item.id || typeof item.sort_order !== 'number') {
        return NextResponse.json({ 
          error: "排序项目格式错误，每项必须包含id和sort_order" 
        }, { status: 400 })
      }
    }

    // 批量更新排序
    const results = []
    for (const item of body.items) {
      try {
        const result = await updateContentSortOrder(item.id, item.sort_order)
        if (result) {
          results.push({
            id: result.id,
            sort_order: result.sort_order,
            success: true
          })
        } else {
          results.push({
            id: item.id,
            success: false,
            error: "内容不存在或未更新"
          })
        }
      } catch (err) {
        console.error(`更新ID=${item.id}的排序失败:`, err)
        results.push({
          id: item.id,
          success: false,
          error: err instanceof Error ? err.message : "更新失败"
        })
      }
    }

    // 返回更新结果
    return NextResponse.json({
      success: true,
      results
    })
  } catch (error) {
    console.error("处理排序请求失败:", error)

    // 检查是否是数据库连接错误
    if (error instanceof Error && error.message.includes("数据库连接未初始化")) {
      return NextResponse.json({ error: "数据库连接未初始化，请检查环境变量配置" }, { status: 500 })
    }

    return NextResponse.json({ error: "更新排序失败" }, { status: 500 })
  }
}) 