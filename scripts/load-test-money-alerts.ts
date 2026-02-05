#!/usr/bin/env node
/**
 * Load Testing Script for Money Alerts
 * Tests the Money Alerts engine under realistic load
 *
 * Usage: npm run load-test:money-alerts
 * Environment: Set TEST_LOAD=100 for 100 concurrent users, default 10
 */

import axios, { AxiosInstance } from "axios";

const API_URL = process.env.API_URL || "http://localhost:3000";
const TEST_LOAD = parseInt(process.env.TEST_LOAD || "10");
const TEST_DURATION = parseInt(process.env.TEST_DURATION || "30"); // seconds

interface LoadTestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
}

const responseTimes: number[] = [];
let successCount = 0;
let failCount = 0;

async function createTestUser(client: AxiosInstance) {
  try {
    const response = await client.post("/api/auth/signup", {
      email: `test-${Date.now()}-${Math.random()}@load-test.com`,
      password: "TestPassword123!@#",
      name: "Load Test User",
    });
    return response.data.token;
  } catch (error) {
    console.error("Failed to create test user:", error);
    return null;
  }
}

async function callMoneyAlertsAPI(client: AxiosInstance, endpoint: string) {
  const startTime = Date.now();
  try {
    const response = await client.get(endpoint, {
      timeout: 5000,
    });
    const duration = Date.now() - startTime;
    responseTimes.push(duration);
    successCount++;
    return { success: true, duration, status: response.status };
  } catch (error) {
    const duration = Date.now() - startTime;
    responseTimes.push(duration);
    failCount++;
    return { success: false, duration, error: String(error) };
  }
}

async function runLoadTest() {
  console.log(`\n🚀 Starting Money Alerts Load Test`);
  console.log(`📊 Configuration:`);
  console.log(`   - Concurrent Users: ${TEST_LOAD}`);
  console.log(`   - Duration: ${TEST_DURATION} seconds`);
  console.log(`   - API URL: ${API_URL}`);
  console.log(`   - Endpoints Tested:`);
  console.log(`     * GET /api/money-alerts`);
  console.log(`     * GET /api/money-alerts/summary`);
  console.log(`\n⏳ Test running...`);

  const client = axios.create({
    baseURL: API_URL,
  });

  // Create test user and get token
  const token = await createTestUser(client);
  if (!token) {
    console.error("❌ Failed to create test user. Aborting test.");
    process.exit(1);
  }

  // Set auth header
  client.defaults.headers.common["Authorization"] = `Bearer ${token}`;

  const startTime = Date.now();
  const requests: Promise<any>[] = [];

  // Simulate concurrent requests
  while (Date.now() - startTime < TEST_DURATION * 1000) {
    for (let i = 0; i < TEST_LOAD; i++) {
      const promise = (async () => {
        // Alternate between endpoints
        const endpoint = Math.random() > 0.5 ? "/api/money-alerts" : "/api/money-alerts/summary";
        return callMoneyAlertsAPI(client, endpoint);
      })();
      requests.push(promise);
    }

    // Small delay to avoid overwhelming the system
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Wait for all requests to complete
  await Promise.all(requests);

  const totalTime = (Date.now() - startTime) / 1000;

  // Calculate statistics
  const result: LoadTestResult = {
    totalRequests: successCount + failCount,
    successfulRequests: successCount,
    failedRequests: failCount,
    averageResponseTime: responseTimes.reduce((a, b) => a + b) / responseTimes.length,
    minResponseTime: Math.min(...responseTimes),
    maxResponseTime: Math.max(...responseTimes),
    requestsPerSecond: (successCount + failCount) / totalTime,
    errorRate: (failCount / (successCount + failCount)) * 100,
  };

  // Print results
  console.log(`\n✅ Load Test Complete\n`);
  console.log(`📈 Results:`);
  console.log(`   - Total Requests: ${result.totalRequests}`);
  console.log(`   - Successful: ${result.successfulRequests} (${(100 - result.errorRate).toFixed(2)}%)`);
  console.log(`   - Failed: ${result.failedRequests} (${result.errorRate.toFixed(2)}%)`);
  console.log(`   - Avg Response Time: ${result.averageResponseTime.toFixed(2)}ms`);
  console.log(`   - Min Response Time: ${result.minResponseTime}ms`);
  console.log(`   - Max Response Time: ${result.maxResponseTime}ms`);
  console.log(`   - Requests/Second: ${result.requestsPerSecond.toFixed(2)}`);

  // Verdict
  console.log(`\n🔍 Verdict:`);
  if (result.errorRate < 5 && result.averageResponseTime < 200) {
    console.log(`   ✅ PASS - System performs well under load`);
  } else if (result.errorRate < 10 && result.averageResponseTime < 500) {
    console.log(`   ⚠️  WARNING - Performance acceptable but could improve`);
  } else {
    console.log(`   ❌ FAIL - Performance issues detected`);
  }

  if (result.errorRate > 0) {
    console.log(`   ⚠️  ${result.failedRequests} requests failed - investigate errors`);
  }

  console.log();

  process.exit(result.errorRate > 10 ? 1 : 0);
}

// Run the test
runLoadTest().catch((error) => {
  console.error("❌ Load test failed:", error);
  process.exit(1);
});
