import { put, del } from "@vercel/blob"
import { nanoid } from "nanoid"

// 文件类型映射
const contentTypeMap = {
  character_card: "png",
  knowledge_base: "json",
  event_book: "json",
  prompt_injection: "json",
}

// 存储前缀
const STORAGE_PREFIX = "oshare/"

// 上传文件到Blob存储
export async function uploadToBlob(
  file: File,
  contentType: string,
  filename?: string,
): Promise<{ url: string; thumbnailUrl?: string }> {
  try {
    // 生成唯一文件名
    const extension = contentTypeMap[contentType as keyof typeof contentTypeMap] || file.name.split(".").pop() || "bin"
    const uniqueFilename = filename || `${contentType}_${nanoid()}.${extension}`
    
    // 添加存储前缀
    const prefixedFilename = `${STORAGE_PREFIX}${uniqueFilename}`

    // 上传文件
    const { url } = await put(prefixedFilename, file, {
      access: "public",
      addRandomSuffix: true, // 添加随机后缀避免文件名冲突
      allowOverwrite: true,  // 允许覆盖已存在的文件
    })

    // 只有图片文件才设置缩略图URL
    let thumbnailUrl = undefined
    
    // 图片文件扩展名列表
    const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']
    
    // 检查是否是图片文件
    if (contentType === "character_card" || imageExtensions.includes(extension.toLowerCase())) {
      thumbnailUrl = url
    }
    
    return { url, thumbnailUrl }
  } catch (error) {
    console.error("文件上传失败:", error)
    throw new Error(`文件上传失败: ${error instanceof Error ? error.message : "未知错误"}`)
  }
}

// 从Blob存储删除文件
export async function deleteFromBlob(url: string): Promise<boolean> {
  try {
    // 从URL中提取文件名（包含路径）
    const urlPath = new URL(url).pathname
    const filename = urlPath.split('/').pop()
    
    if (!filename) {
      throw new Error("无效的文件URL")
    }

    // 使用URL中的完整路径提取文件名
    console.log("尝试删除文件:", filename)
    await del(filename)
    return true
  } catch (error) {
    console.error("文件删除失败:", error)
    return false
  }
}
