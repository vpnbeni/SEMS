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

    // Extract counts
    const counts = {
      examFunctionaries: teachersData.data?.pagination?.totalCount || teachersData.meta?.totalCount || 0,
      candidates: candidatesData.total || candidatesData.meta?.totalCount || 0,
      subjects: subjectsData.data?.total || 0
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