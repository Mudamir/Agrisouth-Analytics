# Container Locking Workflow Guide

## Overview

The **Container Locking Workflow** is a structured approach to data entry that ensures maximum accuracy when encoding shipping records. All records must go through a two-step process: **Lock Container Details** first, then **Add Pack Entries**.

## Why Lock Container Details?

### Benefits

✅ **Prevents Data Duplication**
- Container details (Year, Week, ETD, Supplier, etc.) entered once
- Applied automatically to all pack entries
- No risk of typos or inconsistencies

✅ **Ensures Data Accuracy**
- Validates total cartons before submission
- Prevents over/under allocation
- Guaranteed load count accuracy (must sum to 1.0)

✅ **Supports Multiple Pack Types**
- Single container can have multiple pack types
- Each pack type becomes a separate database row
- All rows share identical container details

✅ **Streamlines Data Entry**
- Clear step-by-step workflow
- Visual feedback on progress
- Faster encoding after initial setup

## How It Works

### Workflow Steps

```
Step 1: Fill Container Details
         ↓
Step 2: Lock Container Info
         ↓
Step 3: Enter Total Cartons
         ↓
Step 4: Add Pack Entries (one or more)
         ↓
Step 5: Submit (creates database records)
```

## Detailed Instructions

### Step 1: Fill All Container Details

Click **"Add Record"** button and fill in all required fields:

#### Basic Information
- **Year**: Shipping year (e.g., 2026)
- **Week**: Week number (1-52)
- **ETD**: Estimated Time of Departure (date picker)
- **ETA**: Estimated Time of Arrival (optional, date picker)
- **POL**: Port of Loading (e.g., DAVAO, GENSAN)

#### Product & Logistics
- **Item Type**: 🍌 Bananas or 🍍 Pineapples
- **Supplier**: Select from dropdown
- **Type**: CONTRACT or SPOT
- **Destination**: Select destination port
- **Shipping Line**: Select shipping line

#### Shipping Details
- **Vessel Name**: Name of the shipping vessel

#### Container Details
- **Container Number**: Format: 4 letters + numbers (e.g., CGMU1234567)

#### Invoice & Billing
- **Customer Name**: Select from dropdown
  - Mohammed Abdallah Sharbatly Co Ltd
  - Santito Brands Inc
- **Billing No.**: Enter BL/Billing number

> **Note**: Invoice No. and Invoice Date are auto-generated based on the billing number.

### Step 2: Lock Container Info

Once all fields are filled:

1. Review your entries for accuracy
2. Click **"Lock Container Info"** button at the bottom
3. Container details become read-only
4. You'll see a confirmation message

> **Tip**: If you need to change any locked field, click the **"Change"** button next to "Container Information".

### Step 3: Enter Total Cartons in Container

After locking, you'll see:

1. A summary of your locked container information
2. **"Total Cartons in Container"** input field

Enter the total capacity of the container. This is the sum of all pack types.

**Example**: If your container holds:
- 500 cartons of 13.5 KG A
- 300 cartons of 13.5 KG B  
- 200 cartons of 18KG

**Total Cartons = 1000**

### Step 4: Add Pack Entries

Now add each pack type:

#### For Each Pack Type:

1. **Pack Type**: Select from dropdown (e.g., "13.5 KG A")
2. **Cartons**: Enter carton count (e.g., 500)
3. **Load Count**: Automatically calculated
4. Click **"Add Pack"** or press **Enter**

#### Visual Feedback

As you add packs, you'll see real-time validation:

**🟢 Green** - Perfect match (Total = Container capacity)
```
✓ All cartons accounted for (1,000 = 1,000)
Ready to submit!
```

**🟡 Yellow** - Under capacity (can add more)
```
⚠️ Total cartons (700) is 300 less than container total (1,000)
30% remaining
```

**🔴 Red** - Over capacity (exceeds total)
```
❌ Total cartons (1,200) exceeds container total (1,000) by 200
20% over
```

#### Pack Entry List

All added packs appear in a list showing:
- Pack type
- Cartons
- Load count (auto-calculated)
- Remove button (❌) to delete if needed

### Step 5: Submit Records

When total cartons exactly match container capacity:

1. The **"Add X Record(s)"** button becomes enabled
2. Review your pack entries one final time
3. Click **"Add X Record(s)"**
4. All records are created in the database simultaneously

**Success!** All pack entries are now in the database with:
- ✅ Identical container details
- ✅ Accurate carton distribution
- ✅ Perfect load count (1.0 total)
- ✅ Linked invoice information

## Real-World Examples

### Example 1: Single Pack Type Container

**Container**: CGMU1234567 with 1,080 cartons of one pack type

**Steps**:
1. Fill all container details → Lock
2. Enter Total Cartons: **1080**
3. Add Pack: **18KG** → **1080** cartons → Click "Add Pack"
4. Validation: **🟢 1,080/1,080** (Perfect!)
5. Click "Add 1 Record(s)"

**Result**: 1 database row created

---

### Example 2: Multiple Pack Types Container

**Container**: BMOU9773370 with 1,000 cartons, mixed packs

**Steps**:
1. Fill all container details → Lock
2. Enter Total Cartons: **1000**
3. Add Pack: **13.5 KG A** → **500** cartons → Add
   - Status: **🟡 500/1,000** (50% remaining)
