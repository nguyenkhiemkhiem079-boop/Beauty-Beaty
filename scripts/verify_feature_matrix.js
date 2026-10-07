const fs = require('fs');
const path = require('path');

const repo = path.join(__dirname, '..');
const featuresPath = path.join(repo, 'docs', 'FEATURES.md');
const matrixPath = path.join(repo, 'docs', 'E2E_FUNCTION_MATRIX.md');

const features = fs.readFileSync(featuresPath, 'utf8');
const matrix = fs.readFileSync(matrixPath, 'utf8');

const LEDGER_STATUSES = ['VERIFIED', 'IMPLEMENTED_UNVERIFIED', 'PLANNED', 'BLOCKED_EXTERNAL'];
const MATRIX_STATUSES = [
  'VERIFIED_E2E',
  'WORKS_TECHNICALLY',
  'TOO_WEAK_VISUAL',
  'TOO_STRONG_VISUAL',
  'WRONG_REGION',
  'UI_NOT_WIRED',
  'NO_OP',
  'BROKEN',
  'BLOCKED_EXTERNAL',
  'NOT_IMPLEMENTED'
];

function parseRows(text, statuses) {
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith('|')) continue;
    const idMatch = line.match(/^\|\s*\*\*([BXI]\d{3})\*\*/);
    if (!idMatch) continue;
    const status = statuses.find((candidate) =>
      line.includes(`\`${candidate}\``)
    );
    if (!status) {
      throw new Error(`Row ${idMatch[1]} has no recognized status: ${line}`);
    }
    rows.push({ id: idMatch[1], status, line });
  }
  return rows;
}

function assertUnique(rows, label) {
  const counts = new Map();
  for (const row of rows) counts.set(row.id, (counts.get(row.id) || 0) + 1);
  const duplicates = [...counts.entries()].filter(([, count]) => count !== 1);
  if (duplicates.length) {
    throw new Error(
      `${label} contains duplicate IDs: ${duplicates
        .map(([id, count]) => `${id} x${count}`)
        .join(', ')}`
    );
  }
}

function countStatuses(rows) {
  const result = {};
  for (const row of rows) result[row.status] = (result[row.status] || 0) + 1;
  return result;
}

function parseSummaryCount(text, status) {
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith('|')) continue;
    if (!line.includes(`\`${status}\``)) continue;
    if (/^\|\s*\*\*[BXI]\d{3}/.test(line)) continue;

    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    if (cells.length < 2) continue;

    const numeric = cells[1].replace(/\*/g, '').match(/\d+/);
    if (numeric) return Number(numeric[0]);
  }
  return null;
}

function parseTotal(text) {
  const bold = text.match(/\|\s*\*\*(?:TỔNG CỘNG|TOTAL)\*\*\s*\|\s*\*\*(\d+)\*\*/i);
  if (bold) return Number(bold[1]);
  return null;
}

const ledgerRows = parseRows(features, LEDGER_STATUSES);
const matrixRows = parseRows(matrix, MATRIX_STATUSES);

assertUnique(ledgerRows, 'FEATURES.md');
assertUnique(matrixRows, 'E2E_FUNCTION_MATRIX.md');

const ledgerIds = new Set(ledgerRows.map((row) => row.id));
const matrixIds = new Set(matrixRows.map((row) => row.id));

const missingFromMatrix = [...ledgerIds].filter((id) => !matrixIds.has(id));
const extrasInMatrix = [...matrixIds].filter((id) => !ledgerIds.has(id));

if (missingFromMatrix.length || extrasInMatrix.length) {
  throw new Error(
    [
      missingFromMatrix.length
        ? `Missing from E2E matrix: ${missingFromMatrix.join(', ')}`
        : null,
      extrasInMatrix.length
        ? `Extra IDs in E2E matrix: ${extrasInMatrix.join(', ')}`
        : null
    ]
      .filter(Boolean)
      .join('\n')
  );
}

const ledgerCounts = countStatuses(ledgerRows);
const matrixCounts = countStatuses(matrixRows);

for (const status of LEDGER_STATUSES) {
  const displayed = parseSummaryCount(features, status);
  const actual = ledgerCounts[status] || 0;
  if (displayed === null) {
    throw new Error(`FEATURES.md summary is missing status ${status}`);
  }
  if (displayed !== actual) {
    throw new Error(
      `FEATURES.md summary mismatch for ${status}: displayed=${displayed}, actual=${actual}`
    );
  }
}

const ledgerTotal = parseTotal(features);
if (ledgerTotal === null || ledgerTotal !== ledgerRows.length) {
  throw new Error(
    `FEATURES.md total mismatch: displayed=${ledgerTotal}, actual=${ledgerRows.length}`
  );
}

for (const status of MATRIX_STATUSES) {
  const actual = matrixCounts[status] || 0;
  const displayed = parseSummaryCount(matrix, status);
  if (actual === 0 && displayed === null) continue;
  if (displayed === null) {
    throw new Error(`E2E matrix summary is missing status ${status}`);
  }
  if (displayed !== actual) {
    throw new Error(
      `E2E matrix summary mismatch for ${status}: displayed=${displayed}, actual=${actual}`
    );
  }
}

const matrixTotal = parseTotal(matrix);
if (matrixTotal === null || matrixTotal !== matrixRows.length) {
  throw new Error(
    `E2E matrix total mismatch: displayed=${matrixTotal}, actual=${matrixRows.length}`
  );
}

console.log('FEATURE LEDGER INTEGRITY: PASS');
console.log(`Declared requirements: ${ledgerRows.length}`);
console.log('Ledger counts:', ledgerCounts);
console.log('E2E counts:', matrixCounts);
