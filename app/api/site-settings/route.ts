import { type NextRequest, NextResponse } from "next/server"
import { withAdminAuth } from "@/lib/auth"
import { getSiteSettings, updateSiteSettings } from "@/lib/db"

// 获取站点设置
export async function GET() {
  try {
    const settings = await getSiteSettings()
    
    return NextResponse.json(settings || {
      site_name: "OMateShare",
      show_download_link: true,
      page_title: "OMateShare",
      meta_description: "管理角色卡、知识库、事件书和提示注入"
    })
  } catch (error) {
    console.error("获取站点设置失败:", error)
    return NextResponse.json({ error: "获取站点设置失败" }, { status: 500 })
  }
}

// 更新站点设置 (仅管理员可操作)
export const PUT = withAdminAuth(async (req: NextRequest) => {
  try {
    const data = await req.json()
    
    // 验证请求数据
    const { site_name, show_download_link, page_title, meta_description } = data
    
    // 构建更新数据对象
    const updateData: Record<string, any> = {}
    
    if (site_name !== undefined) updateData.site_name = site_name
    if (show_download_link !== undefined) updateData.show_download_link = show_download_link
    if (page_title !== undefined) updateData.page_title = page_title
    if (meta_description !== undefined) updateData.meta_description = meta_description
    
    // 如果没有要更新的字段，直接返回当前设置
    if (Object.keys(updateData).length === 0) {
      const currentSettings = await getSiteSettings()
      return NextResponse.json(currentSettings)
    }
    
    // 更新设置
    const updatedSettings = await updateSiteSettings(updateData)
    
    return NextResponse.json(updatedSettings)
  } catch (error) {
    console.error("更新站点设置失败:", error)
    return NextResponse.json({ error: "更新站点设置失败" }, { status: 500 })
  }
}) 