# Individual Tool Testing

This directory contains tests for individual YouTube MCP server tools, providing deep debugging capabilities when interface compliance tests fail.

## Purpose

Individual tool tests complement the interface compliance tests in `tests/tool-interface-compliance.test.ts` by providing:

- **Deep debugging** for specific tool failures
- **Isolated testing** of tool-specific functionality
- **Comprehensive validation** beyond interface compliance
- **Development workflow** for new tool features

## Hierarchical Testing Strategy

Our testing follows an "interface first, drill down when needed" approach:

1. **Start with Interface Tests** (`npm run test:interface`) - Catch 80% of issues with minimal quota
2. **Use Individual Tests** (`npm run test:tool`) - Deep debug specific tools when needed
3. **Run Comprehensive Tests** (`npm run test:hierarchical`) - Full workflow validation

## Usage

### Running Individual Tool Tests

```bash
# Test a specific tool
npm run test:tool -- --testNamePattern="tool-name"

# Test all individual tools
npm run test:tools

# Watch mode for development
npm run test:tools:watch

# Test only expensive tools (search, analyze, workflow)
npm run test:tools:expensive

# Test only cheap tools (get, extract, generate)
npm run test:tools:cheap

# Debug mode with extended timeout
npm run test:debug
```

### Integration with Interface Tests

Individual tool tests are designed to work with the existing interface compliance framework:

- Interface tests validate **structure and basic functionality**
- Individual tests validate **deep behavior and edge cases**
- Both share the same test fixtures from `tests/fixtures/test-inputs.ts`
- Both respect quota limits and API health checks

## Future Development

When adding new individual tool tests:

1. **Follow existing patterns** from interface compliance tests
2. **Use shared fixtures** from `tests/fixtures/test-inputs.ts`
3. **Respect quota limits** - use minimal test cases
4. **Add to appropriate categories** (cheap vs expensive tools)
5. **Include error handling** and edge case validation

### Test Categories

- **Cheap Tools** (`get`, `extract`, `generate`) - Low quota usage, fast execution
- **Expensive Tools** (`search`, `analyze`, `workflow`) - High quota usage, thorough testing
- **Integration Tests** - Cross-tool workflows and complex scenarios

## Testing Modes

| Mode          | Command                  | Purpose              | Quota Usage |
| ------------- | ------------------------ | -------------------- | ----------- |
| Interface     | `test:interface`         | Structure validation | Low         |
| Minimal       | `test:interface:minimal` | Quick feedback       | Very Low    |
| Individual    | `test:tool`              | Deep debugging       | Medium      |
| Comprehensive | `test:tools`             | Full validation      | High        |
| Debug         | `test:debug`             | Extended diagnostics | Variable    |

## Best Practices

- **Start with interface tests** before creating individual tests
- **Use minimal test cases** to preserve quota
- **Test edge cases** that interface tests might miss
- **Include error scenarios** and API failure handling
- **Document any quota-intensive tests** clearly

This directory is part of the comprehensive testing strategy that ensures reliable YouTube MCP server functionality while optimizing for development workflow and API quota management.
