/**
 * 生成分享图片 — 奶蛙 MBTI 结果卡（纯 Canvas，无外部依赖）
 * - 画布高度按内容动态计算，避免底部大片空白。
 * - 配图按原图比例缩放进卡片，不做裁切（保证奶蛙的脸不被切掉）。
 */

import { getFigureSrc } from './figures.js'

const INK = '#4A3B2A'
const MUTED = '#8A7B6B'
const ACCENT = '#F5A623'
const ACCENT_SOFT = '#FFF3D6'
const TRACK = '#F0E4D0'

const FONT = {
  kicker: '400 22px system-ui, "PingFang SC", "Microsoft YaHei", sans-serif',
  code: '900 64px system-ui, "PingFang SC", "Microsoft YaHei", sans-serif',
  name: '700 32px system-ui, "PingFang SC", "Microsoft YaHei", sans-serif',
  badge: '500 20px system-ui, "PingFang SC", "Microsoft YaHei", sans-serif',
  quote: 'italic 600 24px system-ui, "PingFang SC", "Microsoft YaHei", sans-serif',
  dimLetter: '800 22px system-ui, "PingFang SC", "Microsoft YaHei", sans-serif',
  dimPct: '700 17px system-ui, "PingFang SC", "Microsoft YaHei", sans-serif',
  watermark: '400 17px system-ui, "PingFang SC", "Microsoft YaHei", sans-serif',
}

const FIG_MAX_W = 340
const FIG_MAX_H = 430

