import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { creditApi } from './data/creditApi'

vi.mock('./data/creditApi', () => ({
	creditApi: { loadDocket: vi.fn() },
}))

describe('App docket states', () => {
	beforeEach(() => {
		creditApi.loadDocket.mockReset()
	})

	it('holds a loading layout while the docket request is pending', () => {
		creditApi.loadDocket.mockReturnValue(new Promise(() => {}))
		render(<App />)

		expect(screen.getByLabelText('Loading assessment docket')).toHaveAttribute('aria-busy', 'true')
	})

	it('names the API recovery command and retries a failed docket', async () => {
		const user = userEvent.setup()
		creditApi.loadDocket
			.mockRejectedValueOnce(new Error('Could not load /businesses (503)'))
			.mockResolvedValueOnce([])
		render(<App />)

		expect(await screen.findByText('npm run api')).toBeVisible()
		await user.click(screen.getByRole('button', { name: 'Retry docket' }))
		expect(await screen.findByText('No businesses are available')).toBeVisible()
		expect(creditApi.loadDocket).toHaveBeenCalledTimes(2)
	})

	it('states an empty docket in words', async () => {
		creditApi.loadDocket.mockResolvedValue([])
		render(<App />)

		expect(await screen.findByText('No businesses are available')).toBeVisible()
	})
})
