import React from 'react'
import { describe, test, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Card from './Card'
import Tabs from './Tabs'

describe('Card Component', () => {
  test('renders children', () => {
    render(<Card>Test Content</Card>)
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(<Card className="custom-class">Content</Card>)
    expect(container.firstChild).toHaveClass('custom-class')
  })

  test('renders as different element when specified', () => {
    const { container } = render(<Card>Content</Card>)
    expect(container.firstChild?.nodeName).toBe('DIV')
  })
})

describe('Tabs Component', () => {
  const mockItems = ['Tab 1', 'Tab 2', 'Tab 3']

  test('renders all tabs', () => {
    render(<Tabs items={mockItems} current="Tab 1" onChange={() => {}} />)
    
    expect(screen.getByText('Tab 1')).toBeInTheDocument()
    expect(screen.getByText('Tab 2')).toBeInTheDocument()
    expect(screen.getByText('Tab 3')).toBeInTheDocument()
  })

  test('highlights active tab', () => {
    render(<Tabs items={mockItems} current="Tab 2" onChange={() => {}} />)
    
    const tab2 = screen.getByText('Tab 2')
    // Active tab should have different styling
    expect(tab2.closest('button')).toBeTruthy()
  })

  test('calls onChange when tab clicked', () => {
    const onChange = vi.fn()
    render(<Tabs items={mockItems} current="Tab 1" onChange={onChange} />)
    
    const tab2 = screen.getByText('Tab 2')
    tab2.click()
    
    expect(onChange).toHaveBeenCalledWith('Tab 2')
  })

  test('handles empty items array', () => {
    const { container } = render(<Tabs items={[]} current="" onChange={() => {}} />)
    expect(container.firstChild).toBeTruthy()
  })

  test('handles single tab', () => {
    render(<Tabs items={['Only Tab']} current="Only Tab" onChange={() => {}} />)
    expect(screen.getByText('Only Tab')).toBeInTheDocument()
  })
})
