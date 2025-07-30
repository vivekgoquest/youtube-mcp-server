# GitHub Secrets Setup Guide

This guide helps you configure GitHub repository secrets for automatic NPM publishing of the YouTube MCP Server.

## Prerequisites

Before starting, ensure you have:

- **GitHub CLI installed**: Download from [cli.github.com](https://cli.github.com/)
- **GitHub authentication**: You must be logged in to GitHub CLI
- **Repository access**: Write access to the `vivekgoquest/youtube-mcp-server` repository
- **NPM account**: Account on [npmjs.com](https://www.npmjs.com/) with publishing permissions

### Verify GitHub CLI Setup

Check if GitHub CLI is installed and authenticated:

```bash
# Check installation
gh --version

# Check authentication status
gh auth status

# Login if needed
gh auth login
```

## Required Secrets

### 1. NPM_TOKEN (Required)

This token enables GitHub Actions to automatically publish packages to NPM.

#### Creating an NPM Automation Token

1. **Login to NPM**:
   - Go to [npmjs.com](https://www.npmjs.com/)
   - Sign in to your account

2. **Navigate to Access Tokens**:
   - Click on your profile picture (top right)
   - Select "Access Tokens" from the dropdown

3. **Generate New Token**:
   - Click "Generate New Token"
   - Select **"Automation"** type (important for CI/CD)
   - Add a descriptive name like "YouTube MCP Server CI"
   - Click "Generate Token"

4. **Copy the Token**:
   - Copy the generated token immediately (it won't be shown again)

#### Setting the NPM_TOKEN Secret

```bash
# Set the NPM token as a GitHub secret
echo "npm_XXXXXXXXXXXXXXXXXXXXXXXXXXXX" | gh secret set NPM_TOKEN -R vivekgoquest/youtube-mcp-server
```

Replace `npm_XXXXXXXXXXXXXXXXXXXXXXXXXXXX` with your actual token.

### 2. YOUTUBE_API_KEY (Optional)

This enables GitHub Actions to run integration tests that require YouTube API access.

#### Setting the YouTube API Key

```bash
# Set the YouTube API key as a GitHub secret
echo "YOUR_YOUTUBE_API_KEY" | gh secret set YOUTUBE_API_KEY -R vivekgoquest/youtube-mcp-server
```

Use the same API key from your local development environment.

## Complete Setup Commands

```bash
# Set NPM token (replace with your actual token)
echo "npm_your_actual_token_here" | gh secret set NPM_TOKEN -R vivekgoquest/youtube-mcp-server

# Set YouTube API key (optional - replace with your key)
echo "your_youtube_api_key_here" | gh secret set YOUTUBE_API_KEY -R vivekgoquest/youtube-mcp-server
```

## Verification

### Check if Secrets are Set

```bash
# List all secrets in the repository
gh secret list -R vivekgoquest/youtube-mcp-server
```

You should see:

- `NPM_TOKEN`
- `YOUTUBE_API_KEY` (if configured)

### Test GitHub Actions

1. **Push a commit** to trigger the test workflow
2. **Check the Actions tab** in your GitHub repository
3. **Verify tests run successfully** with the configured secrets

## Publishing New Versions

Once secrets are configured, you can publish new versions:

```bash
# Increment version and create git tag
npm version patch   # 1.0.0 → 1.0.1
npm version minor   # 1.0.0 → 1.1.0
npm version major   # 1.0.0 → 2.0.0

# Push tags to trigger publishing
git push --follow-tags
```

The GitHub Action will automatically:

1. Run all tests
2. Build the package
3. Publish to NPM if tests pass

## What GitHub Actions Will Do

With these secrets configured, GitHub Actions will:

✅ **On every push**:

- Run linting and type checking
- Execute unit tests
- Run integration tests (if `YOUTUBE_API_KEY` is set)

✅ **On version tags** (e.g., `v1.0.1`):

- Run all tests
- Build production package
- Publish to NPM registry
- Create GitHub release

## Troubleshooting

### Common Issues

#### "Authentication failed" Error

```bash
# Re-authenticate with GitHub CLI
gh auth login --web
```

#### "Permission denied" for NPM Token

- Ensure the NPM token type is **"Automation"** (not "Publish")
- Verify you have publish permissions for the package
- Check token hasn't expired

#### Tests Fail in CI but Pass Locally

- Verify `YOUTUBE_API_KEY` secret is set correctly
- Check API key quotas aren't exceeded
- Review GitHub Actions logs for specific error messages

### Checking Secret Values

```bash
# Secrets are encrypted - you can only see names, not values
gh secret list -R vivekgoquest/youtube-mcp-server

# To update a secret, set it again with new value
echo "new_secret_value" | gh secret set SECRET_NAME -R vivekgoquest/youtube-mcp-server
```

### Repository Settings

Verify in GitHub web interface:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Confirm both secrets are listed
3. Check **Actions** → **General** for workflow permissions

## Security Best Practices

- **Never commit secrets** to code repository
- **Use automation tokens** for CI/CD (not personal tokens)
- **Rotate tokens regularly** (especially if compromised)
- **Limit token scope** to minimum required permissions
- **Monitor token usage** in NPM dashboard

## Package Information

- **Repository**: [github.com/vivekgoquest/youtube-mcp-server](https://github.com/vivekgoquest/youtube-mcp-server)
- **NPM Package**: [npmjs.com/package/youtube-mcp-server](https://www.npmjs.com/package/youtube-mcp-server)
- **GitHub Actions**: Available in the "Actions" tab of the repository

---

**Note**: This setup only needs to be done once. After configuration, all version publishing will be automated through GitHub Actions.
