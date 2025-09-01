/**
 * Manual MongoDB Commands to Fix "Maximum available: 0 cartons" Issue
 * 
 * Copy and paste these commands into MongoDB Compass or mongosh
 */

// Switch to your database
use china5

// Insert test orders with QC data
db.orders.insertMany([
  {
    "_id": ObjectId(),
    "orderNumber": "ORD-TEST-001",
    "clientId": "CLIENT-A",
    "clientName": "Test Client A",
    "status": "ready",
    "qcStatus": "completed",
    "qcCompletedAt": new Date(),
    "totalAmount": 5000,
    "totalCarryingCharges": 500,
    "totalWeight": 2500,
    "totalCbm": 15,
    "totalCartons": 50,
    "totalQcPassedCartons": 50,
    "totalLoopBackCartons": 0,
    "totalPendingCartons": 0,
    "qcCompletionPercentage": 100,
    "createdBy": ObjectId(),
    "updatedBy": ObjectId(),
    "createdAt": new Date(),
    "updatedAt": new Date(),
    "items": [
      {
        "itemCode": "ITEM-A-001",
        "description": "Test Widget A",
        "quantity": 1000,
        "cartons": 20,
        "unitPrice": 2.50,
        "unitWeight": 2.5,
        "unitCbm": 0.3,
        "paymentType": "CLIENT_DIRECT",
        "carryingCharge": {
          "basis": "carton",
          "rate": 10,
          "amount": 200
        },
        "qcPassedCartons": 20,
        "qcPassedQuantity": 1000,
        "loopBackCartons": 0,
        "loopBackQuantity": 0,
        "allocatedCartons": 0,
        "allocatedQuantity": 0,
        "pendingCartons": 0,
        "pendingQuantity": 0,
        "qcStatus": "completed"
      },
      {
        "itemCode": "ITEM-A-002",
        "description": "Test Gadget A", 
        "quantity": 1500,
        "cartons": 30,
        "unitPrice": 1.80,
        "unitWeight": 2.0,
        "unitCbm": 0.2,
        "paymentType": "THROUGH_ME",
        "carryingCharge": {
          "basis": "carton",
          "rate": 10,
          "amount": 300
        },
        "qcPassedCartons": 30,
        "qcPassedQuantity": 1500,
        "loopBackCartons": 0,
        "loopBackQuantity": 0,
        "allocatedCartons": 0,
        "allocatedQuantity": 0,
        "pendingCartons": 0,
        "pendingQuantity": 0,
        "qcStatus": "completed"
      }
    ]
  },
  {
    "_id": ObjectId(),
    "orderNumber": "ORD-TEST-002",
    "clientId": "CLIENT-B", 
    "clientName": "Test Client B",
    "status": "partial_ready",
    "qcStatus": "partial",
    "qcCompletedAt": new Date(),
    "totalAmount": 3000,
    "totalCarryingCharges": 200,
    "totalWeight": 1800,
    "totalCbm": 10,
    "totalCartons": 40,
    "totalQcPassedCartons": 25,
    "totalLoopBackCartons": 10,
    "totalPendingCartons": 5,
    "qcCompletionPercentage": 62.5,
    "createdBy": ObjectId(),
    "updatedBy": ObjectId(),
    "createdAt": new Date(),
    "updatedAt": new Date(),
    "items": [
      {
        "itemCode": "ITEM-B-001",
        "description": "Test Product B",
        "quantity": 2000,
        "cartons": 40,
        "unitPrice": 1.50,
        "unitWeight": 2.0,
        "unitCbm": 0.25,
        "paymentType": "CLIENT_DIRECT",
        "carryingCharge": {
          "basis": "carton",
          "rate": 5,
          "amount": 200
        },
        "qcPassedCartons": 25,
        "qcPassedQuantity": 1250,
        "loopBackCartons": 10,
        "loopBackQuantity": 500,
        "allocatedCartons": 0,
        "allocatedQuantity": 0,
        "pendingCartons": 5,
        "pendingQuantity": 250,
        "qcStatus": "partial"
      }
    ]
  }
])

// Verify orders were created
db.orders.find({}).count()

// Check available cartons
db.orders.find({
  "status": { $in: ["ready", "partial_ready"] }
}).forEach(function(order) {
  print("Order: " + order.orderNumber + " (" + order.status + ")");
  order.items.forEach(function(item, index) {
    var available = (item.qcPassedCartons || 0) - (item.allocatedCartons || 0);
    print("  Item " + index + ": " + item.itemCode + " - " + available + " cartons available");
  });
});

print("✅ Test orders created! Available cartons:");
print("- ORD-TEST-001: 50 cartons (20 + 30)")
print("- ORD-TEST-002: 25 cartons")
print("- Total: 75 cartons available for allocation")
print("🚀 Try container allocation again - should work now!")