// Use Firebase REST API - no Admin SDK needed
// Requires: FIREBASE_PROJECT_ID and VITE_FIREBASE_API_KEY env vars
// Firestore rules must allow reads

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'lowkeychat-4d82f'
const API_KEY = process.env.VITE_FIREBASE_API_KEY || ''

async function fetchFirestore() {
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/responses`

  // Add API key as query param
  const url = API_KEY ? `${baseUrl}?key=${API_KEY}` : baseUrl

  console.log('Fetching from:', url.replace(API_KEY, '***'))

  const res = await fetch(url)
  const text = await res.text()

  if (!res.ok) {
    console.error('Firestore API error:', res.status, text)
    throw new Error(`Firestore API error ${res.status}: ${text}`)
  }

  const data = JSON.parse(text)
  return data.documents || []
}

function convertDoc(doc) {
  const fields = doc.fields || {}
  const result = {}

  for (const [key, value] of Object.entries(fields)) {
    if (value.stringValue !== undefined) {
      result[key] = value.stringValue
    } else if (value.arrayValue && value.arrayValue.values) {
      result[key] = value.arrayValue.values.map(v => v.stringValue || '')
    } else if (value.timestampValue) {
      result[key] = value.timestampValue
    }
  }

  return result
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    const body = req.body || {}
    const password = body.password

    if (!password || password !== process.env.ANALYTICS_API_KEY) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const docs = await fetchFirestore()
    const responses = docs.map(convertDoc)

    return res.status(200).json({ responses })
  } catch (err) {
    console.error('Analytics error:', err)
    return res.status(500).json({ 
      error: 'Failed to fetch data', 
      details: err.message 
    })
  }
}
