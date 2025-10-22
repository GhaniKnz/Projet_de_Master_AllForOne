import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Splash from './routes/Splash'

test('renders splash hero content', () => {
  render(
    <MemoryRouter>
      <Splash />
    </MemoryRouter>
  )
  expect(screen.getByText(/AllForOne/i)).toBeInTheDocument()
  const heading = screen.getByRole('heading', { level: 1 })
  expect(heading.textContent).toBeTruthy()
  const normalized = heading.textContent?.normalize('NFD').replace(/\p{Diacritic}/gu, '')
  expect(normalized?.toLowerCase()).toContain('reunit jeux et social')
})
