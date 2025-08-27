// Main API function - Vercel expects this in the root
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  return res.status(200).json({
    message: 'JUST API is running on Vercel Functions!',
    timestamp: new Date().toISOString(),
    endpoints: {
      test: '/api/test',
      auth: {
        login: '/api/auth/login',
        register: '/api/auth/register'
      }
    }
  })
}
