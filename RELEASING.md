# Releasing

Minimum release flow for publishing both Composer and npm packages.

## 1) Prerequisites

- Packagist account connected to the GitHub repository.
- npm account with rights to publish `@poshtive/petak`.
- Local auth:
  - `composer --version`
  - `npm whoami`

## 2) Pre-release checks

Run from repository root:

```bash
pnpm install
composer install
pnpm run release:check
pnpm run release:npm:dry-run
```

## 3) Bump versions

- npm version is taken from `package.json`.
- Composer package version is inferred from Git tag.

Update npm version:

```bash
npm version patch --no-git-tag-version
# or: npm version minor --no-git-tag-version
# or: npm version major --no-git-tag-version
```

Commit:

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore(release): bump npm version"
```

## 4) Tag and push

Create and push Git tag (this is the Composer release version):

```bash
git tag v0.1.1
git push origin master
git push origin v0.1.1
```

## 5) Publish npm

```bash
npm publish --access public
```

## 6) Publish Composer

- If Packagist webhook is configured, release appears automatically after tag push.
- If not, open Packagist package page and click "Update".

## 7) Post-release verification

```bash
npm view @poshtive/petak version
composer show poshtive/petak --all | head
```

## Notes

- Keep Git tag (Composer version) and `package.json` version aligned.
- Optional PHP dependency for XLSX export remains optional via Composer `suggest`:
  - `openspout/openspout`
