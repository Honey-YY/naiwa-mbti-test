/**
 * 评分引擎 — MBTI 四维二元模型（纯函数，无 DOM 依赖）
 *
 * 规则：
 *   ① 每个选项带 dims（如 ["E"] 或 ["S","E"]），被选中则给其中每个字母各 +1
 *   ② 四个维度两两比较：E/I、S/N、T/F、J/P，得分高的一极胜出
 *   ③ 四个胜出字母依次组合 → 4 位类型码（如 INTJ）
 *   ④ 平局（两极相等）按 config.tieBreak 指定的字母裁定，并记录在 tieBroken
 *   ⑤ 同时给出每维的倾向强度，供结果页展示
 */

const DIM_PAIRS = [
  { key: 'EI', left: 'E', right: 'I' },
  { key: 'SN', left: 'S', right: 'N' },
  { key: 'TF', left: 'T', right: 'F' },
  { key: 'JP', left: 'J', right: 'P' },
]

export const ALL_LETTERS = ['E', 'I', 'S', 'N', 'T', 'F', 'J', 'P']
const LETTER_SET = new Set(ALL_LETTERS)

export const DIM_ORDER = DIM_PAIRS.map((dim) => dim.key)
export const DIM_PAIRS_EXPORT = DIM_PAIRS

/** 只做「字母计数」，供校验与展示复用 */
export function tally(answers, questions) {
  const count = Object.fromEntries(ALL_LETTERS.map((letter) => [letter, 0]))
  let answered = 0
  for (const question of questions) {
    const picked = answers[question.id]
    if (picked == null) continue
    const option = question.options.find((item) => item.id === picked)
    if (!option) continue
    answered += 1
    for (const dim of option.dims || []) {
      if (LETTER_SET.has(dim)) count[dim] += 1
    }
  }
  return { count, answered }
}

/**
 * 计算 MBTI 结果
 * @param {Object} answers       { q1: 'A', q3: 'B', ... } 选项 id
 * @param {Array}  questions     data/questions.json 的 main
 * @param {Object} personalities data/personalities.json
 * @param {Object} config        data/config.json 的 scoring 段（含 tieBreak）
 */
export function score(answers, questions, personalities, config = {}) {
  const tieBreak = config.tieBreak || { EI: 'I', SN: 'N', TF: 'F', JP: 'P' }
  const { count, answered } = tally(answers, questions)

  const dims = {}
  const letters = []
  const tieBroken = []

  for (const { key, left, right } of DIM_PAIRS) {
    const leftScore = count[left]
    const rightScore = count[right]
    const total = leftScore + rightScore

    let winner
    if (leftScore > rightScore) winner = left
    else if (rightScore > leftScore) winner = right
    else {
      winner = tieBreak[key] || left
      tieBroken.push(key)
    }

    const leftPercent = total ? Math.round((leftScore / total) * 100) : 50

    dims[key] = {
      key,
      left,
      right,
      leftScore,
      rightScore,
      total,
      winner,
      lead: Math.abs(leftScore - rightScore),
      leftPercent,
      rightPercent: total ? 100 - leftPercent : 50,
      tie: leftScore === rightScore,
      strong: total ? Math.abs(leftScore - rightScore) / total >= 0.5 : false,
    }

    letters.push(winner)
  }

  const type = letters.join('')
  const item = personalities.items?.[type] || null

  return {
    type,
    code: type,
    item,
    group: item?.group || type.slice(0, 2),
    dims,
    dimOrder: DIM_ORDER,
    letters,
    tieBroken,
    answered,
    total: questions.length,
    count,
  }
}

/** 供校验脚本使用：列出该类型在这次作答中的依据 */
export function explain(type, answers, questions) {
  const rows = []
  for (const question of questions) {
    const option = question.options.find((item) => item.id === answers[question.id])
    if (!option) continue
    if ((option.dims || []).some((dim) => type.includes(dim))) {
      rows.push(`${question.id}${option.id} → ${(option.dims || []).join('+')}`)
    }
  }
  return rows
}
