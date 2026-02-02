// Simple test to check if server can start without calendar
const express = require('express')
const mongoose = require('mongoose')
require('dotenv').config()

console.log('🧪 Testing server startup without calendar...')

// Test database connection
const testDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/examination_management_system'
    await mongoose.connect(mongoUri)
    console.log('✅ Database connection successful')
    await mongoose.connection.close()
    console.log('✅ Database disconnection successful')
  } catch (error) {
    console.error('❌ Database connection failed:', error.message)
  }
}

// Test basic express app
const testApp = () => {
  try {
    const app = express()
    app.get('/test', (req, res) => res.json({ success: true }))
    
    const server = app.listen(0, () => {
      const port = server.address().port
      console.log(`✅ Express app started on port ${port}`)
      server.close(() => {
        console.log('✅ Express app closed successfully')
        process.exit(0)
      })
    })
  } catch (error) {
    console.error('❌ Express app failed:', error.message)
    process.exit(1)
  }
}

// Run tests
const runTests = async () => {
  await testDB()
  testApp()
}

runTests()