# QUICK FIX: Insert Orders to Fix "Maximum available: 0 cartons"

## Copy and paste these commands into MongoDB Compass or mongosh:

```javascript
// Switch to your database
use china5

// Insert test orders with available cartons
db.orders.insertMany([
  {
    "_id": ObjectId(),
    "orderNumber": "ORD-000001", 
    "clientId": "CLIENT-TEST-A",
    "clientName": "Test Client A",
    "status": "ready",
    "qcStatus": "completed", 
    "qcCompletedAt": new Date(),
    "totalAmount": 3000,
    "totalCarryingCharges": 300,
    "totalWeight": 1500,
    "totalCbm": 10,
    "totalCartons": 30,
    "totalQcPassedCartons": 30,
    "totalLoopBackCartons": 0,
    "totalPendingCartons": 0,
    "qcCompletionPercentage": 100,
    "createdBy": ObjectId(),
    "updatedBy": ObjectId(),
    "createdAt": new Date(),
    "updatedAt": new Date(),
    "__v": 0,
    "items": [
      {
        "itemCode": "WIDGET-A001",
        "description": "Test Widget Product A", 
        "quantity": 600,
        "cartons": 20,
        "unitPrice": 2.50,
        "unitWeight": 2.5,
        "unitCbm": 0.3,
        "totalPrice": 1500,
        "paymentType": "CLIENT_DIRECT",
        "carryingCharge": {
          "basis": "carton",
          "rate": 10,
          "amount": 200
        },
        "qcPassedCartons": 20,
        "qcPassedQuantity": 600,
        "loopBackCartons": 0,
        "loopBackQuantity": 0,
        "allocatedCartons": 0,
        "allocatedQuantity": 0,
        "pendingCartons": 0,
        "pendingQuantity": 0,
        "qcStatus": "completed"
      },
      {
        "itemCode": "GADGET-B002", 
        "description": "Test Gadget Product B",
        "quantity": 300,
        "cartons": 10,
        "unitPrice": 5.00,
        "unitWeight": 1.5,
        "unitCbm": 0.4,
        "totalPrice": 1500,
        "paymentType": "THROUGH_ME", 
        "carryingCharge": {
          "basis": "carton",
          "rate": 10,
          "amount": 100
        },
        "qcPassedCartons": 10,
        "qcPassedQuantity": 300,
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
    "orderNumber": "ORD-000002",
    "clientId": "CLIENT-TEST-B", 
    "clientName": "Test Client B",
    "status": "partial_ready",
    "qcStatus": "partial",
    "qcCompletedAt": new Date(),
    "totalAmount": 2000,
    "totalCarryingCharges": 150,
    "totalWeight": 1000,
    "totalCbm": 8,
    "totalCartons": 25,
    "totalQcPassedCartons": 15,
    "totalLoopBackCartons": 5,
    "totalPendingCartons": 5,
    "qcCompletionPercentage": 60,
    "createdBy": ObjectId(),
    "updatedBy": ObjectId(),
    "createdAt": new Date(),
    "updatedAt": new Date(),
    "__v": 0,
    "items": [
      {
        "itemCode": "PRODUCT-C003",
        "description": "Test Product C",
        "quantity": 500,
        "cartons": 25,
        "unitPrice": 4.00,
        "unitWeight": 2.0,
        "unitCbm": 0.32,
        "totalPrice": 2000,
        "paymentType": "CLIENT_DIRECT",
        "carryingCharge": {
          "basis": "carton", 
          "rate": 6,
          "amount": 150
        },
        "qcPassedCartons": 15,
        "qcPassedQuantity": 300,
        "loopBackCartons": 5,
        "loopBackQuantity": 100,
        "allocatedCartons": 0,
        "allocatedQuantity": 0,
        "pendingCartons": 5,
        "pendingQuantity": 100,
        "qcStatus": "partial"
      }
    ]
  }
])

// Verify orders were created
print("Checking created orders...")
db.orders.find({}).forEach(function(order) {
  print("Order: " + order.orderNumber + " (" + order.status + ")")
  order.items.forEach(function(item, index) {
    var available = (item.qcPassedCartons || 0) - (item.allocatedCartons || 0)
    print("  Item " + index + ": " + item.itemCode + " - " + available + " cartons available")
  })
})

print("✅ ORDERS CREATED!")
print("Available cartons for allocation:")
print("- ORD-000001: 30 cartons (20 + 10)")
print("- ORD-000002: 15 cartons") 
print("- Total: 45 cartons available")
print("")
print("🚀 Try container allocation again - you should now see orders with available cartons!")
```

## After inserting orders, test the allocation:

1. **Refresh your frontend application**
2. **Go to Container Allocation** 
3. **You should now see:**
   - ORD-000001 with 30 available cartons
   - ORD-000002 with 15 available cartons
4. **Try allocating 10 cartons** - it should work now!

## Expected Result:
- ✅ Orders appear in QC ready orders list
- ✅ Available cartons show correct numbers  
- ✅ Allocation of 10 cartons succeeds
- ✅ No more "Maximum available: 0" error