import fs from 'fs/promises'
import path from 'path'
import { nanoid } from 'nanoid'
import sharp from 'sharp'

// 本地存储配置
const LOCAL_STORAGE_DIR = process.env.LOCAL_STORAGE_DIR || './public/uploads'
const LOCAL_STORAGE_URL_PREFIX = process.env.LOCAL_STORAGE_URL_PREFIX || '/uploads'

// 确保存储目录存在
export async function ensureStorageDir(): Promise<void> {
  try {
    await fs.access(LOCAL_STORAGE_DIR)
  } catch {
    await fs.mkdir(LOCAL_STORAGE_DIR, { recursive: true })
  }
}

// 生成jpg缩略图
export async function generateJpegThumbnail(file: File): Promise<Buffer> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    const jpegBuffer = await sharp(buffer)
      .resize(800)
      .jpeg({ quality: 80 })
      .toBuffer()
    
    return jpegBuffer
  } catch (error) {
    console.error("缩略图生成失败:", error)
    throw error
  }
}

// 上传文件到本地存储
export async function uploadFileLocal(
  file: File,
  contentType: string,
  filename?: string,
): Promise<{ url: string; thumbnailUrl?: string }> {
  await ensureStorageDir()
  
  try {
    // 文件类型映射
    const contentTypeMap = {
      character_card: "png",
      knowledge_base: "json",
      event_book: "json",
      prompt_injection: "json",
    }
    
    const extension = contentTypeMap[contentType as keyof typeof contentTypeMap] || file.name.split(".").pop() || "bin"
    const uniqueFilename = filename || `${contentType}_${nanoid()}.${extension}`
    const filePath = path.join(LOCAL_STORAGE_DIR, uniqueFilename)
    
    // 保存主文件
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    await fs.writeFile(filePath, buffer)
    
    const url = `${LOCAL_STORAGE_URL_PREFIX}/${uniqueFilename}`
    let thumbnailUrl: string | undefined
    
    // 为角色卡生成缩略图
    if (contentType === "character_card") {
      try {
        const thumbnailBuffer = await generateJpegThumbnail(file)
        const thumbnailFilename = `thumbnail_${contentType}_${nanoid()}.jpg`
        const thumbnailPath = path.join(LOCAL_STORAGE_DIR, thumbnailFilename)
        
        await fs.writeFile(thumbnailPath, thumbnailBuffer)
        thumbnailUrl = `${LOCAL_STORAGE_URL_PREFIX}/${thumbnailFilename}`
      } catch (error) {
        console.error("缩略图生成失败，使用原图:", error)
        thumbnailUrl = url
      }
    }
    
    // 其他图片文件直接使用原图作为缩略图
    const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']
    if (!thumbnailUrl && imageExtensions.includes(extension.toLowerCase())) {
      thumbnailUrl = url
    }
    
    return { url, thumbnailUrl }
  } catch (error) {
    console.error("本地文件上传失败:", error)
    throw new Error(`本地文件上传失败: ${error instanceof Error ? error.message : "未知错误"}`)
  }
}

// 从本地存储删除文件
export async function deleteFileLocal(url: string): Promise<boolean> {
  try {
    // 从URL中提取文件名
    const urlPath = new URL(url, 'http://localhost').pathname
    const filename = path.basename(urlPath)
    const filePath = path.join(LOCAL_STORAGE_DIR, filename)
    
    // 检查文件是否存在
    try {
      await fs.access(filePath)
      await fs.unlink(filePath)
      return true
    } catch {
      console.warn(`文件不存在或已被删除: ${filePath}`)
      return false
    }
  } catch (error) {
    console.error("本地文件删除失败:", error)
    return false
  }
}

// 检查本地存储是否可用
export async function isLocalStorageAvailable(): Promise<boolean> {
  try {
    await ensureStorageDir()
    // 尝试写入一个测试文件
    const testFile = path.join(LOCAL_STORAGE_DIR, '.test')
    await fs.writeFile(testFile, 'test')
    await fs.unlink(testFile)
    return true
  } catch {
    return false
  }
}