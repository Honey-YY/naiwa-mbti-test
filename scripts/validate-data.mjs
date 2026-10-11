import fs from 'node:fs'
import { score, tally, ALL_LETTERS, DIM_ORDER, DIM_PAIRS_EXPORT } from '../src/engine.js'

const readJSON = (path) => JSON.parse(fs.readFileSync(path, 'utf8'))

const questions = readJSON('data/questions.json')
const personalities = readJSON('data/personalities.json')
const config = readJSON('data/config.json')

const errors = []
const assert = (condition, message) => {
  if (!condition) errors.push(message)
}

const DIM_OF = { E: 'EI', I: 'EI', S: 'SN', N: 'SN', T: 'TF', F: 'TF', J: 'JP', P: 'JP' }

// ---- 16 型清单 ----
const order = personalities.order || []
const items = personalities.items || {}
const all16 = new Set()
for (const e of ['E', 'I']) for (const s of ['S', 'N']) for (const t of ['T', 'F']) for (const j of ['J', 'P']) all16.add(e + s + t + j)

assert(order.length === 16, `expected 16 types, got ${order.length}`)
assert(new Set(order).size === 16, 'order 中存在重复类型码')
for (const code of order) {
  const item = items[code]
  assert(item, `missing type ${code}`)
  if (!item) continue
  assert(all16.has(code), `${code} 不是合法的 MBTI 类型码`)
  assert(item.code === code, `${code} 的 item.code 与键名不一致`)
  assert(item.group && personalities.groups?.[item.group], `${code} 的 group 无效`)
  for (const key of ['cn', 'desc', 'quote']) {
    assert(item[key] && String(item[key]).trim(), `type ${code} missing ${key}`)
  }
}
assert(Object.keys(items).length === order.length, 'items 与 order 数量不一致')

// ---- 题目 ----
const main = questions.main || []
const declared = questions.meta?.questionCount
assert(typeof declared === 'number', 'questions.meta.questionCount 缺失')
assert(main.length === declared, `题数 ${main.length} != meta.questionCount ${declared}`)
assert(main.every((q, i) => q.id === `q${i + 1}`), '题号必须是从 q1 开始的连续序列')

const letterCount = Object.fromEntries(ALL_LETTERS.map((l) => [l, 0]))
const letterQuestions = Object.fromEntries(ALL_LETTERS.map((l) => [l, new Set()]))
let optionTotal = 0

for (const question of main) {
  assert(question.id, 'question missing id')
  assert(question.text, `question ${question.id} missing text`)
  const opts = question.options || []
  assert(opts.length >= 2, `question ${question.id} 选项少于 2 个`)

  const ids = new Set()
  const dimsInQuestion = new Set()
  for (const option of opts) {
    optionTotal += 1
    assert(option.label && String(option.label).trim(), `question ${question.id}${option.id} 选项文案为空`)
    assert(!ids.has(option.id), `question ${question.id} 选项 id 重复 ${option.id}`)
    ids.add(option.id)
    assert(Array.isArray(option.dims) && option.dims.length >= 1, `question ${question.id}${option.id} dims 缺失`)
    for (const dim of option.dims || []) {
      assert(ALL_LETTERS.includes(dim), `question ${question.id}${option.id} 非法维度标签 ${dim}`)
      if (ALL_LETTERS.includes(dim)) {
        letterCount[dim] += 1
        letterQuestions[dim].add(question.id)
        dimsInQuestion.add(DIM_OF[dim])
      }
    }
    for (const [left, right] of [['E', 'I'], ['S', 'N'], ['T', 'F'], ['J', 'P']]) {
      assert(
        !((option.dims || []).includes(left) && (option.dims || []).includes(right)),
        `question ${question.id}${option.id} 同时包含 ${left} 与 ${right}`,
      )
    }
  }
  // 多选题（如 q6/q7/q12）有意覆盖多个维度，上限设为 4（四维全集）
  assert(dimsInQuestion.size <= 4, `question ${question.id} 影响的维度超过 4 个`)
}

assert(optionTotal === questions.meta?.optionCount, `选项数 ${optionTotal} != meta.optionCount ${questions.meta?.optionCount}`)

// ---- 每维两极都要有题目支撑 ----
for (const { key, left, right } of DIM_PAIRS_EXPORT) {
  assert(letterCount[left] > 0, `维度 ${key} 的左极 ${left} 没有任何选项`)
  assert(letterCount[right] > 0, `维度 ${key} 的右极 ${right} 没有任何选项`)
}

