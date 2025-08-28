// Test database connection
import databaseService from './services/database.js'

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('Testing database connection...')
    
    // Test basic connection
    const testResult = await databaseService.testConnection()
    
    if (testResult.error) {
      console.error('Database connection failed:', testResult.error)
      return res.status(500).json({ 
        error: 'Database connection failed',
        details: testResult.error
      })
    }

    // Test if tables exist
    const tablesResult = await databaseService.checkTables()
    
    return res.status(200).json({
      success: true,
      message: 'Database connection successful',
      connection: testResult,
      tables: tablesResult,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Test endpoint error:', error)
    return res.status(500).json({ 
      error: 'Test failed',
      message: error.message,
      stack: error.stack
    })
  }
}
