import { put, del } from "@vercel/blob"
import { R2 } from "node-cloudflare-r2"
import { nanoid } from "nanoid"
import sharp from 'sharp'

// 存储类型枚举
export type StorageType = 'vercel' | 'r2'

// 文件类型映射
const contentTypeMap = {
  character_card: "png",
  knowledge_base: "json",
  event_book: "json",
  prompt_injection: "json",
}

// 从环境变量获取存储前缀，默认为"oshare/"
const STORAGE_PREFIX = `${process.env.BLOB_PREFIX || "oshare"}/`

// 初始化 R2 客户端
const r2 = new R2({
  accountId: process.env.R2_ACCOUNT_ID || '',
  accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
})

// 生成jpg缩略图
async function generateJpegThumbnail(file: File): Promise<File> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    const jpegBuffer = await sharp(buffer)
      .resize(800)
      .jpeg({ quality: 80 })
      .toBuffer()
    
    const fileName = `thumbnail-${nanoid()}.jpg`
    
    if (typeof File !== 'undefined') {
      return new File([jpegBuffer], fileName, {
        type: 'image/jpeg'
      })
    } else {
      const blob = new Blob([jpegBuffer], { type: 'image/jpeg' })
      Object.defineProperty(blob, 'name', {
        value: fileName,
        writable: false
      })
      return blob as unknown as File
    }
  } catch (error) {
    console.error("缩略图生成失败:", error)
    return file
  }
}

// 上传文件到存储
export async function uploadFile(
  file: File,
  contentType: string,
  filename?: string,
): Promise<{ url: string; thumbnailUrl?: string }> {
  const storageType = (process.env.STORAGE_TYPE || 'vercel') as StorageType
  
  try {
    const extension = contentTypeMap[contentType as keyof typeof contentTypeMap] || file.name.split(".").pop() || "bin"
    const uniqueFilename = filename || `${contentType}_${nanoid()}.${extension}`
    const prefixedFilename = `${STORAGE_PREFIX}${uniqueFilename}`

    let url: string
    let thumbnailUrl: string | undefined

    if (storageType === 'vercel') {
      // Vercel Blob 存储
      const { url: blobUrl } = await put(prefixedFilename, file, {
        access: "public",
        addRandomSuffix: true,
        allowOverwrite: true,
      })
      url = blobUrl

      if (contentType === "character_card") {
        const thumbnailFile = await generateJpegThumbnail(file)
        const thumbnailFilename = `thumbnail_${contentType}_${nanoid()}.jpg`
        const prefixedThumbnailFilename = `${STORAGE_PREFIX}${thumbnailFilename}`
        
        const { url: thumbnailFileUrl } = await put(prefixedThumbnailFilename, thumbnailFile, {
          access: "public",
          addRandomSuffix: true,
          allowOverwrite: true,
        })
        thumbnailUrl = thumbnailFileUrl
      }
    } else {
      // Cloudflare R2 存储
      const bucket = r2.bucket(process.env.R2_BUCKET_NAME || '')
      
      // 上传主文件
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      await bucket.upload(buffer, prefixedFilename)
      
      // 构建公开访问URL
      url = `${process.env.R2_PUBLIC_URL}/${prefixedFilename}`

      if (contentType === "character_card") {
        const thumbnailFile = await generateJpegThumbnail(file)
        const thumbnailFilename = `thumbnail_${contentType}_${nanoid()}.jpg`
        const prefixedThumbnailFilename = `${STORAGE_PREFIX}${thumbnailFilename}`
        
        const thumbnailArrayBuffer = await thumbnailFile.arrayBuffer()
        const thumbnailBuffer = Buffer.from(thumbnailArrayBuffer)
        await bucket.upload(thumbnailBuffer, prefixedThumbnailFilename)
        
        thumbnailUrl = `${process.env.R2_PUBLIC_URL}/${prefixedThumbnailFilename}`
      }
    }

    // 其他图片文件直接使用原图作为缩略图
    const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']
    if (!thumbnailUrl && imageExtensions.includes(extension.toLowerCase())) {
      thumbnailUrl = url
    }
    
    return { url, thumbnailUrl }
  } catch (error) {
    console.error("文件上传失败:", error)
    throw new Error(`文件上传失败: ${error instanceof Error ? error.message : "未知错误"}`)
  }
}

// 从存储删除文件
export async function deleteFile(url: string): Promise<boolean> {
  const storageType = (process.env.STORAGE_TYPE || 'vercel') as StorageType
  
  try {
    const urlPath = new URL(url).pathname
    const pathParts = urlPath.split('/')
    const validParts = pathParts.filter(part => part.length > 0)
    
    if (validParts.length === 0) {
      throw new Error("无效的文件URL")
    }

    const fullPath = '/' + validParts.join('/')

    if (storageType === 'vercel') {
      await del(fullPath)
    } else {
      const bucket = r2.bucket(process.env.R2_BUCKET_NAME || '')
      await bucket.deleteObject(fullPath)
    }
    
    return true
  } catch (error) {
    console.error("文件删除失败:", error)
    return false
  }
} 