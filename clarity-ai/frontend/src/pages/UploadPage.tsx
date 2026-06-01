import { useState, useRef, type ChangeEvent, type DragEvent } from 'react'
import { uploadDiary, uploadFile, type UploadResult } from '../api'

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.txt']
    const ext = '.' + f.name.split('.').pop()?.toLowerCase()
    if (!allowed.includes(ext)) {
      setError(`Unsupported file type: ${ext}. Allowed: ${allowed.join(', ')}`)
      setFile(null)
      return
    }
    setFile(f)
    setError(null)
    setResult(null)
  }

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) handleFile(f)
  }

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(true)
  }
  const onDragLeave = () => setDragOver(false)

  const onSubmit = async () => {
    if (!file) return
    setUploading(true)
    setError(null)
    setResult(null)
    try {
      const r = await uploadDiary(file)
      setResult(r)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const onSubmitFull = async () => {
    if (!file) return
    setUploading(true)
    setError(null)
    setResult(null)
    try {
      const r = await uploadFile(file)
      setResult({
        success: r.status === 'completed',
        filename: r.filename,
        saved_as: r.file_id,
        size_bytes: 0,
        message: r.status === 'completed'
          ? `Processed: ${r.chunks_count ?? 0} chunks`
          : r.error || r.status,
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Upload Diary Entry</h1>
      <p className="text-gray-400 mb-6">
        Upload handwritten diary pages (images or PDFs) for AI-powered analysis.
      </p>

      {/* Drop zone */}
      <div
        className={`drop-zone border-2 border-dashed rounded-xl p-12 text-center cursor-pointer ${
          dragOver
            ? 'active border-indigo-400 bg-indigo-900/20'
            : 'border-gray-700 hover:border-gray-500'
        }`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.txt"
          onChange={onChange}
          className="hidden"
        />
        <div className="text-4xl mb-3">📄</div>
        <p className="text-gray-300 font-medium">
          {file ? file.name : 'Drop your diary entry here, or click to browse'}
        </p>
        <p className="text-gray-500 text-sm mt-1">
          JPG, PNG, PDF, TXT supported
        </p>
      </div>

      {/* File info */}
      {file && (
        <div className="mt-4 p-3 rounded-lg bg-gray-900 border border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-300">{file.name}</span>
            <span className="text-xs text-gray-500">
              ({(file.size / 1024).toFixed(1)} KB)
            </span>
          </div>
          <button
            onClick={() => { setFile(null); setResult(null); setError(null) }}
            className="text-xs text-gray-500 hover:text-red-400"
          >
            Remove
          </button>
        </div>
      )}

      {/* Action buttons */}
      {file && (
        <div className="mt-4 flex gap-3">
          <button
            onClick={onSubmit}
            disabled={uploading}
            className="flex-1 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-colors font-medium"
          >
            {uploading ? 'Uploading...' : 'Quick Upload (save only)'}
          </button>
          <button
            onClick={onSubmitFull}
            disabled={uploading}
            className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-colors font-medium"
          >
            {uploading ? 'Processing...' : 'Full Pipeline (OCR + AI)'}
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-900/40 border border-red-800 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="mt-4 p-4 rounded-lg bg-gray-900 border border-gray-800">
          <h3 className="text-sm font-semibold text-green-400 mb-2">
            {result.success ? '✓ Upload Successful' : '⚠ Upload Completed'}
          </h3>
          <div className="text-xs text-gray-400 space-y-1">
            <p>File: {result.filename}</p>
            <p>Saved as: {result.saved_as}</p>
            {result.size_bytes > 0 && (
              <p>Size: {(result.size_bytes / 1024).toFixed(1)} KB</p>
            )}
            <p className="text-gray-500 mt-2">{result.message}</p>
          </div>
        </div>
      )}
    </div>
  )
}