import { render, screen, within } from '@testing-library/react'
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
		assessment: { id: 102, createdDate: '2024-11-18', status: 'Pending' },
	},
]

describe('Docket', () => {
	it('filters and sorts the composed set deterministically', () => {
		expect(
			filterAndSortDocket(entries, { status: 'Complete', industry: 'All', sort: 'industry' }),
		).toEqual([entries[0]])
		expect(
			filterAndSortDocket(entries, { status: 'All', industry: 'All', sort: 'industry' }),
		).toEqual([entries[1], entries[0]])
	})

	it('applies status filters and updates the visible count', async () => {
		const user = userEvent.setup()
		render(<Docket entries={entries} selectedId={1} onSelect={vi.fn()} />)

		await user.selectOptions(screen.getByLabelText('Status'), 'Pending')

		expect(screen.getByText('1 files in view')).toBeVisible()
		expect(screen.queryByText('Acme Traders')).not.toBeInTheDocument()
		expect(screen.getByText('Bright Construction')).toBeVisible()
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
})
