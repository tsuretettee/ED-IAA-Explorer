import { parseCsv } from './csv.js'

const NOT_ADDRESSED = 'NOT ADDRESSED'
const PARAGRAPH_BREAK = /\n\s*\n/

export class ChartError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ChartError'
  }
}

function readTable(rows, label) {
  if (rows.length === 0) throw new ChartError(`${label} is empty`)

  const header = rows[0].map((cell) => cell.trim())
  const columns = header.slice(1)
  const table = new Map()

  rows.slice(1).forEach((row, index) => {
    const line = index + 2
    if (!row.some((cell) => cell.trim())) return

    if (row.length !== header.length) {
      throw new ChartError(
        `${label} line ${line}: expected ${header.length} columns, got ${row.length}`
      )
    }
    const name = row[0].trim()
    if (table.has(name)) {
      throw new ChartError(`${label} line ${line}: duplicate partnership "${name}"`)
    }
    table.set(name, Object.fromEntries(columns.map((column, i) => [column, row[i + 1]])))
  })

  return { columns, table }
}

function splitHolders(value) {
  if (value.toUpperCase() === NOT_ADDRESSED) return []
  return value
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean)
}

function parseJustification(cell) {
  const paragraphs = cell
    .split(PARAGRAPH_BREAK)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
  return {
    clauses: paragraphs.filter((p) => !p.startsWith('http')),
    urls: paragraphs.filter((p) => p.startsWith('http')),
  }
}

function buildCell(rawValue, justification, where) {
  const value = rawValue.trim()
  const holders = splitHolders(value)

  if (holders.length === 0) {
    return { value: NOT_ADDRESSED, holders: [], quotes: [], url: '' }
  }

  const { clauses, urls } = parseJustification(justification)

  if (clauses.length !== holders.length) {
    throw new ChartError(
      `${where}: ${holders.length} holder(s) [${holders}] but ${clauses.length} ` +
        `clause paragraph(s) in the justification cell`
    )
  }
  if (urls.length !== 1) {
    throw new ChartError(`${where}: expected exactly 1 source URL, found ${urls.length}`)
  }

  return {
    value,
    holders,
    quotes: holders.map((party, i) => ({ party, text: clauses[i] })),
    url: urls[0],
  }
}

export function buildChart(chartCsv, justificationCsv) {
  const chart = readTable(parseCsv(chartCsv), 'CHART.csv')
  const justification = readTable(parseCsv(justificationCsv), 'JUSTIFICATION.csv')

  if (chart.columns.join('|') !== justification.columns.join('|')) {
    throw new ChartError(
      'the two exports disagree on their function columns:\n' +
        `  CHART.csv: ${chart.columns.join(', ')}\n` +
        `  JUSTIFICATION.csv: ${justification.columns.join(', ')}`
    )
  }

  const missing = [...chart.table.keys()].filter((name) => !justification.table.has(name))
  if (missing.length) {
    throw new ChartError(`JUSTIFICATION.csv is missing partnership(s): ${missing.join(', ')}`)
  }
  const extra = [...justification.table.keys()].filter((name) => !chart.table.has(name))
  if (extra.length) {
    throw new ChartError(`CHART.csv is missing partnership(s): ${extra.join(', ')}`)
  }

  const rows = [...chart.table.entries()].map(([name, chartRow]) => {
    const justificationRow = justification.table.get(name)
    const cells = {}
    for (const column of chart.columns) {
      cells[column] = buildCell(
        chartRow[column],
        justificationRow[column],
        `"${name}" / "${column}"`
      )
    }
    return { name, cells }
  })

  return { columns: chart.columns, rows }
}
