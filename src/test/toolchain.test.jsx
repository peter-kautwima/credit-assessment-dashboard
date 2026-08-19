import { render, screen } from '@testing-library/react'

// Guards the toolchain, not the app: this fails if vite.config.js stops being loaded
// (JSX never compiles), if the jsdom environment is lost, or if the jest-dom matchers
// are not registered by the setup file. It renders its own component rather than
// importing App, so changing the app can never break this test for the wrong reason.
function Probe() {
	return <p>toolchain ok</p>
}

describe('toolchain', () => {
	it('compiles JSX, renders into jsdom, and exposes jest-dom matchers', () => {
		render(<Probe />)
		expect(screen.getByText('toolchain ok')).toBeInTheDocument()
	})
})
