import { useCallback } from 'react'
import { useDropzone, type Accept } from 'react-dropzone'
import { Upload, X, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DocumentDropzoneProps {
  onFile: (file: File) => void
  label: string
  accept?: Accept
  file?: File | null
  onRemove?: () => void
}

export function DocumentDropzone({ onFile, label, accept, file, onRemove }: DocumentDropzoneProps) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted[0]) onFile(accepted[0])
    },
    [onFile],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: accept ?? { 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg'] },
    maxFiles: 1,
  })

  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-xl border-2 border-primary bg-primary/5 p-3">
        <FileText className="h-8 w-8 shrink-0 text-primary" strokeWidth={1.5} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{file.name}</p>
          <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
        </div>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="shrink-0 rounded-full border border-foreground/20 p-1 hover:bg-destructive/10"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        'cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors',
        isDragActive
          ? 'border-primary bg-primary/5'
          : 'border-foreground/30 hover:border-primary hover:bg-primary/5',
      )}
    >
      <input {...getInputProps()} />
      <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
      <p className="text-sm font-semibold">{label}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {isDragActive ? 'Drop here…' : 'Drag & drop or click to browse. PDF or image.'}
      </p>
    </div>
  )
}
