import { YouTubeMCPServer } from '../../src/mcp-server.js';

describe('formatDuration', () => {
  let server: YouTubeMCPServer;

  beforeEach(() => {
    // Create server with dummy API key for unit testing
    server = new YouTubeMCPServer({
      apiKey: 'test-api-key'
    });
  });

  test('should format PT0S correctly', () => {
    // Access private method through any casting for testing
    const formatDuration = (server as any).formatDuration.bind(server);
    const result = formatDuration('PT0S');
    expect(result).toBe('0:00');
  });

  test('should format PT1H2M correctly', () => {
    const formatDuration = (server as any).formatDuration.bind(server);
    const result = formatDuration('PT1H2M');
    expect(result).toBe('1:02:00');
  });

  test('should format PT4M13S correctly', () => {
    const formatDuration = (server as any).formatDuration.bind(server);
    const result = formatDuration('PT4M13S');
    expect(result).toBe('4:13');
  });

  test('should format PT1H30M45S correctly', () => {
    const formatDuration = (server as any).formatDuration.bind(server);
    const result = formatDuration('PT1H30M45S');
    expect(result).toBe('1:30:45');
  });

  test('should format PT45S correctly', () => {
    const formatDuration = (server as any).formatDuration.bind(server);
    const result = formatDuration('PT45S');
    expect(result).toBe('0:45');
  });

  test('should format PT2H correctly', () => {
    const formatDuration = (server as any).formatDuration.bind(server);
    const result = formatDuration('PT2H');
    expect(result).toBe('2:00:00');
  });

  test('should format PT30M correctly', () => {
    const formatDuration = (server as any).formatDuration.bind(server);
    const result = formatDuration('PT30M');
    expect(result).toBe('30:00');
  });

  test('should return original string for invalid duration format', () => {
    const formatDuration = (server as any).formatDuration.bind(server);
    const result = formatDuration('invalid-duration');
    expect(result).toBe('invalid-duration');
  });

  test('should handle empty duration string', () => {
    const formatDuration = (server as any).formatDuration.bind(server);
    const result = formatDuration('');
    expect(result).toBe('');
  });

  test('should handle PT format without any time components', () => {
    const formatDuration = (server as any).formatDuration.bind(server);
    const result = formatDuration('PT');
    expect(result).toBe('0:00');
  });
});