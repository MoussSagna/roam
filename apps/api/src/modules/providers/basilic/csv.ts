/**
 * A streaming CSV reader (RFC 4180: quoted fields, doubled quotes, CR/LF, a delimiter of choice, UTF-8 BOM) — enough
 * for the Basilic file without adding a dependency. Chunks go in, records come out: memory stays one record plus one
 * chunk, never the whole file.
 */
export async function* readCsv(
  chunks: AsyncIterable<string>,
  delimiter = ',',
): AsyncGenerator<string[]> {
  let field = '';
  let record: string[] = [];
  let quoted = false;
  /** In a quoted field, a quote was just read: either the closing one or the first of a doubled pair. */
  let quotePending = false;
  let atStart = true;
  let fieldStarted = false;

  for await (let chunk of chunks) {
    if (atStart) {
      chunk = chunk.replace(/^\uFEFF/, '');
      atStart = false;
    }
    const out: string[][] = [];
    for (let i = 0; i < chunk.length; i += 1) {
      const char = chunk[i];
      if (quoted) {
        if (quotePending) {
          quotePending = false;
          if (char === '"') {
            field += '"';
            continue;
          }
          quoted = false;
          // fall through: the character after a closing quote
        } else if (char === '"') {
          quotePending = true;
          continue;
        } else {
          field += char;
          continue;
        }
      }
      if (char === '"' && !fieldStarted) {
        quoted = true;
        fieldStarted = true;
      } else if (char === delimiter) {
        record.push(field);
        field = '';
        fieldStarted = false;
      } else if (char === '\n') {
        record.push(field);
        out.push(record);
        record = [];
        field = '';
        fieldStarted = false;
      } else if (char === '\r') {
        // CR of CRLF: the LF ends the record.
      } else {
        field += char;
        fieldStarted = true;
      }
    }
    for (const done of out) if (!(done.length === 1 && done[0] === '')) yield done;
  }
  if (quoted && !quotePending) throw new SyntaxError('CSV ends inside a quoted field');
  if (field !== '' || record.length > 0) {
    record.push(field);
    yield record;
  }
}

/** Records as objects keyed by the header row. */
export async function* readCsvObjects(
  chunks: AsyncIterable<string>,
  delimiter = ',',
): AsyncGenerator<Record<string, string>> {
  let header: string[] | undefined;
  for await (const record of readCsv(chunks, delimiter)) {
    if (!header) {
      header = record.map((name) => name.trim());
      continue;
    }
    const row: Record<string, string> = {};
    header.forEach((name, index) => (row[name] = record[index] ?? ''));
    yield row;
  }
}
