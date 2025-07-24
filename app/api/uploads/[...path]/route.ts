import { type NextRequest, NextResponse } from "next/server"
import fs from 'fs/promises'
import path from 'path'
import { createReadStream } from 'fs'

// 获取上传文件 - 兼容 /api/uploads 路径
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // 获取文件路径参数
    const { path: filePath } = await params
    
    if (!filePath || filePath.length === 0) {
      return NextResponse.json({ error: "文件路径不能为空" }, { status: 400 })
    }
    
    // 构建完整的文件路径
    const fileName = filePath.join('/')
    const LOCAL_STORAGE_DIR = process.env.LOCAL_STORAGE_DIR || './public/uploads'
    const fullPath = path.join(process.cwd(), LOCAL_STORAGE_DIR, fileName)
    
    // 安全检查：确保文件路径在允许的目录内
    const allowedDir = path.resolve(process.cwd(), LOCAL_STORAGE_DIR)
    const resolvedPath = path.resolve(fullPath)
    
    if (!resolvedPath.startsWith(allowedDir)) {
      return NextResponse.json({ error: "无权限访问该文件" }, { status: 403 })
    }
    
    try {
      // 检查文件是否存在
      await fs.access(resolvedPath)
      
      // 读取文件
      const fileBuffer = await fs.readFile(resolvedPath)
      
      // 根据文件扩展名设置 Content-Type
      const ext = path.extname(fileName).toLowerCase()
      let contentType = 'application/octet-stream'
      
      const mimeTypes: Record<string, string> = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.json': 'application/json',
        '.txt': 'text/plain',
        '.pdf': 'application/pdf',
        '.zip': 'application/zip'
      }
      
      if (mimeTypes[ext]) {
        contentType = mimeTypes[ext]
      }
      
      // 返回文件内容
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Content-Length': fileBuffer.length.toString()
        }
      })
      
    } catch (fileError) {
      console.error(`文件访问失败: ${resolvedPath}`, fileError)
      return NextResponse.json({ error: "文件不存在" }, { status: 404 })
    }
    
  } catch (error) {
    console.error("获取文件失败:", error)
    return NextResponse.json({ error: "获取文件失败" }, { status: 500 })
  }
}