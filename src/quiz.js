import { shuffle } from './utils.js'

/**
 * 答题控制器
 * 与底座的区别：去掉「敬局门控」与随机插入，改为 12 道固定顺序题（config.behavior.shuffleQuestions 可开洗牌）
 */
export function createQuiz(questions, config, onComplete) {
  const pool = questions.main
  const useShuffle = config.behavior?.shuffleQuestions === true

  let queue = []
  let current = 0
  let answers = {}

  const els = {
    fill: document.getElementById('progress-fill'),
    text: document.getElementById('progress-text'),
    qText: document.getElementById('question-text'),
    options: document.getElementById('options'),
  }

  function totalCount() {
    return queue.length
  }

  function updateProgress() {
    els.fill.style.width = `${(current / totalCount()) * 100}%`
    els.text.textContent = `${current} / ${totalCount()}`
  }

  function renderQuestion() {
    const question = queue[current]
    els.qText.textContent = question.text

    els.options.innerHTML = ''
    question.options.forEach((option) => {
      const btn = document.createElement('button')
      btn.className = 'btn btn-option'
      btn.type = 'button'
      btn.textContent = option.label
      btn.addEventListener('click', () => selectOption(question, option))
      els.options.appendChild(btn)
    })

    updateProgress()
  }

  function selectOption(question, option) {
    answers[question.id] = option.id
    current += 1

    if (current >= totalCount()) {
      updateProgress()
      onComplete(answers)
    } else {
      renderQuestion()
    }
  }

  function start() {
    current = 0
    answers = {}
    queue = useShuffle ? shuffle(pool) : [...pool]
    renderQuestion()
  }

  return { start }
}
