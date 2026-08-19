import { useEffect, useState } from 'react'

export function useMediaQuery(query) {
	const getMatches = () => globalThis.matchMedia?.(query).matches ?? false
	const [matches, setMatches] = useState(getMatches)

	useEffect(() => {
		const media = globalThis.matchMedia?.(query)
		if (!media) return undefined
		const update = () => setMatches(media.matches)
		update()
		media.addEventListener('change', update)
		return () => media.removeEventListener('change', update)
	}, [query])

	return matches
}
