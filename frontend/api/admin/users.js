// Simple users endpoint without complex imports
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
    // Mock users data
    const mockUsers = [
      {
        id: 'USR-001',
        full_name: 'John Doe',
        email: 'john@example.com',
        phone: '+234-803-123-4567',
        role: 'user',
        status: 'active',
        created_at: '2024-12-15T10:30:00Z',
        last_login: '2025-01-01T08:15:00Z',
        incident_count: 2,
        location: 'Lagos, Nigeria'
      },
      {
        id: 'USR-002',
        full_name: 'Sarah Johnson',
        email: 'sarah@police.gov.ng',
        phone: '+234-807-987-6543',
        role: 'police',
        status: 'active',
        created_at: '2024-11-20T14:20:00Z',
        last_login: '2025-01-01T07:45:00Z',
        incident_count: 15,
        location: 'Abuja, Nigeria'
      },
      {
        id: 'USR-003',
        full_name: 'Mike Admin',
        email: 'mike@just.gov.ng',
        phone: '+234-809-555-1234',
        role: 'admin',
        status: 'active',
        created_at: '2024-10-10T09:00:00Z',
        last_login: '2025-01-01T00:30:00Z',
        incident_count: 50,
        location: 'Lagos, Nigeria'
      }
    ]

    res.status(200).json({
      users: mockUsers,
      total: mockUsers.length,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Users endpoint error:', error)
    res.status(500).json({ 
      error: 'Failed to retrieve users',
      message: error.message
    })
  }
}
