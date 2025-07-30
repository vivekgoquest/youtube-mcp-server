# YouTube MCP Server - Project Configuration

## Project Overview

This is a comprehensive YouTube Data API v3 MCP Server built with TypeScript, providing advanced tools for content research, analytics, and keyword discovery workflows. The server implements the Model Context Protocol (MCP) to enable AI assistants to interact with YouTube data effectively.

### Technology Stack

- **Language**: TypeScript (ES2022 target)
- **Runtime**: Node.js (>=16.0.0)
- **Build System**: TypeScript Compiler
- **Testing**: Jest with TypeScript support
- **API Integration**: YouTube Data API v3
- **Protocol**: Model Context Protocol (MCP)
- **Key Libraries**:
  - @modelcontextprotocol/sdk for MCP implementation
  - axios for HTTP requests
  - natural & compromise for NLP/keyword extraction
  - ajv for JSON schema validation

### Architecture Highlights

- Tool-based architecture with individual tool files
- Registry pattern for tool management
- Comprehensive testing infrastructure (unit, integration, e2e)
- CLI tools for diagnostics and server management
- Quota management and response validation utilities

## AI Development Team Configuration

_Configured by team-configurator on 2025-07-28_

Your project uses: TypeScript, Node.js, MCP Protocol, YouTube API

### Specialist Assignments

#### API & Protocol Development

- **MCP Protocol Expert** → @api-architect
  - MCP server implementation and tool registration
  - Protocol compliance and interface design
  - Request/response handling and validation
- **YouTube API Integration** → @backend-developer
  - YouTube Data API v3 integration
  - Quota management and rate limiting
  - API response transformation and enrichment

#### Core Development

- **TypeScript Architecture** → @backend-developer
  - TypeScript best practices and patterns
  - Module organization and dependency management
  - Type safety and interface design
- **Tool Development** → @api-architect
  - Individual tool implementation
  - Tool interface compliance
  - Input validation and error handling

#### Testing & Quality

- **Test Strategy** → @tdd-test-designer
  - Jest test configuration and setup
  - Test coverage planning
  - Integration and e2e test design
- **Code Quality** → @code-reviewer
  - TypeScript code reviews
  - Architecture and pattern compliance
  - Performance and security considerations

#### Documentation & Maintenance

- **API Documentation** → @documentation-specialist
  - Tool documentation and examples
  - API reference documentation
  - Integration guides and tutorials
- **Performance** → @performance-optimizer
  - Quota optimization strategies
  - Response caching implementation
  - Batch operation optimization

### How to Use Your Team

#### For New Tool Development

```
"I need to create a new tool for analyzing YouTube Shorts performance"
→ Team will design the tool interface, implement with proper error handling, and ensure MCP compliance
```

#### For API Integration

```
"Implement batch processing for video details to reduce quota usage"
→ Team will optimize API calls, implement caching, and ensure efficient quota management
```

#### For Testing

```
"Add comprehensive tests for the keyword extraction tools"
→ Team will create unit tests, integration tests, and ensure proper mocking of API responses
```

#### For Code Review

```
"Review the unified search tool implementation"
→ Team will analyze code quality, check for edge cases, and suggest improvements
```

#### For Performance

```
"Optimize the analyze-viral-videos tool for better performance"
→ Team will profile the tool, identify bottlenecks, and implement optimizations
```

### Project-Specific Guidelines

1. **Tool Development Standards**
   - All tools must implement the `Tool` interface
   - Include comprehensive input validation
   - Provide detailed error messages
   - Calculate and report quota usage
   - Follow the established tool file naming pattern

2. **Testing Requirements**
   - Maintain test coverage above 80%
   - Include both unit and integration tests
   - Test error scenarios and edge cases
   - Mock YouTube API responses appropriately

3. **Documentation Standards**
   - Each tool must have clear documentation
   - Include example inputs and outputs
   - Document quota costs and limitations
   - Provide integration examples

4. **Performance Considerations**
   - Minimize YouTube API quota usage
   - Implement response caching where appropriate
   - Use batch operations when possible
   - Monitor and log performance metrics

### Development Workflow

1. **Planning Phase**
   - Analyze requirements with @project-analyst
   - Design tool interface with @api-architect
   - Plan test strategy with @tdd-test-designer

2. **Implementation Phase**
   - Implement core logic with @backend-developer
   - Ensure MCP compliance with @api-architect
   - Write tests with @tdd-test-writer

3. **Review Phase**
   - Code review with @code-reviewer
   - Performance analysis with @performance-optimizer
   - Documentation review with @documentation-specialist

4. **Deployment Phase**
   - Final testing with @tdd-test-runner
   - Build verification
   - Documentation updates

### Quick Commands

- `npm run test:interface` - Verify tool interface compliance
- `npm run diagnostics` - Run MCP diagnostics
- `npm run test:quota-check` - Check API quota status
- `npm run build` - Build the TypeScript project
- `npm run test:tools` - Test all tools

Your specialized AI team is ready to help build and maintain your YouTube MCP Server!
