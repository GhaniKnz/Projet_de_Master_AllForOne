import { beforeEach, describe, expect, test, vi } from 'vitest'

const ioMock = vi.fn()
const isBackendConfiguredMock = vi.fn()
const getStoredTokenMock = vi.fn()

vi.mock('socket.io-client', () => ({
  io: (...args: unknown[]) => ioMock(...args)
}))

vi.mock('./api', () => ({
  isBackendConfigured: () => isBackendConfiguredMock(),
  getStoredToken: () => getStoredTokenMock()
}))

type MockSocket = {
  connected: boolean
  auth: Record<string, unknown>
  on: ReturnType<typeof vi.fn>
  connect: ReturnType<typeof vi.fn>
  disconnect: ReturnType<typeof vi.fn>
}

function createSocketMock(): MockSocket {
  return {
    connected: false,
    auth: {},
    on: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn()
  }
}

describe('socket manager', () => {
  beforeEach(() => {
    vi.resetModules()
    ioMock.mockReset()
    isBackendConfiguredMock.mockReset()
    getStoredTokenMock.mockReset()
    isBackendConfiguredMock.mockReturnValue(true)
    getStoredTokenMock.mockReturnValue('')
  })

  test('does not create socket when token is missing', async () => {
    const { getSocket } = await import('./socket')
    expect(getSocket()).toBeNull()
    expect(ioMock).not.toHaveBeenCalled()
  })

  test('creates socket with auth token', async () => {
    const socket = createSocketMock()
    ioMock.mockReturnValue(socket)
    getStoredTokenMock.mockReturnValue('token-1')

    const { getSocket } = await import('./socket')
    const instance = getSocket()

    expect(instance).toBe(socket)
    expect(ioMock).toHaveBeenCalledTimes(1)
    expect(ioMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        auth: { token: 'token-1' }
      })
    )
  })

  test('re-authenticates existing socket when token changes', async () => {
    const socket = createSocketMock()
    socket.connected = true
    ioMock.mockReturnValue(socket)
    getStoredTokenMock.mockReturnValue('token-1')

    const { getSocket } = await import('./socket')
    getSocket()

    getStoredTokenMock.mockReturnValue('token-2')
    const sameSocket = getSocket()

    expect(sameSocket).toBe(socket)
    expect(ioMock).toHaveBeenCalledTimes(1)
    expect(socket.auth.token).toBe('token-2')
    expect(socket.disconnect).toHaveBeenCalledTimes(1)
    expect(socket.connect).toHaveBeenCalledTimes(1)
  })

  test('disconnects existing socket when token is removed', async () => {
    const socket = createSocketMock()
    ioMock.mockReturnValue(socket)
    getStoredTokenMock.mockReturnValue('token-1')

    const { getSocket } = await import('./socket')
    getSocket()

    getStoredTokenMock.mockReturnValue('')
    const instance = getSocket()

    expect(instance).toBeNull()
    expect(socket.disconnect).toHaveBeenCalledTimes(1)
  })
})
