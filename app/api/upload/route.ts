import { type NextRequest, NextResponse } from "next/server"
import { withAdminAuth } from "@/lib/auth"
import { uploadToBlob } from "@/lib/blob"

// 上传文件
export const POST = withAdminAuth(async (req: NextRequest) => {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    const contentType = formData.get("contentType") as string
    const filename = formData.get("filename") as string | undefined

    if (!file || !contentType) {
      return NextResponse.json({ error: "缺少必填字段" }, { status: 400 })
    }

    const result = await uploadToBlob(file, contentType, filename)

    return NextResponse.json(result)
  } catch (error) {
    console.error("文件上传失败:", error)
    return NextResponse.json({ error: "文件上传失败" }, { status: 500 })
  }
})
