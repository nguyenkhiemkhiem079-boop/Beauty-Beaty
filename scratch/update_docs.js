const fs = require('fs');
const path = require('path');

const featuresPath = path.join(__dirname, '..', 'docs', 'FEATURES.md');
let content = fs.readFileSync(featuresPath, 'utf8');

// The public tools list based on publicTools.ts
const publicToolsPath = path.join(__dirname, '..', 'apps', 'web', 'src', 'config', 'publicTools.ts');
const publicToolsContent = fs.readFileSync(publicToolsPath, 'utf8');

// Match `id: '...', code: '...'` or similar, wait, `publicTools.ts` doesn't have `code` inside `PUBLIC_TOOLS`!
// Wait, `e2e/public_tools_matrix.spec.ts` has the mapping between `tool` and `code`.
const e2eMatrixPath = path.join(__dirname, '..', 'e2e', 'public_tools_matrix.spec.ts');
const e2eMatrixContent = fs.readFileSync(e2eMatrixPath, 'utf8');

const regex = /tool:\s*'([^']+)',\s*code:\s*'([A-Z0-9]+)'/g;
let match;
const publicCodes = new Set();
while ((match = regex.exec(e2eMatrixContent)) !== null) {
  publicCodes.add(match[2]); // e.g. B001
}
// Manually add makeup codes from B051 to B061 as they are not in the matrix
for (let i = 51; i <= 61; i++) {
  publicCodes.add('B0' + i);
}
console.log('Public codes:', Array.from(publicCodes).join(', '));

// Update FEATURES.md
// Update headers
if (!content.includes('Công khai trên UI')) {
  content = content.replace(/\| ID \| Nguyên văn yêu cầu \| Distinct Behavior \| UI Entry \| Engine \/ Provider \| Dependency \| Supported Inputs \| Acceptance Criteria \| Tests & Evidence \| Status \| Next Action \|/g, 
                            '| ID | Nguyên văn yêu cầu | Distinct Behavior | UI Entry | Engine / Provider | Dependency | Supported Inputs | Acceptance Criteria | Tests & Evidence | Status | Công khai trên UI | Next Action |');
  content = content.replace(/\|---\|---\|---\|---\|---\|---\|---\|---\|---\|---\|---\|/g, 
                            '|---|---|---|---|---|---|---|---|---|---|---|---|');
}

// Update rows
const lines = content.split('\n');
const newLines = lines.map(line => {
  const rowMatch = line.match(/^\| \*\*([BX]\d{3})\*\*(.*)\| ([A-Z_]+) \|([^|]*)\|$/);
  if (rowMatch) {
    const code = rowMatch[1];
    const beforeStatus = rowMatch[2];
    const status = rowMatch[3];
    const afterStatus = rowMatch[4];
    const isPublic = publicCodes.has(code) ? 'Có' : 'Không';
    return `| **${code}**${beforeStatus}| ${status} | ${isPublic} |${afterStatus}|`;
  }
  return line;
});
content = newLines.join('\n');

// Update summary table
content = content.replace(/35 công cụ công khai \(không phải 82\)/g, '35 công cụ công khai');
fs.writeFileSync(featuresPath, content);
console.log('Updated FEATURES.md');

// Update UX_AUDIT.md
const uxAuditPath = path.join(__dirname, '..', 'docs', 'UX_AUDIT.md');
if (fs.existsSync(uxAuditPath)) {
  let uxAuditContent = fs.readFileSync(uxAuditPath, 'utf8');
  uxAuditContent = uxAuditContent.replace(/82 công cụ công khai/g, '35 công cụ công khai');
  uxAuditContent = uxAuditContent.replace(/crop 7 tỉ lệ/g, 'crop 4 tỉ lệ (original, 1:1, 4:5, 3:4, 9:16)');
  fs.writeFileSync(uxAuditPath, uxAuditContent);
  console.log('Updated UX_AUDIT.md');
}

// Update E2E_FUNCTION_MATRIX.md
const e2eMatrixDocPath = path.join(__dirname, '..', 'docs', 'E2E_FUNCTION_MATRIX.md');
if (fs.existsSync(e2eMatrixDocPath)) {
  let e2eMatrixDocContent = fs.readFileSync(e2eMatrixDocPath, 'utf8');
  e2eMatrixDocContent = e2eMatrixDocContent.replace(/82 công cụ công khai/g, '35 công cụ công khai');
  fs.writeFileSync(e2eMatrixDocPath, e2eMatrixDocContent);
  console.log('Updated E2E_FUNCTION_MATRIX.md');
}
