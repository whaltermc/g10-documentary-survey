import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

function getDb() {
  if (getApps().length === 0) {
    // Fix private key formatting - handle both 
 literal and actual newlines
    let privateKey = process.env.FIREBASE_PRIVATE_KEY || ''
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '
')
    } else if (!privateKey.includes('-----BEGIN')) {
      // If it's base64 encoded, decode it
      try {
        privateKey = Buffer.from(privateKey, 'base64').toString('utf-8')
      } catch (e) {}
    }

    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
      throw new Error('Missing Firebase Admin credentials. Check FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY env vars.')
    }

    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey
      })
    })
  }
  return getFirestore()
}

export default async function handler(req, res) {
  // CORS headers
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
      details: err.message,
      stack: err.stack 
    })
  }
}
