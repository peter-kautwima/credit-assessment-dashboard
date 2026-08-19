import { render, screen, within } from '@testing-library/react'
import { creditApi } from '../data/creditApi'
import { FileSheet } from './FileSheet'

vi.mock('../data/creditApi', () => ({
	creditApi: {
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
	...completeEntry,
	business: { ...completeEntry.business, id: 5, name: 'Echo Tech Solutions' },
	assessment: { id: 105, businessId: 5, createdDate: '2024-11-22', status: 'Pending' },
}

describe('FileSheet', () => {
	beforeEach(() => {
		creditApi.loadCreditReport.mockReset()
		creditApi.loadBankStatement.mockReset()
		creditApi.loadScoreItems.mockReset()
	})

	it('derives the financial picture from reported values', async () => {
		const onReportResolved = vi.fn()
		creditApi.loadCreditReport.mockResolvedValue({
			score: 612,
			riskBand: 'Medium',
			isThinFile: false,
		})
		creditApi.loadBankStatement.mockResolvedValue({
			totalCredits: 485000,
			totalDebits: 312000,
			monthsAnalysed: 3,
		})
		creditApi.loadScoreItems.mockResolvedValue([
			{ id: 401, category: 'Payment History', score: 68.5 },
		])

		render(
			<FileSheet entry={completeEntry} onBack={() => {}} onReportResolved={onReportResolved} />,
		)

		expect(await screen.findByText('612')).toBeVisible()
		expect(screen.getByText('Medium')).toBeVisible()
		const financials = screen.getByRole('region', { name: 'Financial picture' })
		expect(within(financials).getByText(/173[ ,.\u00a0]000/)).toBeVisible()
		expect(screen.getByText('Payment History')).toBeVisible()
		expect(onReportResolved).toHaveBeenCalledWith(101, {
			score: 612,
			riskBand: 'Medium',
			isThinFile: false,
		})
	})

	it('states pending values in words and never renders a zero score', async () => {
		creditApi.loadCreditReport.mockResolvedValue({
			score: null,
			riskBand: null,
			isThinFile: null,
		})
		creditApi.loadBankStatement.mockResolvedValue({
			totalCredits: null,
			totalDebits: null,
			monthsAnalysed: null,
		})
		creditApi.loadScoreItems.mockResolvedValue([])

		render(<FileSheet entry={pendingEntry} onBack={() => {}} />)

		expect(await screen.findByText('Score not yet available')).toBeVisible()
		expect(screen.getByText('Bank-statement values not yet available')).toBeVisible()
		expect(screen.getByText('Score breakdown not on file')).toBeVisible()
		expect(screen.queryByText('0')).not.toBeInTheDocument()
	})

	it('isolates a failed panel while other evidence remains readable', async () => {
		creditApi.loadCreditReport.mockResolvedValue({
			score: 612,
			riskBand: 'Medium',
			isThinFile: false,
		})
		creditApi.loadBankStatement.mockRejectedValue(new Error('Could not load bank statements'))
		creditApi.loadScoreItems.mockResolvedValue([
			{ id: 401, category: 'Payment History', score: 68.5 },
		])

		render(<FileSheet entry={completeEntry} onBack={() => {}} />)

		expect(await screen.findByText('Couldn’t load bank statement')).toBeVisible()
		expect(screen.getByText('612')).toBeVisible()
		expect(screen.getByText('Payment History')).toBeVisible()
	})

	it('does not turn a missing thin-file value into an established-file claim', async () => {
		creditApi.loadCreditReport.mockResolvedValue({
			score: 612,
			riskBand: 'Medium',
			isThinFile: null,
		})
		creditApi.loadBankStatement.mockResolvedValue(null)
		creditApi.loadScoreItems.mockResolvedValue([])

		render(<FileSheet entry={completeEntry} onBack={() => {}} />)

		expect(await screen.findByText('Credit-file status not reported')).toBeVisible()
		expect(screen.queryByText('Established file')).not.toBeInTheDocument()
	})

	it('removes resolved evidence at the assessment boundary', async () => {
		creditApi.loadCreditReport.mockResolvedValueOnce({
			score: 612,
			riskBand: 'Medium',
			isThinFile: false,
		})
		creditApi.loadBankStatement.mockResolvedValue(null)
		creditApi.loadScoreItems.mockResolvedValue([])
		const { rerender } = render(<FileSheet entry={completeEntry} onBack={() => {}} />)

		expect(await screen.findByText('612')).toBeVisible()
		creditApi.loadCreditReport.mockReturnValueOnce(new Promise(() => {}))
		rerender(<FileSheet entry={pendingEntry} onBack={() => {}} />)

		expect(screen.queryByText('612')).not.toBeInTheDocument()
		expect(screen.getByText('Loading credit report…')).toBeVisible()
	})
})
