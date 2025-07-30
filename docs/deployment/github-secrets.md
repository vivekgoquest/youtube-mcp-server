# GitHub Secrets Setup Guide

This guide explains how to configure the necessary GitHub repository secrets for the automated testing and NPM publishing of
the YouTube MCP Server.

## Required Secrets

To enable the full CI/CD pipeline, you need to configure the following secrets in your GitHub repository settings.

Go to your repository > **Settings** > **Secrets and variables** > **Actions**, then click **New repository secret** for each
secret.

### 1. `NPM_TOKEN` (Required for Publishing)

This token allows GitHub Actions to publish the package to the NPM registry on your behalf.

#### Creating an NPM Automation Token

1. **Log in to your NPM account** at [npmjs.com](https://www.npmjs.com/).
2. Navigate to **Access Tokens** from your profile menu.
3. Click **Generate New Token** and select the **"Automation"** type. This type is specifically designed for CI/CD
   workflows.
4. Copy the generated token. You will not be able to see it again.

#### Setting the GitHub Secret

- **Name**: `NPM_TOKEN`
- **Value**: Paste the NPM automation token you just copied.

### 2. `YOUTUBE_API_KEY` (Optional but Recommended)

This secret allows the GitHub Actions workflow to run integration tests that make real calls to the YouTube API.

#### Setting the GitHub Secret

- **Name**: `YOUTUBE_API_KEY`
- **Value**: Paste your YouTube Data API v3 key.

## Using GitHub CLI to Set Secrets

If you have the [GitHub CLI](https://cli.github.com/) installed, you can set the secrets from your terminal.

```bash
# Set the NPM token (replace with your actual token)
echo "npm_your_actual_token_here" | gh secret set NPM_TOKEN -R vivekgoquest/youtube-mcp-server

# Set the YouTube API key (replace with your key)
echo "your_youtube_api_key_here" | gh secret set YOUTUBE_API_KEY -R vivekgoquest/youtube-mcp-server
```

## Verification

You can verify that the secrets have been set by either checking the repository settings on GitHub or by using the GitHub
CLI:

```bash
# List all secrets in the repository
gh secret list -R vivekgoquest/youtube-mcp-server
```

You should see `NPM_TOKEN` and `YOUTUBE_API_KEY` in the list.

## How the Secrets Are Used

- **`NPM_TOKEN`**: Used in the release workflow to authenticate with NPM and publish the package.
- **`YOUTUBE_API_KEY`**: Used in the testing workflow to run tests that require API access.

With these secrets in place, the CI/CD pipeline will be fully functional, automating the testing and release process.
