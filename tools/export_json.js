#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildChart, ChartError } from '../src/lib/chart.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const CSV = {
  chart: path.join(ROOT, 'data', 'ED_IAA_chart_data - CHART.csv'),
  justification: path.join(ROOT, 'data', 'ED_IAA_chart_data - JUSTIFICATION.csv'),
}

function arg(flag, fallback) {
  const i = process.argv.indexOf(flag)
  return i === -1 ? fallback : process.argv[i + 1]
}

const out = path.resolve(arg('-o', arg('--out', path.join(ROOT, 'data', 'iaa.json'))))
const indent = Number(arg('--indent', 1))

for (const [name, file] of Object.entries(CSV)) {
  if (!fs.existsSync(file)) {
    console.error(`export: missing ${name} export at ${path.relative(ROOT, file)}`)
    process.exit(1)
  }
}

let chart
try {
  chart = buildChart(
    fs.readFileSync(CSV.chart, 'utf8'),
    fs.readFileSync(CSV.justification, 'utf8')
  )
} catch (err) {
  if (err instanceof ChartError) {
    console.error(`export: the spreadsheet exports don't line up —\n  ${err.message}`)
    process.exit(1)
  }
  throw err
}

fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, JSON.stringify(chart, null, indent || undefined) + '\n')

const addressed = chart.rows.reduce(
  (total, row) => total + Object.values(row.cells).filter((cell) => cell.holders.length).length,
  0
)
console.log(
  `wrote ${path.relative(ROOT, out)} — ${chart.rows.length} partnerships x ` +
    `${chart.columns.length} functions, ${addressed}/${chart.rows.length * chart.columns.length} addressed`
)
