import { useCallback, useEffect, useState } from 'react'
import { creditApi } from '../data/creditApi'

const loadingState = { status: 'loading', data: null, error: null }

function useResource(assessmentId, loader) {
	const [state, setState] = useState(loadingState)
	const [requestKey, setRequestKey] = useState(0)

	useEffect(() => {
		void requestKey
		let active = true
		if (!assessmentId) {
			setState({ status: 'empty', data: null, error: null })
			return undefined
		}

		setState(loadingState)
		loader(assessmentId)
			.then((data) => {
				if (active) setState({ status: data == null ? 'empty' : 'success', data, error: null })
			})
			.catch((error) => {
				if (active) setState({ status: 'error', data: null, error })
			})

		return () => {
			active = false
		}
	}, [assessmentId, loader, requestKey])

	const retry = useCallback(() => setRequestKey((key) => key + 1), [])
	return { ...state, retry }
}

export function useAssessmentDetails(assessmentId) {
	return {
		report: useResource(assessmentId, creditApi.loadCreditReport),
		statement: useResource(assessmentId, creditApi.loadBankStatement),
		scoreItems: useResource(assessmentId, creditApi.loadScoreItems),
	}
}
