import { type NextRequest, NextResponse } from "next/server"
import { withMemberAuth, withAdminAuth } from "@/lib/auth"
import { getContents, createContent, ContentType } from "@/lib/db"

// 获取内容列表
export const GET = withMemberAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get("type") as ContentType | null

    const dbContents = await getContents(type || undefined)
    
    // 确保数据可以被 JSON 序列化
    const contents = dbContents.map((item: any) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      content_type: item.content_type,
      blob_url: item.blob_url,
      thumbnail_url: item.thumbnail_url,
      metadata: item.metadata,
      tags: item.tags,
      created_at: item.created_at ? new Date(item.created_at).toISOString() : null,
      updated_at: item.updated_at ? new Date(item.updated_at).toISOString() : null
    }))
    
    return NextResponse.json(contents)
  } catch (error) {
    console.error("获取内容列表失败:", error)

    // 检查是否是数据库连接错误
    if (error instanceof Error && error.message.includes("数据库连接未初始化")) {
      return NextResponse.json({ error: "数据库连接未初始化，请检查环境变量配置" }, { status: 500 })
    }

    return NextResponse.json({ error: "获取内容列表失败" }, { status: 500 })
  }
})

// 创建新内容
export const POST = withAdminAuth(async (req: NextRequest) => {
  try {
    const body = await req.json()
    console.log("收到创建内容请求:", body)

    // 验证必填字段
    if (!body.name || !body.content_type || !body.blob_url) {
      return NextResponse.json({ error: "缺少必填字段" }, { status: 400 })
    }

    // 验证内容类型
    if (!Object.values(ContentType).includes(body.content_type)) {
      return NextResponse.json({ error: "无效的内容类型" }, { status: 400 })
    }

    try {
      // 确保标签是数组
      const tags = Array.isArray(body.tags) ? body.tags : []

      const dbContent = await createContent({
        name: body.name,
        description: body.description || "",
        content_type: body.content_type,
        blob_url: body.blob_url,
        thumbnail_url: body.thumbnail_url || null,
        metadata: body.metadata || null,
        tags: tags,
      })
      
      // 确保数据可以被 JSON 序列化
      const content = {
        id: dbContent.id,
        name: dbContent.name,
        description: dbContent.description,
        content_type: dbContent.content_type,
        blob_url: dbContent.blob_url,
        thumbnail_url: dbContent.thumbnail_url,
        metadata: dbContent.metadata,
        tags: dbContent.tags,
        created_at: dbContent.created_at ? new Date(dbContent.created_at).toISOString() : null,
        updated_at: dbContent.updated_at ? new Date(dbContent.updated_at).toISOString() : null
      }

      return NextResponse.json(content, { status: 201 })
    } catch (dbError) {
      console.error("数据库操作失败:", dbError)

      if (dbError instanceof Error && dbError.message.includes("数据库连接未初始化")) {
        return NextResponse.json({ error: "数据库连接未初始化，请检查环境变量配置" }, { status: 500 })
      }

      return NextResponse.json(
        {
          error: `数据库操作失败: ${dbError instanceof Error ? dbError.message : "未知错误"}`,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("创建内容失败:", error)
    return NextResponse.json(
      {
        error: `创建内容失败: ${error instanceof Error ? error.message : "未知错误"}`,
      },
      { status: 500 },
    )
  }
})
