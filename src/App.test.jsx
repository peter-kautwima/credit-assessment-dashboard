import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { creditApi } from './data/creditApi'

vi.mock('./data/creditApi', () => ({
	creditApi: {
		loadDocket: vi.fn(),
		loadCreditReport: vi.fn(),
		loadBankStatement: vi.fn(),
		loadScoreItems: vi.fn(),
	},
}))

const completeEntry = {
	business: {
		id: 1,
		name: 'Acme Traders',
		industry: 'Retail',
		registrationNumber: '2018/123456/07',
	},
	assessment: { id: 101, businessId: 1, createdDate: '2024-11-15', status: 'Complete' },
}

const pendingEntry = {
	business: {
		id: 5,
		name: 'Echo Tech Solutions',
		industry: 'Technology',
		registrationNumber: '2022/567890/07',
	},
	assessment: { id: 105, businessId: 5, createdDate: '2024-11-22', status: 'Pending' },
}

describe('App docket states', () => {
	beforeEach(() => {
		creditApi.loadDocket.mockReset()
		creditApi.loadCreditReport.mockReset()
		creditApi.loadBankStatement.mockReset()
		creditApi.loadScoreItems.mockReset()
		creditApi.loadCreditReport.mockImplementation((assessmentId) =>
			assessmentId === 101
				? Promise.resolve({ score: 612, riskBand: 'Medium', isThinFile: false })
				: new Promise(() => {}),
		)
		creditApi.loadBankStatement.mockResolvedValue(null)
		creditApi.loadScoreItems.mockResolvedValue([])
		vi.stubGlobal('requestAnimationFrame', (callback) => window.setTimeout(callback, 0))
		vi.stubGlobal('matchMedia', undefined)
	})

	afterEach(() => {
		vi.unstubAllGlobals()
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

	it('moves selection when filters remove the open file and clears stale evidence immediately', async () => {
		const user = userEvent.setup()
		creditApi.loadDocket.mockResolvedValue([completeEntry, pendingEntry])
		render(<App />)

		expect(await screen.findByText('612')).toBeVisible()
		await user.click(screen.getByRole('button', { name: 'Pending: 1' }))

		expect(screen.getByRole('heading', { name: 'Echo Tech Solutions' })).toBeVisible()
		expect(screen.queryByText('612')).not.toBeInTheDocument()
		expect(screen.getByText('Loading credit report…')).toBeVisible()
	})

	it('defers mobile detail requests and restores focus on return', async () => {
		const user = userEvent.setup()
		vi.stubGlobal('matchMedia', () => ({
			matches: true,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		}))
		creditApi.loadDocket.mockResolvedValue([completeEntry])
		render(<App />)

		const row = await screen.findByRole('button', { name: /Acme Traders/ })
		expect(creditApi.loadCreditReport).not.toHaveBeenCalled()
		await user.click(row)

		const heading = screen.getByRole('heading', { name: 'Acme Traders' })
		expect(heading).toHaveFocus()
		expect(creditApi.loadCreditReport).toHaveBeenCalledWith(101)
		await user.click(screen.getByRole('button', { name: 'Back to docket' }))
		await waitFor(() => expect(row).toHaveFocus())
	})
})
