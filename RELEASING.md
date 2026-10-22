# Releasing Remold

Every public package is versioned together and published under `@remold-ui`.

1. Add a changeset for a user-facing change: `pnpm changeset`.
2. Merge the **Version packages** pull request created by GitHub Actions.
3. Read the shared version from any package, create a matching tag, and push it:
   ```sh
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```
4. The **Publish packages** workflow verifies the tag, runs the full checks, then publishes the six packages.

## npm authentication

For the first publish, add an npm granular publish token as the repository secret `NPM_TOKEN`. Then, in the npm settings for each package, add a GitHub Actions trusted publisher with:

- Owner: `albertdugba`
- Repository: `remold-ui`
- Workflow: `publish.yml`
- Permission: allow `npm publish`

Trusted publishing uses GitHub OIDC and removes the need for a long-lived publishing token. The workflow already has the required `id-token: write` permission.
