// Simple test endpoint
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  return res.status(200).json({
    message: 'Vercel Functions are working!',
    timestamp: new Date().toISOString(),
    endpoints: {
      test: '/api/test',
      login: '/api/auth/login',
      register: '/api/auth/register'
    }
  })
}
