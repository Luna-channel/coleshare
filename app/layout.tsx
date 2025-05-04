import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { LanguageProvider } from "@/contexts/language-context"
import { getSiteSettings } from "@/lib/db"

const inter = Inter({ subsets: ["latin"] })

export async function generateMetadata(): Promise<Metadata> {
  // 获取站点设置
  try {
    const settings = await getSiteSettings()
    
    return {
      title: settings?.page_title || "OMateShare",
      description: settings?.meta_description || "管理角色卡、知识库、事件书和提示注入",
      generator: 'v0.dev'
    }
  } catch (error) {
    console.error("获取站点设置失败:", error)
    
    // 返回默认值
    return {
      title: "OMateShare",
      description: "管理角色卡、知识库、事件书和提示注入",
      generator: 'v0.dev'
    }
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  )
}
