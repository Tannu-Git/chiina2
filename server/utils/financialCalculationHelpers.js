// Financial calculation helper functions for allocation-aware calculations
const mongoose = require('mongoose');

/**
 * Calculate allocated product cost for an order based on container allocations
 * @param {Object} order - Order document with items
 * @param {Array} containers - Container documents that have allocations for this order
 * @returns {number} - Allocated product cost
 */
function calculateAllocatedProductCost(order, containers) {
  if (!order.items || !Array.isArray(order.items)) {
    return 0;
  }

  let totalAllocatedProductCost = 0;

  order.items.forEach(item => {
    const totalPrice = item.totalPrice || 0;
    const totalCartons = item.cartons || 0;
    const allocatedCartons = item.allocatedCartons || 0;

    if (totalCartons > 0) {
      // Calculate allocation ratio for this item
      const allocationRatio = allocatedCartons / totalCartons;
      const allocatedProductCost = totalPrice * allocationRatio;
      totalAllocatedProductCost += allocatedProductCost;
    }
  });

  return totalAllocatedProductCost;
}

/**
 * Calculate allocated carrying charges for an order based on container allocations
 * @param {Object} order - Order document with items
 * @param {Array} containers - Container documents that have allocations for this order
 * @returns {number} - Allocated carrying charges
 */
function calculateAllocatedCarryingCharges(order, containers) {
  if (!order.items || !Array.isArray(order.items)) {
    return 0;
  }

  let totalAllocatedCarryingCharges = 0;

  order.items.forEach(item => {
    const carryingChargeAmount = item.carryingCharge?.amount || 0;
    const totalCartons = item.cartons || 0;
    const allocatedCartons = item.allocatedCartons || 0;

    if (totalCartons > 0) {
      // Calculate allocation ratio for this item
      const allocationRatio = allocatedCartons / totalCartons;
      const allocatedCarryingCharge = carryingChargeAmount * allocationRatio;
      totalAllocatedCarryingCharges += allocatedCarryingCharge;
    }
  });

  return totalAllocatedCarryingCharges;
}

/**
 * Calculate total allocated amount for THROUGH_ME orders (allocated product cost + allocated carrying charges)
 * @param {Object} order - Order document
 * @param {Array} containers - Container documents
 * @returns {number} - Total allocated amount
 */
function calculateAllocatedTotalAmount(order, containers) {
  const allocatedProductCost = calculateAllocatedProductCost(order, containers);
  const allocatedCarryingCharges = calculateAllocatedCarryingCharges(order, containers);
  return allocatedProductCost + allocatedCarryingCharges;
}

/**
 * Get allocation summary for an order
 * @param {Object} order - Order document
 * @param {Array} containers - Container documents
 * @returns {Object} - Allocation summary with ratios and amounts
 */
function getOrderAllocationSummary(order, containers) {
  if (!order.items || !Array.isArray(order.items)) {
    return {
      totalCartons: 0,
      allocatedCartons: 0,
      allocationRatio: 0,
      allocatedProductCost: 0,
      allocatedCarryingCharges: 0,
      allocatedTotalAmount: 0,
      isPartiallyAllocated: false,
      isFullyAllocated: false,
      isUnallocated: true
    };
  }

  let totalCartons = 0;
  let allocatedCartons = 0;
  let totalProductCost = 0;
  let totalCarryingCharges = 0;

  order.items.forEach(item => {
    totalCartons += item.cartons || 0;
    allocatedCartons += item.allocatedCartons || 0;
    totalProductCost += item.totalPrice || 0;
    totalCarryingCharges += item.carryingCharge?.amount || 0;
  });

  const allocationRatio = totalCartons > 0 ? allocatedCartons / totalCartons : 0;
  const allocatedProductCost = totalProductCost * allocationRatio;
  const allocatedCarryingCharges = totalCarryingCharges * allocationRatio;
  const allocatedTotalAmount = allocatedProductCost + allocatedCarryingCharges;

  return {
    totalCartons,
    allocatedCartons,
    allocationRatio: Math.round(allocationRatio * 10000) / 100, // Percentage with 2 decimals
    allocatedProductCost,
    allocatedCarryingCharges,
    allocatedTotalAmount,
    totalProductCost,
    totalCarryingCharges,
    totalAmount: totalProductCost + totalCarryingCharges,
    isPartiallyAllocated: allocationRatio > 0 && allocationRatio < 1,
    isFullyAllocated: allocationRatio >= 1,
    isUnallocated: allocationRatio === 0
  };
}

