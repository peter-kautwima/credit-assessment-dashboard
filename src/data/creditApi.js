const API_URL = 'http://localhost:3001'

async function getJson(path, fetcher = fetch) {
	const response = await fetcher(`${API_URL}${path}`)

	if (!response.ok) {
		throw new Error(`Could not load ${path} (${response.status})`)
	}

	return response.json()
}

export function latestAssessmentByBusiness(assessments) {
	return assessments.reduce((latest, assessment) => {
		const current = latest.get(assessment.businessId)
		const isNewerDate = !current || assessment.createdDate > current.createdDate
		const isHigherIdOnSameDate =
			current?.createdDate === assessment.createdDate && assessment.id > current.id

		if (isNewerDate || isHigherIdOnSameDate) {
			latest.set(assessment.businessId, assessment)
		}

		return latest
	}, new Map())
}

export async function loadDocket(fetcher = fetch) {
	const [businesses, assessments] = await Promise.all([
		getJson('/businesses', fetcher),
		getJson('/assessments', fetcher),
	])
	const latestByBusiness = latestAssessmentByBusiness(assessments)

	return businesses.map((business) => ({
		business,
		assessment: latestByBusiness.get(business.id) ?? null,
	}))
}

function createCachedQuery(fetcher) {
	const cache = new Map()

	return function cachedQuery(path) {
		if (!cache.has(path)) {
			const request = getJson(path, fetcher).catch((error) => {
				cache.delete(path)
				throw error
			})
			cache.set(path, request)
		}

		return cache.get(path)
	}
}

export function createCreditApi(fetcher = fetch) {
	const query = createCachedQuery(fetcher)
	const assessmentPath = (collection, assessmentId) =>
		`/${collection}?assessmentId=${encodeURIComponent(assessmentId)}`

	return {
		loadDocket: () => loadDocket(fetcher),
		loadCreditReport: (assessmentId) =>
			query(assessmentPath('creditReports', assessmentId)).then((rows) => rows[0] ?? null),
		loadBankStatement: (assessmentId) =>
			query(assessmentPath('bankStatements', assessmentId)).then((rows) => rows[0] ?? null),
		loadScoreItems: (assessmentId) => query(assessmentPath('scoreItems', assessmentId)),
	}
}

export const creditApi = createCreditApi()
