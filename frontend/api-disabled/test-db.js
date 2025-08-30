// Database Connection Test Endpoint
import databaseService from './services/database.js'

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  try {
    // Test database connection
    const connectionTest = await databaseService.testConnection()
    
    if (connectionTest.error) {
      return res.status(500).json({
        error: 'Database connection failed',
        details: connectionTest.error.message
      })
    }

    // Check if tables exist
    const tablesCheck = await databaseService.checkTables()
    
    return res.status(200).json({
      success: true,
      message: 'Database connection successful',
      connection: connectionTest.data,
      tables: tablesCheck.data
    })

  } catch (error) {
    console.error('Database test error:', error)
    return res.status(500).json({
      error: 'Database test failed',
      details: error.message
    })
  }
}
