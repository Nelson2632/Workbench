// ============================================================
// Node 内置模块最小类型声明（测试专用）
// 用途：tsc 类型检查 node:fs / node:url 的测试导入；
// 运行时由 Node 原生提供（vitest node 环境）。仅声明测试用到的 API。
// ============================================================

declare module 'node:fs' {
  export interface Dirent {
    name: string
    isDirectory(): boolean
    isFile(): boolean
  }
  export function readFileSync(path: string | URL, encoding: string): string
  export function readFileSync(path: string | URL): Buffer
  export function readdirSync(path: string | URL, options: { withFileTypes: true }): Dirent[]
  export function readdirSync(path: string | URL): string[]
}

declare module 'node:url' {
  export function fileURLToPath(url: string | URL): string
}
