// Simple test for auth function
const testData = {
  login: {
    email: 'test@example.com',
    password: 'password123'
  },
  register: {
    email: 'new@example.com',
    password: 'password123',
    fullName: 'New User',
    phone: '1234567890'
  }
}

console.log('Test data created:', testData)
console.log('Auth function should handle both login and register now!')
