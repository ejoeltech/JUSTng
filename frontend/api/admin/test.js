// Test endpoint for admin API
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  try {
    res.status(200).json({
      message: 'Admin API test endpoint is working!',
      timestamp: new Date().toISOString(),
      status: 'success',
      method: req.method,
      url: req.url
    })
  } catch (error) {
    console.error('Test endpoint error:', error)
    res.status(500).json({ 
      error: 'Test endpoint failed',
      message: error.message
    })
  }
}
