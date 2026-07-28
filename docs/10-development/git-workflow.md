# Git Workflow

## Branch strategy
- Use short-lived feature branches for implementation work.
- Use hotfix branches for urgent corrections that need immediate attention.
- Keep the main branch deployable and reviewable.

## Feature branches
- Create a branch from the main development line for each independent task.
- Keep branch names descriptive and consistent with the task scope.
- Avoid mixing unrelated changes in a single branch.

## Hotfix branches
- Use hotfix branches for urgent production or stability issues.
- Keep the scope narrow and focused on the issue at hand.

## Merge strategy
- Prefer merge commits or squash merges that preserve a clear history.
- Ensure the branch is reviewed before merging.
- Keep the mainline stable and easy to understand.

## Commit expectations
- Commit focused changes.
- Include documentation updates when architecture or business rules change.
- Keep commit messages clear and meaningful.

## Pull request expectations
- Reference the relevant documentation before implementation.
- Summarize the business impact and any migration or data integrity concerns.
- Include a clear summary of the change and the reason for it.