export async function generateShareImage(result, personalities, config) {
  const { type, item, dims, dimOrder } = result
  const ui = config?.display?.ui || {}
  const groups = personalities.groups || {}
  const persona = item || {}

  const dpr = 2
  const W = 720

  // ---- 先加载配图（尺寸参与布局，必须等它） ----
  const figure = await loadFigure(type, personalities)
  let figW = 0
  let figH = 0
  if (figure) {
    const iw = figure.naturalWidth || figure.width
    const ih = figure.naturalHeight || figure.height
    if (iw && ih) {
      figW = FIG_MAX_W
      figH = Math.round((figW * ih) / iw)
      if (figH > FIG_MAX_H) {
        figH = FIG_MAX_H
        figW = Math.round((figH * iw) / ih)
      }
    }
  }

  // ---- 用探针 canvas 测量文本换行 ----
  const probe = document.createElement('canvas')
  probe.width = W * dpr
  probe.height = 400 * dpr
  const pctx = probe.getContext('2d')
  pctx.scale(dpr, dpr)
  pctx.font = FONT.quote
  const quoteText = persona.quote ? `「${persona.quote}」` : ''
  const quoteLines = wrapText(pctx, quoteText, W - 200)

  // ---- 布局预算 ----
  const cardX = 32
  const cardW = W - 64
  const dimRowH = 40

  let y = 32 + 54 // kicker 基线
  const yKicker = y
  y += 62 // code
  const yCode = y
  y += 40 // name
  const yName = y
  y += 46 // badge 区
  const yBadge = y
  // badge 圆角矩形占 yBadge-26 ~ yBadge+12；配图必须从标签底下另起一段，
  // 否则（图片后绘制）会把标签下沿压住 —— 这里留 14px 间距。
  const yFigure = yBadge + 26
  y = figH ? yFigure + figH + 26 : yBadge + 12
  y += quoteLines.length * 34 + 14 // 台词
  const yQuote = y - quoteLines.length * 34 - 14
  y += 12 + dimOrder.length * dimRowH // 维度条
  const yDims = y - dimOrder.length * dimRowH
  const H = Math.max(900, Math.round(y + 74))

  // ---- 正式绘制 ----
  const canvas = document.createElement('canvas')
  canvas.width = W * dpr
  canvas.height = H * dpr
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'

  // 背景 + 卡片
  ctx.fillStyle = '#FFF7E6'
  ctx.fillRect(0, 0, W, H)
  roundRect(ctx, cardX, cardX, cardW, H - cardX * 2, 22)
  ctx.fillStyle = '#ffffff'
  ctx.fill()

  // Kicker
  ctx.font = FONT.kicker
  ctx.fillStyle = MUTED
  ctx.fillText(ui.resultKicker || '你的奶蛙家族人格是', W / 2, yKicker)

  // 类型码
  ctx.font = FONT.code
  ctx.fillStyle = ACCENT
  ctx.fillText(type, W / 2, yCode)

  // 人设名
  ctx.font = FONT.name
  ctx.fillStyle = INK
  ctx.fillText(persona.cn || '', W / 2, yName)

  // 组标签
  if (persona.group) {
    const badgeText = `${persona.group}｜${groups[persona.group] || ''}`
    ctx.font = FONT.badge
    const badgeW = ctx.measureText(badgeText).width + 44
    roundRect(ctx, (W - badgeW) / 2, yBadge - 26, badgeW, 38, 19)
    ctx.fillStyle = ACCENT_SOFT
    ctx.fill()
    ctx.fillStyle = ACCENT
    ctx.fillText(badgeText, W / 2, yBadge)
  }

  // 配图（按比例缩放，不裁切）
  if (figure && figW && figH) {
    const fx = (W - figW) / 2
    ctx.save()
    roundRect(ctx, fx, yFigure, figW, figH, 18)
    ctx.clip()
    ctx.fillStyle = ACCENT_SOFT
    ctx.fill()
    ctx.drawImage(figure, fx, yFigure, figW, figH)
    ctx.restore()
  }

  // 台词
  ctx.font = FONT.quote
  ctx.fillStyle = INK
  let qy = yQuote + 24
  for (const line of quoteLines) {
    ctx.fillText(line, W / 2, qy)
    qy += 34
  }

  // 四个维度
  const barLeft = cardX + 78
  const barRight = cardX + cardW - 126
  const barW = barRight - barLeft
  let dy = yDims + 34
  for (const key of dimOrder) {
    const dim = dims[key]
    const leftWin = dim.winner === dim.left

    ctx.textAlign = 'left'
    ctx.font = FONT.dimLetter
    ctx.fillStyle = leftWin ? ACCENT : '#C9BBA6'
    ctx.fillText(dim.left, cardX + 40, dy)

    // 轨道
    roundRect(ctx, barLeft, dy - 15, barW, 12, 6)
    ctx.fillStyle = TRACK
    ctx.fill()
    // 填充
    const fillW = Math.max(8, (dim.leftPercent / 100) * barW)
    roundRect(ctx, barLeft, dy - 15, fillW, 12, 6)
    ctx.fillStyle = leftWin ? ACCENT : '#C9BBA6'
    ctx.fill()
    // 中线
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(barLeft + barW / 2 - 1, dy - 18, 2, 18)

    ctx.font = FONT.dimLetter
    ctx.fillStyle = !leftWin ? ACCENT : '#C9BBA6'
    ctx.fillText(dim.right, barLeft + barW + 14, dy)

    ctx.textAlign = 'right'
    ctx.font = FONT.dimPct
    ctx.fillStyle = MUTED
    ctx.fillText(`${leftWin ? dim.leftPercent : dim.rightPercent}%`, cardX + cardW - 40, dy)

    dy += dimRowH
  }

  // 水印
  ctx.textAlign = 'center'
  ctx.font = FONT.watermark
  ctx.fillStyle = '#C3B49C'
  ctx.fillText(ui.shareWatermark || '奶蛙 MBTI 人格测试 · 仅供娱乐', W / 2, H - 56)

  const link = document.createElement('a')
  link.download = `naiwa-${type}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function wrapText(ctx, text, maxWidth) {
  if (!text) return []
  const lines = []
  let line = ''
  for (const char of text) {
    const test = line + char
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = char
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

function loadFigure(code, personalities) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = getFigureSrc(code, personalities)
  })
}
