"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import * as React from 'react'

export default function OcWithMemberKey() {
  const params = useParams()
  const router = useRouter()
  
  // 作为客户端组件，我们不需要使用React.use，直接获取参数即可
  // Next.js在客户端组件中的useParams()已经处理了这个问题
  const memberKey = params.memberKey as string || ""

  useEffect(() => {
    // 保存memberKey到本地存储，以便后续API请求使用
    if (memberKey) {
      localStorage.setItem("memberToken", memberKey)
      
      // 如果是移动设备客户端，重定向到带有key查询参数的API
      const isMobileApp = 
        /OMateMobile/.test(navigator.userAgent) || 
        /OMateClient/.test(navigator.userAgent)
      
      if (isMobileApp) {
        // 使用查询参数方式重定向到API
        const apiUrl = new URL(`/api/cards/by-key`, window.location.origin);
        apiUrl.searchParams.append('key', memberKey);
        window.location.href = apiUrl.toString();
        return;
      }
    }
    
    // 如果不是客户端或者memberKey无效，重定向到首页
    router.push("/")
  }, [memberKey, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="text-center">
        <h1 className="text-2xl mb-4">正在处理请求...</h1>
        <p>如果页面没有自动跳转，请点击<a href="/" className="text-blue-400 underline">返回首页</a></p>
      </div>
    </div>
  )
} 