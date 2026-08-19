import { useEffect, useMemo, useState } from 'react'
import { StatusBadge } from './ui/StatusBadge'
import './Docket.css'

const sorters = {
	name: (left, right) => left.business.name.localeCompare(right.business.name),
	industry: (left, right) =>
		left.business.industry.localeCompare(right.business.industry) ||
		left.business.name.localeCompare(right.business.name),
	date: (left, right) =>
		(right.assessment?.createdDate ?? '').localeCompare(left.assessment?.createdDate ?? '') ||
		left.business.name.localeCompare(right.business.name),
}

export function filterAndSortDocket(entries, { status, industry, sort }) {
	return entries
		.filter((entry) => status === 'All' || entry.assessment?.status === status)
		.filter((entry) => industry === 'All' || entry.business.industry === industry)
		.toSorted(sorters[sort] ?? sorters.name)
}

export function Docket({ entries, selectedId, onSelect, onVisibleChange, reportSummaries = {} }) {
	const [filters, setFilters] = useState({ status: 'All', industry: 'All', sort: 'name' })

	const industries = useMemo(
		() => [...new Set(entries.map((entry) => entry.business.industry))].sort(),
		[entries],
	)
	const visibleEntries = useMemo(() => filterAndSortDocket(entries, filters), [entries, filters])
	const visibleIds = useMemo(
		() => visibleEntries.map((entry) => entry.business.id),
		[visibleEntries],
	)

	useEffect(() => {
		onVisibleChange?.(visibleIds)
	}, [onVisibleChange, visibleIds])

	function updateFilter(event) {
		const { name, value } = event.target
		setFilters((current) => {
			const nextFilters = { ...current, [name]: value }
			const nextVisibleIds = filterAndSortDocket(entries, nextFilters).map(
				(entry) => entry.business.id,
			)
			onVisibleChange?.(nextVisibleIds)
			return nextFilters
		})
	}

	function handleRowKeyDown(event) {
		if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
		event.preventDefault()
		const rows = [...event.currentTarget.closest('ul').querySelectorAll('[data-row]')]
		const currentIndex = rows.indexOf(event.currentTarget)
		const nextIndex =
			event.key === 'Home'
				? 0
				: event.key === 'End'
					? rows.length - 1
					: Math.min(
							rows.length - 1,
							Math.max(0, currentIndex + (event.key === 'ArrowDown' ? 1 : -1)),
						)
		rows[nextIndex]?.focus()
	}

	return (
		<aside className="docket" aria-labelledby="docket-title">
			<div className="docket__header">
				<div>
					<h2 id="docket-title">Assessment docket</h2>
					<p>{visibleEntries.length} files in view</p>
				</div>

				<div className="docket__filters">
					<label>
						<span>Status</span>
						<select id="status-filter" name="status" onChange={updateFilter}>
							<option>All</option>
							<option>Complete</option>
							<option>Pending</option>
						</select>
					</label>
					<label>
						<span>Industry</span>
						<select id="industry-filter" name="industry" onChange={updateFilter}>
							<option>All</option>
							{industries.map((name) => (
								<option key={name}>{name}</option>
							))}
						</select>
					</label>
					<label>
						<span>Sort by</span>
						<select id="sort-order" name="sort" onChange={updateFilter} defaultValue="name">
							<option value="name">Business name</option>
							<option value="industry">Industry</option>
							<option value="date">Assessment date</option>
						</select>
					</label>
				</div>
			</div>

			<ul className="docket__list" aria-label="Businesses">
				{visibleEntries.length ? (
					visibleEntries.map(({ business, assessment }) => {
						const isSelected = business.id === selectedId
						const reportSummary = reportSummaries[assessment?.id]
						return (
							<li key={business.id}>
								<button
									type="button"
									data-row
									data-business-id={business.id}
									className="docket-row"
									aria-current={isSelected ? 'true' : undefined}
									onClick={() => onSelect(business.id)}
									onKeyDown={handleRowKeyDown}
								>
									<span className="docket-row__topline">
										<strong>{business.name}</strong>
										{assessment ? (
											<StatusBadge status={assessment.status}>{assessment.status}</StatusBadge>
										) : (
											<StatusBadge>Not assessed</StatusBadge>
										)}
									</span>
									<span className="docket-row__meta">
										<span>{business.industry}</span>
										<span>{business.registrationNumber}</span>
									</span>
									{assessment && (
										<span className="docket-row__date">Assessed {assessment.createdDate}</span>
									)}
									{reportSummary?.riskBand && (
										<span
											className={`docket-row__risk${
												reportSummary.riskBand === 'High' ? ' docket-row__risk--high' : ''
											}`}
										>
											<strong>{reportSummary.riskBand} risk</strong>
											{reportSummary.score != null && <span>Score {reportSummary.score}</span>}
										</span>
									)}
									{assessment?.status === 'Complete' && !reportSummary && (
										<span className="docket-row__unreviewed">Risk available on review</span>
									)}
								</button>
							</li>
						)
					})
				) : (
					<li className="docket__empty">No files match these filters.</li>
				)}
			</ul>
		</aside>
	)
}
