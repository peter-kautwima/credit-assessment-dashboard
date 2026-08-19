import { readFile, writeFile } from 'node:fs/promises'

const source = JSON.parse(await readFile(new URL('../data.json', import.meta.url), 'utf8'))
const targetSize = Number(process.argv[2] ?? 2000)

if (!Number.isInteger(targetSize) || targetSize < source.businesses.length) {
	throw new Error(`Fixture size must be an integer of at least ${source.businesses.length}`)
}

let seed = 0x5eed2026
function random() {
	seed += 0x6d2b79f5
	let value = seed
	value = Math.imul(value ^ (value >>> 15), value | 1)
	value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
	return ((value ^ (value >>> 14)) >>> 0) / 4294967296
}

const firstNames = ['Aloe', 'Beacon', 'Cedar', 'Drift', 'Ember', 'Field', 'Grove', 'Harbour']
const nouns = [
	'Trading',
	'Works',
	'Foods',
	'Logistics',
	'Systems',
	'Supply',
	'Projects',
	'Services',
]
const industries = [
	'Retail',
	'Construction',
	'Food & Beverage',
	'Transport',
	'Technology',
	'Mining',
]
const fixture = structuredClone(source)

for (let businessId = source.businesses.length + 1; businessId <= targetSize; businessId += 1) {
	const assessmentId = 1000 + businessId
	const pending = random() < 0.1
	const score = pending ? null : Math.round(280 + random() * 520)
	const riskBand = score == null ? null : score < 450 ? 'High' : score < 650 ? 'Medium' : 'Low'
	const industry = industries[Math.floor(random() * industries.length)]
	const year = 2010 + (businessId % 15)
	const registrationSerial = String(100000 + businessId).padStart(6, '0')
	const createdDay = String(1 + (businessId % 27)).padStart(2, '0')
	const businessName = `${firstNames[businessId % firstNames.length]} ${nouns[Math.floor(random() * nouns.length)]} ${businessId}`

	fixture.businesses.push({
		id: businessId,
		name: businessName,
		registrationNumber: `${year}/${registrationSerial}/07`,
		industry,
	})
	fixture.assessments.push({
		id: assessmentId,
		businessId,
		createdDate: `2024-11-${createdDay}`,
		status: pending ? 'Pending' : 'Complete',
	})
	fixture.creditReports.push({
		id: 2000 + businessId,
		assessmentId,
		score,
		riskBand,
		isThinFile: pending ? null : random() < 0.14,
	})
	const monthsAnalysed = pending ? null : random() < 0.5 ? 3 : 6
	const totalCredits = pending ? null : Math.round(120000 + random() * 1380000)
	const retainedRatio = 0.03 + random() * 0.42
	fixture.bankStatements.push({
		id: 3000 + businessId,
		assessmentId,
		totalCredits,
		totalDebits: pending ? null : Math.round(totalCredits * (1 - retainedRatio)),
		monthsAnalysed,
	})
	if (!pending) {
		for (const [index, category] of [
			'Payment History',
			'Credit Utilisation',
			'Business Age',
			'Cash Flow',
		].entries()) {
			fixture.scoreItems.push({
				id: 10000 + businessId * 4 + index,
				assessmentId,
				category,
				score: Math.round((20 + random() * 75) * 10) / 10,
			})
		}
	}
}

await writeFile(
	new URL(`../data-${targetSize}.json`, import.meta.url),
	`${JSON.stringify(fixture, null, 2)}\n`,
)

console.log(`Generated ${targetSize} businesses with seed 0x5eed2026`)
