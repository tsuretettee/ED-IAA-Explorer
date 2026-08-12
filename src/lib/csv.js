export function parseCsv(text) {
  const source = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n')
  const rows = []
  let row = []
  let field = ''
  let quoted = false

  for (let i = 0; i < source.length; i++) {
    const char = source[i]

    if (quoted) {
      if (char !== '"') {
        field += char
      } else if (source[i + 1] === '"') {
        field += '"'
        i++
      } else {
        quoted = false
      }
      continue
    }

    if (char === '"') quoted = true
    else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += char
  }

  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}
