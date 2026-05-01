# Task Document: Coder Knowledge Output Standardization

## Meta Information
| Field | Value |
|-------|-------|
| Task ID | task-P1-001-coder-knowledge-output |
| Priority | P1 |
| Created | 2026-05-02 |
| Source | Learner Improvement Suggestion - Task 1 |
| Status | pending |

## Task Objective
Create a standardized rule document that mandates Coder agents to output technical knowledge fragments to `.agent/knowledge/raw/` after completing code modifications.

## Task Background
Currently, Coder agents complete code modifications without documenting the technical knowledge gained during implementation. This leads to:
- Loss of valuable implementation insights
- Repeated mistakes across tasks
- Lack of knowledge沉淀 mechanism
- Incomplete knowledge base for future reference

## Task Scope
- Create rule file: `.agent/rules/execution/coder-knowledge-output.md`
- Define knowledge fragment structure and output requirements
- Specify output location: `PROJECT_ROOT/.agent/knowledge/raw/`
- Define when and what knowledge to capture

## Input Files
- `/workspaces/agent-workspace/AGENTS_GENERAL.xml` - Agent rules and knowledge base structure
- `/workspaces/agent-workspace/AGENTS_PLANNER.xml` - Planner responsibilities
- Existing knowledge base structure reference

## Output Files
- `PROJECT_ROOT/.agent/rules/execution/coder-knowledge-output.md` - The rule document

## Task Steps

### Step 1: Analyze Knowledge Base Structure
Read AGENTS_GENERAL.xml sections about knowledge base:
- raw level structure and subdirectories
- permitted write agents
- knowledge fragment types

### Step 2: Draft Rule Document
Create `.agent/rules/execution/coder-knowledge-output.md` with the following sections:
1. **Purpose**: Define why knowledge output is required
2. **Scope**: Define when Coder must output knowledge
3. **Output Location**: Specify `PROJECT_ROOT/.agent/knowledge/raw/` with subdirectories
4. **Knowledge Types**: Code snippets, patterns, solutions, configs, dependencies, experiences
5. **Output Format**: JSON or Markdown fragment structure
6. **Quality Standards**: What makes a good knowledge fragment

### Step 3: Define Knowledge Fragment Requirements
Include:
- Minimum fields: title, category, content, timestamp, related_files
- Content guidelines for each category
- Examples of good vs bad fragments

## Acceptance Criteria
- [ ] Rule document created at `.agent/rules/execution/coder-knowledge-output.md`
- [ ] Document specifies output location as `PROJECT_ROOT/.agent/knowledge/raw/`
- [ ] Document defines 6 knowledge categories (snippets, patterns, solutions, configs, dependencies, experiences)
- [ ] Document specifies knowledge fragment structure with required fields
- [ ] Document specifies when Coder must output knowledge (after every code modification task)
- [ ] Document includes example fragments for each category
- [ ] Document specifies quality standards for knowledge fragments

## Notes
- This is a rule creation task, no code modifications required
- Rule should be consistent with AGENTS_GENERAL.xml knowledge base structure
- Knowledge output should be lightweight, not add significant overhead to Coder workflow