// ---- 16 型可达性：随机作答大样本，统计实际出现的类型 ----
function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = mulberry32(20261011)
const N = 200000
const typeCount = Object.fromEntries([...all16].map((t) => [t, 0]))
for (let i = 0; i < N; i += 1) {
  const answers = {}
  for (const question of main) {
    answers[question.id] = question.options[Math.floor(rand() * question.options.length)].id
  }
  const result = score(answers, main, personalities, config.scoring)
  if (typeCount[result.type] != null) typeCount[result.type] += 1
}
const unreachable = [...all16].filter((t) => typeCount[t] === 0)
assert(unreachable.length === 0, `以下类型在 ${N} 次随机作答中从未出现：${unreachable.join(', ')}`)

// ---- 引擎自检 ----
const sampleAnswers = Object.fromEntries(main.map((q) => [q.id, q.options[0].id]))
const sample = score(sampleAnswers, main, personalities, config.scoring)
assert(/^[EI][SN][TF][JP]$/.test(sample.type), `score() 返回的类型码非法：${sample.type}`)
assert(sample.item, `score() 未匹配到人设：${sample.type}`)
assert(sample.answered === main.length, 'score() 统计的作答数不正确')

// ---- 配图 ----
// 1) 占位图必须齐（没配到素材的型号会回退到它）
for (const code of order) {
  assert(fs.existsSync(`public/figures/${code}.svg`), `missing placeholder public/figures/${code}.svg`)
}

// 2) 专属素材映射（personalities.json 的 figure 字段 → public/wafrog/）
const FIGURE_DIR = 'public/wafrog'
const figureUse = new Map()
const withFigure = []
const withoutFigure = []
for (const code of order) {
  const file = items[code]?.figure
  if (file === null || file === undefined || file === '') {
    withoutFigure.push(code)
    continue
  }
  assert(typeof file === 'string', `${code} 的 figure 必须是字符串或 null`)
  assert(!file.includes('/') && !file.includes('..'), `${code} 的 figure 不允许包含路径：${file}`)
  assert(fs.existsSync(`${FIGURE_DIR}/${file}`), `${code} 指定的配图不存在：${FIGURE_DIR}/${file}`)
  if (!figureUse.has(file)) figureUse.set(file, [])
  figureUse.get(file).push(code)
  withFigure.push(code)
}
for (const [file, codes] of figureUse) {
  assert(codes.length === 1, `配图被多个型号共用（宁缺毋滥，应各配一张）：${file} → ${codes.join(', ')}`)
}

// 3) 页面背景图（config.display.background.image → public/ 下的文件）
const bgImage = config.display?.background?.image
if (bgImage) {
  assert(typeof bgImage === 'string', 'display.background.image 必须是字符串')
  assert(!bgImage.includes('..'), `display.background.image 不允许包含 ..：${bgImage}`)
  assert(fs.existsSync(`public/${bgImage}`), `背景图不存在：public/${bgImage}`)
}

// ---- 报告 ----
if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join('\n'))
  process.exit(1)
}

console.log(`✓ ${main.length} 题 / ${optionTotal} 个选项 / ${order.length} 型 / 专属配图 ${withFigure.length} 型、占位 ${withoutFigure.length} 型`)
console.log(`  页面背景图：${bgImage ? `public/${bgImage}` : '（未配置，纯色底）'}`)
console.log('')
console.log('维度考点分布（每个字母被多少选项/多少题覆盖）：')
console.log('| 维度 | 左极 | 选项数 | 题数 | 右极 | 选项数 | 题数 |')
console.log('|---|---|---|---|---|---|---|')
for (const { key, left, right } of DIM_PAIRS_EXPORT) {
  console.log(
    `| ${key} | ${left} | ${letterCount[left]} | ${letterQuestions[left].size} | ${right} | ${letterCount[right]} | ${letterQuestions[right].size} |`,
  )
}
console.log('')
const sorted = [...all16].sort((a, b) => typeCount[b] - typeCount[a])
console.log(`16 型随机作答分布（seed=20261011, N=${N}；这是随机分布，不代表真人比例）：`)
console.log('| 类型 | 人设 | 次数 | 占比 |')
console.log('|---|---|---|---|')
for (const type of sorted) {
  const pct = ((typeCount[type] / N) * 100).toFixed(2)
  console.log(`| ${type} | ${items[type]?.cn || ''} | ${typeCount[type]} | ${pct}% |`)
}
console.log('')
console.log(`配图映射（专属 ${withFigure.length} / ${order.length}）：`)
console.log('| 类型 | 人设 | 配图 |')
console.log('|---|---|---|')
for (const code of order) {
  const file = items[code]?.figure
  console.log(`| ${code} | ${items[code]?.cn || ''} | ${file || '_(待补，暂用占位图)_'} |`)
}
if (withoutFigure.length) {
  console.log('')
  console.log(`待补素材的型号（${withoutFigure.length}）：${withoutFigure.map((c) => `${c} ${items[c]?.cn || ''}`).join('、')}`)
}
