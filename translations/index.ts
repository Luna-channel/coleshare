import en from "./en"
import zhCN from "./zh-CN"
import zhTW from "./zh-TW"
import ja from "./ja"
import ko from "./ko"

export const translations = {
  en: en,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
  ja: ja,
  ko: ko,
}

export type TranslationKey = keyof typeof en