/**
 * Calculate client financial summary with allocation awareness
 * @param {Array} orders - Array of order documents for a client
 * @param {Array} containers - Array of container documents
 * @param {String} clientId - Client ID to filter
 * @returns {Object} - Client financial summary
 */
function calculateClientFinancialSummary(orders, containers, clientId) {
  const clientOrders = orders.filter(order => order.clientId === clientId);
  
  let totalOrderValue = 0;
  let totalCarryingCharges = 0;
  let allocatedOrderValue = 0;
  let allocatedCarryingCharges = 0;
  let throughMeAmount = 0;
  let directAmount = 0;

  clientOrders.forEach(order => {
    const allocationSummary = getOrderAllocationSummary(order, containers);
    
    totalOrderValue += allocationSummary.totalProductCost;
    totalCarryingCharges += allocationSummary.totalCarryingCharges;
    allocatedOrderValue += allocationSummary.allocatedProductCost;
    allocatedCarryingCharges += allocationSummary.allocatedCarryingCharges;

    // Determine payment type from first item (assuming consistent per order)
    const paymentType = order.items[0]?.paymentType || 'THROUGH_ME';
    
    if (paymentType === 'THROUGH_ME') {
      // For THROUGH_ME: Use allocated amounts (client pays only for allocated portion)
      throughMeAmount += allocationSummary.allocatedTotalAmount;
    } else {
      // For CLIENT_DIRECT: Use allocated carrying charges only
      directAmount += allocationSummary.allocatedCarryingCharges;
    }
  });

  return {
    clientId,
    totalOrders: clientOrders.length,
    totalOrderValue,
    totalCarryingCharges,
    allocatedOrderValue,
    allocatedCarryingCharges,
    allocationRatio: totalOrderValue > 0 ? (allocatedOrderValue / totalOrderValue) * 100 : 0,
    paymentBreakdown: {
      throughMe: {
        amount: throughMeAmount,
        orders: clientOrders.filter(o => (o.items[0]?.paymentType || 'THROUGH_ME') === 'THROUGH_ME').length
      },
      direct: {
        amount: directAmount,
        orders: clientOrders.filter(o => (o.items[0]?.paymentType || 'THROUGH_ME') === 'CLIENT_DIRECT').length
      }
    }
  };
}

/**
 * Validate financial calculation consistency
 * @param {Object} order - Order document
 * @param {Array} containers - Container documents
 * @returns {Object} - Validation results
 */
function validateFinancialConsistency(order, containers) {
  const allocationSummary = getOrderAllocationSummary(order, containers);
  const issues = [];

  // Check if allocation ratio is valid
  if (allocationSummary.allocationRatio > 100) {
    issues.push({
      type: 'OVER_ALLOCATION',
      message: `Order ${order.orderNumber} has over-allocation: ${allocationSummary.allocationRatio}%`,
      severity: 'high'
    });
  }

  // Check if payment collections match allocated amounts
  // This would require payment collection data to validate

  // Check container revenue consistency
  const relatedContainers = containers.filter(container => 
    container.orders.some(containerOrder => 
      containerOrder.orderId.toString() === order._id.toString()
    )
  );

  relatedContainers.forEach(container => {
    const containerOrder = container.orders.find(co => 
      co.orderId.toString() === order._id.toString()
    );
    
    if (containerOrder) {
      const expectedCarryingCharges = allocationSummary.allocatedCarryingCharges;
      const actualCarryingCharges = containerOrder.carryingCharges || 0;
      
      if (Math.abs(expectedCarryingCharges - actualCarryingCharges) > 0.01) {
        issues.push({
          type: 'CONTAINER_REVENUE_MISMATCH',
          message: `Container ${container.realContainerId} revenue mismatch for order ${order.orderNumber}: Expected ₹${expectedCarryingCharges}, Got ₹${actualCarryingCharges}`,
          severity: 'medium'
        });
      }
    }
  });

  return {
    isValid: issues.length === 0,
    issues,
    allocationSummary
  };
}

module.exports = {
  calculateAllocatedProductCost,
  calculateAllocatedCarryingCharges,
  calculateAllocatedTotalAmount,
  getOrderAllocationSummary,
  calculateClientFinancialSummary,
  validateFinancialConsistency
};