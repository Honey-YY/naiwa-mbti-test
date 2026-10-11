/**
 * 结果配图取址
 *
 * 优先用作者在 `奶蛙图片/` 里给的实拍/二创素材（配置在 data/personalities.json 的
 * 每个型号的 `figure` 字段，文件放在 public/wafrog/）；
 * 该型号还没配到合适素材时，回退到 scripts/generate-figures.mjs 生成的占位图。
 */

const BASE = (import.meta?.env?.BASE_URL) || '/'

/** 该型号是否已有专属配图 */
export function hasFigure(code, personalities) {
  return Boolean(personalities?.items?.[code]?.figure)
}

/** 返回该型号结果页 / 分享图应使用的图片地址 */
export function getFigureSrc(code, personalities) {
  const figure = personalities?.items?.[code]?.figure
  if (figure) return `${BASE}wafrog/${figure}`
  return `${BASE}figures/${code}.svg`
}

/**
 * 页面背景图取址
 *
 * 图源配置在 data/config.json 的 display.background.image（路径相对 public/），
 * 例如 "bg/background.png" 对应 public/bg/background.png。
 * 未配置时返回空串，页面回退到纯色底。
 */
export function getBackgroundSrc(config) {
  const image = config?.display?.background?.image
  if (!image) return ''
  return BASE + String(image).replace(/^\/+/, '')
}
