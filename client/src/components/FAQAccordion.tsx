import React, { useState } from 'react'

type FAQItem = {
  id: string
  category: string
  question: string
  answer: string
}

const FAQAccordion: React.FC = () => {
  const [openId, setOpenId] = useState<string | null>('login-1')

  const faqs: FAQItem[] = [
    {
      id: 'login-1',
      category: 'Login Issues',
    question: 'I am unable to login to Cntr.',
      answer:
        'Confirm your centre code and school code are correct, then check your email and password. If the issue persists, contact the board coordinator with a screenshot of the error.',
    },
    {
      id: 'exam-1',
      category: 'Exam Day Issues',
      question: 'Seating plan is not matching today’s candidate count.',
      answer:
        'Go to Centre Details and recheck the candidate summary. Then regenerate the seating plan for the correct date and session.',
    },
    {
      id: 'candidates-1',
      category: 'Candidate Management',
      question: 'How do I import candidates from CBSE PDF or Excel?',
      answer:
        'Navigate to Candidates → Import and upload the latest CBSE candidate list PDF/Excel. Follow the on-screen mapping instructions carefully.',
    },
    {
      id: 'packing-1',
      category: 'Packing & Answer Sheets',
      question: 'How do I record answer sheet usage and packing details?',
      answer:
        'Use the Answer Sheets module to record serial ranges used each day, and maintain packing colour and marker details under Centre Details → Packing section.',
    },
  ]

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3">
      <h2 className="text-sm font-semibold text-gray-900 mb-1">FAQs</h2>
      <p className="text-xs text-gray-500 mb-2">
        Quick answers to common questions about login, exam day, candidates, and packing.
      </p>
      <div className="space-y-2">
        {faqs.map((item) => {
          const isOpen = openId === item.id
          return (
            <div
              key={item.id}
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : item.id)}
                className="w-full flex items-center justify-between px-3 py-2 text-left text-xs sm:text-sm bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">{item.category}</p>
                  <p className="font-medium text-gray-800">{item.question}</p>
                </div>
                <span className="ml-3 text-gray-400 text-xs">{isOpen ? '−' : '+'}</span>
              </button>
              {isOpen && (
                <div className="px-3 py-2 text-xs text-gray-600 bg-white">
                  {item.answer}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default FAQAccordion

