const API_BASE = '/api'

export function initAnalytics() {
  const HABIT_COLORS = {
    "Vaping": "var(--accent)",
    "Cigarettes": "var(--accent2)",
    "Alcohol drinking": "var(--accent3)",
    "None of these": "#B9B0A0"
  }
  const INTRO_COLORS = {
    "Friends": "var(--accent)",
    "Family": "var(--accent2)",
    "No one": "var(--accent3)"
  }

  function renderBars(container, counts, colorMap, total) {
    container.innerHTML = ''
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1])
    if (entries.length === 0) {
      container.innerHTML = '<div class="empty">No data yet.</div>'
      return
    }
    entries.forEach(([label, count]) => {
      const pct = total ? Math.round((count / total) * 100) : 0
      const row = document.createElement('div')
      row.className = 'bar-row'
      row.innerHTML = `
        <div class="bar-label"><span>${label}</span><span class="count">${count} · ${pct}%</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%; background:${colorMap[label] || 'var(--accent)'}"></div></div>
      `
      container.appendChild(row)
    })
  }

  function timeAgo(ts) {
    if (!ts) return ''
    const date = new Date(ts)
    const diffMs = Date.now() - date.getTime()
    const mins = Math.floor(diffMs / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  async function loadData(password) {
    const loading = document.getElementById('loading')
    const content = document.getElementById('content')
    loading.style.display = 'block'
    loading.className = 'status'
    loading.textContent = 'Loading responses…'
    content.style.display = 'none'

    try {
      const res = await fetch(`${API_BASE}/analytics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Server error: ${res.status}`)
      }

      const data = await res.json()
      const docs = data.responses || []
      const total = docs.length

      const habitCounts = {}
      const introCounts = {}
      let anyHabit = 0
      let mentionsQuit = 0

      docs.forEach(d => {
        const habits = d.habits || []
        if (habits.length && !habits.includes('None of these')) anyHabit++
        habits.forEach(h => habitCounts[h] = (habitCounts[h] || 0) + 1)
        if (d.introducedBy) introCounts[d.introducedBy] = (introCounts[d.introducedBy] || 0) + 1
        const r = (d.reflection || '').toLowerCase()
        if (/\bquit\b|\bstopped\b|\bstop(ping)?\b/.test(r)) mentionsQuit++
      })

      document.getElementById('totalCount').textContent = total
      document.getElementById('anyHabitPct').textContent = total ? Math.round((anyHabit / total) * 100) + '%' : '0%'
      document.getElementById('quitCount').textContent = mentionsQuit

      renderBars(document.getElementById('habitsBars'), habitCounts, HABIT_COLORS, total)
      renderBars(document.getElementById('introBars'), introCounts, INTRO_COLORS, total)

      const list = document.getElementById('reflectionsList')
      list.innerHTML = ''
      const withReflections = docs.filter(d => d.reflection && d.reflection.trim())
      if (withReflections.length === 0) {
        list.innerHTML = '<div class="empty">No reflections yet.</div>'
      } else {
        withReflections.forEach(d => {
          const el = document.createElement('div')
          el.className = 'reflection'
          const habitsStr = (d.habits || []).join(', ') || '—'
          el.innerHTML = `
            <div class="meta">${habitsStr} · introduced by ${d.introducedBy || '—'} · ${timeAgo(d.createdAt)}</div>
            <div>${d.reflection}</div>
          `
          list.appendChild(el)
        })
      }

      loading.style.display = 'none'
      content.style.display = 'block'
    } catch (err) {
      console.error(err)
      loading.className = 'status error'
      loading.textContent = err.message || "Couldn't load responses."
    }
  }

  // Login gate
  const loginScreen = document.getElementById('loginScreen')
  const analyticsWrap = document.getElementById('analyticsWrap')
  const passwordInput = document.getElementById('adminPassword')
  const loginBtn = document.getElementById('loginBtn')
  const loginStatus = document.getElementById('loginStatus')
  const logoutBtn = document.getElementById('logoutBtn')
  const refreshBtn = document.getElementById('refreshBtn')

  let currentPassword = ''

  async function attemptLogin() {
    const password = passwordInput.value
    if (!password) return
    loginBtn.disabled = true
    loginStatus.className = 'status saving'
    loginStatus.innerHTML = '<span class="spinner"></span>Signing in…'

    try {
      await loadData(password)
      currentPassword = password
      loginScreen.style.display = 'none'
      analyticsWrap.style.display = 'block'
      loginStatus.textContent = ''
      passwordInput.value = ''
      loginBtn.disabled = false
    } catch (err) {
      loginStatus.className = 'status error'
      loginStatus.textContent = 'Incorrect password or server error.'
      loginBtn.disabled = false
    }
  }

  loginBtn.addEventListener('click', attemptLogin)
  passwordInput.addEventListener('keydown', e => { if (e.key === 'Enter') attemptLogin() })

  logoutBtn.addEventListener('click', () => {
    currentPassword = ''
    loginScreen.style.display = 'block'
    analyticsWrap.style.display = 'none'
  })

  refreshBtn.addEventListener('click', () => {
    if (currentPassword) loadData(currentPassword)
  })
}
