# Task Document Completeness Standard

## Purpose

Ensure task documents capture complete change information for full traceability, auditability, and reproducibility.

## Mandatory Fields

### 1. Git State Fields

| Field | Description | Required Timing |
|-------|-------------|------------------|
| `git_commit_hash` | Current HEAD commit SHA before task execution | Before task starts |
| `git_branch` | Current branch name | Before task starts |
| `files_changed` | List of files modified during task | After task completion |

### 2. Diff Fields

| Field | Description | Format |
|-------|-------------|--------|
| `expected_diff_summary` | Expected changes before execution | Summary text |
| `actual_diff` | Actual diff after task completion | Unified diff format |

### 3. Execution Record Fields

| Field | Description |
|-------|-------------|
| `commit_hash` | Git commit hash after changes |
| `actual_diff` | Full diff of changes made |
| `implementation_time` | When changes were implemented |

### 4. Review Record Fields

| Field | Description |
|-------|-------------|
| `review_result` | Pass/Fail/Needs Modification |
| `review_time` | When review was completed |
| `reviewer_notes` | Additional review comments |

## Recording Points

### Before Task Execution
```bash
git rev-parse HEAD           # Capture current commit hash
git branch                   # Confirm current branch
git status --short          # Show working tree status
```

### After Task Completion
```bash
git diff                     # Full unified diff
git diff --stat             # Summary of changes
git status --short          # Final status
```

## Diff Format Specification

Use unified diff format for all diff records:
```bash
git diff [options]
```

Key options:
- `--unified=N` - Context lines (default: 3)
- `--stat` - Summary only for large changes
- `-- no-color` - Ensure plain text

## Multi-Commit Handling

If task requires multiple commits:
1. Record initial commit hash before first change
2. Record each intermediate commit hash
3. Record final commit hash
4. Use `git log --oneline` for commit history

## Rollback Recording

If rollback is needed during task:
1. Record original commit hash
2. Record rollback commit hash
3. Document reason for rollback

## Checklist

- [ ] `git_commit_hash` captured before task
- [ ] `git_branch` recorded
- [ ] `files_changed` list generated
- [ ] `actual_diff` recorded in unified format
- [ ] `commit_hash` recorded after completion
- [ ] `implementation_time` logged
- [ ] Review record section completed