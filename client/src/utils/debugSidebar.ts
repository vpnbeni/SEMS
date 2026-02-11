// Debug utility for sidebar counts
export const debugSidebarCounts = async () => {
  const token = localStorage.getItem('token')
  if (!token) {
    console.log('❌ No token found')
    return
  }

  console.log('🔍 Debugging sidebar counts...')

  try {
    // Test each API endpoint
    console.log('📡 Testing /api/teachers...')
    const teachersResponse = await fetch('/api/teachers?limit=1', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const teachersData = await teachersResponse.json()
    console.log('Teachers API:', teachersData)

    console.log('📡 Testing /api/candidates...')
    const candidatesResponse = await fetch('/api/candidates?limit=1', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const candidatesData = await candidatesResponse.json()
    console.log('Candidates API:', candidatesData)

    console.log('📡 Testing /api/subjects/stats...')
    const subjectsResponse = await fetch('/api/subjects/stats', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const subjectsData = await subjectsResponse.json()
    console.log('Subjects API:', subjectsData)

    console.log('📡 Testing /api/answersheets/stats/summary...')
    const answerSheetsResponse = await fetch('/api/answersheets/stats/summary', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const answerSheetsData = await answerSheetsResponse.json()
    console.log('Answer Sheets Stats API:', answerSheetsData)

    const parseCount = (value: unknown): number | null => {
      if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value
      if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value)
        if (Number.isFinite(parsed) && parsed >= 0) return parsed
      }
      return null
    }

    const answerSheetRecordCount = Array.isArray(answerSheetsData?.data?.byType)
      ? answerSheetsData.data.byType.reduce((sum: number, entry: { count?: unknown }) => {
          const count = parseCount(entry?.count)
          return sum + (count ?? 0)
        }, 0)
      : null

    // Extract counts
    const counts = {
      examFunctionaries: parseCount(teachersData?.data?.pagination?.totalCount),
      candidates: parseCount(candidatesData?.total),
      subjects: parseCount(subjectsData?.data?.total),
      answerSheets: answerSheetRecordCount
    }

    console.log('📊 Extracted counts:', counts)

  } catch (error) {
    console.error('❌ Debug failed:', error)
  }
}

// Add to window for easy access in browser console
if (typeof window !== 'undefined') {
  (window as any).debugSidebarCounts = debugSidebarCounts
}
