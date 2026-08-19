import { useEffect, useMemo, useRef, useState } from 'react'
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
	dateAsc: (left, right) =>
		(left.assessment?.createdDate ?? '').localeCompare(right.assessment?.createdDate ?? '') ||
		left.business.name.localeCompare(right.business.name),
	nameDesc: (left, right) => right.business.name.localeCompare(left.business.name),
	reference: (left, right) =>
		(left.assessment?.id ?? Number.POSITIVE_INFINITY) -
		(right.assessment?.id ?? Number.POSITIVE_INFINITY),
}

export function filterAndSortDocket(
	entries,
	{ query = '', status, industry, risk, sort },
	reportSummaries = {},
) {
	const riskOrder = { High: 0, Medium: 1, Low: 2 }
	const filtered = entries
		.filter((entry) => {
			const normalizedQuery = query.trim().toLocaleLowerCase()
			if (!normalizedQuery) return true
			const summary = reportSummaries[entry.assessment?.id]
			return (
				[entry.business.name, entry.business.registrationNumber, entry.business.industry].some(
					(value) => value.toLocaleLowerCase().includes(normalizedQuery),
				) ||
				[entry.assessment?.id, entry.assessment?.status, entry.assessment?.createdDate]
					.filter((value) => value != null)
					.some((value) => String(value).toLocaleLowerCase().includes(normalizedQuery)) ||
				[summary?.riskBand, summary?.score]
					.filter((value) => value != null)
					.some((value) => String(value).toLocaleLowerCase().includes(normalizedQuery))
			)
		})
		.filter((entry) => status === 'All' || entry.assessment?.status === status)
		.filter((entry) => industry === 'All' || entry.business.industry === industry)
		.filter((entry) => {
			if (risk === 'All') return true
			const assessmentId = entry.assessment?.id
			const hasSummary = Object.hasOwn(reportSummaries, assessmentId)
			if (risk === 'Not reviewed') return !hasSummary
			if (risk === 'Not reported')
				return hasSummary && reportSummaries[assessmentId]?.riskBand == null
			return reportSummaries[assessmentId]?.riskBand === risk
		})

	if (sort === 'risk') {
		return filtered.toSorted((left, right) => {
			const leftRank = riskOrder[reportSummaries[left.assessment?.id]?.riskBand] ?? 3
			const rightRank = riskOrder[reportSummaries[right.assessment?.id]?.riskBand] ?? 3
			return leftRank - rightRank || sorters.name(left, right)
		})
	}
	if (sort === 'scoreDesc' || sort === 'scoreAsc') {
		return filtered.toSorted((left, right) => {
			const leftScore = reportSummaries[left.assessment?.id]?.score
			const rightScore = reportSummaries[right.assessment?.id]?.score
			if (leftScore == null) return rightScore == null ? sorters.name(left, right) : 1
			if (rightScore == null) return -1
			return (
				(sort === 'scoreDesc' ? rightScore - leftScore : leftScore - rightScore) ||
				sorters.name(left, right)
			)
		})
	}
	return filtered.toSorted(sorters[sort] ?? sorters.name)
}

