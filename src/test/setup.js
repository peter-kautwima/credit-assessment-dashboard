import '@testing-library/jest-dom/vitest'

Object.defineProperties(HTMLElement.prototype, {
	clientHeight: { configurable: true, get: () => 720 },
	clientWidth: { configurable: true, get: () => 432 },
})

HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
	const height = this.tagName === 'LI' ? 142 : 720
	return {
		width: 432,
		height,
		top: 0,
		right: 432,
		bottom: height,
		left: 0,
		x: 0,
		y: 0,
		toJSON: () => {},
	}
}

HTMLElement.prototype.scrollTo = function scrollTo(options) {
	this.scrollTop = typeof options === 'number' ? options : (options?.top ?? 0)
	this.dispatchEvent(new Event('scroll'))
}

class TestResizeObserver {
	constructor(callback) {
		this.callback = callback
	}

	observe(target) {
		window.setTimeout(() => {
			const height = target.tagName === 'LI' ? 142 : 720
			this.callback([
				{
					target,
					contentRect: { width: 432, height },
					borderBoxSize: [{ inlineSize: 432, blockSize: height }],
				},
			])
		}, 0)
	}

	unobserve() {}
	disconnect() {}
}

globalThis.ResizeObserver = TestResizeObserver
