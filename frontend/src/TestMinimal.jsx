import React from 'react'

const TestMinimal = () => {
  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: '#f0f9ff', 
      fontFamily: 'Arial, sans-serif',
      minHeight: '100vh'
    }}>
      <h1 style={{ color: '#0369a1' }}>✅ React is Working!</h1>
      <p>This is a minimal React component to test if React rendering works.</p>
      <p>Current time: {new Date().toLocaleString()}</p>
      <p>Location: {window.location.href}</p>
    </div>
  )
}

export default TestMinimal