export function Docket({ entries, selectedId, onSelect, onVisibleChange, reportSummaries = {} }) {
	const [filters, setFilters] = useState({
		query: '',
		status: 'All',
		industry: 'All',
		risk: 'All',
		sort: 'name',
	})
	const [announcedCount, setAnnouncedCount] = useState(entries.length)
	const searchRef = useRef(null)
	const restoreListFocusRef = useRef(false)

	const industries = useMemo(
		() => [...new Set(entries.map((entry) => entry.business.industry))].sort(),
		[entries],
	)
	const statusCounts = useMemo(
		() => ({
			All: entries.length,
			Complete: entries.filter((entry) => entry.assessment?.status === 'Complete').length,
			Pending: entries.filter((entry) => entry.assessment?.status === 'Pending').length,
		}),
		[entries],
	)
	const visibleEntries = useMemo(
		() => filterAndSortDocket(entries, filters, reportSummaries),
		[entries, filters, reportSummaries],
	)
	const visibleIds = useMemo(
		() => visibleEntries.map((entry) => entry.business.id),
		[visibleEntries],
	)

	useEffect(() => {
		onVisibleChange?.(visibleIds)
	}, [onVisibleChange, visibleIds])

	useEffect(() => {
		if (!restoreListFocusRef.current) return
		restoreListFocusRef.current = false
		const focusId = visibleIds.includes(selectedId) ? selectedId : visibleIds[0]
		document.querySelector(`[data-business-id="${focusId}"]`)?.focus()
	}, [selectedId, visibleIds])

	useEffect(() => {
		const timeout = window.setTimeout(() => setAnnouncedCount(visibleEntries.length), 500)
		return () => window.clearTimeout(timeout)
	}, [visibleEntries.length])

	useEffect(() => {
		function focusSearch(event) {
			if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return
			const target = event.target
			if (
				target instanceof HTMLElement &&
				(target.matches('input, textarea, select') || target.isContentEditable)
			) {
				return
			}
			event.preventDefault()
			searchRef.current?.focus()
		}

		document.addEventListener('keydown', focusSearch)
		return () => document.removeEventListener('keydown', focusSearch)
	}, [])

	function applyFilter(name, value) {
		setFilters((current) => {
			const nextFilters = { ...current, [name]: value }
			const nextVisibleIds = filterAndSortDocket(entries, nextFilters, reportSummaries).map(
				(entry) => entry.business.id,
			)
			onVisibleChange?.(nextVisibleIds)
			return nextFilters
		})
	}

	function updateFilter(event) {
		applyFilter(event.target.name, event.target.value)
	}

	function handleSearchKeyDown(event) {
		if (event.key !== 'Escape') return
		event.preventDefault()
		const nextFilters = { ...filters, query: '' }
		restoreListFocusRef.current = true
		setFilters(nextFilters)
		onVisibleChange?.(
			filterAndSortDocket(entries, nextFilters, reportSummaries).map((entry) => entry.business.id),
		)
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
					<p>{fileCountLabel(visibleEntries.length)}</p>
				</div>

				<label className="docket__search">
					<span className="docket__search-label">
						<span>Find a file</span>
						<small>Press / to search</small>
					</span>
					<span className="docket__search-control">
						<input
							ref={searchRef}
							name="query"
							type="search"
							value={filters.query}
							onChange={updateFilter}
							onKeyDown={handleSearchKeyDown}
							placeholder="Name, reference, industry, status or date"
						/>
					</span>
				</label>
				<p className="sr-only" aria-live="polite">
					{fileCountLabel(announcedCount)}
				</p>

				<fieldset className="docket__status-filter">
					<legend>Status</legend>
					<div>
						{['All', 'Complete', 'Pending'].map((status) => (
							<button
								key={status}
								type="button"
								aria-label={`${status}: ${statusCounts[status]}`}
								aria-pressed={filters.status === status}
								onClick={() => applyFilter('status', status)}
							>
								<span>{status}</span>
								<small>{statusCounts[status]}</small>
							</button>
						))}
					</div>
				</fieldset>

				<div className="docket__filters">
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
							<option value="name">Business name A–Z</option>
							<option value="nameDesc">Business name Z–A</option>
							<option value="date">Newest assessment</option>
							<option value="dateAsc">Oldest assessment</option>
							<option value="industry">Industry A–Z</option>
							<option value="reference">File reference</option>
							<option value="risk">Reviewed risk — High first</option>
							<option value="scoreDesc">Reviewed score — High first</option>
							<option value="scoreAsc">Reviewed score — Low first</option>
						</select>
					</label>
					<label>
						<span>Reviewed risk</span>
						<select name="risk" onChange={updateFilter}>
							<option value="All">All files</option>
							<option value="High">High</option>
							<option value="Medium">Medium</option>
							<option value="Low">Low</option>
							<option value="Not reviewed">Not reviewed</option>
							<option value="Not reported">No reported risk</option>
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
										<strong>{highlightMatch(business.name, filters.query)}</strong>
										{assessment ? (
											<StatusBadge status={assessment.status}>{assessment.status}</StatusBadge>
										) : (
											<StatusBadge>Not assessed</StatusBadge>
										)}
									</span>
									<span className="docket-row__meta">
										<span>{highlightMatch(business.industry, filters.query)}</span>
										<span>{highlightMatch(business.registrationNumber, filters.query)}</span>
									</span>
									{assessment && (
										<span className="docket-row__date">
											<span>File {assessment.id}</span>
											<span>Assessed {highlightMatch(assessment.createdDate, filters.query)}</span>
										</span>
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
					<li className="docket__empty">
						{filters.query.trim()
							? `No file matches '${filters.query.trim()}' by name, reference or industry.`
							: 'No files match these filters.'}
					</li>
				)}
			</ul>
		</aside>
	)
}

function highlightMatch(value, query) {
	const normalizedQuery = query.trim().toLocaleLowerCase()
	if (!normalizedQuery) return value
	const index = value.toLocaleLowerCase().indexOf(normalizedQuery)
	if (index === -1) return value
	return (
		<>
			{value.slice(0, index)}
			<mark>{value.slice(index, index + normalizedQuery.length)}</mark>
			{value.slice(index + normalizedQuery.length)}
		</>
	)
}

function fileCountLabel(count) {
	return `${count} ${count === 1 ? 'file' : 'files'} in view`
}
