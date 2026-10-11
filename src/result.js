import { getFigureSrc, hasFigure } from './figures.js'
import { generateShareImage } from './share.js'

/**
 * 渲染 MBTI 结果页
 * @param {Object} result        engine.score() 的返回值
 * @param {Object} personalities data/personalities.json
 * @param {Object} config        data/config.json
 */
export function renderResult(result, personalities, config) {
  const { type, item, dims, dimOrder } = result
  const ui = config.display?.ui || {}
  const groups = personalities.groups || {}
  const persona = item || {}

  // Kicker
  document.getElementById('result-kicker').textContent = ui.resultKicker || '你的奶蛙家族人格是'

  // 配图（有专属素材用素材，没有则回退占位图并标注）
  const wrap = document.getElementById('result-figure-wrap')
  const img = document.getElementById('result-figure')
  const cap = document.getElementById('result-figure-cap')
  if (wrap && img) {
    const has = hasFigure(type, personalities)
    wrap.hidden = true
    if (cap) cap.textContent = has ? '' : '该型配图待补'
    img.onload = () => { wrap.hidden = false }
    img.onerror = () => { wrap.hidden = true }
    img.src = getFigureSrc(type, personalities)
    img.alt = `${type} · ${persona.cn || ''}`
  }

  // 类型码 + 人设名
  document.getElementById('result-code').textContent = type
  document.getElementById('result-name').textContent = persona.cn || ''

  // 组标签
  const badge = document.getElementById('result-badge')
  if (persona.group) {
    badge.textContent = `${persona.group}｜${groups[persona.group] || ''}`
    badge.style.display = ''
  } else {
    badge.style.display = 'none'
  }

  // 台词
  const quoteEl = document.getElementById('result-quote')
  quoteEl.textContent = persona.quote ? `「${persona.quote}」` : ''

  // 描述
  document.getElementById('result-desc').textContent = persona.desc || ''

  // 四个维度
  const titleEl = document.getElementById('dims-title')
  if (titleEl) titleEl.textContent = ui.dimsTitle || '你的四个性格维度'
  const subEl = document.getElementById('dims-sub')
  if (subEl) subEl.textContent = ui.dimsSub || ''

  const listEl = document.getElementById('dims-list')
  listEl.innerHTML = ''
  for (const key of dimOrder) {
    const dim = dims[key]
    const leftWin = dim.winner === dim.left
    const winPct = leftWin ? dim.leftPercent : dim.rightPercent
    const row = document.createElement('div')
    row.className = 'dim-row'
    row.innerHTML = `
      <span class="dim-letter${leftWin ? ' dim-win' : ''}">${dim.left}</span>
      <div class="dim-track">
        <div class="dim-fill" style="width:${dim.leftPercent}%"></div>
        <div class="dim-mid"></div>
      </div>
      <span class="dim-letter${!leftWin ? ' dim-win' : ''}">${dim.right}</span>
      <span class="dim-pct">${winPct}%</span>
    `
    listEl.appendChild(row)
  }

  // 免责声明
  document.getElementById('disclaimer').innerHTML = config.display.funNote

  // 下载分享图
  document.getElementById('btn-download').onclick = () => {
    generateShareImage(result, personalities, config)
  }

  return result
}
