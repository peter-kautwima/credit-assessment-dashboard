import { useEffect } from 'react'
import { useAssessmentDetails } from '../hooks/useAssessmentDetails'
import { Button } from './ui/Button'
import { StatusBadge } from './ui/StatusBadge'
import './FileSheet.css'

const money = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' })
const number = new Intl.NumberFormat('en-ZA', { maximumFractionDigits: 1 })

export function FileSheet({ entry, onBack, headingRef, onReportResolved }) {
	const boundaryKey = entry.assessment?.id ?? `business-${entry.business.id}`
	return (
		<FileSheetContent
			key={boundaryKey}
			entry={entry}
			onBack={onBack}
			headingRef={headingRef}
			onReportResolved={onReportResolved}
		/>
	)
}

function FileSheetContent({ entry, onBack, headingRef, onReportResolved }) {
	const { business, assessment } = entry
	const details = useAssessmentDetails(assessment?.id)
	const report = details.report.data
	const needsAttention = assessment?.status === 'Pending' || report?.riskBand === 'High'

	useEffect(() => {
		if (details.report.status === 'success') {
			onReportResolved?.(assessment?.id, details.report.data)
		}
	}, [assessment?.id, details.report.data, details.report.status, onReportResolved])

	if (!assessment) {
		return (
			<section className="file-sheet file-sheet--empty">
				<Button variant="secondary" className="file-sheet__back" onClick={onBack}>
					Back to docket
				</Button>
				<p>Assessment unavailable</p>
				<h1 ref={headingRef} tabIndex={-1}>
					{business.name}
				</h1>
				<p>This business has no assessment on file yet.</p>
			</section>
		)
	}

	return (
		<article className="file-sheet" aria-labelledby="file-title">
			<div className="file-sheet__toolbar">
				<Button variant="secondary" className="file-sheet__back" onClick={onBack}>
					Back to docket
				</Button>
				<Button variant="secondary" onClick={() => window.print()}>
					Print file
				</Button>
			</div>

			<header className="file-header">
				<div>
					<p>{business.registrationNumber}</p>
					<h1 id="file-title" ref={headingRef} tabIndex={-1}>
						{business.name}
					</h1>
					<p>{business.industry}</p>
				</div>
				<div className="file-header__status">
					<StatusBadge status={assessment.status}>{assessment.status}</StatusBadge>
					<span>Assessed {assessment.createdDate}</span>
				</div>
			</header>

			{needsAttention && (
				<output className="attention-note">
					<strong>Needs attention</strong>
					<span>
						{assessment.status === 'Pending'
							? 'Assessment data is still pending.'
							: 'The credit report carries a High risk band.'}
					</span>
				</output>
			)}

			<section id="overview" className="file-section" aria-labelledby="overview-title">
				<div className="section-heading">
					<h2 id="overview-title">Credit overview</h2>
					<p>Reported score and risk profile</p>
				</div>
				<Resource resource={details.report} label="credit report">
					{(creditReport) => <CreditOverview report={creditReport} />}
				</Resource>
			</section>

			<div className="evidence-band">
				<section id="financials" className="file-section" aria-labelledby="financials-title">
					<div className="section-heading">
						<h2 id="financials-title">Financial picture</h2>
						<p>Computed from the analysed bank-statement period</p>
					</div>
					<Resource resource={details.statement} label="bank statement">
						{(statement) => <FinancialPicture statement={statement} />}
					</Resource>
				</section>

				<section
					id="score-breakdown"
					className="file-section"
					aria-labelledby="score-breakdown-title"
				>
					<div className="section-heading">
						<h2 id="score-breakdown-title">Score breakdown</h2>
						<p>Reported score items by category</p>
					</div>
					<Resource resource={details.scoreItems} label="score breakdown" emptyArray>
						{(items) => <ScoreBreakdown items={items} />}
					</Resource>
				</section>
			</div>
		</article>
	)
}

