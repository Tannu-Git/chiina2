# 🔧 Container Optimization Troubleshooting Guide

## 🎯 What Container Optimization Does

The **Container Allocation Optimization** automatically finds the most efficient way to pack your QC-ready orders into shipping containers.

### ⚡ How It Works:
1. **Analyzes Requirements**: Calculates total CBM, weight, cartons needed
2. **Tests Strategies**: Single container, multiple containers, existing containers
3. **Scores Options**: Based on utilization rate, cost efficiency, waste minimization
4. **Recommends Best**: Highest scoring option with optimal space usage

### 📦 Container Types Available:
- **20ft Container**: 33 CBM capacity, 28,000 kg weight limit
- **40ft Container**: 67 CBM capacity, 30,000 kg weight limit  
- **40ft High Cube**: 76 CBM capacity, 30,000 kg weight limit
- **45ft Container**: 86 CBM capacity, 30,000 kg weight limit

## 🚨 Common "Failed to optimize container allocation" Causes

### 1. **Missing Order Data**
**Symptom**: "No allocation data available. Please complete order selection first."
**Cause**: Step 1 (Order Selection) wasn't completed properly
**Solution**: 
- Go back to Step 1
- Select QC-ready orders
- Ensure orders have CBM and weight data
- Complete Step 1 before optimization

### 2. **Orders Too Large for Containers**
**Symptom**: "No suitable container found for X CBM and Y kg"
**Cause**: Total order volume exceeds largest container capacity (86 CBM)
**Solutions**:
- **Split large orders** into smaller batches
- **Use multi-container strategy** (system will suggest multiple containers)
- **Check order data** - ensure CBM values are realistic

### 3. **Invalid Order Data**
**Symptom**: "Invalid order data: Total CBM must be greater than 0"
**Cause**: Orders missing CBM or weight information
**Solution**: 
- Check order data in database
- Ensure orders have proper totalCbm and totalWeight values
- Verify QC process populated these fields

### 4. **Authentication Issues**
**Symptom**: "Failed to load existing containers" + 401 errors
**Cause**: User not properly authenticated or missing permissions
**Solution**:
- Log out and log back in
- Ensure user has admin or staff role
- Check token hasn't expired

### 5. **No Existing Containers Available**
**Symptom**: Optimization only shows new container options
**Cause**: No containers with available space in system
**Solution**: This is normal - system will create new containers

## 🔍 Step-by-Step Debugging

### **Step 1: Open Browser Dev Tools**
1. Press `F12` to open developer tools
2. Click on **Console** tab
3. Clear any existing messages

### **Step 2: Navigate to Container Allocation**
1. Go to Warehouse → Container Allocation  
2. Complete Step 1 (Order Selection)
3. Move to Step 2 (Container Optimization)

### **Step 3: Trigger Optimization**
1. Select "Auto-Optimization" mode
2. Watch console for debug messages
3. Look for these key messages:

```
🔍 Optimization Debug - Starting optimization...
📊 Data received: {...}
📋 Allocation totals: {...}
📦 Requirements: X CBM, Y kg
```

### **Step 4: Identify the Issue**

**If you see**: `❌ Optimization failed: No allocation totals provided`
- **Fix**: Go back to Step 1, ensure orders are selected

**If you see**: `❌ Optimization failed: Invalid CBM data`  
- **Fix**: Check order data, ensure CBM values are valid

**If you see**: `🚢 Testing single container options...` followed by `❌ [container] too small`
- **Fix**: Orders are too large, try splitting them or use multi-container

**If you see**: `❌ Optimization failed: No suitable container configuration found`
- **Fix**: Orders exceed system capacity, split into smaller batches

## 💡 Quick Fixes

### **Fix 1: Reset and Retry**
1. Go back to Step 1
2. Clear all selections
3. Select fewer orders (start with 1-2 orders)
4. Try optimization again

### **Fix 2: Check Order Sizes**
1. In Step 1, look at "Total CBM" at bottom
2. If > 86 CBM, split selections
3. Aim for 30-70 CBM for best optimization

### **Fix 3: Manual Container Selection**
1. Switch to "Manual Selection" mode
2. Add containers manually based on your needs
3. Skip auto-optimization

### **Fix 4: Refresh Authentication**
1. Log out completely
2. Clear browser cache
3. Log back in with admin/staff account
4. Try again

## 📊 Optimization Success Indicators

### **In Console, you should see**:
```
✅ [container type] suitable: X% utilization
✅ Multi-40ft: X% utilization  
✅ Existing container [ID]: X% utilization
🏆 Best option selected: [strategy] with X% utilization
✅ Optimization completed successfully
```

### **In UI, you should see**:
- Green "Recommended Configuration" card
- Utilization percentage (aim for 60-90%)
- Alternative options if available
- "Optimization complete" success message

## 🎯 Best Practices

1. **Start Small**: Test with 1-2 orders first
2. **Check Data**: Ensure orders have valid CBM/weight
3. **Monitor Console**: Watch debug messages for issues  
4. **Use Manual Mode**: If auto-optimization consistently fails
5. **Split Large Orders**: Keep individual allocations under 70 CBM

## 🆘 Still Having Issues?

If optimization continues to fail:
1. **Share console error messages** - exact text helps identify the issue
2. **Check order data** - provide sample totalCbm and totalWeight values
3. **Verify authentication** - ensure admin/staff permissions
4. **Try simplified allocation** - use the simple allocation feature instead

---

**Remember**: The optimization feature is designed to find the most efficient container usage. If it fails, the system is protecting you from inefficient or impossible allocations!