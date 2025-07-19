#!/usr/bin/env node

import { YouTubeMCPServer } from './dist/src/mcp-server.js';

const API_KEY = 'AIzaSyAqDuM3GcsKivan0IQ1I7_Q3Mx5VNZ9QmU';

async function testTools() {
  console.log('🧪 Testing YouTube MCP Server Tools...\n');
  
  try {
    // Initialize server
    const server = new YouTubeMCPServer({ apiKey: API_KEY });
    await server.initialize();
    
    console.log(`✅ Server initialized with ${server.listTools().length} tools\n`);
    
    // Test 1: search_videos
    console.log('🔍 Testing search_videos tool...');
    const searchResult = await server.executeTool('search_videos', {
      query: 'javascript tutorials',
      maxResults: 3
    });
    
    if (searchResult.success) {
      console.log('✅ search_videos tool working');
      console.log(`   Found data: ${searchResult.data ? 'Yes' : 'No'}`);
      if (searchResult.data) {
        console.log(`   Items: ${searchResult.data.items?.length || 0}`);
      }
      console.log(`   Metadata:`, searchResult.metadata);
    } else {
      console.log('❌ search_videos tool failed:', searchResult.error);
    }
    
    // Test 2: get_trending_videos
    console.log('\n🔥 Testing get_trending_videos tool...');
    const trendingResult = await server.executeTool('get_trending_videos', {
      maxResults: 5
    });
    
    if (trendingResult.success) {
      console.log('✅ get_trending_videos tool working');
      console.log(`   Found ${trendingResult.data?.items?.length || 0} trending videos`);
    } else {
      console.log('❌ get_trending_videos tool failed:', trendingResult.error);
    }
    
    // Test 3: search_channels
    console.log('\n📺 Testing search_channels tool...');
    const channelResult = await server.executeTool('search_channels', {
      query: 'programming',
      maxResults: 3
    });
    
    if (channelResult.success) {
      console.log('✅ search_channels tool working');
      console.log(`   Found data: ${channelResult.data ? 'Yes' : 'No'}`);
    } else {
      console.log('❌ search_channels tool failed:', channelResult.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testTools().catch(console.error);