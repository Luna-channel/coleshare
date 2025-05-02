"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Download } from "lucide-react"
import Link from "next/link"

export default function ViewContent({ params }: { params: { id: string } }) {
  const [content, setContent] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchContent = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const token = localStorage.getItem("adminToken") || localStorage.getItem("memberToken") || ""
        const response = await fetch(`/api/contents/${params.id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          if (response.status === 403) {
            // 权限不足，重定向到首页
            router.push("/")
            return
          }

          throw new Error("获取内容详情失败")
        }

        const data = await response.json()
        setContent(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "获取内容详情失败")
      } finally {
        setIsLoading(false)
      }
    }

    fetchContent()
  }, [params.id, router])

  // 获取内容类型标签
  const getTypeLabel = (type: string) => {
    switch (type) {
      case "character_card":
        return "角色卡"
      case "knowledge_base":
        return "知识库"
      case "event_book":
        return "事件书"
      case "prompt_injection":
        return "提示注入"
      default:
        return "未知类型"
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  if (error || !content) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white">
        <div className="container mx-auto py-12 px-4">
          <div className="bg-red-500/20 border border-red-500 text-white p-4 rounded-lg mb-6">
            {error || "内容不存在"}
          </div>
          <Button asChild variant="outline">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回首页
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white">
      <div className="container mx-auto py-6 px-4">
        <div className="mb-8">
          <Button asChild variant="outline" className="mb-6">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回首页
            </Link>
          </Button>

          <div className="flex flex-col md:flex-row gap-8">
            {/* 左侧：图片预览 */}
            <div className="w-full md:w-1/3">
              <div className="aspect-[3/4] rounded-lg overflow-hidden border border-gray-700">
                <img
                  src={content.thumbnail_url || "/placeholder.svg?height=400&width=300"}
                  alt={content.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="mt-4">
                <Button className="w-full" onClick={() => window.open(content.blob_url, "_blank")}>
                  <Download className="mr-2 h-4 w-4" />
                  下载{getTypeLabel(content.content_type)}
                </Button>
              </div>
            </div>

            {/* 右侧：内容详情 */}
            <div className="w-full md:w-2/3">
              <div className="mb-2 text-sm font-medium text-purple-400">{getTypeLabel(content.content_type)}</div>
              <h1 className="text-3xl font-bold mb-4">{content.name}</h1>

              <div className="prose prose-invert max-w-none">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-2">描述</h2>
                  <p className="text-gray-300 whitespace-pre-wrap">{content.description || "无描述"}</p>
                </div>

                {content.tags && content.tags.length > 0 && (
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold mb-2">标签</h2>
                    <div className="flex flex-wrap gap-2">
                      {content.tags.map((tag: string, index: number) => (
                        <span key={index} className="px-2 py-1 bg-purple-900/50 text-purple-200 rounded-md text-sm">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {content.metadata && (
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold mb-2">元数据</h2>
                    <pre className="bg-gray-800 p-4 rounded-md overflow-x-auto">
                      {JSON.stringify(content.metadata, null, 2)}
                    </pre>
                  </div>
                )}

                <div className="text-sm text-gray-400">
                  <p>创建时间: {new Date(content.created_at).toLocaleString()}</p>
                  <p>更新时间: {new Date(content.updated_at).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
