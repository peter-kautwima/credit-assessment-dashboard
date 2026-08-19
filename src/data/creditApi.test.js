import { createCreditApi, latestAssessmentByBusiness, loadDocket } from './creditApi'

function jsonResponse(body, options = {}) {
	return Promise.resolve({
		ok: options.ok ?? true,
		status: options.status ?? 200,
		json: () => Promise.resolve(body),
	})
}

describe('latestAssessmentByBusiness', () => {
	it('selects the newest date and uses the highest id as a deterministic tiebreak', () => {
		const latest = latestAssessmentByBusiness([
			{ id: 19, businessId: 1, createdDate: '2024-12-01', status: 'Complete' },
			{ id: 20, businessId: 1, createdDate: '2024-12-01', status: 'Pending' },
			{ id: 21, businessId: 1, createdDate: '2024-11-30', status: 'Complete' },
		])

		expect(latest.get(1)).toMatchObject({ id: 20, status: 'Pending' })
	})
})

describe('loadDocket', () => {
	it('joins businesses only to their current assessment and keeps unassessed businesses', async () => {
		const fetcher = vi.fn((url) => {
			if (url.endsWith('/businesses')) {
				return jsonResponse([
					{ id: 1, name: 'Acme Traders' },
					{ id: 2, name: 'New Venture' },
				])
			}

			return jsonResponse([
				{ id: 101, businessId: 1, createdDate: '2024-11-15', status: 'Complete' },
				{ id: 106, businessId: 1, createdDate: '2024-11-22', status: 'Pending' },
			])
		})

		await expect(loadDocket(fetcher)).resolves.toEqual([
			{
				business: { id: 1, name: 'Acme Traders' },
				assessment: {
					id: 106,
					businessId: 1,
					createdDate: '2024-11-22',
					status: 'Pending',
				},
			},
			{ business: { id: 2, name: 'New Venture' }, assessment: null },
		])
	})

	it('reports the failed endpoint so the UI can give a useful error', async () => {
		const fetcher = vi.fn((url) =>
			url.endsWith('/businesses') ? jsonResponse([], { ok: false, status: 503 }) : jsonResponse([]),
		)

		await expect(loadDocket(fetcher)).rejects.toThrow('Could not load /businesses (503)')
	})
})

describe('assessment detail loader', () => {
	it('loads child collections independently and deduplicates repeated requests', async () => {
		const pendingReport = {
			id: 205,
			assessmentId: 105,
			score: null,
			riskBand: null,
			isThinFile: null,
		}
		const pendingStatement = {
			id: 305,
			assessmentId: 105,
			totalCredits: null,
			totalDebits: null,
			monthsAnalysed: null,
		}
		const fetcher = vi.fn((url) => {
			if (url.includes('/creditReports')) return jsonResponse([pendingReport])
			if (url.includes('/bankStatements')) return jsonResponse([pendingStatement])
			return jsonResponse([])
		})
		const api = createCreditApi(fetcher)

		const firstRequest = api.loadCreditReport(105)
		const secondRequest = api.loadCreditReport(105)

		await expect(Promise.all([firstRequest, secondRequest])).resolves.toEqual([
			pendingReport,
			pendingReport,
		])
		await expect(api.loadBankStatement(105)).resolves.toEqual(pendingStatement)
		await expect(api.loadScoreItems(105)).resolves.toEqual([])
		expect(fetcher).toHaveBeenCalledTimes(3)
	})

	it('isolates a panel failure and allows that request to retry', async () => {
		const fetcher = vi
			.fn()
			.mockImplementationOnce(() => jsonResponse([], { ok: false, status: 500 }))
			.mockImplementation(() => jsonResponse([]))
		const api = createCreditApi(fetcher)

		await expect(api.loadCreditReport(101)).rejects.toThrow('creditReports')
		await expect(api.loadBankStatement(101)).resolves.toBeNull()
		await expect(api.loadCreditReport(101)).resolves.toBeNull()
		expect(fetcher).toHaveBeenCalledTimes(3)
	})
})
