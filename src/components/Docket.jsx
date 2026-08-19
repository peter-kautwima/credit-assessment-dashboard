import { useVirtualizer } from '@tanstack/react-virtual'
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

const initialFilters = {
	query: '',
	status: 'All',
	industry: 'All',
	risk: 'All',
	sort: 'name',
}

function observeDocketRect(instance, callback) {
	const element = instance.scrollElement
	if (!element) return undefined
	const report = () => callback({ width: element.clientWidth, height: element.clientHeight })
	const frame = requestAnimationFrame(report)
	const observer = new ResizeObserver(report)
	observer.observe(element)
	return () => {
		cancelAnimationFrame(frame)
		observer.disconnect()
	}
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

export function Docket({
	entries,
	selectedId,
	restoreFocusId,
	onSelect,
	onVisibleChange,
	reportSummaries = {},
}) {
	const [filters, setFilters] = useState(initialFilters)
	const [announcedCount, setAnnouncedCount] = useState(entries.length)
	const [pendingFocusIndex, setPendingFocusIndex] = useState(null)
	const searchRef = useRef(null)
	const listRef = useRef(null)
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
	const scrollResetKey = `${filters.query}|${filters.status}|${filters.industry}|${filters.risk}|${filters.sort}`
	const visibleIds = useMemo(
		() => visibleEntries.map((entry) => entry.business.id),
		[visibleEntries],
	)
	const shouldVirtualize = visibleEntries.length > 50
	const rowVirtualizer = useVirtualizer({
		count: shouldVirtualize ? visibleEntries.length : 0,
		enabled: shouldVirtualize,
		getScrollElement: () => listRef.current,
		estimateSize: () => 116,
		getItemKey: (index) => visibleEntries[index].business.id,
		overscan: 6,
		initialRect: { width: 432, height: 720 },
		observeElementRect: observeDocketRect,
	})
	const renderedRows = shouldVirtualize
		? rowVirtualizer.getVirtualItems()
		: visibleEntries.map((entry, index) => ({ index, key: entry.business.id, start: 0 }))
	const renderedIndexKey = renderedRows.map((row) => row.index).join(',')

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
		void renderedIndexKey
		if (pendingFocusIndex == null) return
		const row = listRef.current?.querySelector(`[data-row][data-index="${pendingFocusIndex}"]`)
		if (!row) return
		row.focus()
		setPendingFocusIndex(null)
	}, [pendingFocusIndex, renderedIndexKey])

	useEffect(() => {
		if (restoreFocusId == null) return
		const index = visibleEntries.findIndex((entry) => entry.business.id === restoreFocusId)
		if (index < 0) return
		const frame = requestAnimationFrame(() => {
			if (shouldVirtualize) {
				rowVirtualizer.measure()
				rowVirtualizer.scrollToIndex(index, { align: 'center' })
				setPendingFocusIndex(index)
				return
			}
			listRef.current?.querySelector(`[data-row][data-index="${index}"]`)?.focus()
		})
		return () => cancelAnimationFrame(frame)
	}, [restoreFocusId, rowVirtualizer, shouldVirtualize, visibleEntries])

	useEffect(() => {
		const timeout = window.setTimeout(() => setAnnouncedCount(visibleEntries.length), 500)
		return () => window.clearTimeout(timeout)
	}, [visibleEntries.length])

	useEffect(() => {
		void scrollResetKey
		if (!shouldVirtualize || visibleEntries.length === 0) return
		const frame = requestAnimationFrame(() => rowVirtualizer.scrollToIndex(0))
		return () => cancelAnimationFrame(frame)
	}, [rowVirtualizer, scrollResetKey, shouldVirtualize, visibleEntries.length])

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

	function resetFilters() {
		setFilters(initialFilters)
		onVisibleChange?.(
			filterAndSortDocket(entries, initialFilters, reportSummaries).map(
				(entry) => entry.business.id,
			),
		)
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
		const currentIndex = Number(event.currentTarget.dataset.index)
		const nextIndex =
			event.key === 'Home'
				? 0
				: event.key === 'End'
					? visibleEntries.length - 1
					: Math.min(
							visibleEntries.length - 1,
							Math.max(0, currentIndex + (event.key === 'ArrowDown' ? 1 : -1)),
						)
		if (!shouldVirtualize) {
			listRef.current?.querySelector(`[data-row][data-index="${nextIndex}"]`)?.focus()
			return
		}
		const nextRow = listRef.current?.querySelector(`[data-row][data-index="${nextIndex}"]`)
		if (nextRow) {
			nextRow.focus()
			return
		}
		setPendingFocusIndex(nextIndex)
		rowVirtualizer.scrollToIndex(nextIndex, { align: 'center' })
	}

	return (
		<aside className="docket" aria-labelledby="docket-title">
			<div className="docket__header">
				<div className="docket__titlebar">
					<div>
						<h2 id="docket-title">Assessment docket</h2>
						<p>{fileCountLabel(visibleEntries.length)}</p>
					</div>
					{Object.entries(filters).some(([name, value]) => value !== initialFilters[name]) && (
						<button type="button" className="docket__reset" onClick={resetFilters}>
							Clear filters
						</button>
					)}
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
						<select
							id="industry-filter"
							name="industry"
							value={filters.industry}
							onChange={updateFilter}
						>
							<option>All</option>
							{industries.map((name) => (
								<option key={name}>{name}</option>
							))}
						</select>
					</label>
					<label>
						<span>Sort by</span>
						<select id="sort-order" name="sort" value={filters.sort} onChange={updateFilter}>
							<option value="name">Name A–Z</option>
							<option value="nameDesc">Name Z–A</option>
							<option value="date">Newest first</option>
							<option value="dateAsc">Oldest first</option>
							<option value="industry">Industry A–Z</option>
							<option value="reference">File reference</option>
							<option value="risk">Risk: High first</option>
							<option value="scoreDesc">Score: High first</option>
							<option value="scoreAsc">Score: Low first</option>
						</select>
					</label>
					<label>
						<span>Reviewed risk</span>
						<select name="risk" value={filters.risk} onChange={updateFilter}>
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

			<div ref={listRef} className="docket__list">
				{visibleEntries.length ? (
					<ul
						aria-label="Businesses"
						className={shouldVirtualize ? 'docket__virtual-list' : undefined}
						style={shouldVirtualize ? { height: `${rowVirtualizer.getTotalSize()}px` } : undefined}
					>
						{renderedRows.map((virtualRow) => {
							const { business, assessment } = visibleEntries[virtualRow.index]
							const isSelected = business.id === selectedId
							const reportSummary = reportSummaries[assessment?.id]
							return (
								<li
									key={virtualRow.key}
									ref={shouldVirtualize ? rowVirtualizer.measureElement : undefined}
									data-index={virtualRow.index}
									aria-posinset={virtualRow.index + 1}
									aria-setsize={visibleEntries.length}
									style={
										shouldVirtualize
											? { transform: `translateY(${virtualRow.start}px)` }
											: undefined
									}
								>
									<button
										type="button"
										data-row
										data-index={virtualRow.index}
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
												<span>
													Assessed {highlightMatch(assessment.createdDate, filters.query)}
												</span>
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
						})}
					</ul>
				) : (
					<p className="docket__empty">
						{filters.query.trim()
							? `No file matches '${filters.query.trim()}' by name, reference or industry.`
							: 'No files match these filters.'}
					</p>
				)}
			</div>
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
