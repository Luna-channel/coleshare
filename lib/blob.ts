import { put, del } from "@vercel/blob"
import { nanoid } from "nanoid"
import sharp from 'sharp'

// 文件类型映射
const contentTypeMap = {
  character_card: "png",
  knowledge_base: "json",
  event_book: "json",
  prompt_injection: "json",
}

// 从环境变量获取存储前缀，默认为"oshare/"
const STORAGE_PREFIX = `${process.env.BLOB_PREFIX || "oshare"}/`

// 生成jpg缩略图
async function generateJpegThumbnail(file: File): Promise<File> {
  try {
    // 将文件转换为Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // 使用sharp转换为jpg格式，质量设为80%
    const jpegBuffer = await sharp(buffer)
      .resize(800) // 限制最大宽度为800像素
      .jpeg({ quality: 80 })
      .toBuffer()
    
    // 在服务器环境中创建File对象
    const fileName = `thumbnail-${nanoid()}.jpg`
    
    // 服务器环境下创建File对象的兼容方式
    if (typeof File !== 'undefined') {
      // 浏览器环境
      return new File([jpegBuffer], fileName, {
        type: 'image/jpeg'
      })
    } else {
      // Node.js环境 (Vercel Edge Function)
      // 使用Blob作为替代方案
      const blob = new Blob([jpegBuffer], { type: 'image/jpeg' })
      Object.defineProperty(blob, 'name', {
        value: fileName,
        writable: false
      })
      return blob as unknown as File
    }
  } catch (error) {
    console.error("缩略图生成失败:", error)
    // 如果转换失败，返回原始文件
    return file
  }
}

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
    
    // 角色卡需要生成jpg缩略图
    if (contentType === "character_card") {
      // 生成jpg缩略图
      const thumbnailFile = await generateJpegThumbnail(file)
      
      // 上传缩略图
      const thumbnailFilename = `thumbnail_${contentType}_${nanoid()}.jpg`
      const prefixedThumbnailFilename = `${STORAGE_PREFIX}${thumbnailFilename}`
      
      const { url: thumbnailFileUrl } = await put(prefixedThumbnailFilename, thumbnailFile, {
        access: "public",
        addRandomSuffix: true,
        allowOverwrite: true,
      })
      
      thumbnailUrl = thumbnailFileUrl
    }
    // 其他图片文件直接使用原图作为缩略图
    else if (imageExtensions.includes(extension.toLowerCase())) {
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
    // 检查存储类型
    const storageType = process.env.STORAGE_TYPE || 'vercel'
    
    if (storageType === 'local') {
      // 本地存储：直接使用相对路径或从URL中提取路径
      let urlPath: string
      if (url.startsWith('http')) {
        // 完整URL，提取路径部分
        urlPath = new URL(url).pathname
      } else {
        // 相对路径，直接使用
        urlPath = url
      }
      
      // 导入本地存储删除函数
      const { deleteFileLocal } = await import('./local-storage')
      return await deleteFileLocal(url)
    } else {
      // Vercel Blob 存储：需要完整URL
      const urlPath = new URL(url).pathname
      // 提取完整路径部分（包括前缀）
      const pathParts = urlPath.split('/')
      // 移除空字符串（URL开头的'/'导致的）
      const validParts = pathParts.filter(part => part.length > 0)
      
      if (validParts.length === 0) {
        throw new Error("无效的文件URL")
      }

      // 使用URL中的完整路径
      const fullPath = '/' + validParts.join('/')
      console.log("尝试删除文件:", fullPath)
      await del(fullPath)
      return true
    }
  } catch (error) {
    console.error("文件删除失败:", error)
    return false
  }
}
