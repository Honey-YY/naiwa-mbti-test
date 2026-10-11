import fs from 'node:fs'

/**
 * 生成 16 张占位配图（原创几何造型的奶蛙，不使用任何第三方形象素材）。
 *
 * 说明：结果页配图优先使用 data/personalities.json 里 `figure` 指定的素材
 * （来自 public/wafrog/）；只有该型还没配到合适素材时，才会用到这里的占位图。
 * 因此这里画的是「中性、明显是占位」的造型，不追求表情个性。
 */

const personalities = JSON.parse(fs.readFileSync('data/personalities.json', 'utf8'))
const outDir = 'public/figures'

fs.mkdirSync(outDir, { recursive: true })

// 16 型强调色（按 NT / NF / SJ / SP 四组色系排布）
const ACCENTS = {
  INTJ: ['#4C7DF0', '#2F4B8F'],
  INTP: ['#3E68D6', '#27407F'],
  ENTJ: ['#5B8DEF', '#33509C'],
  ENTP: ['#6E9BF5', '#3D5BB0'],

  INFJ: ['#A06BE0', '#5F3E9C'],
  INFP: ['#B287E8', '#7048A8'],
  ENFJ: ['#8E5BD0', '#523184'],
  ENFP: ['#C99BEF', '#8A5BC4'],

  ISTJ: ['#3FAF74', '#256B47'],
  ISFJ: ['#58C48B', '#2E8B57'],
  ESTJ: ['#2E9A66', '#1C5E3E'],
  ESFJ: ['#6BD3A0', '#37976B'],

  ISTP: ['#F5A623', '#B37100'],
  ISFP: ['#FFB84D', '#C17F00'],
  ESTP: ['#FF8F3C', '#B75B00'],
  ESFP: ['#FFC93C', '#C08F00'],
}

const BODY = '#FFD75E'
const BODY_DARK = '#E8B63A'
const INK = '#3D2E1B'
const IRIS = '#8FBE7A'
const CHEEK = '#FF9DB0'

const escapeHTML = (value) =>
  String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]))

function figureSVG(item) {
  const [accent, accentDark] = ACCENTS[item.code] || ACCENTS.ESFP
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640" viewBox="0 0 960 640" role="img" aria-label="${escapeHTML(item.cn)} · ${escapeHTML(item.code)}">
  <defs>
    <clipPath id="card"><rect width="960" height="640" rx="44" /></clipPath>
  </defs>
  <g clip-path="url(#card)">
    <rect width="960" height="640" fill="${accent}" opacity="0.14" />
    <circle cx="150" cy="120" r="90" fill="${accent}" opacity="0.18" />
    <circle cx="830" cy="540" r="120" fill="${accent}" opacity="0.16" />

    <!-- 奶蛙 -->
    <g transform="translate(400,320)">
      <!-- 脚 -->
      <ellipse cx="-62" cy="196" rx="42" ry="27" fill="${BODY_DARK}" />
      <ellipse cx="62" cy="196" rx="42" ry="27" fill="${BODY_DARK}" />
      <!-- 手 -->
      <ellipse cx="-134" cy="96" rx="32" ry="48" fill="${BODY}" transform="rotate(-12 -134 96)" />
      <ellipse cx="134" cy="96" rx="32" ry="48" fill="${BODY}" transform="rotate(12 134 96)" />
      <!-- 身体 -->
      <ellipse cx="0" cy="92" rx="130" ry="114" fill="${BODY}" />
      <ellipse cx="0" cy="118" rx="82" ry="78" fill="#FFF6DC" />
      <!-- 头 -->
      <circle cx="0" cy="-58" r="118" fill="${BODY}" />
      <!-- 眼（大眼 + 绿色虹膜，奶蛙的标志） -->
      <circle cx="-46" cy="-94" r="34" fill="#FFFFFF" />
      <circle cx="46" cy="-94" r="34" fill="#FFFFFF" />
      <circle cx="-46" cy="-94" r="23" fill="${IRIS}" />
      <circle cx="46" cy="-94" r="23" fill="${IRIS}" />
      <circle cx="-46" cy="-94" r="11.5" fill="${INK}" />
      <circle cx="46" cy="-94" r="11.5" fill="${INK}" />
      <circle cx="-39" cy="-101" r="4.5" fill="#ffffff" />
      <circle cx="53" cy="-101" r="4.5" fill="#ffffff" />
      <!-- 腮红 -->
      <ellipse cx="-88" cy="-34" rx="22" ry="13" fill="${CHEEK}" opacity="0.66" />
      <ellipse cx="88" cy="-34" rx="22" ry="13" fill="${CHEEK}" opacity="0.66" />
      <!-- 宽嘴 -->
      <path d="M-40 -12 q40 26 80 0" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round" />
    </g>

    <!-- 文字 -->
    <text x="700" y="268" text-anchor="middle" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="96" font-weight="900" fill="${accentDark}">${escapeHTML(item.code)}</text>
    <text x="700" y="330" text-anchor="middle" font-family="system-ui, 'PingFang SC', 'Microsoft YaHei', sans-serif" font-size="40" font-weight="800" fill="${INK}">${escapeHTML(item.cn)}</text>
    <text x="700" y="382" text-anchor="middle" font-family="system-ui, 'PingFang SC', 'Microsoft YaHei', sans-serif" font-size="24" font-weight="600" fill="${accentDark}" opacity="0.7">奶蛙家族 · 配图待补</text>
  </g>
</svg>
`
}

for (const code of personalities.order) {
  fs.writeFileSync(`${outDir}/${code}.svg`, figureSVG(personalities.items[code]))
}

console.log(`Generated ${personalities.order.length} placeholder figures in ${outDir}`)
