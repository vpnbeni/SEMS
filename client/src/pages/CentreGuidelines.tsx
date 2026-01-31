import React from 'react'

const CentreGuidelines: React.FC = () => {
  return (
    <div className="h-full min-h-0 flex flex-col">
      <iframe
        src="/centre-guidelines.pdf"
        className="flex-1 w-full min-h-0 border-0"
        title="Centre Guidelines"
      />
    </div>
  )
}

export default CentreGuidelines
