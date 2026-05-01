# Coder Knowledge Output Rule

## Purpose
Ensure Coder agents output technical knowledge fragments to the knowledge base after completing code modification tasks. This captures implementation insights, prevents repeated mistakes, and builds a reusable knowledge base for future reference.

## Scope
- **Trigger**: After every Coder task that involves code modifications
- **Output Directory**: `PROJECT_ROOT/.agent/knowledge/raw/`
- **Applicable Categories**: snippets, patterns, solutions, configs, dependencies, experiences

## Knowledge Output Timing

Coder must output knowledge fragments after:
1. Completing any code modification task
2. Implementing a new feature or solving a bug
3. Discovering a noteworthy pattern or solution during implementation
4. Making architectural decisions or design choices
5. Encountering and resolving technical challenges

## Knowledge Categories and Output Location

| Category | Subdirectory | Description |
|----------|--------------|-------------|
| snippets | `raw/snippets/` | Reusable code fragments |
| patterns | `raw/patterns/` | Design patterns and application patterns |
| solutions | `raw/solutions/` | Problem solutions and fixes |
| configs | `raw/configs/` | Configuration notes and parameters |
| dependencies | `raw/dependencies/` | Dependency notes and environment setup |
| experiences | `raw/experiences/` | Implementation experiences and lessons learned |

## Knowledge Fragment Structure

Each knowledge fragment must contain:

```markdown
---
title: {brief title}
category: {snippets|patterns|solutions|configs|dependencies|experiences}
timestamp: {ISO 8601 format}
related_files: [{file1}, {file2}, ...]
tags: [{tag1}, {tag2}, ...]
---

## Problem Description
{What problem or context this knowledge addresses}

## Technical Details
{Key technical points and implementation details}

## Code Example
```{language}
{code example}
```

## Solution/Key Insight
{How the problem was solved or key takeaway}

## Related Files
- {file1}
- {file2}
```

## Required Fields

| Field | Required | Description |
|-------|----------|-------------|
| title | Yes | Brief descriptive title (max 80 characters) |
| category | Yes | One of the 6 categories |
| timestamp | Yes | ISO 8601 format (e.g., 2026-05-02T12:00:00Z) |
| related_files | Yes | Array of file paths related to this knowledge |
| tags | No | Array of tags for searchability |
| Problem Description | Yes | Clear description of the problem/context |
| Technical Details | Yes | Key technical points |
| Code Example | No | Actual code example (strongly recommended) |
| Solution/Key Insight | Yes | How it was solved or main takeaway |

## Quality Standards

### Good Knowledge Fragment
- Has a clear, specific title that describes the content
- Includes a code example (for technical knowledge)
- Describes the problem context before the solution
- Lists related file paths for traceability
- Contains actionable insights that can be reused

### Poor Knowledge Fragment (Avoid)
- Vague title like "Bug fix" or "Code update"
- Missing problem description or context
- No code example when one is applicable
- No related files listed
- Too generic or lacking specific technical details

## File Naming Convention

Knowledge files must follow this naming pattern:
```
{date}-{context}-{id}.md
```

Examples:
- `2026-05-02-docker-multi-stage-build-dockerx-001.md`
- `2026-05-02-npm-dependency-conflict-002.md`
- `2026-05-02-react-state-management-pattern-003.md`

Components:
- **date**: YYYY-MM-DD format
- **context**: Brief context identifier (kebab-case)
- **id**: 3-digit sequential number within the category

## Output Examples

### Example 1: Experience (Docker Multi-stage Build)
```markdown
---
title: Docker multi-stage build for Node.js application
category: experiences
timestamp: 2026-05-02T10:30:00Z
related_files: [Dockerfile, docker-compose.yml]
tags: [docker, nodejs, build optimization]
---

## Problem Description
Building a Node.js application with dependencies resulted in large Docker images (over 1GB). Need to optimize image size for faster deployments.

## Technical Details
- Node.js build requires development dependencies (npm install)
- Production only needs compiled output and runtime dependencies
- Multi-stage builds separate build and production environments

## Code Example
```dockerfile
# Stage 1: Build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
RUN npm ci --only=production
CMD ["node", "dist/index.js"]
```

## Solution/Key Insight
Multi-stage builds reduce image size from ~1GB to ~200MB by copying only production artifacts. Key points: use `npm ci --only=production` to avoid dev dependencies, copy only necessary artifacts between stages.

## Related Files
- Dockerfile
- docker-compose.yml
```

### Example 2: Solution (Fixing CORS Issues)
```markdown
---
title: CORS configuration for Express.js API
category: solutions
timestamp: 2026-05-02T11:00:00Z
related_files: [src/server.js, src/middleware/cors.js]
tags: [cors, express, api, security]
---

## Problem Description
Browser blocked API requests due to missing CORS headers when frontend called backend API on different domain.

## Technical Details
Cross-Origin Resource Sharing (CORS) requires explicit header configuration. Express needs cors middleware to allow cross-origin requests.

## Code Example
```javascript
// src/middleware/cors.js
const cors = require('cors');

const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

module.exports = cors(corsOptions);
```

## Solution/Key Insight
Use environment variable for allowed origins instead of hardcoding '*' in production. Include 'OPTIONS' in allowed methods for preflight requests. Set credentials: true when using cookies or auth headers.

## Related Files
- src/server.js
- src/middleware/cors.js
```

## Implementation Notes

1. **Lightweight Process**: Knowledge output should add minimal overhead (~5 minutes per task)
2. **One Fragment Per Task**: Create one primary knowledge fragment per completed task
3. **Incremental Updates**: If knowledge already exists for similar topic, update the existing fragment
4. **No Sorted/Verified Writes**: Coder only writes to raw directory; Learner handles classification

## Violation Handling

If Coder fails to output required knowledge:
- Reviewer should note the omission in task verification
- Task should be marked incomplete until knowledge fragment is added
- Repeated violations should be reported to Manager