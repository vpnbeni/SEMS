import { uploadFile } from './api'

const importFromPDF = (file: File) => {
  return uploadFile('/subjects/import-pdf', file)
}

const subjectService = {
  importFromPDF,
}

export default subjectService


