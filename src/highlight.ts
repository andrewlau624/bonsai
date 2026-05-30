// Lazy syntax highlighting via highlight.js. The library is dynamically
// imported so it lands in its own chunk and never bloats the main window.

type Hljs = {
  getLanguage: (l: string) => unknown
  highlight: (code: string, opts: { language: string }) => { value: string }
  highlightAuto: (code: string) => { value: string }
}

let hljs: Hljs | null = null

const EXT_LANG: Record<string, string> = {
  ts: 'typescript', tsx: 'typescript', mts: 'typescript', cts: 'typescript',
  js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
  json: 'json', py: 'python', rb: 'ruby', go: 'go', rs: 'rust', java: 'java',
  c: 'c', h: 'c', cpp: 'cpp', cc: 'cpp', hpp: 'cpp', cs: 'csharp', php: 'php',
  sh: 'bash', bash: 'bash', zsh: 'bash', fish: 'bash', yml: 'yaml', yaml: 'yaml',
  md: 'markdown', markdown: 'markdown', html: 'xml', xml: 'xml', svg: 'xml',
  css: 'css', scss: 'scss', less: 'less', sql: 'sql', swift: 'swift',
  kt: 'kotlin', toml: 'ini', ini: 'ini', dockerfile: 'dockerfile', lua: 'lua',
  r: 'r', pl: 'perl', dart: 'dart', scala: 'scala', vue: 'xml',
}

/** Highlight `content`, returning HTML (with hljs spans) or null on failure. */
export async function highlight(content: string, filename: string): Promise<string | null> {
  try {
    if (!hljs) hljs = ((await import('highlight.js/lib/common')) as { default: Hljs }).default
    const ext = filename.split('.').pop()?.toLowerCase() ?? ''
    const lang = EXT_LANG[ext]
    if (lang && hljs.getLanguage(lang)) return hljs.highlight(content, { language: lang }).value
    return hljs.highlightAuto(content).value
  } catch {
    return null
  }
}
