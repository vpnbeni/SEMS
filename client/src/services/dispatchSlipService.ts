import api from './api'

export const dispatchSlipService = {
  async downloadDispatchSlipPdf(entryId: string, destination?: string): Promise<Blob> {
    const response = await api.get(`/dispatch/slip/${encodeURIComponent(entryId)}/pdf`, {
      params: destination ? { destination } : undefined,
      responseType: 'blob',
    })
    return response.data
  },

  downloadPDF(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  },
}

