---
name: rollback-checkpoint
description: Restore the working tree to the last pre-prompt checkpoint snapshot. Use to undo the changes made since the most recent user prompt.
---

# Rollback to last checkpoint

Each user prompt snapshots the full tree (incl. untracked) into
`refs/checkpoints/latest` via the `UserPromptSubmit` hook. This restores it.

## Restore the last checkpoint

```
git checkout refs/checkpoints/latest -- .
```

This overwrites tracked + previously-snapshotted paths with the checkpoint version.

## Inspect before restoring

```
git diff refs/checkpoints/latest -- .          # what changed since checkpoint
git show refs/checkpoints/latest --stat        # files in the checkpoint
```

## Notes

- Files created AFTER the checkpoint are not auto-deleted; remove them manually if
  the rollback should be exact (`git clean -nd` to preview, then `-fd`).
- For finer, edit-level undo, the native `/rewind` command is also enabled.
- The checkpoint ref chains over time; `refs/checkpoints/latest~1` is the prior one.
