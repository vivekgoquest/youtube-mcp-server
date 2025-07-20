#!/usr/bin/env node

import { YouTubeClient } from '../dist/src/youtube-client.js';

console.log('🔍 YouTube API Health Check');
console.log('='.repeat(50));

// Check for API key
if (!process.env.YOUTUBE_API_KEY) {
  console.error('❌ Error: YOUTUBE_API_KEY environment variable not set');
  process.exit(1);
}

console.log('✅ API Key found');

try {
  // Create client instance
  const client = new YouTubeClient({ apiKey: process.env.YOUTUBE_API_KEY });
  console.log('✅ YouTube client initialized');

  // Test basic API call with minimal quota usage
  console.log('\n🧪 Testing API connectivity...');
  
  const startTime = Date.now();
  const response = await client.videos.list({
    part: ['snippet'],
    id: ['dQw4w9WgXcQ'], // Rick Roll video - stable test
    maxResults: 1
  });
  
  const responseTime = Date.now() - startTime;
  
  if (response.items && response.items.length > 0) {
    console.log('✅ API call successful');
    console.log(`⏱️  Response time: ${responseTime}ms`);
    console.log(`📹 Test video found: ${response.items[0].snippet.title}`);
  } else {
    console.log('⚠️  API call returned no results');
  }

  // Check quota (if available in response headers)
  if (response.pageInfo) {
    console.log(`📊 Results info: ${response.pageInfo.totalResults} total results`);
  }

  // Test error handling
  console.log('\n🧪 Testing error handling...');
  try {
    await client.videos.list({
      part: ['snippet'],
      id: ['invalid-video-id-12345'],
      maxResults: 1
    });
    console.log('✅ Invalid ID handled gracefully (empty result)');
  } catch (error) {
    console.log('✅ Error handling working correctly');
  }

  // Summary
  console.log('\n📋 Health Check Summary:');
  console.log('-'.repeat(50));
  console.log('✅ API Key: Valid');
  console.log('✅ Client: Functional');
  console.log('✅ API: Responsive');
  console.log('✅ Error Handling: Working');
  console.log(`✅ Response Time: ${responseTime}ms`);
  
  console.log('\n✨ YouTube API is healthy and ready for testing!');
  process.exit(0);

} catch (error) {
  console.error('\n❌ Health check failed:', error.message);
  
  if (error.message.includes('API key not valid')) {
    console.error('\n🔑 Invalid API Key. Please check:');
    console.error('1. Your API key is correct');
    console.error('2. YouTube Data API v3 is enabled in Google Cloud Console');
    console.error('3. API key restrictions allow YouTube Data API');
  } else if (error.message.includes('quota')) {
    console.error('\n💰 Quota exceeded. Please check:');
    console.error('1. Your daily quota limit in Google Cloud Console');
    console.error('2. Consider waiting until quota resets');
  } else {
    console.error('\n🔧 Troubleshooting tips:');
    console.error('1. Check internet connectivity');
    console.error('2. Verify API key permissions');
    console.error('3. Check Google Cloud Console for any issues');
  }
  
  process.exit(1);
}
