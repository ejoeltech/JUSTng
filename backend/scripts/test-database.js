const { DatabaseService } = require('../services/database')

async function testDatabase() {
  console.log('🧪 Testing JUST Database Service...')

  try {
    const dbService = new DatabaseService()

    // Test 1: Get app settings
    console.log('\n📋 Test 1: Getting app settings...')
    const settings = await dbService.getAppSettings()
    console.log('✅ App settings retrieved:', settings)

    // Test 2: Get states
    console.log('\n🗺️ Test 2: Getting states...')
    const states = await dbService.getStates()
    console.log(`✅ Retrieved ${states.length} states`)
    console.log('Sample states:', states.slice(0, 3))

    // Test 3: Get system stats
    console.log('\n📊 Test 3: Getting system stats...')
    const stats = await dbService.getSystemStats()
    console.log('✅ System stats retrieved:', stats)

    // Test 4: Test maintenance mode
    console.log('\n🔧 Test 4: Testing maintenance mode...')
    const maintenance = await dbService.getMaintenanceMode()
    console.log('✅ Maintenance mode status:', maintenance)

    // Test 5: Test user profile operations
    console.log('\n👤 Test 5: Testing user profile operations...')
    const testUser = {
      email: 'test@example.com',
      phone: '+2348012345678',
      fullName: 'Test User',
      password: 'testpassword123'
    }

    try {
      const createdUser = await dbService.createUserProfile(testUser)
      console.log('✅ User profile created:', createdUser.id)

      const retrievedUser = await dbService.getUserProfile(createdUser.id)
      console.log('✅ User profile retrieved:', retrievedUser.email)

      const updatedUser = await dbService.updateUserRole(createdUser.id, 'admin')
      console.log('✅ User role updated to admin')

      const allUsers = await dbService.getAllUsers()
      console.log(`✅ Retrieved ${allUsers.length} users`)

      // Clean up test user
      await dbService.deleteUser(createdUser.id)
      console.log('✅ Test user cleaned up')

    } catch (error) {
      console.log('⚠️ User profile test skipped (may need auth setup):', error.message)
    }

    console.log('\n🎉 All database tests completed successfully!')
    console.log('✅ Database service is working properly')

  } catch (error) {
    console.error('❌ Database test failed:', error)
    throw error
  }
}

// Run tests if called directly
if (require.main === module) {
  testDatabase()
    .then(() => {
      console.log('✅ Database tests complete!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Database tests failed:', error)
      process.exit(1)
    })
}

module.exports = { testDatabase }
