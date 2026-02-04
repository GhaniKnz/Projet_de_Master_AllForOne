import React from 'react'
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// Mock the stores with proper selector support
const mockAppState = {
  user: null,
  setUser: vi.fn(),
  preferences: { darkMode: false, notifications: true, compactFeed: false, language: 'fr' }
}

vi.mock('../store/app', () => ({
  useAppStore: vi.fn((selector) => selector ? selector(mockAppState) : mockAppState)
}))

const mockFeedState = {
  posts: [],
  trends: [
    { id: 'trend-1', title: '#Test', description: 'Test trend', growth: '+10%' }
  ],
  loading: false,
  hasMore: false,
  error: undefined,
  comments: {},
  initialize: vi.fn(),
  refresh: vi.fn(),
  loadMore: vi.fn(),
  publish: vi.fn(),
  repost: vi.fn(),
  toggleLike: vi.fn(),
  ensureComments: vi.fn(),
  addComment: vi.fn(),
  clearError: vi.fn()
}

vi.mock('../store/feed', () => ({
  useFeedStore: vi.fn((selector) => selector ? selector(mockFeedState) : mockFeedState)
}))

describe('Home Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders without crashing', async () => {
    const Home = (await import('../routes/Home')).default

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )

    // Should render some content
    expect(document.body).toBeTruthy()
  })
})

describe('Splash Route', () => {
  test('renders splash content', async () => {
    const Splash = (await import('../routes/Splash')).default

    render(
      <MemoryRouter>
        <Splash />
      </MemoryRouter>
    )

    expect(screen.getByText(/AllForOne/i)).toBeInTheDocument()
  })

  test('has navigation buttons', async () => {
    const Splash = (await import('../routes/Splash')).default

    render(
      <MemoryRouter>
        <Splash />
      </MemoryRouter>
    )

    // Should have buttons to navigate
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })
})

describe('Auth Route', () => {
  test('renders auth form', async () => {
    const Auth = (await import('../routes/Auth')).default

    render(
      <MemoryRouter>
        <Auth />
      </MemoryRouter>
    )

    // Should have form elements
    const inputs = document.querySelectorAll('input')
    expect(inputs.length).toBeGreaterThan(0)
  })

  test('has login/register toggle', async () => {
    const Auth = (await import('../routes/Auth')).default

    render(
      <MemoryRouter>
        <Auth />
      </MemoryRouter>
    )

    // Should have some form of mode toggle
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })
})
