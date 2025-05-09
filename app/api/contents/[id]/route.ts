import { type NextRequest, NextResponse } from "next/server"
import { withMemberAuth, withAdminAuth } from "@/lib/auth"
import { getContent, updateContent, deleteContent, logAccess } from "@/lib/db"
import { deleteFromBlob } from "@/lib/blob"

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
      await deleteFromBlob(dbContent.blob_url)
    }

    // 如果缩略图URL与blob_url不同，也需要删除
    if (dbContent.thumbnail_url && dbContent.thumbnail_url !== dbContent.blob_url) {
      await deleteFromBlob(dbContent.thumbnail_url)
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
