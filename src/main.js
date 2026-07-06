import './style.css'
import { initSurvey } from './survey.js'
import { initAnalytics } from './analytics.js'

// Auto-detect which page we're on and initialize accordingly
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('step1')) {
    initSurvey()
  } else if (document.getElementById('loginScreen')) {
    initAnalytics()
  }
})
