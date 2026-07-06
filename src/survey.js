import { db } from './firebase-config.js'
import { collection, addDoc, serverTimestamp } from "firebase/firestore"

export function initSurvey() {
  const step1 = document.getElementById('step1')
  const step2 = document.getElementById('step2')
  const step3 = document.getElementById('step3')
  const stepDone = document.getElementById('stepDone')
  const steps = [step1, step2, step3, stepDone]
  const progress = [document.getElementById('p1'), document.getElementById('p2'), document.getElementById('p3')]
  const status3 = document.getElementById('status3')

  function showStep(i) {
    steps.forEach((s, idx) => s.classList.toggle('active', idx === i))
    progress.forEach((p, idx) => p.classList.toggle('done', idx <= i))
  }

  const q1Boxes = document.querySelectorAll('input[name="q1"]')
  const next1 = document.getElementById('next1')
  q1Boxes.forEach(box => {
    box.addEventListener('change', () => {
      if (box.value === 'None of these' && box.checked) {
        q1Boxes.forEach(b => { if (b !== box) b.checked = false })
      } else if (box.checked) {
        document.querySelector('input[name="q1"][value="None of these"]').checked = false
      }
      next1.disabled = ![...q1Boxes].some(b => b.checked)
    })
  })
  next1.addEventListener('click', () => showStep(1))

  const q2Radios = document.querySelectorAll('input[name="q2"]')
  const next2 = document.getElementById('next2')
  q2Radios.forEach(r => r.addEventListener('change', () => next2.disabled = false))
  document.getElementById('back2').addEventListener('click', () => showStep(0))
  next2.addEventListener('click', () => showStep(2))

  document.getElementById('back3').addEventListener('click', () => showStep(1))

  const next3 = document.getElementById('next3')
  const confirmOverlay = document.getElementById('confirmOverlay')
  const confirmCancel = document.getElementById('confirmCancel')
  const confirmSubmit = document.getElementById('confirmSubmit')

  next3.addEventListener('click', () => {
    confirmOverlay.classList.add('active')
  })

  confirmCancel.addEventListener('click', () => {
    confirmOverlay.classList.remove('active')
  })

  confirmSubmit.addEventListener('click', async () => {
    const habits = [...q1Boxes].filter(b => b.checked).map(b => b.value)
    const introducedBy = document.querySelector('input[name="q2"]:checked')?.value || ''
    const reflection = document.getElementById('q3').value.trim()

    confirmSubmit.disabled = true
    confirmCancel.disabled = true
    status3.className = 'status saving'
    status3.innerHTML = '<span class="spinner"></span>Saving your response…'

    try {
      await addDoc(collection(db, "responses"), {
        habits,
        introducedBy,
        reflection,
        createdAt: serverTimestamp()
      })
      status3.textContent = ''
      document.getElementById('summaryBox').innerHTML = `
        <div><b>Habit(s):</b> ${habits.join(', ') || '—'}</div>
        <div><b>Introduced by:</b> ${introducedBy || '—'}</div>
        <div><b>Your reflection:</b> ${reflection || '(no answer given)'}</div>
      `
      confirmOverlay.classList.remove('active')
      confirmSubmit.disabled = false
      confirmCancel.disabled = false
      showStep(3)
    } catch (err) {
      console.error(err)
      status3.className = 'status error'
      status3.textContent = "Couldn't save your response. Check your connection and try again."
      confirmSubmit.disabled = false
      confirmCancel.disabled = false
    }
  })

  document.getElementById('restart').addEventListener('click', () => {
    q1Boxes.forEach(b => b.checked = false)
    q2Radios.forEach(r => r.checked = false)
    document.getElementById('q3').value = ''
    next1.disabled = true
    next2.disabled = true
    status3.textContent = ''
    showStep(0)
  })
}
