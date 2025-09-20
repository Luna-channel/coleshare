"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Download, QrCode, ExternalLink } from "lucide-react"
import Link from "next/link"
import QRCode from "qrcode"
import React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function ViewContent({ params }: { params: any }) {
  const unwrappedParams = React.use(params) as { id: string }
  const [content, setContent] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("")
  const router = useRouter()

  useEffect(() => {
    const fetchContent = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const token = localStorage.getItem("adminToken") || localStorage.getItem("memberToken") || ""
        const response = await fetch(`/api/contents/${unwrappedParams.id}`, {
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
  }, [unwrappedParams.id, router])

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
      case "story_book":
        return "故事书"
      default:
        return "未知类型"
    }
  }

  // 判断是否显示图像
  const shouldShowImage = () => {
    return !!content?.thumbnail_url;
  }

  // 处理文件下载
  const handleDownload = async () => {
    try {
      // 从URL中提取文件名
      const url = content.blob_url;
      const urlParts = url.split('/');
      let fileName = urlParts[urlParts.length - 1];

      // 如果文件名包含查询参数，去掉它们
      if (fileName.includes('?')) {
        fileName = fileName.split('?')[0];
      }

      // 根据内容类型设置更友好的文件名
      const typeLabel = getTypeLabel(content.content_type);
      const cleanName = content.name.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_');

      // 确保文件扩展名正确
      let extension = fileName.split('.').pop();
      if (!extension || extension.length > 5) {
        // 根据内容类型设置默认扩展名
        if (content.content_type === 'character_card') {
          extension = 'png';
        } else {
          extension = 'json';
        }
      }

      // 确保文件名有正确的前缀
      const downloadName = `${cleanName}_${typeLabel}.${extension}`;
      console.log('下载文件名:', downloadName);

      // --- 地址修正代码 开始 ---
      const lastSlashIndex = url.lastIndexOf('/');
      const baseUrl = url.substring(0, lastSlashIndex + 1);
      const filename = url.substring(lastSlashIndex + 1);
      const correctUrl = baseUrl + encodeURIComponent(filename);
      console.log('原始URL:', url);
      console.log('修复后的URL:', correctUrl);
      // --- 地址修正代码 结束 ---

      // 获取文件内容
      const response = await fetch(correctUrl);
      if (!response.ok) {
        throw new Error('获取文件内容失败');
      }

      const blob = await response.blob();

      // 创建下载链接
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = downloadName;

      // 模拟点击下载
      document.body.appendChild(link);
      link.click();

      // 清理
      setTimeout(() => {
        window.URL.revokeObjectURL(downloadUrl);
        document.body.removeChild(link);
      }, 100);
    } catch (error) {
      console.error('下载文件失败:', error);
      alert('下载文件失败，请稍后重试');
    }
  };

  // 处理显示二维码
  const handleShowQRCode = async () => {
    try {
      if (!content || !content.blob_url) {
        throw new Error("内容链接不可用");
      }

      // 生成二维码
      const qrDataUrl = await QRCode.toDataURL(content.blob_url);
      setQrCodeDataUrl(qrDataUrl);

      // 打开对话框
      setQrDialogOpen(true);
    } catch (error) {
      console.error("生成二维码失败:", error);
      alert("生成二维码失败");
    }
  };

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
          <Button asChild variant="outline" className="mb-6 bg-gray-800 text-white border-gray-700 hover:bg-gray-700">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              <span>返回首页</span>
            </Link>
          </Button>

          <div className="flex flex-col md:flex-row gap-8">
            {/* 左侧：图片预览 */}
            <div className="w-full md:w-1/3">
              {shouldShowImage() ? (
                <div className="aspect-[3/4] rounded-lg overflow-hidden border border-gray-700">
                  <img
                    src={content.thumbnail_url}
                    alt={content.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // 图片加载失败时隐藏图片元素
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              ) : (
                <div className="aspect-[3/4] rounded-lg overflow-hidden border border-gray-700 bg-gradient-to-b from-blue-800 to-blue-900"></div>
              )}

              <div className="mt-4 flex gap-2">
                <Button className="flex-1" onClick={handleDownload}>
                  <Download className="mr-2 h-4 w-4" />
                  <span>下载{getTypeLabel(content.content_type)}</span>
                </Button>
                <Button
                  variant="outline"
                  className="bg-gray-800 text-white border-gray-700 hover:bg-gray-700"
                  onClick={handleShowQRCode}
                >
                  <QrCode className="h-4 w-4" />
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

                {content.metadata && content.content_type !== "character_card" && (
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold mb-2">元数据</h2>
                    <pre className="bg-gray-800 p-4 rounded-md overflow-x-auto">
                      {JSON.stringify(content.metadata, null, 2)}
                    </pre>
                  </div>
                )}

                {/* 角色卡相关资源 */}
                {content.content_type === "character_card" && content.related_resources && (
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold mb-2">相关资源</h2>
                    {content.related_resources.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {content.related_resources.map((resource: any, index: number) => (
                          <Link href={`/view/${resource.id}`} key={index}>
                            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 hover:border-purple-500 transition-all">
                              <div className="flex items-start gap-3">
                                {resource.thumbnail_url ? (
                                  <img
                                    src={resource.thumbnail_url}
                                    alt={resource.name}
                                    className="w-16 h-16 object-cover rounded-md"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <div className="w-16 h-16 rounded-md bg-gradient-to-b from-gray-700 to-gray-800 flex items-center justify-center">
                                    <span className="text-xs text-gray-400">{getTypeLabel(resource.content_type).substring(0, 2)}</span>
                                  </div>
                                )}
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-purple-400">{getTypeLabel(resource.content_type)}</div>
                                  <div className="font-semibold">{resource.name}</div>
                                  <div className="text-xs text-gray-400 flex items-center mt-1">
                                    <ExternalLink className="w-3 h-3 mr-1" />
                                    <span>查看详情</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-gray-400">
                        暂无相关资源
                      </div>
                    )}
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

      {/* 二维码对话框 */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-md bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>扫描二维码下载</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-4">
            {qrCodeDataUrl && (
              <img src={qrCodeDataUrl} alt="QR Code" className="w-64 h-64 bg-white p-4 rounded-lg" />
            )}
            <p className="mt-4 text-sm text-center text-gray-500">
              扫描二维码获取{getTypeLabel(content?.content_type)}下载链接
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
