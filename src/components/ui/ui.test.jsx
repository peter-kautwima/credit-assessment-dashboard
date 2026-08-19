import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'
import { StatusBadge } from './StatusBadge'

describe('UI primitives', () => {
	it('renders a working button and preserves native disabled behaviour', async () => {
		const user = userEvent.setup()
		const onClick = vi.fn()
		const { rerender } = render(<Button onClick={onClick}>Retry</Button>)

		await user.click(screen.getByRole('button', { name: 'Retry' }))
		expect(onClick).toHaveBeenCalledOnce()

		rerender(<Button disabled>Retry</Button>)
		expect(screen.getByRole('button', { name: 'Retry' })).toBeDisabled()
	})

	it('prints status as text rather than relying on colour', () => {
		render(<StatusBadge status="Pending">Pending</StatusBadge>)

		expect(screen.getByText('Pending')).toBeVisible()
	})
})
