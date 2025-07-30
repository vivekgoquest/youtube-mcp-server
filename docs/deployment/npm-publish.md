# NPM Package Publishing Guide

This guide explains the process for publishing the YouTube MCP Server to NPM, with a focus on the automated workflow
triggered by GitHub releases.

## Automatic Publishing Workflow

When you push a version tag to GitHub, the package is automatically published to NPM. Here’s the process:

1. **Create a version tag** (e.g., `git tag v1.0.1`).
2. **GitHub Actions is triggered**, which runs tests, builds the package, and publishes it.
3. The **NPM package is updated** with the new version.
4. A **GitHub release is created** with installation instructions.

## Prerequisites

Before you can publish the package, you need to have the following set up:

1. **NPM Account**: If you don't have one, you can sign up at [npmjs.com/signup](https://www.npmjs.com/signup).
2. **GitHub Repository**: The project should be hosted on GitHub.
3. **Required GitHub Secrets**:
   - `NPM_TOKEN`: Your NPM automation token.
   - `YOUTUBE_API_KEY`: Your YouTube API key for running tests in CI (optional but recommended).

To get an NPM token, go to your NPM account settings, generate a new "Automation" type token, and add it to your GitHub
repository's secrets as `NPM_TOKEN`.

## Publishing Process

### Option 1: Automatic Publishing (Recommended)

1. **Commit your changes**:

   ```bash
   git add .
   git commit -m "Add new feature"
   ```

2. **Create a new version**:
   The `npm version` command will automatically update `package.json`, create a git tag, push it to GitHub, and trigger
   the publishing workflow.

   ```bash
   # For a patch release (e.g., 1.0.0 -> 1.0.1)
   npm version patch -m "Fix for keyword extraction bug"

   # For a minor release (e.g., 1.0.0 -> 1.1.0)
   npm version minor -m "Add new analysis tool"

   # For a major release (e.g., 1.0.0 -> 2.0.0)
   npm version major -m "Breaking change to API structure"
   ```

### Option 2: Manual Publishing

If you need to publish manually, follow these steps:

1. **Build for production**:

   ```bash
   npm run build:prod
   ```

2. **Run tests**:

   ```bash
   npm test
   ```

3. **Publish to NPM**:

   ```bash
   npm publish
   ```

4. **Create a GitHub release manually**:

   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```

## Versioning Strategy

This project follows Semantic Versioning (semver):

- **PATCH** (`1.0.0` -> `1.0.1`): For bug fixes and documentation updates.
- **MINOR** (`1.0.0` -> `1.1.0`): For new features and backward-compatible changes.
- **MAJOR** (`1.0.0` -> `2.0.0`): For breaking changes that are not backward-compatible.

## Complete Workflow Example

1. **Development**:
   - Create a feature branch and make your changes.
   - Merge the branch into `main` via a pull request.

2. **Release**:
   - From the `main` branch, run the `npm version` command to trigger the automatic publishing process.

   ```bash
   # Example for a minor release
   npm version minor -m "Add viral content analysis tool"
   ```

3. **Verification**:
   - Check the package on [npmjs.com](https://www.npmjs.com/package/youtube-mcp-server).
   - Test the installation: `npm install -g youtube-mcp-server@latest`.
   - Verify that the new version works as expected.
