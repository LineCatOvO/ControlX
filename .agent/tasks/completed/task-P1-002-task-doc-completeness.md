# Task Document: Task Document Completeness Enhancement

## Meta Information
| Field | Value |
|-------|-------|
| Task ID | task-P1-002-task-doc-completeness |
| Priority | P1 |
| Created | 2026-05-02 |
| Source | Learner Improvement Suggestion - Task 2 |
| Status | pending |

## Task Objective
Update the task document template to require recording of git commit hash and actual diff records for complete change traceability.

## Task Background
Current task documents lack:
- Git commit hash of the working branch state
- Actual diff records showing what changed
- Commit history reference during task execution

This makes it difficult to:
- Trace changes back to specific commits
- Understand what was actually modified
- Verify task completion against actual changes
- Maintain audit trail for code changes

## Task Scope
- Create or update: `.agent/rules/execution/task-doc-completeness.md` - Task document completeness standard
- Optionally update: `.agent/tasks/template-task.md` - Task template reference
- Define mandatory fields for git hash and diff recording
- Specify when and how to record this information

## Input Files
- `/workspaces/agent-workspace/AGENTS_GENERAL.xml` - Agent rules and task document structure
- `/workspaces/agent-workspace/AGENTS_PLANNER.xml` - Task document requirements
- Any existing task templates in `PROJECT_ROOT/.agent/tasks/`

## Output Files
- `PROJECT_ROOT/.agent/rules/execution/task-doc-completeness.md` - Completeness standard
- If template exists: Updated `.agent/tasks/template-task.md`

## Task Steps

### Step 1: Analyze Current Task Document Structure
Read existing task documents in `PROJECT_ROOT/.agent/tasks/` to understand current structure:
- Check if template-task.md exists
- Review existing task document format
- Identify where git hash and diff fields should be added

### Step 2: Create Task Completeness Standard
Create `.agent/rules/execution/task-doc-completeness.md` with:
1. **Purpose**: Ensure task documents capture complete change information
2. **Mandatory Fields**: Define new required fields:
   - `git_commit_hash`: Current HEAD commit before task execution
   - `git_branch`: Current branch name
   - `expected_diff_summary`: Expected changes before execution
   - `actual_diff`: Actual diff after task completion
   - `files_changed`: List of files modified
3. **When to Record**: Specify recording points (before, during, after task)
4. **Format**: Markdown table or structured format for diff records

### Step 3: Document Diff Recording Process
Include:
- Commands to capture git state: `git rev-parse HEAD`, `git diff`, `git status`
- How to format diff output for task documents
- How to handle multi-commit scenarios
- How to record rollback changes if applicable

## Acceptance Criteria
- [ ] Created `.agent/rules/execution/task-doc-completeness.md`
- [ ] Document defines `git_commit_hash` field requirement
- [ ] Document defines `git_branch` field requirement
- [ ] Document defines `actual_diff` field requirement
- [ ] Document specifies when to capture git state (before and after task)
- [ ] Document provides commands to capture git information
- [ ] Document specifies diff format (unified diff preferred)
- [ ] Document specifies how to record files changed

## Notes
- This is a documentation/rule creation task
- Must work with existing git workflow in projects
- Diff recording should be automated where possible
- Consider using `git diff --stat` for summary and `git diff` for full diff