import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import ProfileManagement from '@components/ProfileManagement'
import * as toasty from '@components/ToastyNotification'

// Mock useAuth to provide a profile
vi.mock('@hooks/useAuth', () => ({ default: () => ({ profile: { email: 'test@example.com', full_name: 'Test User' } }) }))

describe('Profile password reset', () => {
  const notifySuccessSpy = vi.spyOn(toasty, 'notifySuccess')
  const notifyErrorSpy = vi.spyOn(toasty, 'notifyError')

  beforeEach(() => {
    notifySuccessSpy.mockClear()
    notifyErrorSpy.mockClear()
    ;(global as any).fetch = vi.fn()
  })

  afterEach(() => {
    ;(global as any).fetch = undefined
  })

  it('calls server-side mailer and shows success', async () => {
    ;(global as any).fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => ({ ok: true }) }))

    render(<ProfileManagement />)

    const btn = await screen.findByRole('button', { name: /Send password reset email/i })
    fireEvent.click(btn)

    await waitFor(() => expect((global as any).fetch).toHaveBeenCalled())
    expect(notifySuccessSpy).toHaveBeenCalledWith(expect.stringContaining('Password reset'))
  })
})
