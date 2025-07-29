# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2025-07-29

### Changed
- Updated repository URLs from `yourusername` to `vivekgoquest` throughout the codebase
- Updated package.json repository, bugs, and homepage URLs
- Updated src/mcp-server.ts homepage URL
- Updated all documentation references to use correct GitHub repository
- Updated LICENSE copyright holder to Vivek Goquest
- Enhanced .npmignore to exclude all test files and directories
- Standardized API key configuration to use JSON files instead of .env files

### Added
- Created tests/youtube-api.local.template.json for API key configuration template
- Added root-level youtube-api.local.json to .gitignore

### Fixed
- Updated tests/setup.ts to use JSON-based API key loading matching setup.js
- Enhanced error handling in tests/setup.js with better validation and user guidance

## [BREAKING: Single API Key Path] - 2025-01-23

### 🔒 Security Fixes
- **CRITICAL**: Removed hardcoded YouTube API keys from ALL files in version control
- Cleaned up real API keys from `README.md`, `tests/mcp-inspector-config.json`, and `.claude/settings.local.json`
- Added `.claude/settings.local.json` to `.gitignore`

### 💥 BREAKING CHANGES
- **REMOVED**: All JSON-based API key configuration files (`youtube-api.local.json`, `youtube-api.local.template.json`)
- **REMOVED**: All backward compatibility and fallback mechanisms in API key loading
- **NEW**: Single API key source: `tests/.env.test` (automatically gitignored)
- **SIMPLIFIED**: All scripts now use only one API key loading path

### 🚀 New Features
- Added `tests/.env.test.template` for easy local setup
- Simplified API key loading with clear error messages
- Single command setup: `cp tests/.env.test.template tests/.env.test`

### 🔧 Fixed
- Corrected ALL stale build paths from `dist/src/index.js` to `dist/index.js`
- Updated ALL configuration files to use current build output structure

### 📚 Documentation
- Updated setup instructions to use only environment file approach
- Added comprehensive security warnings
- Simplified developer workflow documentation

### 🏗️ Infrastructure
- Removed complex fallback logic from all scripts
- Streamlined codebase with single API key loading mechanism
- Maintained CI/CD compatibility with GitHub secrets

## [1.0.0] - 2025-01-09

### Added
- Initial release of YouTube MCP Server
- 21+ comprehensive tools for YouTube content research and analytics
- Advanced keyword research workflow capabilities
- Competitor analysis and viral video pattern detection
- Channel network discovery and relationship mapping
- Comment extraction and sentiment analysis
- NLP-powered keyword extraction using Natural.js and Compromise.js
- Comprehensive test suite with Jest
- TypeScript support with full type definitions
- Automatic GitHub Actions CI/CD pipeline
- NPM package distribution with semantic versioning

### Features
#### Search & Discovery Tools
- `search_videos` - Advanced video search with filtering
- `search_channels` - Channel discovery by query
- `search_playlists` - Playlist search functionality
- `get_trending_videos` - Regional trending content
- `advanced_search` - Complex multi-filter searches

#### Analytics & Insights Tools
- `analyze_viral_videos` - Viral content pattern analysis
- `analyze_competitor` - Deep competitor strategy analysis
- `analyze_channel_videos` - Comprehensive channel performance metrics
- `discover_channel_network` - Channel relationship mapping
- `extract_video_comments` - Comment extraction with sentiment analysis
- `get_commenter_frequency` - Super fan identification

#### Keyword Research Tools
- `extract_keywords_from_text` - NLP-powered keyword extraction
- `extract_keywords_from_videos` - Video metadata keyword mining
- `analyze_keywords` - Competition and opportunity analysis
- `generate_keyword_cloud` - Visual keyword cloud generation
- `find_content_gaps` - Content opportunity identification
- `analyze_keyword_opportunities` - Ranking potential analysis
- `keyword_research_workflow` - Complete end-to-end workflow

### Technical Features
- Model Context Protocol (MCP) compliance
- YouTube Data API v3 integration
- Intelligent quota tracking and rate limiting
- Comprehensive error handling and logging
- Production-ready TypeScript codebase
- Automated testing and deployment
- Cross-platform compatibility (Node.js 16+)

## [Unreleased]

### Planned Features
- Additional social media platform integrations
- Enhanced sentiment analysis capabilities
- Real-time trend monitoring
- Advanced visualization tools
- Custom workflow builder
- API rate optimization features

---

## Release Process

This project uses semantic versioning:
- **MAJOR** version for incompatible API changes
- **MINOR** version for new functionality in a backwards compatible manner  
- **PATCH** version for backwards compatible bug fixes

To create a new release:
```bash
npm version patch  # for bug fixes
npm version minor  # for new features
npm version major  # for breaking changes
```

This will automatically:
1. Update the version in package.json
2. Create a git tag
3. Trigger GitHub Actions to publish to NPM
4. Create a GitHub release
