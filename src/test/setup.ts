import { vi } from 'vitest'
import '@testing-library/jest-dom'

class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// jsdom does not implement IntersectionObserver by default.
// Dashboard tests rely on this API for reveal animations.
vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)

