import api from './api'

const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const downloadSingle = async (examId: string, studentId: string, studentName: string): Promise<void> => {
  const response = await api.get('/report-card/single', {
    params: { examId, studentId },
    responseType: 'blob',
  })
  const safeName = studentName.replace(/[^a-zA-Z0-9]/g, '_')
  triggerDownload(response.data as Blob, `report-card_${safeName}.pdf`)
}

const downloadBulk = async (examId: string, className: string, section: string): Promise<void> => {
  const response = await api.get('/report-card/bulk', {
    params: { examId, class: className, section },
    responseType: 'blob',
  })
  triggerDownload(response.data as Blob, `report-cards_${className}-${section}.pdf`)
}

const previewSingle = async (examId: string, studentId: string): Promise<void> => {
  const response = await api.get('/report-card/single', {
    params: { examId, studentId },
    responseType: 'blob',
  })

  const blob = response.data as Blob
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank', 'noopener,noreferrer')
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

const exmclReportCardService = { downloadSingle, downloadBulk, previewSingle }

export default exmclReportCardService
