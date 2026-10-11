import { score } from './engine.js'
import { createQuiz } from './quiz.js'
import { renderResult } from './result.js'
import { getBackgroundSrc } from './figures.js'

async function loadJSON(path) {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`加载失败：${path}`)
  return res.json()
}

async function init() {
  const [questions, personalities, config] = await Promise.all([
    loadJSON(new URL('../data/questions.json', import.meta.url).href),
    loadJSON(new URL('../data/personalities.json', import.meta.url).href),
    loadJSON(new URL('../data/config.json', import.meta.url).href),
  ])

  const pages = {
    intro: document.getElementById('page-intro'),
    quiz: document.getElementById('page-quiz'),
    result: document.getElementById('page-result'),
  }

  function showPage(name) {
    Object.values(pages).forEach((page) => page.classList.remove('active'))
    pages[name].classList.add('active')
    window.scrollTo(0, 0)
  }

  function onQuizComplete(answers) {
    const result = score(answers, questions.main, personalities, config.scoring)
    renderResult(result, personalities, config)
    showPage('result')
  }

  const quiz = createQuiz(questions, config, onQuizComplete)

  // 页面背景图（首屏即生效；配置为空则回退纯色底）
  const bgLayer = document.getElementById('page-bg')
  const bgSrc = getBackgroundSrc(config)
  if (bgLayer) {
    if (bgSrc) {
      bgLayer.style.backgroundImage = `url("${bgSrc}")`
      document.documentElement.classList.add('has-bg')
    } else {
      bgLayer.remove()
    }
  }

  const ui = config.display?.ui || {}
  if (ui.introTitleHtml) document.getElementById('intro-title').textContent = ui.introTitleHtml
  if (ui.introLead) document.getElementById('intro-lead').textContent = ui.introLead

  const credit = document.getElementById('intro-credit')
  if (credit) {
    if (config.display?.author) credit.textContent = config.display.author
    else credit.remove()
  }

  document.getElementById('btn-start').addEventListener('click', () => {
    quiz.start()
    showPage('quiz')
  })

  document.getElementById('btn-restart').addEventListener('click', () => {
    quiz.start()
    showPage('quiz')
  })
}

init()
