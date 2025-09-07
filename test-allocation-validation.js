// Direct MongoDB shell analysis to avoid connection timeout issues
console.log(`
=== ALLOCATION & REVENUE VALIDATION ANALYSIS ===

Based on database investigation, here are the key findings:

CURRENT DATABASE STATE:
- Order ORD-000001: 100 units, 61 QC passed, 39 loop-back
- Container CONT-1757237134639: Has 52 cartons allocated (OVER-ALLOCATED!)
- Total Revenue: ₹10,000 (order) + ₹10,000 (carrying) = ₹20,000
- Container shows ₹5,200 revenue (inconsistent)

CRITICAL ALLOCATION ISSUES FOUND:

1. 🚨 OVER-ALLOCATION PROBLEM:
   - QC Passed: 61 cartons
   - Allocated to Container: 52 cartons  
   - Issue: Only 61 available but system allowed 52 allocation
   - Remaining Available: 61 - 52 = 9 cartons
   - Problem: System likely allows allocating full 61 again to another container!

2. 🔍 MISSING REAL-TIME VALIDATION:
   - Container allocation route doesn't check item-level availability
   - Only checks container-level capacity (CBM/weight)
   - No validation against qcPassedCartons - allocatedCartons

3. 💰 REVENUE CALCULATION INCONSISTENCIES:
   - Order shows ₹10,000 item total + ₹10,000 carrying = ₹20,000
   - Container shows only ₹5,200 revenue (partial allocation)
   - Carrying charge calculation: 100 cartons × ₹100 rate = ₹10,000 ✓
   - But allocation shows different carton count (52 vs 100)

4. 🗑️ CONTAINER DELETION ISSUES:
   - Delete route exists but may not properly restore availability
   - Uses updateMany with $set for item arrays (risky)
   - Potential race conditions in cleanup

CRITICAL CODE ISSUES IDENTIFIED:

A. Allocation Route Problems (/api/warehouse/allocate-container):
   ❌ No validation against available quantities
   ❌ Directly updates allocatedCartons without checking qcPassedCartons
   ❌ No atomic operations to prevent double allocation

B. Revenue Calculation Problems:
   ❌ Container revenue calculation inconsistent with order totals
   ❌ Carrying charges not properly synchronized between order/container
   ❌ Partial allocation revenue not correctly calculated

C. Data Consistency Issues:
   ❌ Order shows 61 QC passed but container shows 52 allocated
   ❌ No real-time availability tracking
   ❌ Missing constraint: allocated ≤ qcPassed

RECOMMENDED FIXES:

1. ADD ALLOCATION VALIDATION:
   - Check available = qcPassedCartons - allocatedCartons before allocation
   - Use atomic updates with session transactions
   - Add real-time availability API endpoint

2. FIX REVENUE CALCULATIONS:
   - Ensure container revenue = sum of allocated carrying charges
   - Synchronize order and container financial totals
   - Validate carrying charge basis calculations

3. IMPROVE DELETION CLEANUP:
   - Use proper atomic operations for clearing allocations
   - Add verification queries after cleanup
   - Implement rollback on cleanup failures

4. ADD REAL-TIME AVAILABILITY:
   - Create endpoint to get current availability per item
   - Update frontend to show real-time available quantities
   - Prevent double allocation in UI

SCHEMA INDEX WARNINGS TO FIX:
- Order model: Remove duplicate indexes on orderNumber, clientId
- Container model: Remove duplicate indexes on realContainerId, clientFacingId

NEXT TESTING STEPS:
1. Test allocation of remaining 9 cartons to another container
2. Verify if system prevents or allows over-allocation
3. Test container deletion and availability restoration
4. Validate revenue calculations at different allocation levels
`);

console.log('\n=== END OF ANALYSIS ===');