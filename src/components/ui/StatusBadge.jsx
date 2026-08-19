import './StatusBadge.css'

const statusTone = {
	Complete: 'success',
	Pending: 'pending',
	High: 'attention',
	Medium: 'info',
	Low: 'success',
}

export function StatusBadge({ children, status = children }) {
	const tone = statusTone[status] ?? 'neutral'

	return <span className={`status-badge status-badge--${tone}`}>{children}</span>
}
