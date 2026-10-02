const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const agentsSkillsDir = path.join(repoRoot, '.agents', 'skills');

// 1. Karpathy Guidelines
const karpathySrc = path.join(agentsSkillsDir, 'andrej-karpathy-skills', 'skills', 'karpathy-guidelines', 'SKILL.md');
const karpathyDestDir = path.join(agentsSkillsDir, 'karpathy-guidelines');
if (fs.existsSync(karpathySrc)) {
  fs.mkdirSync(karpathyDestDir, { recursive: true });
  fs.copyFileSync(karpathySrc, path.join(karpathyDestDir, 'SKILL.md'));
  console.log('✅ Installed karpathy-guidelines -> .agents/skills/karpathy-guidelines/SKILL.md');
} else {
  console.error('❌ Missing karpathy source at:', karpathySrc);
}

// 2. Agent-Reach (Installed to global Antigravity skills to avoid Windows case-insensitive collision with submodule folder)
const globalSkillsDir = 'C:\\Users\\khiem.nguyen\\.gemini\\config\\skills';
const agentReachSrc = path.join(agentsSkillsDir, 'Agent-Reach', 'agent_reach', 'skill', 'SKILL.md');
const agentReachRefSrc = path.join(agentsSkillsDir, 'Agent-Reach', 'agent_reach', 'skill', 'references');
const agentReachGlobalDestDir = path.join(globalSkillsDir, 'agent-reach');

if (fs.existsSync(agentReachSrc)) {
  fs.mkdirSync(agentReachGlobalDestDir, { recursive: true });
  fs.copyFileSync(agentReachSrc, path.join(agentReachGlobalDestDir, 'SKILL.md'));
  if (fs.existsSync(agentReachRefSrc)) {
    const refDestDir = path.join(agentReachGlobalDestDir, 'references');
    fs.mkdirSync(refDestDir, { recursive: true });
    const refFiles = fs.readdirSync(agentReachRefSrc);
    for (const rf of refFiles) {
      fs.copyFileSync(path.join(agentReachRefSrc, rf), path.join(refDestDir, rf));
    }
  }
  console.log('✅ Installed agent-reach -> C:\\Users\\khiem.nguyen\\.gemini\\config\\skills\\agent-reach\\SKILL.md');
} else {
  console.error('❌ Missing agent-reach source at:', agentReachSrc);
}

// 3. Agency Agents
const agencyRoles = [
  { file: 'specialized/agents-orchestrator.md', slug: 'agency-agents-orchestrator' },
  { file: 'project-management/project-management-project-shepherd.md', slug: 'agency-project-shepherd' },
  { file: 'engineering/engineering-software-architect.md', slug: 'agency-software-architect' },
  { file: 'engineering/engineering-ai-engineer.md', slug: 'agency-ai-engineer' },
  { file: 'engineering/engineering-frontend-developer.md', slug: 'agency-frontend-developer' },
  { file: 'engineering/engineering-backend-architect.md', slug: 'agency-backend-architect' },
  { file: 'design/design-ui-designer.md', slug: 'agency-ui-designer' },
  { file: 'design/design-ux-researcher.md', slug: 'agency-ux-researcher' },
  { file: 'testing/testing-api-tester.md', slug: 'agency-api-tester' },
  { file: 'testing/testing-evidence-collector.md', slug: 'agency-evidence-collector' },
  { file: 'testing/testing-performance-benchmarker.md', slug: 'agency-performance-benchmarker' },
  { file: 'engineering/engineering-devops-automator.md', slug: 'agency-devops-automator' },
  { file: 'testing/testing-reality-checker.md', slug: 'agency-reality-checker' }
];

const agencyBase = path.join(agentsSkillsDir, 'agency-agents');

function parseFrontmatterAndBody(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: content };
  }
  const yamlBlock = match[1];
  const body = match[2];
  const fm = {};
  yamlBlock.split(/\r?\n/).forEach(line => {
    const idx = line.indexOf(':');
    if (idx !== -1) {
      const k = line.substring(0, idx).trim();
      const v = line.substring(idx + 1).trim();
      fm[k] = v;
    }
  });
  return { frontmatter: fm, body };
}

let installedRolesCount = 0;
for (const role of agencyRoles) {
  const srcPath = path.join(agencyBase, role.file);
  if (!fs.existsSync(srcPath)) {
    console.error(`❌ Missing agency role source: ${srcPath}`);
    continue;
  }
  const content = fs.readFileSync(srcPath, 'utf8');
  const { frontmatter, body } = parseFrontmatterAndBody(content);
  
  const skillDir = path.join(agentsSkillsDir, role.slug);
  fs.mkdirSync(skillDir, { recursive: true });
  
  const description = frontmatter.description || `Agency Agent: ${role.slug}`;
  const skillContent = `---
name: ${role.slug}
description: "${description.replace(/"/g, '\\"')}"
---

${body}
`;

  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), skillContent, 'utf8');
  console.log(`✅ Installed ${role.slug} -> .agents/skills/${role.slug}/SKILL.md`);
  installedRolesCount++;
}

console.log(`\n=== SKILLS INSTALLATION COMPLETE ===`);
console.log(`Agency Agents Installed: ${installedRolesCount}/${agencyRoles.length}`);
