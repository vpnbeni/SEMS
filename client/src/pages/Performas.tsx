import React from 'react'
import CentreRecordsUtilityPage from '../components/centre-records/CentreRecordsUtilityPage'

const Performas: React.FC = () => {
  return (
    <CentreRecordsUtilityPage
      title="Performa's"
      description="Prepare commonly needed centre documents such as relieving letters and answer sheet submission letters without rebuilding the same content manually every exam day."
      summaryLabel="Letter generation and centre document drafting"
      summaryValue="Docs"
      accentClasses="bg-[linear-gradient(135deg,#eefaf4_0%,#f9fcff_52%,#fff7ed_100%)]"
      overview={[
        'Generate relieving letters with centre and duty context already in place.',
        'Prepare answer sheet submission letters with standard wording and date-wise details.',
        'Reduce repeat document drafting during busy exam-day operations.',
      ]}
      workflows={[
        {
          title: 'Relieving Letter Drafting',
          description: 'Generate relieving letters for functionaries or staff once duty completion details are available.',
        },
        {
          title: 'Answer Sheet Submission Letter',
          description: 'Prepare the submission letter for answer sheets with the relevant centre details and exam-day context.',
        },
        {
          title: 'Reusable Templates',
          description: 'Keep a standard set of centre-level performas ready so documents stay consistent across all exam days.',
        },
        {
          title: 'Print and Archive Flow',
          description: 'Use one place to review, print, and later archive the generated letters for record keeping.',
        },
      ]}
      outputs={[
        {
          title: 'Relieving letter',
          description: 'A ready-to-print letter for staff or functionaries after duty completion.',
        },
        {
          title: 'Answer sheet submission letter',
          description: 'A formal letter to accompany submission of answer sheets and related material.',
        },
        {
          title: 'Template-driven performas',
          description: 'A base library of standard centre letters that can be reused with minimal edits.',
        },
      ]}
    />
  )
}

export default Performas
