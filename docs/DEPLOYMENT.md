# NPM Package Deployment Guide

This guide explains how to publish your YouTube MCP Server to NPM with automatic publishing on GitHub releases.

## 🎯 **Automatic Publishing Workflow**

**Yes!** When you push a version tag to GitHub, it **automatically publishes to NPM**. Here's how it works:

1. **You create a version tag** → `git tag v1.0.1`
2. **GitHub Actions triggers** → Runs tests, builds, and publishes
3. **NPM package updates** → New version available on npmjs.com
4. **GitHub release created** → With installation instructions

## 📋 **Prerequisites**

### 1. NPM Account Setup
```bash
# Create NPM account (if you don't have one)
# Visit: https://www.npmjs.com/signup

# Login to NPM
npm login
```

### 2. GitHub Repository Setup
```bash
# Create repository on GitHub
# Clone and push your code
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/youtube-mcp-server.git
git push -u origin main
```

### 3. Required GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret:

#### Required Secrets:
- **`NPM_TOKEN`**: Your NPM automation token
- **`YOUTUBE_API_KEY`**: For running tests in CI (optional but recommended)

#### Get NPM Token:
1. Go to [npmjs.com](https://www.npmjs.com) → Your profile → Access Tokens
2. Generate new token → **Automation** type
3. Copy the token and add it to GitHub secrets as `NPM_TOKEN`

## 🚀 **Publishing Process**

### Option 1: Automatic Publishing (Recommended)

```bash
# 1. Make your changes and commit
git add .
git commit -m "Add new feature"

# 2. Create a new version (this triggers automatic publishing)
npm version patch   # 1.0.0 → 1.0.1 (bug fixes)
npm version minor   # 1.0.0 → 1.1.0 (new features)
npm version major   # 1.0.0 → 2.0.0 (breaking changes)

# 3. The npm version command automatically:
#    - Updates package.json version
#    - Creates a git tag (e.g., v1.0.1)
#    - Pushes the tag to GitHub
#    - Triggers GitHub Actions
#    - Publishes to NPM
#    - Creates GitHub release
```

### Option 2: Manual Publishing

```bash
# 1. Build for production
npm run build:prod

# 2. Test everything works
npm test

# 3. Publish manually
npm publish

# 4. Create GitHub release manually
git tag v1.0.1
git push origin v1.0.1
```

## 📊 **Version Strategy**

### Semantic Versioning (semver)
- **1.0.0** → **1.0.1** (PATCH): Bug fixes, documentation updates
- **1.0.0** → **1.1.0** (MINOR): New features, new tools, backwards compatible
- **1.0.0** → **2.0.0** (MAJOR): Breaking changes, API changes

### Examples:
```bash
# Bug fix release
npm version patch -m "Fix keyword extraction bug"

# New feature release  
npm version minor -m "Add TikTok integration tool"

# Breaking change release
npm version major -m "Redesign API structure"
```

## 🔄 **Complete Workflow Example**

### 1. Development
```bash
# Work on new features
git checkout -b feature/new-analysis-tool
# ... make changes ...
git commit -m "Add viral content analysis tool"
git push origin feature/new-analysis-tool

# Merge to main via Pull Request
git checkout main
git pull origin main
```

### 2. Release
```bash
# Create new version (triggers automatic publishing)
npm version minor -m "Add viral content analysis tool"

# This automatically:
# ✅ Updates package.json to v1.1.0
# ✅ Creates git tag v1.1.0  
# ✅ Pushes to GitHub
# ✅ Triggers GitHub Actions
# ✅ Runs tests
# ✅ Builds production code
# ✅ Publishes to NPM
# ✅ Creates GitHub release
```

### 3. Verification
```bash
# Check NPM package
npm view youtube-mcp-server

# Test installation
npm install -g youtube-mcp-server@latest

# Verify it works
youtube-mcp-server --help
```

## 📦 **Package Distribution**

### NPM Installation Methods

**Global installation:**
```bash
npm install -g youtube-mcp-server
```

**Project installation:**
```bash
npm install youtube-mcp-server
```

**Via npx (no installation):**
```bash
npx youtube-mcp-server
```

### MCP Configuration Updates

Users can now install via NPM:

```json
{
  "mcpServers": {
    "youtube": {
      "command": "npx",
      "args": ["youtube-mcp-server"],
      "env": {
        "YOUTUBE_API_KEY": "user_api_key_here"
      }
    }
  }
}
```

Or with specific version:
```json
{
  "mcpServers": {
    "youtube": {
      "command": "npx",
      "args": ["youtube-mcp-server@1.2.0"],
      "env": {
        "YOUTUBE_API_KEY": "user_api_key_here"
      }
    }
  }
}
```

## 🛠️ **Troubleshooting**

### Publishing Issues

**1. "You do not have permission to publish"**
```bash
# Check you're logged in
npm whoami

# Login if needed
npm login

# Check package name isn't taken
npm view youtube-mcp-server
```

**2. "Version already exists"**
```bash
# You need to increment version
npm version patch
```

**3. "Tests failing in CI"**
```bash
# Check GitHub Actions logs
# Ensure YOUTUBE_API_KEY secret is set
# Run tests locally: npm test
```

### GitHub Actions Issues

**1. "NPM_TOKEN not found"**
- Go to GitHub repo → Settings → Secrets → Actions
- Add `NPM_TOKEN` with your NPM automation token

**2. "Permission denied"**
- Ensure your GitHub token has repo access
- Check the workflow file syntax

### Version Management

**Rollback a bad release:**
```bash
# Deprecate version (doesn't delete)
npm deprecate youtube-mcp-server@1.0.1 "This version has issues, use 1.0.2"

# Users will see warning when installing 1.0.1
```

## 📈 **Monitoring & Analytics**

### NPM Package Stats
- Visit: https://www.npmjs.com/package/youtube-mcp-server
- Track downloads, versions, dependents

### GitHub Release Stats  
- Visit: https://github.com/yourusername/youtube-mcp-server/releases
- Track downloads per release

## 🔒 **Security Best Practices**

1. **Use automation tokens** (not personal access tokens)
2. **Enable 2FA** on NPM account
3. **Review dependencies** regularly with `npm audit`
4. **Keep secrets secure** - never commit API keys
5. **Test before releasing** - always run full test suite

## 🎉 **Success!**

Once set up, your workflow is:
1. **Develop** → Make changes
2. **Commit** → `git commit -m "Add feature"`
3. **Release** → `npm version minor`
4. **Done!** → NPM updates automatically

Your package will be available at:
- **NPM**: https://www.npmjs.com/package/youtube-mcp-server
- **GitHub**: https://github.com/yourusername/youtube-mcp-server

Users can install with: `npm install -g youtube-mcp-server`
