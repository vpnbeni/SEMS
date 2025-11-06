#!/usr/bin/env node

/**
 * Quick verification script to check answer sheets order
 * Run: node verify-answer-sheets-order.js
 */

require('dotenv').config({ path: './server/.env' })
const mongoose = require('mongoose')
const AnswerSheet = require('./src/models/AnswerSheet')

const expectedOrder = [
  'Main - 32 Pages - Red - Class 10',
  'Main - 32 Pages - Blue - Class 12',
  'Main - 20 Pages - Red - Class 10',
  'Main - 20 Pages - Blue - Class 12',
  'Graph - 40 Pages - Red - Class 10',
  'Graph - 40 Pages - Blue - Class 12',
  'Supplementary - 16 Pages - Yellow - Class 10',
  'Supplementary - 16 Pages - Pink - Class 12',
  'For Blind - 32 Pages - Red - Class 10',
  'For Blind - 32 Pages - Blue - Class 12',
  'Drawing Sheets - 21 Pages - White - Class 12'
]

async function verify() {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    
    const sheets = await AnswerSheet.find({ isActive: true })
      .sort({ sortOrder: 1, receivedDate: -1 })
    
    console.log('\n✅ Answer Sheets Order Verification\n')
    console.log('Expected Order (from PDF):')
    expectedOrder.forEach((name, i) => {
      console.log(`  ${i + 1}. ${name}`)
    })
    
    console.log('\nActual Order (from Database):')
    let allMatch = true
    sheets.forEach((sheet, i) => {
      const match = sheet.displayName === expectedOrder[i] ? '✅' : '❌'
      console.log(`  ${i + 1}. ${sheet.displayName} ${match}`)
      if (sheet.displayName !== expectedOrder[i]) {
        allMatch = false
      }
    })
    
    console.log('\n' + '='.repeat(60))
    if (allMatch && sheets.length === expectedOrder.length) {
      console.log('✅ SUCCESS: All answer sheets are in correct PDF order!')
    } else {
      console.log('❌ MISMATCH: Order does not match PDF template')
    }
    console.log('='.repeat(60) + '\n')
    
    await mongoose.connection.close()
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

verify()
