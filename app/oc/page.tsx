"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function OcPage() {
  const router = useRouter()

  useEffect(() => {
    // 尝试从localStorage获取memberKey
    const memberKey = localStorage.getItem("memberToken")
    
    // 检查是否是移动设备客户端
    const isMobileApp = 
      /OMateMobile/.test(navigator.userAgent) || 
      /OMateClient/.test(navigator.userAgent)
    
    if (isMobileApp) {
      // 客户端访问，直接重定向到API
      if (memberKey) {
        // 使用查询参数方式
        window.location.href = `/api/cards/by-key?key=${encodeURIComponent(memberKey)}`;
      } else {
        // 尝试从API获取成员密钥
        fetch("/api/member-key")
          .then(response => {
            if (response.ok) {
              return response.text();
            }
            return "";
          })
          .then(key => {
            if (key && key.trim() !== "") {
              // 存储成员密钥并重定向
              localStorage.setItem("memberToken", key);
              window.location.href = `/api/cards/by-key?key=${encodeURIComponent(key)}`;
            } else {
              // 没有成员密钥，直接访问无需授权的API
              window.location.href = "/api/cards";
            }
          })
          .catch(error => {
            console.error("获取成员密钥失败:", error);
            // 错误时访问无需授权的API
            window.location.href = "/api/cards";
          });
      }
      return;
    }
    
    // 如果不是客户端访问，重定向到首页
    router.push("/");
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="text-center">
        <h1 className="text-2xl mb-4">正在处理请求...</h1>
        <p>如果页面没有自动跳转，请点击<a href="/" className="text-blue-400 underline">返回首页</a></p>
      </div>
    </div>
  )
} 