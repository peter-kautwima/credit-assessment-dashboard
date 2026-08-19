import { useCallback, useEffect, useRef, useState } from 'react'
import { Docket } from './components/Docket'
import { FileSheet } from './components/FileSheet'
import { Button } from './components/ui/Button'
import { creditApi } from './data/creditApi'
import { useMediaQuery } from './hooks/useMediaQuery'
import './App.css'

export default function App() {
	const [docket, setDocket] = useState({ status: 'loading', entries: [], error: null })
	const [selectedId, setSelectedId] = useState(null)
	const [mobileDetailOpen, setMobileDetailOpen] = useState(false)
	const [restoreFocusId, setRestoreFocusId] = useState(null)
	const [reportSummaries, setReportSummaries] = useState({})
	const [requestKey, setRequestKey] = useState(0)
	const detailHeadingRef = useRef(null)
	const isMobile = useMediaQuery('(max-width: 52rem)')

	useEffect(() => {
		void requestKey
		let active = true
		setDocket((current) => ({ ...current, status: 'loading', error: null }))

		creditApi
			.loadDocket()
			.then((entries) => {
				if (!active) return
				setDocket({ status: 'success', entries, error: null })
				setSelectedId((current) => current ?? entries[0]?.business.id ?? null)
			})
			.catch((error) => {
				if (!active) return
				setDocket({ status: 'error', entries: [], error })
			})

		return () => {
			active = false
		}
	}, [requestKey])

	const selectedEntry = docket.entries.find((entry) => entry.business.id === selectedId)
	const selectEntry = (businessId) => {
		setSelectedId(businessId)
		setMobileDetailOpen(true)
		setRestoreFocusId(null)
	}
	const handleVisibleChange = useCallback((visibleIds) => {
		setSelectedId((current) => {
			if (visibleIds.length === 0) return null
			return visibleIds.includes(current) ? current : visibleIds[0]
		})
	}, [])
	const handleReportResolved = useCallback((assessmentId, report) => {
		if (assessmentId == null || report == null) return
		setReportSummaries((current) => ({
			...current,
			[assessmentId]: {
				riskBand: report.riskBand,
				score: report.score,
			},
		}))
	}, [])
	const returnToDocket = () => {
		setRestoreFocusId(selectedId)
		setMobileDetailOpen(false)
	}

	useEffect(() => {
		if (mobileDetailOpen) detailHeadingRef.current?.focus()
	}, [mobileDetailOpen])

	return (
		<div className="app-shell">
			<header className="app-header">
				<a href="#workspace" className="app-header__brand">
					<span className="app-header__mark" aria-hidden="true">
						CA
					</span>
					<span>
						<strong>Credit assessment</strong>
						<small>Operations workspace</small>
					</span>
				</a>
				<p>Current assessment docket</p>
			</header>

			<main
				id="workspace"
				className={mobileDetailOpen ? 'workspace workspace--detail' : 'workspace'}
			>
				{docket.status === 'loading' && <DocketLoading />}
				{docket.status === 'error' && (
					<DocketError error={docket.error} onRetry={() => setRequestKey((key) => key + 1)} />
				)}
				{docket.status === 'success' && docket.entries.length === 0 && <DocketEmpty />}
				{docket.status === 'success' && docket.entries.length > 0 && (
					<>
						<Docket
							entries={docket.entries}
							selectedId={selectedId}
							restoreFocusId={restoreFocusId}
							onSelect={selectEntry}
							onVisibleChange={handleVisibleChange}
							reportSummaries={reportSummaries}
						/>
						{selectedEntry && (!isMobile || mobileDetailOpen) && (
							<FileSheet
								entry={selectedEntry}
								onBack={returnToDocket}
								headingRef={detailHeadingRef}
								onReportResolved={handleReportResolved}
							/>
						)}
					</>
				)}
			</main>
		</div>
	)
}

function DocketLoading() {
	return (
		<section className="state-page" aria-busy="true" aria-label="Loading assessment docket">
			<div className="state-page__skeleton" />
			<div className="state-page__skeleton state-page__skeleton--short" />
			<div className="state-page__rows" aria-hidden="true">
				{['one', 'two', 'three', 'four', 'five'].map((row) => (
					<div className="state-page__row" key={row} />
				))}
			</div>
		</section>
	)
}

function DocketError({ error, onRetry }) {
	return (
		<section className="state-page" role="alert">
			<p>Docket unavailable</p>
			<h1>Couldn’t reach the assessment API</h1>
			<p>
				Start it with <code>npm run api</code>, then retry. {error?.message}
			</p>
			<Button onClick={onRetry}>Retry docket</Button>
		</section>
	)
}

function DocketEmpty() {
	return (
		<section className="state-page">
			<p>Assessment docket</p>
			<h1>No businesses are available</h1>
			<p>The API returned an empty business list. There are no files to review yet.</p>
		</section>
	)
}
