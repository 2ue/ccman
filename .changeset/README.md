# Changesets

This folder stores pending release notes for the next version.

## Usage

1. Run `pnpm changeset`
2. Select impacted packages
3. Write a user-facing summary
4. Commit the generated `.changeset/*.md` file

`release.yml` consumes pending changesets during tag release to update root `CHANGELOG.md` and archives consumed files to `.changeset/archive/v<version>/`.
