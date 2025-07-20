#!/usr/bin/env node

import { estimateQuotaUsage, TOOL_QUOTA_ESTIMATES } from '../tests/fixtures/test-inputs.js';

console.log('📊 YouTube MCP Server - Quota Usage Estimation');
console.log('=' * 50);

// Calculate quota for all tools
const toolQuotas = Object.entries(TOOL_QUOTA_ESTIMATES).map(([tool, quota]) => ({
  tool,
  quota
})).sort((a, b) => b.quota - a.quota);

// Group by quota ranges
const quotaGroups = {
  free: toolQuotas.filter(t => t.quota === 0),
  low: toolQuotas.filter(t => t.quota > 0 && t.quota <= 50),
  medium: toolQuotas.filter(t => t.quota > 50 && t.quota <= 150),
  high: toolQuotas.filter(t => t.quota > 150)
};

console.log('\n📈 Quota Usage by Tool:');
console.log('-'.repeat(50));
toolQuotas.forEach(({ tool, quota }) => {
  const bar = '█'.repeat(Math.ceil(quota / 10));
  console.log(`${tool.padEnd(30)} ${quota.toString().padStart(4)} units ${bar}`);
});

console.log('\n📊 Quota Groups Summary:');
console.log('-'.repeat(50));
console.log(`Free (0 units):       ${quotaGroups.free.length} tools`);
console.log(`Low (1-50 units):     ${quotaGroups.low.length} tools`);
console.log(`Medium (51-150 units): ${quotaGroups.medium.length} tools`);
console.log(`High (151+ units):    ${quotaGroups.high.length} tools`);

const totalQuota = toolQuotas.reduce((sum, t) => sum + t.quota, 0);
console.log(`\n💰 Total Quota (all tools): ${totalQuota} units`);

// Estimate test scenarios
console.log('\n🧪 Test Scenario Estimates:');
console.log('-'.repeat(50));

const minimalTestQuota = quotaGroups.free.reduce((sum, t) => sum + t.quota, 0) +
  quotaGroups.low.slice(0, 2).reduce((sum, t) => sum + t.quota, 0) +
  quotaGroups.medium.slice(0, 1).reduce((sum, t) => sum + t.quota, 0);

const standardTestQuota = quotaGroups.free.reduce((sum, t) => sum + t.quota, 0) +
  quotaGroups.low.reduce((sum, t) => sum + t.quota, 0) +
  quotaGroups.medium.reduce((sum, t) => sum + t.quota, 0);

console.log(`Minimal Mode:  ~${minimalTestQuota} units`);
console.log(`Standard Mode: ~${standardTestQuota} units`);
console.log(`Full Mode:     ~${totalQuota} units`);

console.log('\n💡 Recommendations:');
console.log('-'.repeat(50));
console.log('- Use COMPLIANCE_TEST_MODE=minimal for development');
console.log('- Set MAX_QUOTA_FOR_COMPLIANCE_TESTS=300 for CI/CD');
console.log('- Run high-quota tools individually when needed');
console.log('- Monitor actual usage with test:compliance-report');
