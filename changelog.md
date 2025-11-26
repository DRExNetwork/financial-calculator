# Changelog

## Version 2.1.0 - Exit Values Calculation Methodology Update
**File Reference JavaScript**: `updated_cal_logic_11_26_v2.js`
**File Reference python**: `updated_calculator_logic_11_26_v2.py`


### Major Changes

#### 1. Exit Values Calculation Method - Replaced IRR-based with EBITDA PV Method
- **Changed**: Exit value calculation from IRR-based approach to present value of remaining EBITDA stream
- **Old Method**: `computeExitValuesAndIrrs()` - calculated IRR by adding exit value to year T cashflow and solving for IRR
- **New Method**: `computeExitValuesFromEbitda()` - calculates PV of remaining EBITDA (years T+1..n) discounted at 10%

#### 2. New Exit Values Output Structure
- **Old Output Fields**: 
  - Exit Year
  - Exit Value at Year T
  - IRR with Exit (%)
  
- **New Output Fields**:
  - Exit Year: Year at which project is exited
  - Exit Value @T (USD): Present value at year T of remaining EBITDA stream (years T+1..n)
  - Exit Value @0 PV (USD): Exit value discounted back to year 0 (for apples-to-apples comparison vs CAPEX)



#### 3. Updated Console Output Format
```
Exit Scenarios (Unlevered, 10% discount on remaining cashflows)
================================================================
Exit Year | Exit Value @T ($)    | Exit Value @0 PV ($)
---------+----------------------+---------------------
    5    | $X,XXX,XXX.XX        | $X,XXX,XXX.XX
   10    | $X,XXX,XXX.XX        | $X,XXX,XXX.XX
   15    | $X,XXX,XXX.XX        | $X,XXX,XXX.XX
```

#### 5. New Function: `computeExitValuesFromEbitda()`
- **Purpose**: Calculate exit scenarios based on remaining EBITDA stream valuation
- **Parameters**:
  - `ebitda`: Array of EBITDA values by year (index 0..n)
  - `discountRate`: Discount rate for PV calculations (default: 0.10 = 10%)
  - `exitYears`: Array of exit years to analyze (default: [5, 10, 15])
- **Returns**: Array of exit records with Exit Year, Exit Value @T, and Exit Value @0 PV
- **Behavior**: Automatically filters to only valid exit years within project tenor

#### 6. Integration with `runCalculation()`
- **Old Code**: Called `computeExitValuesAndIrrs(projectCf, 0.10, [5, 10, 15])`
- **New Code**: Calls `computeExitValuesFromEbitda(ebitdaSeries, 0.10, [5, 10, 15])`
- **Data Source**: Uses `optimalResultTable["EBITDA"]` instead of `resultTable["Project Cashflow"]`

---


## Version 2.0.1 - Financial Calculator Field Computation Updates

### Changes to Existing Field Computations

#### 1. O&M & Monitoring Expense (ex VAT) - Simplified Formula
- **Changed**: O&M monitoring expense calculation reduced to core components
- **Old Formula**: `(12*(1-0.2)*project_capacity_kw+(240+(400*project_capacity_kw/1000)))*fx_rate`
- **New Formula**: `(12*(1-0.2)*project_capacity_kw)*fx_rate`

#### 2. ES Reporting (ex VAT) - Set to Zero
- **Changed**: ES Reporting exclusion VAT expense set to 0
- **Old Value**: Calculated value
- **New Value**: `0`


#### 3. Project Due Diligence (ex VAT) - Set to Zero
- **Changed**: Project due diligence expense set to 0
- **Old Value**: Calculated value
- **New Value**: `0`


#### 4. Project ES (ex VAT) - Set to Zero
- **Changed**: Project environmental/social expense set to 0
- **Old Value**: Calculated value
- **New Value**: `0`


#### 5. Target IRR Threshold Update
- **Changed**: Target IRR threshold reduced for PPA term optimization
- **Old Value**: 12.5%
- **New Value**: 12.00%


## Version 2.0.0 - Financial Calculator Update 2025-11-07

### Major Changes

#### 1. Land Expense Calculation Overhaul
- **Changed**: Land expense calculation method from complex formula to simplified direct calculation
- **Old Formula**: `landExp = -landExpenseExclVat * landIdx * (projectCapacityKw * 1000 / 550) * (3.25 / 10000) / fxRate`
- **New Formula**: `landExp = -(landIdx * landRentExpense) / fxRate`


#### 2. New Input Parameters
Added two new project input parameters:
- **`surface_area_m2`**: Project surface area in square meters (m²)
  - Default: 10,000 m²
  - Unit: Square meters
  - Description: Total land area occupied by the solar project
  
- **`land_rent_expense`**: Total annual land rent expense in USD
  - Default: $22,330,000
  - Unit: USD (annual)
  - Description: Complete annual land rent paid for project site
  - Replaces the old `land_expense_excl_vat` parameter

#### 3. Dynamic Exit Values Calculation
- **Added**: `computeExitValuesAndIrrs()` function for calculating exit scenarios
- **Behavior**: Exit values are now dynamically filtered based on project contract term:
  - If `ppaTerm < 5 years`: No exit values shown
  - If `5 ≤ ppaTerm < 10 years`: Only 5-year exit shown
  - If `10 ≤ ppaTerm < 15 years`: 5 and 10-year exits shown
  - If `ppaTerm ≥ 15 years`: All three exits (5, 10, 15 years) shown
  
- **Discount Rate**: Fixed at 10% for remaining cashflows valuation
- **Output Format**: Includes Exit Value at Year T and IRR with Exit (%)
- **New Output Section**:
  ```
  Exit Scenarios (Unlevered, 10% discount on remaining cashflows)
  ================================================================
  Exit Year | Exit Value ($) | IRR with Exit (%)
  ```
