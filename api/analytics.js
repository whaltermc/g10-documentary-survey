import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

function getDb() {
  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '
')
      })
    })
  }
  return getFirestore()
}

export default async function handler(req, res) {
  // CORS headers - must be set before anything else
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const password = req.body?.password || req.query?.password

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
    return res.status(500).json({ error: 'Failed to fetch data', details: err.message })
  }
}
