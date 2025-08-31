// User Statistics API endpoint
import { authenticateToken, requireActiveStatus } from '../../lib/middleware/auth.js'
import databaseService from '../../lib/services/database.js'

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Apply authentication middleware
  try {
    await authenticateToken(req, res, () => {})
    await requireActiveStatus(req, res, () => {})
  } catch (error) {
    return // Error already sent by middleware
  }

  try {
    const { user } = req
    const { timeframe = '30' } = req.query // Default to 30 days

    // Get user statistics from database
    const statsResult = await databaseService.getUserStats(user.userId)
    
    if (statsResult.error) {
      console.error('Database error:', statsResult.error)
      return res.status(500).json({ 
        error: 'Failed to retrieve user statistics' 
      })
    }

    // Get additional analytics based on timeframe
    const timeframeDays = parseInt(timeframe)
    const timeframeDate = new Date(Date.now() - timeframeDays * 24 * 60 * 60 * 1000)

    // Get incidents for the specified timeframe
    const incidentsResult = await databaseService.getIncidents(
      { 
        created_after: timeframeDate.toISOString() 
      }, 
      user.role, 
      user.userId
    )

    let timeframeStats = {}
    if (incidentsResult.data) {
      const timeframeIncidents = incidentsResult.data
      
      timeframeStats = {
        totalInTimeframe: timeframeIncidents.length,
        byCategory: {},
        bySeverity: {},
        byStatus: {},
        averageResolutionTime: 0,
        recentTrend: 'stable'
      }

      // Calculate category and severity breakdown
      timeframeIncidents.forEach(incident => {
        timeframeStats.byCategory[incident.category] = (timeframeStats.byCategory[incident.category] || 0) + 1
        timeframeStats.bySeverity[incident.severity] = (timeframeStats.bySeverity[incident.severity] || 0) + 1
        timeframeStats.byStatus[incident.status] = (timeframeStats.byStatus[incident.status] || 0) + 1
      })

      // Calculate average resolution time for resolved incidents
      const resolvedIncidents = timeframeIncidents.filter(incident => 
        ['resolved', 'closed'].includes(incident.status)
      )

      if (resolvedIncidents.length > 0) {
        const totalResolutionTime = resolvedIncidents.reduce((total, incident) => {
          const created = new Date(incident.created_at)
          const updated = new Date(incident.updated_at)
          return total + (updated - created)
        }, 0)
        
        timeframeStats.averageResolutionTime = Math.round(totalResolutionTime / resolvedIncidents.length / (1000 * 60 * 60 * 24)) // Days
      }

      // Calculate trend (comparing first half vs second half of timeframe)
      const midPoint = Math.floor(timeframeIncidents.length / 2)
      const firstHalf = timeframeIncidents.slice(0, midPoint).length
      const secondHalf = timeframeIncidents.slice(midPoint).length
      
      if (secondHalf > firstHalf * 1.2) {
        timeframeStats.recentTrend = 'increasing'
      } else if (secondHalf < firstHalf * 0.8) {
        timeframeStats.recentTrend = 'decreasing'
      } else {
        timeframeStats.recentTrend = 'stable'
      }
    }

    // Combine base stats with timeframe-specific stats
    const combinedStats = {
      ...statsResult.data,
      timeframe: {
        days: timeframeDays,
        stats: timeframeStats
      },
      insights: generateInsights(statsResult.data, timeframeStats),
      recommendations: generateRecommendations(statsResult.data, timeframeStats)
    }

    return res.status(200).json({
      data: combinedStats,
      timestamp: new Date().toISOString(),
      timeframe: timeframeDays
    })

  } catch (error) {
    console.error('User stats error:', error)
    return res.status(500).json({ 
      error: 'Failed to retrieve user statistics' 
    })
  }
}

// Generate insights based on user statistics
function generateInsights(baseStats, timeframeStats) {
  const insights = []

  if (baseStats.totalIncidents === 0) {
    insights.push({
      type: 'info',
      message: 'Welcome! You haven\'t reported any incidents yet. Your first report helps make our community safer.',
      priority: 'low'
    })
  } else if (baseStats.activeIncidents > baseStats.resolvedIncidents) {
    insights.push({
      type: 'warning',
      message: 'You have more active cases than resolved ones. Consider following up on pending investigations.',
      priority: 'medium'
    })
  }

  if (timeframeStats.recentTrend === 'increasing') {
    insights.push({
      type: 'alert',
      message: 'Your incident reports have increased recently. Stay vigilant and report any suspicious activities.',
      priority: 'high'
    })
  }

  if (baseStats.recentActivity > 3) {
    insights.push({
      type: 'info',
      message: 'You\'ve been very active this week. Thank you for helping keep our community safe!',
      priority: 'low'
    })
  }

  return insights
}

// Generate recommendations based on user statistics
function generateRecommendations(baseStats, timeframeStats) {
  const recommendations = []

  if (baseStats.totalIncidents === 0) {
    recommendations.push({
      action: 'Report your first incident',
      description: 'Start contributing to community safety by reporting any harassment incidents you witness.',
      priority: 'high'
    })
  }

  if (timeframeStats.bySeverity?.critical > 0) {
    recommendations.push({
      action: 'Review critical incidents',
      description: 'You have critical severity incidents. Ensure all evidence is properly documented.',
      priority: 'high'
    })
  }

  if (baseStats.activeIncidents > 5) {
    recommendations.push({
      action: 'Follow up on active cases',
      description: 'You have several active cases. Consider checking their status and providing additional information.',
      priority: 'medium'
    })
  }

  if (timeframeStats.averageResolutionTime > 14) {
    recommendations.push({
      action: 'Monitor case progress',
      description: 'Your cases are taking longer than average to resolve. Stay in touch with authorities.',
      priority: 'medium'
    })
  }

  return recommendations
}
