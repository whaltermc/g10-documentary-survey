import '../style.css'
import { initSurvey } from './survey.js'
import { initAnalytics } from './analytics.js'

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('step1')) {
    initSurvey()
  } else if (document.getElementById('loginScreen')) {
    initAnalytics()
  }
})
