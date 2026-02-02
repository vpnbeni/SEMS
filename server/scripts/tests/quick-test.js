// Quick test to see if server starts
console.log('🚀 Testing basic server startup...')

try {
  // Test requiring the main files
  console.log('📦 Testing app.js import...')
  const app = require('./src/app')
  console.log('✅ app.js imported successfully')
  
  console.log('📦 Testing database config...')
  const connectDB = require('./src/config/database')
  console.log('✅ database config imported successfully')
  
  console.log('📦 Testing basic models...')
  const Subject = require('./src/models/Subject')
  console.log('✅ Subject model imported successfully')
  
  // Don't test Calendar model yet
  // const Calendar = require('./src/models/Calendar')
  // console.log('✅ Calendar model imported successfully')
  
  console.log('🎉 All basic imports successful! Server should start now.')
  
} catch (error) {
  console.error('❌ Import failed:', error.message)
  console.error('Stack:', error.stack)
}