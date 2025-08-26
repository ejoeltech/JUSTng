export default async function handler(req, res) {
  if (req.method === 'GET') {
    res.status(200).json({
      message: 'Vercel API is working! 🚀',
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      status: 'success'
    })
  } else {
    res.setHeader('Allow', ['GET'])
    res.status(405).json({ error: 'Method not allowed' })
  }
}
