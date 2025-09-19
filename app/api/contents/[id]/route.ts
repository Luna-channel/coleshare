import { type NextRequest, NextResponse } from "next/server"
import { withMemberAuth, withAdminAuth } from "@/lib/auth"
import { getContent, updateContent, deleteContent, logAccess, getContentsByIds } from "@/lib/db"
import { deleteFile } from "@/lib/storage"

// 获取单个内容
export const GET = withMemberAuth(async (req: NextRequest) => {
  try {
    // 从URL中获取ID参数
    const pathname = new URL(req.url).pathname
    const id = Number.parseInt(pathname.split('/').pop() || '')
    if (isNaN(id)) {
      return NextResponse.json({ error: "无效的内容ID" }, { status: 400 })
    }

    const dbContent = await getContent(id)
    if (!dbContent) {
      return NextResponse.json({ error: "内容不存在" }, { status: 404 })
    }

    // 记录访问日志
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || ""
    const userAgent = req.headers.get("user-agent") || ""

    try {
      // logAccess函数会检查环境变量ACCESS_LOG_ON是否为1，不是则跳过记录
      await logAccess({
        content_id: id,
        access_type: "view",
        ip_address: ip.toString(),
        user_agent: userAgent,
      })
    } catch (logError) {
      // 访问日志错误不应影响主要功能
      console.error("记录访问日志失败:", logError)
    }

    // 确保数据可以被 JSON 序列化
    const content: any = {
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

    // 如果是角色卡，获取相关资源
    if (dbContent.content_type === "character_card" && dbContent.metadata) {
      try {
        const metadata = dbContent.metadata;
        // 收集所有相关资源的ID
        const resourceIds = [
          ...(metadata.selectedEventBooks || []),
          ...(metadata.selectedStoryBooks || []),
          ...(metadata.selectedKnowledgeBases || []),
          ...(metadata.selectedPromptInjections || [])
        ];
        
        console.log("相关资源ID:", resourceIds);
        
        if (resourceIds.length > 0) {
          // 使用getContentsByIds函数获取关联内容
          const relatedResources = await getContentsByIds(resourceIds);
          
          // 格式化相关资源数据
          const formattedRelatedResources = relatedResources.map((resource: any) => ({
            id: resource.id,
            name: resource.name,
            content_type: resource.content_type,
            thumbnail_url: resource.thumbnail_url,
            description: resource.description?.substring(0, 100) // 限制描述长度
          }));
          
          // 将相关资源添加到返回结果中
          content.related_resources = formattedRelatedResources;
        } else {
          content.related_resources = [];
        }
      } catch (relatedError) {
        console.error("获取相关资源失败:", relatedError)
        // 失败时不返回相关资源，但不影响主要内容的返回
        content.related_resources = []
      }
    }

    console.log("content", content)

    return NextResponse.json(content)
  } catch (error) {
    console.error("获取内容详情失败:", error)

    // 检查是否是数据库连接错误
    if (error instanceof Error && error.message.includes("数据库连接未初始化")) {
      return NextResponse.json({ error: "数据库连接未初始化，请检查环境变量配置" }, { status: 500 })
    }

    return NextResponse.json({ error: "获取内容详情失败" }, { status: 500 })
  }
})

// 更新内容
export const PUT = withAdminAuth(async (req: NextRequest) => {
  try {
    // 从URL中获取ID参数
    const pathname = new URL(req.url).pathname
    const id = Number.parseInt(pathname.split('/').pop() || '')
    if (isNaN(id)) {
      return NextResponse.json({ error: "无效的内容ID" }, { status: 400 })
    }

    const body = await req.json()
    const dbContent = await updateContent(id, body)

    if (!dbContent) {
      return NextResponse.json({ error: "内容不存在或未更新" }, { status: 404 })
    }

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

    return NextResponse.json(content)
  } catch (error) {
    console.error("更新内容失败:", error)

    // 检查是否是数据库连接错误
    if (error instanceof Error && error.message.includes("数据库连接未初始化")) {
      return NextResponse.json({ error: "数据库连接未初始化，请检查环境变量配置" }, { status: 500 })
    }

    return NextResponse.json({ error: "更新内容失败" }, { status: 500 })
  }
})

// 删除内容
export const DELETE = withAdminAuth(async (req: NextRequest) => {
  try {
    // 从URL中获取ID参数
    const pathname = new URL(req.url).pathname
    const id = Number.parseInt(pathname.split('/').pop() || '')
    if (isNaN(id)) {
      return NextResponse.json({ error: "无效的内容ID" }, { status: 400 })
    }

    // 先获取内容信息，以便删除Blob存储中的文件
    const dbContent = await getContent(id)
    if (!dbContent) {
      return NextResponse.json({ error: "内容不存在" }, { status: 404 })
    }

    // 删除数据库记录
    const result = await deleteContent(id)
    if (!result) {
      return NextResponse.json({ error: "删除内容失败" }, { status: 500 })
    }

    // 删除Blob存储中的文件
    if (dbContent.blob_url) {
      await deleteFile(dbContent.blob_url)
    }

    // 如果缩略图URL与blob_url不同，也需要删除
    if (dbContent.thumbnail_url && dbContent.thumbnail_url !== dbContent.blob_url) {
      await deleteFile(dbContent.thumbnail_url)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("删除内容失败:", error)

    // 检查是否是数据库连接错误
    if (error instanceof Error && error.message.includes("数据库连接未初始化")) {
      return NextResponse.json({ error: "数据库连接未初始化，请检查环境变量配置" }, { status: 500 })
    }

    return NextResponse.json({ error: "删除内容失败" }, { status: 500 })
  }
})
