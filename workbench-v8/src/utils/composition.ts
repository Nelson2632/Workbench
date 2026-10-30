/** keyCode 229 covers WebKit's composition-ending Enter; isComposing covers WebView2. */
export function isComposingKey(event: { isComposing?: boolean; keyCode?: number; nativeEvent?: { isComposing?: boolean; keyCode?: number } }): boolean {
  const native = event.nativeEvent ?? event
  return native.isComposing === true || native.keyCode === 229
}
