#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildChart, ChartError } from '../src/lib/chart.js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..')
const SRC = path.join(ROOT, 'src')
const ENTRY = path.join(SRC, 'app.js')
const INDEX = path.join(ROOT, 'index.html')
const STYLES = path.join(SRC, 'app.css')
const VUE = path.join(ROOT, 'vendor', 'vue.global.prod.js')
const OUT = path.join(ROOT, 'iaa-explorer.html')

const CSV = {
  chart: path.join(ROOT, 'data', 'ED_IAA_chart_data - CHART.csv'),
  justification: path.join(ROOT, 'data', 'ED_IAA_chart_data - JUSTIFICATION.csv'),
}

const IMPORT = /^[ \t]*import[ \t]*\{([^}]*)\}[ \t]*from[ \t]*['"](\.[^'"]+)['"];?[ \t]*$/gm
const EXPORT = /^export[ \t]+(?=(?:const|let|var|function|class|async)\b)/gm
const UNSUPPORTED = [
  [/^[ \t]*import\s+(?!\{)/m, 'only named imports are supported: import { X } from "./x.js"'],
  [/^[ \t]*import\s*\{[^}]*\}\s*from\s*['"][^.]/m, 'only relative imports are supported'],
  [/^export\s+default\b/m, 'export default is not supported; use a named export'],
  [/^export\s*\{/m, 'export lists are not supported; put export on the declaration'],
  [/^export\s*\*/m, 'export * is not supported'],
]

function fail(message) {
  console.error(`build: ${message}`)
  process.exit(1)
}

function read(file, what) {
  try {
    return fs.readFileSync(file, 'utf8')
  } catch {
    return fail(`cannot read ${what} at ${path.relative(ROOT, file)}`)
  }
}

const guard = (js) => js.replace(/<\/script/gi, '<\\/script')

const literal = (value) => JSON.stringify(value).replace(/</g, '\\u003c')

function bundle(entry) {
  const seen = new Set()
  const declared = new Map()
  const chunks = []

  function visit(file, importedFrom) {
    const rel = path.relative(ROOT, file)
    if (seen.has(file)) return
    seen.add(file)

    if (!fs.existsSync(file)) {
      fail(`${rel} imported by ${path.relative(ROOT, importedFrom)} does not exist`)
    }
    const source = fs.readFileSync(file, 'utf8')

    for (const [pattern, message] of UNSUPPORTED) {
      if (pattern.test(source)) fail(`${rel}: ${message}`)
    }

    for (const match of source.matchAll(IMPORT)) {
      visit(path.resolve(path.dirname(file), match[2]), file)
    }

    for (const match of source.matchAll(EXPORT)) {
      const name = source.slice(match.index).match(/^export\s+(?:async\s+)?\w+\s+(\w+)/)
      if (!name) continue
      const previous = declared.get(name[1])
      if (previous) fail(`${rel}: ${name[1]} is already declared by ${previous}`)
      declared.set(name[1], rel)
    }

    const code = source.replace(IMPORT, '').replace(EXPORT, '')
    chunks.push(code.trim())
  }

  visit(entry, entry)
  return { code: chunks.join('\n\n'), count: chunks.length }
}

function replace(html, pattern, replacement, what) {
  if (!pattern.test(html)) {
    fail(`index.html no longer contains the ${what} tag this script expects (${pattern})`)
  }
  return html.replace(pattern, () => replacement)
}

function main() {
  for (const file of Object.values(CSV)) {
    if (!fs.existsSync(file)) fail(`missing spreadsheet export: ${path.relative(ROOT, file)}`)
  }

  const sources = {
    chart: read(CSV.chart, 'the CHART export'),
    justification: read(CSV.justification, 'the JUSTIFICATION export'),
  }

  let chart
  try {
    chart = buildChart(sources.chart, sources.justification)
  } catch (err) {
    if (err instanceof ChartError) fail(`the spreadsheet exports don't line up —\n  ${err.message}`)
    throw err
  }

  let html = read(INDEX, 'the page shell')
  const css = read(STYLES, 'the stylesheet')
  const vue = read(VUE, 'the vendored Vue runtime')
  const app = bundle(ENTRY)

  html = replace(
    html,
    /<link rel="stylesheet"[^>]*>/,
    `<style>\n${css.trim()}\n</style>`,
    'stylesheet link'
  )
  html = replace(
    html,
    /<script src="\.\/vendor\/vue\.global\.prod\.js"><\/script>/,
    `<script>${guard(vue)}</script>`,
    'Vue runtime script'
  )
  html = replace(
    html,
    /<script type="module" src="\.\/src\/app\.js"><\/script>/,
    `<script>window.__IAA_CSV__ = {\nchart: ${literal(sources.chart)},\n` +
      `justification: ${literal(sources.justification)}\n};</script>\n` +
      `<script>\n(function () {\n'use strict';\n${guard(app.code)}\n})();\n</script>`,
    'application module script'
  )

  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, html)

  const kb = (fs.statSync(OUT).size / 1024).toFixed(0)
  const addressed = chart.rows.reduce(
    (total, row) => total + Object.values(row.cells).filter((cell) => cell.holders.length).length,
    0
  )
  console.log(
    `wrote ${path.relative(ROOT, OUT)} — ${kb} KB, ${app.count} modules inlined, ` +
      `${chart.rows.length} partnerships x ${chart.columns.length} functions ` +
      `(${addressed}/${chart.rows.length * chart.columns.length} addressed)`
  )
}

main()
