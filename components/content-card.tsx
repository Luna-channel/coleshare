"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Edit2, Trash2, Download, Eye } from "lucide-react"
import Link from "next/link"

interface ContentCardProps {
  content: {
    id: number
    name: string
    description: string
    content_type: string
    thumbnail_url: string
    blob_url: string
    tags?: string[]
  }
  onEdit: () => void
  onDelete: () => void
  isAdmin: boolean
}

export function ContentCard({ content, onEdit, onDelete, isAdmin }: ContentCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  // 根据内容类型设置不同的图标和样式
  const getTypeStyles = () => {
    switch (content.content_type) {
      case "character_card":
        return {
          bgGradient: "from-purple-800 to-purple-900",
          hoverBorder: "border-purple-500/50",
          hoverShadow: "shadow-purple-500/20",
        }
      case "knowledge_base":
        return {
          bgGradient: "from-blue-800 to-blue-900",
          hoverBorder: "border-blue-500/50",
          hoverShadow: "shadow-blue-500/20",
        }
      case "event_book":
        return {
          bgGradient: "from-green-800 to-green-900",
          hoverBorder: "border-green-500/50",
          hoverShadow: "shadow-green-500/20",
        }
      case "prompt_injection":
        return {
          bgGradient: "from-amber-800 to-amber-900",
          hoverBorder: "border-amber-500/50",
          hoverShadow: "shadow-amber-500/20",
        }
      case "story_book":
        return {
          bgGradient: "from-teal-800 to-teal-900",
          hoverBorder: "border-teal-500/50",
          hoverShadow: "shadow-teal-500/20",
        }
      default:
        return {
          bgGradient: "from-gray-800 to-gray-900",
          hoverBorder: "border-gray-500/50",
          hoverShadow: "shadow-gray-500/20",
        }
    }
  }

  const styles = getTypeStyles()

  // 内容类型中文名称
  const getTypeLabel = () => {
    switch (content.content_type) {
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

  // 获取内容类型的默认占位图
  const getPlaceholderImage = () => {
    switch (content.content_type) {
      case "character_card":
        return "/placeholder.svg?height=400&width=300&text=角色卡"
      case "knowledge_base":
        return "/placeholder.svg?height=400&width=300&text=知识库"
      case "event_book":
        return "/placeholder.svg?height=400&width=300&text=事件书"
      case "prompt_injection":
        return "/placeholder.svg?height=400&width=300&text=提示注入"
      case "story_book":
        return "/placeholder.svg?height=400&width=300&text=故事书"
      default:
        return "/placeholder.svg?height=400&width=300"
    }
  }

  return (
    <Card
      className={`overflow-hidden relative group border-0 rounded-lg bg-gradient-to-b ${styles.bgGradient} shadow-lg transition-all duration-300 hover:${styles.hoverShadow} hover:scale-[1.02]`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative aspect-[3/4] overflow-hidden">
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent z-10"
          style={{ opacity: isHovered ? 0.9 : 0.7 }}
        />
        <img
          src={content.thumbnail_url || getPlaceholderImage()}
          alt={content.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          onError={(e) => {
            // 图片加载失败时使用占位图
            e.currentTarget.src = getPlaceholderImage();
          }}
        />

        <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
          <div className="mb-1 text-xs font-medium text-gray-300">{getTypeLabel()}</div>
          <h3 className="text-xl font-bold text-white mb-1">{content.name}</h3>
          <p className="text-sm text-gray-200 line-clamp-2 mb-2">{content.description}</p>
        </div>
      </div>

      <div
        className={`absolute top-2 right-2 flex gap-2 z-20 transition-opacity duration-300 ${
          isHovered ? "opacity-100" : "opacity-0"
        }`}
      >
        <Link href={`/view/${content.id}`}>
          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full bg-black/50 hover:bg-blue-600 text-white">
            <Eye className="h-4 w-4" />
            <span className="sr-only">查看</span>
          </Button>
        </Link>

        {isAdmin && (
          <>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-full bg-black/50 hover:bg-green-600 text-white"
              onClick={onEdit}
            >
              <Edit2 className="h-4 w-4" />
              <span className="sr-only">编辑</span>
            </Button>

            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-full bg-black/50 hover:bg-red-600 text-white"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">删除</span>
            </Button>
          </>
        )}

        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 rounded-full bg-black/50 hover:bg-amber-600 text-white"
          onClick={() => window.open(content.blob_url, "_blank")}
        >
          <Download className="h-4 w-4" />
          <span className="sr-only">下载</span>
        </Button>
      </div>

      {/* 悬停时的发光边框效果 */}
      <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className={`absolute inset-0 rounded-lg border ${styles.hoverBorder}`}></div>
      </div>
    </Card>
  )
}
