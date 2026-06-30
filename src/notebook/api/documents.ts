import type { ChunkSet, SourceKind } from '../types'

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export type DocumentStatus = 'pending' | 'processing' | 'ready' | 'error'

/** A document as returned by the backend document endpoints. */
export interface BackendDocument {
  id: string
  name: string
  kind: SourceKind
  status: DocumentStatus
  pageCount: number
  chunkCount: number
  vectorizedCount: number
  error: string | null
  createdAt: string | null
  embeddingModel?: string
}

interface RawDocument {
  id: string
  name: string
  kind: string
  status?: string
  page_count?: number
  chunk_count?: number
  vectorized_count?: number
  error?: string | null
  created_at?: string | null
  embeddingModel?: string
}

function normalizeKind(kind: string): SourceKind {
  if (kind === 'pdf' || kind === 'md' || kind === 'txt') return kind
  return 'txt'
}

function mapDocument(raw: RawDocument): BackendDocument {
  return {
    id: raw.id,
    name: raw.name,
    kind: normalizeKind(raw.kind),
    status: (raw.status as DocumentStatus) ?? 'ready',
    pageCount: raw.page_count ?? 0,
    chunkCount: raw.chunk_count ?? 0,
    vectorizedCount: raw.vectorized_count ?? 0,
    error: raw.error ?? null,
    createdAt: raw.created_at ?? null,
    embeddingModel: raw.embeddingModel,
  }
}

/** URL the viewer uses to fetch the raw file bytes for a backend document. */
export function fileUrl(id: string): string {
  return `${API_URL}/api/documents/${id}/file`
}

export async function listDocuments(signal?: AbortSignal): Promise<BackendDocument[]> {
  const res = await fetch(`${API_URL}/api/documents`, { signal })
  if (!res.ok) throw new Error(`Failed to list documents (${res.status})`)
  const data = (await res.json()) as RawDocument[]
  return data.map(mapDocument)
}

export async function getDocument(id: string): Promise<BackendDocument> {
  const res = await fetch(`${API_URL}/api/documents/${id}`)
  if (!res.ok) throw new Error(`Failed to load document (${res.status})`)
  return mapDocument((await res.json()) as RawDocument)
}

export async function uploadDocument(file: File): Promise<BackendDocument> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${API_URL}/api/documents`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(detail || `Upload failed (${res.status})`)
  }
  return mapDocument((await res.json()) as RawDocument)
}

export async function deleteDocument(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/documents/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Delete failed (${res.status})`)
}

export async function getDocumentChunks(id: string): Promise<ChunkSet> {
  const res = await fetch(`${API_URL}/api/documents/${id}/chunks`)
  if (!res.ok) throw new Error(`Failed to load chunks (${res.status})`)
  return (await res.json()) as ChunkSet
}
