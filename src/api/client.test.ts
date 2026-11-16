import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { handleResponse, ApiError, setUnauthorizedHandler } from './client'

describe('handleResponse', () => {
  let handler: (() => void) | null

  beforeEach(() => {
    handler = vi.fn()
    setUnauthorizedHandler(handler)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    setUnauthorizedHandler(null)
  })

  it('parses JSON body for successful responses', async () => {
    const res = new Response(JSON.stringify({ id: 1, name: 'Task' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
    const result = await handleResponse(res)
    expect(result).toEqual({ id: 1, name: 'Task' })
  })

  it('returns null for 204 No Content', async () => {
    const res = new Response(null, { status: 204 })
    const result = await handleResponse(res)
    expect(result).toBeNull()
  })

  it('returns null for empty JSON body', async () => {
    const res = new Response('', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
    const result = await handleResponse(res)
    expect(result).toBeNull()
  })

  it('returns null for non-JSON content type', async () => {
    const res = new Response('hello world', {
      status: 200,
      headers: { 'content-type': 'text/plain' },
    })
    const result = await handleResponse(res)
    expect(result).toBeNull()
  })

  it('throws ApiError for non-ok responses', async () => {
    const res = new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    })
    await expect(handleResponse(res)).rejects.toBeInstanceOf(ApiError)
  })

  it('extracts error message from JSON error body', async () => {
    const res = new Response(JSON.stringify({ error: 'Custom error message' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    })
    try {
      await handleResponse(res)
    } catch (e) {
      expect((e as ApiError).message).toBe('Custom error message')
    }
  })

  it('calls unauthorized handler on 401', async () => {
    const res = new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    })
    try {
      await handleResponse(res)
    } catch {
      // expected
    }
    expect(handler).toHaveBeenCalled()
  })

  it('handles JSON parse errors gracefully', async () => {
    const res = new Response('not valid json', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
    const result = await handleResponse(res)
    expect(result).toBeNull()
  })
})
