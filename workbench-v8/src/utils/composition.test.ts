import { expect, it } from 'vitest'
import { isComposingKey } from './composition'
it('does not submit IME candidate confirmation in WebView2 or WebKit', () => {
  expect(isComposingKey({ nativeEvent: { isComposing: true } })).toBe(true)
  expect(isComposingKey({ nativeEvent: { isComposing: false, keyCode: 229 } })).toBe(true)
  expect(isComposingKey({ isComposing: true })).toBe(true)
  expect(isComposingKey({ nativeEvent: { isComposing: false, keyCode: 13 } })).toBe(false)
})