4. Add Pack: **13.5 KG B** → **300** cartons → Add
   - Status: **🟡 800/1,000** (20% remaining)
5. Add Pack: **18KG** → **200** cartons → Add
   - Status: **🟢 1,000/1,000** (Perfect!)
6. Click "Add 3 Record(s)"

**Result**: 3 database rows created, all with:
- Same: Year, Week, ETD, Supplier, Container, Invoice, etc.
- Different: Pack type, Cartons, Load Count

---

### Example 3: Container with Existing Records

**Container**: CGMU5555555 already has 1 record in database

**Existing**: 
- 13.5 KG A → 600 cartons (Load: 0.6000)

**Adding**:
1. Enter same container number
2. System detects existing records
3. Shows: **"Existing: 600 cartons"**
4. Enter Total Cartons: **1000**
5. Add new packs:
   - 13.5 KG B → 400 cartons
6. Validation: **🟢 1,000/1,000** (600 existing + 400 new)
7. Click "Add 1 Record(s)"

**Result**: 1 new row added, total 2 rows for this container

## Tips & Best Practices

### ✅ Do's

1. **Double-check before locking**
   - Review all fields carefully
   - Container number especially (hard to change later)

2. **Verify total cartons**
   - Get accurate count from documentation
   - Confirm with logistics team if unsure

3. **Use "Get Latest Record"**
   - Click to auto-fill from previous entry
   - Saves time for similar shipments
   - Still review and adjust as needed

4. **Watch the validation colors**
   - 🟢 Green = Ready to submit
   - 🟡 Yellow = Keep adding
   - 🔴 Red = Remove some packs

5. **Review pack entries before submitting**
   - Check for duplicates
   - Verify carton counts
   - Remove any errors with ❌ button

### ❌ Don'ts

1. **Don't rush through Step 1**
   - Locked fields are harder to change
   - Take time to verify all details

2. **Don't submit with wrong totals**
   - Button is disabled anyway
   - Fix the issue first

3. **Don't add same pack type twice**
   - Combine them into one entry
   - Or remove and re-add with correct total

4. **Don't ignore warnings**
   - Yellow/Red indicators mean action needed
   - Adjust cartons or total as necessary

## Troubleshooting

### "Lock Container Info" button is disabled

**Cause**: Missing required fields

**Solution**: Fill in all fields marked with red asterisk (*)

---

### Can't add more packs (exceeds capacity)

**Cause**: Total cartons > Container capacity

**Solution**:
1. Check your total cartons entered (Step 3)
2. Remove incorrect pack entries (click ❌)
3. Adjust carton counts
4. Or increase total container capacity if it was wrong

---

### Need to change locked container info

**Solution**: Click **"Change"** button next to "Container Information" header
- Unlocks all fields
- Edit as needed
- Lock again when ready

---

### Pack entry won't add

**Cause**: Missing pack type or cartons = 0

**Solution**: Ensure both fields are filled before clicking "Add Pack"

---

### "Add X Record(s)" button is disabled

**Cause**: One of the following:
- No pack entries added yet
- Total cartons ≠ Container capacity

**Solution**: 
- Add at least one pack entry
- Adjust entries until **🟢 Green** validation appears

---

### Duplicate container warning

**Cause**: Container number + ETD already exists in database

**Info**: This is normal if adding more packs to an existing container

**Action**: System shows existing records and includes them in total calculation

## Database Structure

Each pack entry creates one database row:

### Shared Fields (Same for all packs in container)
- Year, Week
- ETD, ETA
- POL, Destination
- Item, Supplier, Shipping Line
- **Container Number**
- Type (CONTRACT/SPOT)
- Vessel
- Customer Name
- Invoice No., Invoice Date
- Billing No.

### Unique Fields (Different per pack)
- **Pack Type** (e.g., "13.5 KG A", "18KG")
- **Cartons** (e.g., 500, 300)
- **Load Count** (auto-calculated: cartons/total)

### Load Count Calculation

```
Load Count = Cartons in Pack / Total Cartons in Container
```

**Example**:
- Container: 1,000 total cartons
- Pack: 500 cartons of 13.5 KG A
- Load Count: 500 / 1,000 = **0.5000**

**Important**: Sum of all Load Counts for a container must equal **1.0000**

## Advantages Over Old Method

### Old Method ❌
- Enter all fields for each record
- Risk of typos in container number
- Inconsistent ETD, supplier, etc.
- No validation of total cartons
- Time-consuming for multiple packs

### New Method ✅
- Enter container details once
- Lock prevents inconsistencies
- Automatic load count calculation
- Real-time carton validation
- Fast pack entry workflow
- Guaranteed data accuracy

## Quick Reference

| Step | Action | Result |
|------|--------|--------|
| 1 | Fill all container details | Form complete |
| 2 | Click "Lock Container Info" | Fields locked ✓ |
| 3 | Enter total cartons | Validation ready |
| 4 | Add pack entries | List builds up |
| 5 | Verify green status | Total matches |
| 6 | Click "Add X Record(s)" | Records created ✓ |

---

**Questions or Issues?**

If you encounter any problems or have suggestions for improvement, please contact the development team. This workflow was designed to eliminate common data entry errors and streamline the encoding process.

**Happy Encoding! 📦✨**

