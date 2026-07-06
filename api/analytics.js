import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

function normalizePrivateKey(key) {
  key = key.trim()
  if (key.startsWith('"') && key.endsWith('"')) {
    key = key.slice(1, -1)
  }
  // Replace literal backslash-n (two chars) with actual newline
  key = key.split('\\n').join('
')
  return key
}

function getDb() {
  if (getApps().length === 0) {
    const rawKey = process.env.FIREBASE_PRIVATE_KEY || ''
    const privateKey = normalizePrivateKey(rawKey)

    console.log('Key length:', privateKey.length)
    console.log('Has BEGIN:', privateKey.includes('-----BEGIN PRIVATE KEY-----'))

    if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
      throw new Error('FIREBASE_PRIVATE_KEY invalid')
    }

    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL) {
      throw new Error('Missing FIREBASE_PROJECT_ID or FIREBASE_CLIENT_EMAIL')
    }

    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey
      })
    })
    console.log('Firebase Admin initialized')
  }
  return getFirestore()
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

    const db = getDb()
    const snapshot = await db.collection('responses')
      .orderBy('createdAt', 'desc')
      .get()

    const responses = snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        ...data,
        createdAt: data.createdAt?.toDate?.()
          ? data.createdAt.toDate().toISOString()
          : data.createdAt
      }
    })

    return res.status(200).json({ responses })
  } catch (err) {
    console.error('Analytics error:', err)
    return res.status(500).json({ 
      error: 'Failed to fetch data', 
      details: err.message 
    })
  }
}