function Resource({ resource, label, children, emptyArray = false }) {
	if (resource.status === 'loading') {
		return (
			<div className="panel-state panel-state--loading" aria-busy="true">
				<span>Loading {label}…</span>
			</div>
		)
	}

	if (resource.status === 'error') {
		return (
			<div className="panel-state" role="alert">
				<strong>Couldn’t load {label}</strong>
				<span>Check the API connection, then retry this section.</span>
				<Button variant="secondary" onClick={resource.retry}>
					Retry {label}
				</Button>
			</div>
		)
	}

	if (resource.status === 'empty' || (emptyArray && resource.data?.length === 0)) {
		return (
			<div className="panel-state">
				<strong>{capitalize(label)} not on file</strong>
				<span>No values were reported for this assessment.</span>
			</div>
		)
	}

	return children(resource.data)
}

function CreditOverview({ report }) {
	if (report.score == null || report.riskBand == null) {
		return (
			<div className="panel-state panel-state--pending">
				<strong>Score not yet available</strong>
				<span>This Pending assessment has no reported score or risk band.</span>
			</div>
		)
	}

	const scorePosition = `${Math.min(100, Math.max(0, (report.score / 850) * 100))}%`

	return (
		<div className="credit-overview">
			<div className="score-readout">
				<span>Credit score</span>
				<strong>{report.score}</strong>
				<div className="score-scale" aria-label={`Score ${report.score} on a display scale to 850`}>
					<span className="score-scale__position" style={{ '--score-position': scorePosition }} />
				</div>
				<small>Display scale 0–850; the source data does not state a maximum.</small>
			</div>
			<dl className="profile-list">
				<div>
					<dt>Risk band</dt>
					<dd>
						<StatusBadge status={report.riskBand}>{report.riskBand}</StatusBadge>
					</dd>
				</div>
				<div>
					<dt>Credit file</dt>
					<dd>
						{report.isThinFile == null
							? 'Credit-file status not reported'
							: report.isThinFile
								? 'Thin file'
								: 'Established file'}
					</dd>
				</div>
			</dl>
		</div>
	)
}

function FinancialPicture({ statement }) {
	if (
		statement.totalCredits == null ||
		statement.totalDebits == null ||
		statement.monthsAnalysed == null
	) {
		return (
			<div className="panel-state panel-state--pending">
				<strong>Bank-statement values not yet available</strong>
				<span>This Pending assessment has no reported financial totals.</span>
			</div>
		)
	}

	const surplus = statement.totalCredits - statement.totalDebits
	const monthlySurplus = surplus / statement.monthsAnalysed
	return (
		<div className="financial-grid">
			<Metric label="Total credits" value={money.format(statement.totalCredits)} />
			<Metric label="Total debits" value={money.format(statement.totalDebits)} />
			<Metric label="Computed surplus" value={money.format(surplus)} emphasis />
			<Metric label="Computed monthly surplus" value={money.format(monthlySurplus)} />
			<p className="financial-grid__note">
				Based on {statement.monthsAnalysed} months analysed; totals are period figures, not a
				transaction ledger.
			</p>
		</div>
	)
}

function Metric({ label, value, emphasis = false }) {
	return (
		<div className={emphasis ? 'metric metric--emphasis' : 'metric'}>
			<span>{label}</span>
			<strong>{value}</strong>
		</div>
	)
}

function ScoreBreakdown({ items }) {
	return (
		<div className="score-items">
			{items.map((item) => (
				<div className="score-item" key={item.id}>
					<div>
						<strong>{item.category}</strong>
						<span>{number.format(item.score)}</span>
					</div>
					<div className="score-item__bar" aria-hidden="true">
						<span style={{ '--item-score': `${Math.min(100, Math.max(0, item.score))}%` }} />
					</div>
				</div>
			))}
			<p>Bars use a 0–100 display scale; the source data does not state category maxima.</p>
		</div>
	)
}

function capitalize(value) {
	return `${value.charAt(0).toUpperCase()}${value.slice(1)}`
}
