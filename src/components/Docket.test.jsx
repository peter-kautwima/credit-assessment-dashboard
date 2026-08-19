import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Docket, filterAndSortDocket } from './Docket'

const entries = [
	{
		business: {
			id: 1,
			name: 'Acme Traders',
			industry: 'Retail',
			registrationNumber: '2018/123456/07',
		},
		assessment: { id: 101, createdDate: '2024-11-15', status: 'Complete' },
	},
	{
		business: {
			id: 2,
			name: 'Bright Construction',
			industry: 'Construction',
			registrationNumber: '2020/456789/07',
		},
		assessment: { id: 102, createdDate: '2024-11-18', status: 'Complete' },
	},
	{
		business: {
			id: 5,
			name: 'Echo Tech Solutions',
			industry: 'Technology',
			registrationNumber: '2022/567890/07',
		},
		assessment: { id: 105, createdDate: '2024-11-22', status: 'Pending' },
	},
]

describe('Docket', () => {
	beforeEach(() => {
		vi.stubGlobal('requestAnimationFrame', (callback) => callback())
	})

	afterEach(() => {
		vi.useRealTimers()
		vi.unstubAllGlobals()
	})

	it('filters and sorts the composed set deterministically', () => {
		expect(
			filterAndSortDocket(entries, { status: 'Complete', industry: 'All', sort: 'industry' }),
		).toEqual([entries[1], entries[0]])
		expect(
			filterAndSortDocket(entries, { status: 'All', industry: 'All', sort: 'industry' }),
		).toEqual([entries[1], entries[0], entries[2]])
	})

	it('applies status filters and updates the visible count', async () => {
		const user = userEvent.setup()
		render(<Docket entries={entries} selectedId={1} onSelect={vi.fn()} />)

		await user.selectOptions(screen.getByLabelText('Status'), 'Pending')

		expect(screen.getByText('1 file in view')).toBeVisible()
		expect(screen.queryByText('Acme Traders')).not.toBeInTheDocument()
		expect(screen.getByText('Echo Tech Solutions')).toBeVisible()
	})

	it('keeps workflow status and loaded risk evidence distinct', () => {
		render(
			<Docket
				entries={entries}
				selectedId={2}
				onSelect={vi.fn()}
				reportSummaries={{ 102: { riskBand: 'High', score: 384 } }}
			/>,
		)

		const brightRow = screen.getByRole('button', { name: /Bright Construction/ })
		expect(within(brightRow).getByText('Complete')).toBeVisible()
		expect(within(brightRow).getByText('High risk')).toBeVisible()
		expect(within(brightRow).getByText('Score 384')).toBeVisible()
		expect(within(brightRow).queryByText('Risk available on review')).not.toBeInTheDocument()
	})

	it('does not let an unopened completed file imply low risk', () => {
		render(<Docket entries={entries} selectedId={1} onSelect={vi.fn()} />)

		const brightRow = screen.getByRole('button', { name: /Bright Construction/ })
		expect(within(brightRow).getByText('Complete')).toBeVisible()
		expect(within(brightRow).getByText('Risk available on review')).toBeVisible()
	})

	it('moves focus between rows without stealing arrow keys from fields', async () => {
		const user = userEvent.setup()
		render(<Docket entries={entries} selectedId={1} onSelect={vi.fn()} />)
		const list = screen.getByRole('list', { name: 'Businesses' })
		const rows = within(list).getAllByRole('button')
		rows[0].focus()

		await user.keyboard('{ArrowDown}')

		expect(rows[1]).toHaveFocus()
	})

	it('searches name, registration and industry within the active filters', async () => {
		const user = userEvent.setup()
		render(<Docket entries={entries} selectedId={1} onSelect={vi.fn()} />)

		await user.selectOptions(screen.getByLabelText('Status'), 'Complete')
		const search = screen.getByLabelText(/Find a file/)
		await user.type(search, 'construction')

		expect(screen.getByText('1 file in view')).toBeVisible()
		expect(screen.getAllByText('Construction', { selector: 'mark' })).toHaveLength(2)
		expect(screen.queryByText('Echo Tech Solutions')).not.toBeInTheDocument()
		await user.clear(search)
		await user.type(search, '2020/456789/07')
		expect(screen.getByText('2020/456789/07', { selector: 'mark' })).toBeVisible()
	})

	it('focuses search with slash and states an unmatched query in words', async () => {
		const user = userEvent.setup()
		render(<Docket entries={entries} selectedId={1} onSelect={vi.fn()} />)

		await user.keyboard('/')
		const search = screen.getByLabelText(/Find a file/)
		expect(search).toHaveFocus()
		await user.type(search, 'unknown firm')

		expect(
			screen.getByText("No file matches 'unknown firm' by name, reference or industry."),
		).toBeVisible()
	})

	it('clears search with Escape and returns focus to the selected row', async () => {
		const user = userEvent.setup()
		render(<Docket entries={entries} selectedId={1} onSelect={vi.fn()} />)
		const search = screen.getByLabelText(/Find a file/)

		await user.type(search, 'bright')
		await user.keyboard('{Escape}')

		expect(search).toHaveValue('')
		expect(screen.getByRole('button', { name: /Acme Traders/ })).toHaveFocus()
	})

	it('announces the composed result count after search settles', () => {
		vi.useFakeTimers()
		render(<Docket entries={entries} selectedId={1} onSelect={vi.fn()} />)
		const liveCount = document.querySelector('[aria-live="polite"]')

		fireEvent.change(screen.getByLabelText(/Find a file/), { target: { value: 'bright' } })
		expect(liveCount).toHaveTextContent('3 files in view')
		act(() => vi.advanceTimersByTime(500))
		expect(liveCount).toHaveTextContent('1 file in view')
	})
})
