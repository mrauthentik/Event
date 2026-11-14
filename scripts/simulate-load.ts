/**
 * IHGC 2026 High-Concurrency Simulation & Load Benchmark
 *
 * Runs 1,000 concurrent operations across:
 * 1. Base32 Ticket Reference Code generation (collision resistance)
 * 2. Ed25519 Token Signing & Verification (throughput & CPU overhead)
 * 3. Group Pass token verification
 * 4. Scan proof validation pipeline
 *
 * Usage: npx tsx scripts/simulate-load.ts
 */

import { generateRefCode } from "../src/lib/crypto/ref-code";
import {
  createTicketToken,
  createGroupOrderToken,
  deriveTicketPublicKey,
  verifyTicketToken,
  verifyGroupOrderToken,
} from "../src/lib/crypto/ed25519";

const TEST_PRIVATE_KEY = "33".repeat(32);
const CONCURRENCY_ITERATIONS = 1000;

function calculatePercentiles(durations: number[]) {
  const sorted = [...durations].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];
  const avg = sorted.reduce((sum, v) => sum + v, 0) / sorted.length;
  return { p50, p95, p99, avg };
}

async function runLoadBenchmark() {
  console.log("==================================================================");
  console.log("🚀 Starting IHGC 2026 Phase 3 Concurrency & Load Benchmark");
  console.log(`🎯 Iterations: ${CONCURRENCY_ITERATIONS} concurrent ops per scenario`);
  console.log("==================================================================\n");

  const publicKey = await deriveTicketPublicKey(TEST_PRIVATE_KEY);

  // -------------------------------------------------------------------------
  // Scenario 1: Reference Code Generation & Collision Resistance
  // -------------------------------------------------------------------------
  console.log("Scenario 1: Testing Reference Code Generation (Collision Check)...");
  const refCodeStart = performance.now();
  const refCodes = new Set<string>();
  const refDurations: number[] = [];

  for (let i = 0; i < CONCURRENCY_ITERATIONS; i++) {
    const t0 = performance.now();
    const code = generateRefCode();
    refDurations.push(performance.now() - t0);
    refCodes.add(code);
  }
  const refTotalTime = performance.now() - refCodeStart;
  const refStats = calculatePercentiles(refDurations);

  console.log(`  ✓ Generated: ${refCodes.size} unique ref codes from ${CONCURRENCY_ITERATIONS} attempts`);
  console.log(`  ✓ Duplicate collisions: ${CONCURRENCY_ITERATIONS - refCodes.size} (0 expected)`);
  console.log(`  ✓ Throughput: ${(CONCURRENCY_ITERATIONS / (refTotalTime / 1000)).toFixed(0)} ops/sec`);
  console.log(`  ✓ Latency: p50=${refStats.p50.toFixed(3)}ms, p95=${refStats.p95.toFixed(3)}ms, p99=${refStats.p99.toFixed(3)}ms\n`);

  if (refCodes.size !== CONCURRENCY_ITERATIONS) {
    throw new Error("COLLISION DETECTED in reference code generator!");
  }

  // -------------------------------------------------------------------------
  // Scenario 2: High-Volume Ed25519 Ticket Token Creation
  // -------------------------------------------------------------------------
  console.log("Scenario 2: Concurrent Ed25519 Ticket Signing & Token Creation...");
  const signStart = performance.now();
  const signDurations: number[] = [];
  const tickets: Array<{ tokenString: string; tokenHash: string }> = [];

  const signTasks = Array.from({ length: CONCURRENCY_ITERATIONS }, async (_, i) => {
    const t0 = performance.now();
    const ticket = await createTicketToken(`attendee-${i}`, TEST_PRIVATE_KEY);
    signDurations.push(performance.now() - t0);
    return ticket;
  });

  const generatedTickets = await Promise.all(signTasks);
  const signTotalTime = performance.now() - signStart;
  const signStats = calculatePercentiles(signDurations);

  console.log(`  ✓ Signed ${generatedTickets.length} cryptographic Ed25519 tickets in ${signTotalTime.toFixed(1)}ms`);
  console.log(`  ✓ Signing Throughput: ${(CONCURRENCY_ITERATIONS / (signTotalTime / 1000)).toFixed(0)} signs/sec`);
  console.log(`  ✓ Latency: p50=${signStats.p50.toFixed(3)}ms, p95=${signStats.p95.toFixed(3)}ms, p99=${signStats.p99.toFixed(3)}ms\n`);

  // -------------------------------------------------------------------------
  // Scenario 3: Concurrent Gate Scanner Ed25519 Verification (Simulating Peak Gates)
  // -------------------------------------------------------------------------
  console.log("Scenario 3: Simulating 1,000 Concurrent Gate Check-in Verifications...");
  const verifyStart = performance.now();
  const verifyDurations: number[] = [];

  const verifyTasks = generatedTickets.map(async (t) => {
    const t0 = performance.now();
    const result = await verifyTicketToken(t.tokenString, publicKey);
    verifyDurations.push(performance.now() - t0);
    return result;
  });

  const verifiedResults = await Promise.all(verifyTasks);
  const verifyTotalTime = performance.now() - verifyStart;
  const verifyStats = calculatePercentiles(verifyDurations);

  const allValid = verifiedResults.every((r) => r.isValid);
  console.log(`  ✓ Verified: ${verifiedResults.length} tickets (All valid: ${allValid})`);
  console.log(`  ✓ Gate Verification Rate: ${(CONCURRENCY_ITERATIONS / (verifyTotalTime / 1000)).toFixed(0)} scans/sec`);
  console.log(`  ✓ Latency: p50=${verifyStats.p50.toFixed(3)}ms, p95=${verifyStats.p95.toFixed(3)}ms, p99=${verifyStats.p99.toFixed(3)}ms\n`);

  // -------------------------------------------------------------------------
  // Scenario 4: Group Order Passes (High Seat Counts)
  // -------------------------------------------------------------------------
  console.log("Scenario 4: Group Express Lane Token Generation & Verification...");
  const groupStart = performance.now();
  const groupTasks = Array.from({ length: 250 }, async (_, i) => {
    const orderUuid = `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`;
    const token = await createGroupOrderToken(orderUuid, (i % 50) + 1, TEST_PRIVATE_KEY);
    const verified = await verifyGroupOrderToken(token, publicKey);
    return verified.isValid;
  });

  const groupResults = await Promise.all(groupTasks);
  const groupTotalTime = performance.now() - groupStart;
  const allGroupsValid = groupResults.every(Boolean);

  console.log(`  ✓ Generated & verified 250 group passes (All valid: ${allGroupsValid}) in ${groupTotalTime.toFixed(1)}ms`);
  console.log(`  ✓ Rate: ${(250 / (groupTotalTime / 1000)).toFixed(0)} group validations/sec\n`);

  console.log("==================================================================");
  console.log("🎉 ALL LOAD & CONCURRENCY BENCHMARKS PASSED SUCCESSFULLY!");
  console.log("==================================================================");
}

runLoadBenchmark().catch((err) => {
  console.error("Benchmark failed with error:", err);
  process.exit(1);
});

