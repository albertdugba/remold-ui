# Releasing Remold

Every public package is versioned together and published under `@remold-ui`.

1. Add a changeset for a user-facing change: `pnpm changeset`.
2. Merge the **Version packages** pull request created by GitHub Actions.
3. Read the shared version from any package, create a matching tag, and push it:
   ```sh
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```
4. The **Publish packages** workflow verifies the tag, runs the full checks, then publishes the seven packages.

## npm authentication

The current workflow publishes with an npm granular token stored in the repository as `NPM_TOKEN`. It needs publish permission for every `@remold-ui/*` package.

You can later replace the token with npm trusted publishing after configuring the package-side publisher settings and adding `id-token: write` to the workflow permissions.
