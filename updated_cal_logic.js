const financial = require('financial');
const irrs = require('node-irr')

const DEBUG = true;
const API_KEY = "b3471f654f8b4a0797fb6278010135c3";

// Country and currency mapping
const CURRENCY_BY_COUNTRY = {
    "Colombia": "COP",
    "Peru": "PEN",
    "Chile": "CLP",
    "Mexico": "MXN",
    "Panama": "USD",
    "Costa Rica": "CRC",
    "Honduras": "HNL",
    "Guatemala": "GTQ",
    "Ecuador": "USD",
};

// Policy configuration by country
const POLICY_CONFIG = {
    "Colombia": {
        "Currency Unit": "COP",
        "Devaluation Factor": 5.00,
        "Electric Tariff Escalator": 7.00,
        "O&M Escalator": 2.00,
        "Land Rent Escalator": 2.00,
        "VAT": 19.00,
        "Corporate Tax": 35.00,
        "Corporate Tax Exemption Years": 15,
    },
    "Peru": {
        "Currency Unit": "PEN",
        "Devaluation Factor": 3.00,
        "Electric Tariff Escalator": 5.00,
        "O&M Escalator": 2.00,
        "Land Rent Escalator": 2.00,
        "VAT": 18.00,
        "Corporate Tax": 29.50,
        "Corporate Tax Exemption Years": 0,
    },
    "Chile": {
        "Currency Unit": "CLP",
        "Devaluation Factor": 3.00,
        "Electric Tariff Escalator": 5.00,
        "O&M Escalator": 2.00,
        "Land Rent Escalator": 2.00,
        "VAT": 19.00,
        "Corporate Tax": 25.00,
        "Corporate Tax Exemption Years": 0,
    },
    "Mexico": {
        "Currency Unit": "MXN",
        "Devaluation Factor": 4.00,
        "Electric Tariff Escalator": 6.00,
        "O&M Escalator": 2.00,
        "Land Rent Escalator": 2.00,
        "VAT": 16.00,
        "Corporate Tax": 30.00,
        "Corporate Tax Exemption Years": 0,
    },
    "Panama": {
        "Currency Unit": "USD",
        "Devaluation Factor": 0.00,
        "Electric Tariff Escalator": 2.00,
        "O&M Escalator": 2.00,
        "Land Rent Escalator": 2.00,
        "VAT": 7.00,
        "Corporate Tax": 25.00,
        "Corporate Tax Exemption Years": 0,
    },
    "Costa Rica": {
        "Currency Unit": "CRC",
        "Devaluation Factor": 4.00,
        "Electric Tariff Escalator": 6.00,
        "O&M Escalator": 2.00,
        "Land Rent Escalator": 2.00,
        "VAT": 13.00,
        "Corporate Tax": 30.00,
        "Corporate Tax Exemption Years": 8,
    },
    "Honduras": {
        "Currency Unit": "HNL",
        "Devaluation Factor": 5.00,
        "Electric Tariff Escalator": 7.00,
        "O&M Escalator": 2.00,
        "Land Rent Escalator": 2.00,
        "VAT": 15.00,
        "Corporate Tax": 25.00,
        "Corporate Tax Exemption Years": 5,
    },
    "Guatemala": {
        "Currency Unit": "GTQ",
        "Devaluation Factor": 4.00,
        "Electric Tariff Escalator": 6.00,
        "O&M Escalator": 2.00,
        "Land Rent Escalator": 2.00,
        "VAT": 12.00,
        "Corporate Tax": 25.00,
        "Corporate Tax Exemption Years": 10,
    },
    "Ecuador": {
        "Currency Unit": "USD",
        "Devaluation Factor": 0.00,
        "Electric Tariff Escalator": 2.00,
        "O&M Escalator": 2.00,
        "Land Rent Escalator": 2.00,
        "VAT": 15.00,
        "Corporate Tax": 25.00,
        "Corporate Tax Exemption Years": 10,
    },
};

///////////////////////////////////////////////////////
// Fetches exchange rates and caches them
// new function with the API
///////////////////////////////////////////////////////

async function fetchLatestFxCached() {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    let data;

    // Fetch from API if no cache exists
    const symbols = Object.values(CURRENCY_BY_COUNTRY).join(',');
    const url = "https://api-dev.drex.network/developers/exchange-rate/latest"

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        data = await response.json();
    } catch (error) {
        console.error("Error fetching FX rates:", error);
        throw error;
    }

    const rates = data;   //store the rate in the databse in the currency field based on what currency user selects

    console.log(`Fetched FX rates for ${today}:`, rates);

    const fxMap = {};
    for (const [country, curr] of Object.entries(CURRENCY_BY_COUNTRY)) {
        const rate = rates[curr];
        if (rate === undefined) {
            throw new Error(`Missing rate for ${curr}`);
        }
        fxMap[country] = rate;
    }

    return fxMap;
}

// Builds a table with country policies and FX rates
async function buildCountryPolicyTable() {
    const fxMap = await fetchLatestFxCached();
    const policyTable = [];

    for (const country of Object.keys(POLICY_CONFIG)) {
        policyTable.push({
            Country: country,
            FXrate: fxMap[country],
            ...POLICY_CONFIG[country]
        });
    }

    return policyTable;
}

// Static testing version that doesn't require API calls
// Static testing version that doesn't require API calls
function devBuildCountryPolicyTable() {
    // This matches the Python implementation's static data structure
    const staticData = {
        "Country": [
            "Colombia",
            "Peru",
            "Chile",
            "Mexico",
            "Panama",
            "Costa Rica",
            "Honduras",
            "Guatemala",
            "Ecuador",
        ],
        "FXrate": [
            4000.00,
            3.80,
            900.00,
            17.50,
            1.00,
            530.00,
            24.50,
            7.80,
            1.00,
        ],
        "Currency Unit": [
            "COP",
            "PEN",
            "CLP",
            "MXN",
            "USD",
            "CRC",
            "HNL",
            "GTQ",
            "USD",
        ],
        "Devaluation Factor": [
            5.00,
            3.00,
            3.00,
            4.00,
            0.00,
            4.00,
            5.00,
            4.00,
            0.00,
        ],
        "Electric Tariff Escalator": [
            7.00,
            5.00,
            5.00,
            6.00,
            2.00,
            6.00,
            7.00,
            6.00,
            2.00,
        ],
        "O&M Escalator": [2.00, 2.00, 2.00, 2.00, 2.00, 2.00, 2.00, 2.00, 2.00],
        "Land Rent Escalator": [2.00, 2.00, 2.00, 2.00, 2.00, 2.00, 2.00, 2.00, 2.00],
        "VAT": [
            19.00,
            18.00,
            19.00,
            16.00,
            7.00,
            13.00,
            15.00,
            12.00,
            15.00,
        ],
        "Corporate Tax": [
            35.00,
            29.50,
            25.00,
            30.00,
            25.00,
            30.00,
            25.00,
            25.00,
            25.00,
        ],
        "Corporate Tax Exemption Years": [15, 0, 0, 0, 0, 8, 5, 10, 10],
    };

    // Build a table that matches the structure expected by the lookup functions
    const policyTable = [];
    for (let i = 0; i < staticData.Country.length; i++) {
        const country = staticData.Country[i];
        policyTable.push({
            Country: country,
            FXrate: staticData.FXrate[i],
            "Currency Unit": staticData["Currency Unit"][i],
            "Devaluation Factor": staticData["Devaluation Factor"][i],
            "Electric Tariff Escalator": staticData["Electric Tariff Escalator"][i],
            "O&M Escalator": staticData["O&M Escalator"][i],
            "Land Rent Escalator": staticData["Land Rent Escalator"][i],
            "VAT": staticData.VAT[i],
            "Corporate Tax": staticData["Corporate Tax"][i],
            "Corporate Tax Exemption Years": staticData["Corporate Tax Exemption Years"][i],
        });
    }

    return policyTable;
}

function lookupCountryPolicy(country, policyTable) {
    const policyRow = policyTable.find(row => row.Country === country);
    if (!policyRow) {
        throw new Error(`Country '${country}' not found in policy table.`);
    }

    return {
        "FXrate": parseFloat(policyRow.FXrate),
        "Currency Unit": String(policyRow["Currency Unit"]),
        "Devaluation Factor": parseFloat(policyRow["Devaluation Factor"]) / 100,
        "Electric Tariff Escalator": parseFloat(policyRow["Electric Tariff Escalator"]) / 100,
        "O&M Escalator": parseFloat(policyRow["O&M Escalator"]) / 100,
        "Land Rent Escalator": parseFloat(policyRow["Land Rent Escalator"]) / 100,
        "VAT": parseFloat(policyRow.VAT) / 100,
        "Corporate Tax": parseFloat(policyRow["Corporate Tax"]) / 100,
        "Corporate Tax Exemption Years": parseInt(policyRow["Corporate Tax Exemption Years"]),
    };
}

function buildTierTable() {
    return {
        SizeAbove: [0, 500, 1000, 2000, 5000, 10000],
        CostPerkWp: [40, 35, 30, 25, 20, 15],
        FromPreviousTranche: [0, 20000, 37500, 67500, 142500, 242500]
    };
}

function buildFxTable(policyTable) {
    const fxTable = {};

    // Initialize with empty objects for each country
    console.log(policyTable);

    for (const row of policyTable) {
        fxTable[row.Country] = {};
    }

    // Calculate rates for each year (1-25) and country
    for (let year = 1; year <= 25; year++) {
        for (const row of policyTable) {
            const country = row.Country;
            const fxRate = row.FXrate;
            const devalFactor = row["Devaluation Factor"] / 100;

            fxTable[country][year] = fxRate * Math.pow(1 + devalFactor, year - 1);
        }
    }

    return fxTable;
}

function lookupFx(country, fxTable, year = 1) {
    if (!fxTable[country]) {
        throw new Error(`Country '${country}' not found in FX table.`);
    }

    if (!fxTable[country][year]) {
        throw new Error(`Year ${year} not found for country '${country}' in FX table.`);
    }

    return parseFloat(fxTable[country][year]);
}

function capexPiecewise(sizeKwp, fxRate, tierTable) {
    // Find the right tier for the project size
    let idx = 0;
    while (idx < tierTable.SizeAbove.length && tierTable.SizeAbove[idx] <= sizeKwp) {
        idx++;
    }
    idx--;

    if (idx < 0) {
        throw new Error("Plant size is below the minimum tier breakpoint.");
    }

    const cumulativeBefore = tierTable.FromPreviousTranche[idx];
    const priorBreak = tierTable.SizeAbove[idx];
    const marginalCost = tierTable.CostPerkWp[idx];

    const subtotalLocal = cumulativeBefore + (sizeKwp - priorBreak) * marginalCost;
    return [subtotalLocal * fxRate, fxRate];
}

function totalCapexUsd(sizeKwp, country, tierTable, fxTable) {
    const rate = lookupFx(country, fxTable);
    return capexPiecewise(sizeKwp, rate, tierTable);
}

// Equivalent of numpy.irr
function irr(cashflows, guess = 0.1) {
    const EPSILON = 1e-10;
    const MAX_ITERATIONS = 100;

    let rate = guess;

    for (let i = 0; i < MAX_ITERATIONS; i++) {
        let f = 0;  // NPV at current rate
        let df = 0; // Derivative of NPV

        for (let j = 0; j < cashflows.length; j++) {
            const factor = Math.pow(1 + rate, j);
            f += cashflows[j] / factor;
            df -= j * cashflows[j] / (factor * (1 + rate));
        }

        // Newton-Raphson step
        const newRate = rate - f / df;

        // Check for convergence
        if (Math.abs(newRate - rate) < EPSILON) {
            return newRate;
        }

        rate = newRate;
    }

    throw new Error("IRR calculation did not converge");
}

function excelNpv(rate, values) {
    let npv = 0;
    for (let i = 0; i < values.length; i++) {
        npv += values[i] / Math.pow(1 + rate, i + 1);
    }
    return npv;
}

function calculateUnleveredIrr(
    ppaTermYears,
    inverterReplacementYear,
    annualPowerDegradation,
    country,
    specificPowerOutput,
    projectCapacityKw,
    projectElectricTariffExclVat,
    opMaintenanceMonitorExpense,
    insuranceRisk,
    totalConstructionCostInclVat,
    assetManagementFee,
    landRentExpense,
    recsEnabled,
    recCost,
    dismantlingCost,
    esReportingExclVat,
    policy,
    fxTable,
    projectVat,
    capexDepreciationYears,
    inverterReplacementExclVat,
    totalProjectCostExclVat,
    totalCapexInclVat
) {
    // Initialize data structure for storing calculation results
    const rows = {
        "Energy Project Tenor Flag": [],
        "Inverter Replacement Flag": [],
        "Dismantling Flag": [],
        "Corporate Tax Exemption Flag": [],
        "Inflation Year Counter": [],
        "Power Degradation Index": [],
        "PPA Inflation Index": [],
        "O&M Inflation Index": [],
        "Land Inflation Index": [],
        "FX Rate": [],
        "Annual Output (kWh AC)": [],
        "Energy Price ($/kWh, escalated)": [],
        "Total Revenue": [],
        "O&M Expense": [],
        "Insurance Expense": [],
        "Management Expense": [],
        "Land Expense": [],
        "Renewable Energy Credits": [],
        "Dismantling Expense": [],
        "ES Expense": [],
        "Total OPEX": [],
        "VAT paid on CAPEX": [],
        "Net op. VAT for Recovery": [],
        "Opening VAT Balance": [],
        "CAPEX VAT Additions": [],
        "CAPEX VAT Recovery": [],
        "Closing VAT Balance": [],
        "CAPEX Depreciation": [],
        "Project Taxable Income": [],
        "Project Tax": [],
        "EBITDA": [],
        "Tax Paid (ungeared)": [],
        "Inverter Replacement": [],
        "Project Cashflow": [],
    };

    const cashFlows = [];
    const corporateTaxExemptionYear = policy["Corporate Tax Exemption Years"];

    // Year 0 initialization
    const fxRateY0 = lookupFx(country, fxTable, 1);
    console.log(`Year 0 FX Rate: ${fxRateY0}, Country: ${country}, totalConstructionCostInclVat: ${totalConstructionCostInclVat}`);

    const vatPaidOnCapexY0 = projectVat / fxRateY0;
    const netOpVatRecoveryY0 = 0.0;
    const openingBalanceY0 = 0.0;
    const capexVatAddY0 = vatPaidOnCapexY0;
    const capexVatRecY0 = -Math.min(openingBalanceY0 + capexVatAddY0, netOpVatRecoveryY0);
    const closingBalanceY0 = openingBalanceY0 + capexVatAddY0 + capexVatRecY0;
    const ebitdaY0 = -totalCapexInclVat / fxRateY0;

    // Store year 0 values
    Object.keys(rows).forEach(key => rows[key].push(0.0));
    rows["VAT paid on CAPEX"][0] = vatPaidOnCapexY0;
    rows["Net op. VAT for Recovery"][0] = netOpVatRecoveryY0;
    rows["Opening VAT Balance"][0] = openingBalanceY0;
    rows["CAPEX VAT Additions"][0] = capexVatAddY0;
    rows["CAPEX VAT Recovery"][0] = capexVatRecY0;
    rows["Closing VAT Balance"][0] = closingBalanceY0;
    rows["EBITDA"][0] = ebitdaY0;
    rows["Project Cashflow"][0] = ebitdaY0;
    cashFlows.push(ebitdaY0);

    console.log(`Year 0: Opening Balance: ${openingBalanceY0}, VAT Paid on CAPEX: ${vatPaidOnCapexY0}, EBITDA: ${ebitdaY0}`);


    // Calculate for operational years
    let openingBalance = closingBalanceY0;

    for (let year = 1; year <= ppaTermYears; year++) {
        // Flags and indices
        rows["Energy Project Tenor Flag"].push(1);
        rows["Inverter Replacement Flag"].push(year === inverterReplacementYear ? 1 : 0);
        rows["Dismantling Flag"].push(year === ppaTermYears ? 1 : 0);
        rows["Corporate Tax Exemption Flag"].push(year <= corporateTaxExemptionYear ? 0 : 1);
        rows["Inflation Year Counter"].push(year - 1);

        const powerDegradationIndex = Math.pow(1 - annualPowerDegradation, year);
        const ppaIndex = Math.pow(1 + policy["Electric Tariff Escalator"], year - 1);
        const oAndMIdx = Math.pow(1 + policy["O&M Escalator"], year - 1);
        const landIdx = Math.pow(1 + policy["Land Rent Escalator"], year - 1);
        const fxRate = lookupFx(country, fxTable, year);
        const fxRateY1 = lookupFx(country, fxTable, 1);

        rows["Power Degradation Index"].push(powerDegradationIndex);
        rows["PPA Inflation Index"].push(ppaIndex);
        rows["O&M Inflation Index"].push(oAndMIdx);
        rows["Land Inflation Index"].push(landIdx);
        rows["FX Rate"].push(fxRate);

        // Output and revenue calculations
        const annualOutput = specificPowerOutput * projectCapacityKw * powerDegradationIndex;
        const energyPrice = projectElectricTariffExclVat * ppaIndex / fxRate;
        const revenue = energyPrice * annualOutput;

        // Expense calculations
        const oAndMExp = -oAndMIdx * opMaintenanceMonitorExpense * projectCapacityKw * 1000 / fxRate;
        const insExp = -insuranceRisk * totalConstructionCostInclVat * oAndMIdx / fxRate;
        const mgmtExp = -assetManagementFee * revenue * oAndMIdx;

        //new changes 
        const landExp = -(landIdx * landRentExpense) / fxRate;
        const recsExp = -(annualOutput / 1000) * recCost * (recsEnabled ? 0.3 : 0) / fxRate;
        const dismantExp = year === ppaTermYears ? -dismantlingCost / fxRate : 0;


        const esExp = -(year <= 2 ? esReportingExclVat * oAndMIdx : 0) / fxRate;


        const totalOpex = oAndMExp + insExp + mgmtExp + landExp + recsExp + dismantExp + esExp;
        const ebitda = revenue + totalOpex;

        // VAT schedule calculations
        const vatPaidOnCapex = 0.0;
        const netOpVat = ebitda * policy["VAT"];
        const capexVatAdd = vatPaidOnCapex;
        const capexVatRec = -Math.min(openingBalance + capexVatAdd, netOpVat);
        const closingBalance = openingBalance + capexVatAdd + capexVatRec;

        // Corporate income tax calculations
        let capexDepreciation = 0.0;
        if (year <= capexDepreciationYears) {
            let baseCost = totalProjectCostExclVat;
            if (year >= inverterReplacementYear) {
                baseCost += inverterReplacementExclVat;
            }
            capexDepreciation = -(baseCost / capexDepreciationYears) / fxRate;
        }

        const projectTaxableIncome = ebitda + capexDepreciation;
        const projectTax = -(
            projectTaxableIncome *
            policy["Corporate Tax"] *
            rows["Corporate Tax Exemption Flag"][year]
        );

        // Unlevered IRR Post-Tax calculations
        const taxPaidUngeared = projectTax - capexVatRec;
        const inverterReplacement = -(
            rows["Inverter Replacement Flag"][year] *
            inverterReplacementExclVat /
            fxRateY1
        );
        const projectCashflow = ebitda + taxPaidUngeared + inverterReplacement;

        // Store values in rows
        rows["Annual Output (kWh AC)"].push(annualOutput);
        rows["Energy Price ($/kWh, escalated)"].push(energyPrice);
        rows["Total Revenue"].push(revenue);
        rows["O&M Expense"].push(oAndMExp);
        rows["Insurance Expense"].push(insExp);
        rows["Management Expense"].push(mgmtExp);
        rows["Land Expense"].push(landExp);
        rows["Renewable Energy Credits"].push(recsExp);
        rows["Dismantling Expense"].push(dismantExp);
        rows["ES Expense"].push(esExp);
        rows["Total OPEX"].push(totalOpex);
        rows["EBITDA"].push(ebitda);
        rows["VAT paid on CAPEX"].push(vatPaidOnCapex);
        rows["Net op. VAT for Recovery"].push(netOpVat);
        rows["Opening VAT Balance"].push(openingBalance);
        rows["CAPEX VAT Additions"].push(capexVatAdd);
        rows["CAPEX VAT Recovery"].push(capexVatRec);
        rows["Closing VAT Balance"].push(closingBalance);
        rows["CAPEX Depreciation"].push(capexDepreciation);
        rows["Project Taxable Income"].push(projectTaxableIncome);
        rows["Project Tax"].push(projectTax);
        rows["Tax Paid (ungeared)"].push(taxPaidUngeared);
        rows["Inverter Replacement"].push(inverterReplacement);
        rows["Project Cashflow"].push(projectCashflow);

        cashFlows.push(projectCashflow);
        openingBalance = closingBalance;
    }

    // Calculate IRR
    // console.log("Calculating Unlevered IRR...");
    // console.log("Cash Flows:", cashFlows);
    const irrValue = irrs.irr(cashFlows) * 100;
    // console.log(`Unlevered IRR: ${irrValue}`);


    return [irrValue, cashFlows, rows];
}

function generateDebtSchedule(
    totalProjectCost,
    debtFacilitySize,
    tenorOfLoan,
    annualInterestRate,
    minDscr,
    cashFlows
) {
    let loanBalanceStart = debtFacilitySize;

    // Calculate debt service for loan period
    const debtService = cashFlows
        .slice(1, tenorOfLoan + 1)
        .map(cf => cf / minDscr);

    const tableData = {
        "Year": Array.from({ length: cashFlows.length - 1 }, (_, i) => i + 1),
        "Loan Balance (Beginning of Year)": [],
        "Principal Amortization": [],
        "Loan Balance (End of Year)": [],
        "Interest Expense": [],
        "Principal": [],
        "Debt Service": [],
        "DSCR": [],
        "Leveraged Cashflow": [],
    };

    const leveragedCashflow = [];

    // Calculate for loan tenor years
    for (let year = 0; year < tenorOfLoan; year++) {
        const debtPayment = debtService[year];
        const cashFlow = cashFlows[year + 1];

        const interestExpense = loanBalanceStart * annualInterestRate;
        const principal = debtPayment - interestExpense;
        const principalAmortization = -principal;
        const loanBalanceEnd = loanBalanceStart + principalAmortization;
        const leveredCf = cashFlow - debtPayment;

        tableData["Loan Balance (Beginning of Year)"].push(loanBalanceStart);
        tableData["Principal Amortization"].push(principalAmortization);
        tableData["Loan Balance (End of Year)"].push(loanBalanceEnd);
        tableData["Interest Expense"].push(interestExpense);
        tableData["Principal"].push(principal);
        tableData["Debt Service"].push(debtPayment);
        tableData["DSCR"].push(`${minDscr.toFixed(2)}x`);
        tableData["Leveraged Cashflow"].push(leveredCf);

        loanBalanceStart = loanBalanceEnd;
        leveragedCashflow.push(leveredCf);
    }

    // Zero values for years after loan term
    for (let year = tenorOfLoan; year < cashFlows.length - 1; year++) {
        tableData["Loan Balance (Beginning of Year)"].push(0);
        tableData["Principal Amortization"].push(0);
        tableData["Loan Balance (End of Year)"].push(0);
        tableData["Interest Expense"].push(0);
        tableData["Principal"].push(0);
        tableData["Debt Service"].push(0);
        tableData["DSCR"].push("-");
        tableData["Leveraged Cashflow"].push(cashFlows[year + 1]);
    }

    // Calculate results
    const leverage = debtFacilitySize / totalProjectCost;
    const initialEquity = -(totalProjectCost - debtFacilitySize);
    const cashflowsForIrr = [initialEquity, ...tableData["Leveraged Cashflow"]];
    const leveredIrr = irr(cashflowsForIrr);

    const results = {
        "Debt Facility Size": debtFacilitySize,
        "Leverage": leverage,
        "Levered Pre-Tax IRR": leveredIrr,
    };

    return [tableData, results];
}

// Compute exit values and IRRs for different exit years
function computeExitValuesAndIrrs(
    projectCashflows,
    discountRate = 0.10,
    exitYears = [5, 10, 15]
) {
    const cf = [...projectCashflows];
    const nYears = cf.length - 1;

    // Filter to only valid exit years within project tenor
    const validExitYears = exitYears.filter(T => T > 0 && T <= nYears);

    const records = [];

    for (const T of validExitYears) {
        const remaining = cf.slice(T + 1);

        if (remaining.length === 0) {
            continue;
        }

        // Discount remaining CFs back to year T at discountRate
        let exitValue = 0;
        for (let i = 0; i < remaining.length; i++) {
            exitValue += remaining[i] / Math.pow(1.0 + discountRate, i + 1);
        }

        // Truncated CF series with exit at year T
        const cfExit = [...cf];
        cfExit[T] += exitValue;
        for (let i = T + 1; i < cfExit.length; i++) {
            cfExit[i] = 0.0;
        }

        // Calculate IRR with exit
        const irrExit = irr(cfExit) * 100.0; // in %

        records.push({
            "Exit Year": T,
            "Exit Value at Year T": exitValue,
            "IRR with Exit (%)": irrExit
        });
    }

    return records;
}

// Add this pretty print debug function (optional for browser environment)
function prettyPrintDebug(data, title = "DEBUG TABLE") {
    console.log("\n" + "=".repeat(title.length));
    console.log(title);
    console.log("=".repeat(title.length));
    console.table(data);
}

// Main execution function - equivalent to Python's if __name__ == "__main__":
async function runCalculation() {
    // Contractor Inputs - hardcoded values
    // const projectCapacityKw = 1000;  // UNIT: kW DC
    // const percentageInvestedByOfftaker = 0;  // UNIT: decimal (0-1)
    // const assetOwnershipTransferred = true;  // UNIT: Boolean
    // const projectSites = 2;  // UNIT: Number of sites
    // const projectCountry = "Colombia";  // UNIT: String
    // const epcCostExclVat = 2080000000;  // UNIT: $
    // const epcCostVat = 263466667;  // UNIT: $
    // const currentElectricityTariff = 360;  // UNIT: $
    // const savingOnElectricityTariff = 0;  // UNIT: decimal (0-1)
    // const electricityForecastP90 = 1275000;  // UNIT: kWh
    // const opMaintenanceEpcExclVat = 30000000;  // UNIT: $
    // const landExpenseExclVat = 0;  // UNIT: $
    // const recsEnabled = false;  // Boolean

    // const projectCapacityKw = 5000;  // UNIT: kW DC
    // const percentageInvestedByOfftaker = 0.0;  // UNIT: decimal (0-1)
    // const assetOwnershipTransferred = true;  // UNIT: Boolean #add this to q/a doc.
    // const projectSites = 2;  // UNIT: Number of sites
    // const projectCountry = "Costa Rica";  // UNIT: String
    // const epcCostExclVat = 1000000;  // UNIT: $
    // const epcCostVat = 130000;  // UNIT: $
    // const currentElectricityTariff = 50;  // UNIT: $
    // const savingOnElectricityTariff = 0;  // UNIT: decimal (0-1)
    // const electricityForecastP90 = 1050000;  // UNIT: kWh
    // const opMaintenanceEpcExclVat = 1900000;  // UNIT: $
    // const landExpenseExclVat = 30000;  // UNIT: $
    // const recsEnabled = true;  // Boolean



    // const projectCapacityKw = 700;  // UNIT: kW DC
    // const percentageInvestedByOfftaker = 0;  // UNIT: decimal (0-1)
    // const assetOwnershipTransferred = false;  // UNIT: Boolean #add this to q/a doc.
    // const projectSites = 1;  // UNIT: Number of sites
    // const projectCountry = "Mexico";  // UNIT: String
    // const epcCostExclVat = 6536705;  // UNIT: $
    // const epcCostVat = 1045873;  // UNIT: $
    // const currentElectricityTariff = 3.5;  // UNIT: $
    // const savingOnElectricityTariff = 0.3;  // UNIT: decimal (0-1)
    // const electricityForecastP90 = 910000;  // UNIT: kWh
    // const opMaintenanceEpcExclVat = 30000000;  // UNIT: $
    // const landExpenseExclVat = 0;  // UNIT: $
    // const recsEnabled = true;  // Boolean



    const projectCapacityKw = 2302.00;  // UNIT: kW DC
    const percentageInvestedByOfftaker = 0 / 100;  // UNIT: Convert % to decimal (0%)
    const assetOwnershipTransferred = true;  // UNIT: Boolean
    const projectSites = 1;  // UNIT: Number of sites
    const projectCountry = "Ecuador";  // UNIT: String
    const epcCostExclVat = 1158000;  // UNIT: $
    const epcCostVat = 55631.0000;  // UNIT: $
    const currentElectricityTariff = 0.0760;  // UNIT: $/kWh
    const savingOnElectricityTariff = 0 / 100;  // UNIT: Convert % to decimal (0%)
    const electricityForecastP90 = 2765000.0000;  // UNIT: kWh
    const opMaintenanceEpcExclVat = 13800.0000;  // UNIT: $
    const surfaceAreaM2 = 10000;  // UNIT: m²
    const landRentExpense = 0;  // UNIT: $
    const landExpenseExclVat = landRentExpense / surfaceAreaM2;  // UNIT: $/m²
    const recsEnabled = false;  // UNIT: Boolean

    // Admin Fixed values
    const projectContingenciesPercentage = 3 / 100;  // UNIT: Convert % to decimal
    const capexDepreciationYears = 20;  // UNIT: years
    const annualPowerDegradation = 0.40 / 100;  // UNIT: Convert % to decimal
    const inverterReplacementYear = 12;  // UNIT: Year number
    const insuranceRisk = 0.5 / 100;  // UNIT: Convert % to decimal
    const assetManagementFee = 3 / 100;  // UNIT: Convert % to decimal
    const recRate = 1.5;  // UNIT: $
    const targetIrr = 12.00;  // UNIT: % (CHANGED from 12.25 to 12)


    // Calculated inputs
    const tierTable = buildTierTable();
    const policyTable = await devBuildCountryPolicyTable();
    console.log("Using static policy table for testing:", policyTable);

    const fxTable = buildFxTable(policyTable);


    const [projectManagementExcludingVat, fxRate] = totalCapexUsd(
        projectCapacityKw,
        projectCountry,
        tierTable,
        fxTable
    );

    console.log(`Project Management Excl. VAT: ${projectManagementExcludingVat}, FX Rate: ${fxRate}`);


    const projectReadinessExclVat = epcCostExclVat * 0.05;
    const projectEsExcludingVat = 0;
    const projectDueDiligenceExclVat = 0;
    const projectContingenciesExcludingVat = projectContingenciesPercentage * (
        epcCostExclVat
        + projectManagementExcludingVat
        + projectEsExcludingVat
        + projectDueDiligenceExclVat
    );

    const totalProjectCostExclVat = (
        epcCostExclVat
        + projectManagementExcludingVat
        + projectReadinessExclVat
        + projectContingenciesExcludingVat
        + projectEsExcludingVat
        + projectDueDiligenceExclVat
    );

    const policy = lookupCountryPolicy(projectCountry, policyTable);

    const projectManagementVat = projectManagementExcludingVat * policy["VAT"];
    const projectReadinessVat = projectReadinessExclVat * policy["VAT"];
    const projectContingenciesVat = projectContingenciesExcludingVat * policy["VAT"];
    const projectEsVat = projectEsExcludingVat * policy["VAT"];
    const projectDueDiligenceVat = projectDueDiligenceExclVat * policy["VAT"];

    const projectVat = (
        epcCostVat
        + projectManagementVat
        + projectReadinessVat
        + projectContingenciesVat
        + projectEsVat
        + projectDueDiligenceVat
    );

    const totalProjectCostInclVat = totalProjectCostExclVat + projectVat;

    const specificProjectCostInclVat = (
        (1 - percentageInvestedByOfftaker) * (epcCostExclVat + epcCostVat)
        + (projectVat - epcCostVat)
        + (totalProjectCostExclVat - epcCostExclVat)
    ) / projectCapacityKw;

    const totalCapexInclVat = specificProjectCostInclVat * projectCapacityKw;
    console.log(`Total Capex Incl. VAT: ${totalCapexInclVat} (per kW: ${specificProjectCostInclVat})`);

    const totalConstructionCostInclVat = (
        totalCapexInclVat - projectReadinessExclVat - projectReadinessVat
    );

    const projectElectricTariffExclVat = currentElectricityTariff * (
        1 - savingOnElectricityTariff
    );

    const specificPowerOutput = electricityForecastP90 / projectCapacityKw;
    const capacityFactor = (projectCapacityKw * specificPowerOutput) / (
        8760 * projectCapacityKw
    );
    const opMaintenanceMonitorExpenseExclVat = (12 * (1 - 0.2) * projectCapacityKw) * fxRate;


    const opMaintenanceMonitorExpense = opMaintenanceMonitorExpenseExclVat / (
        projectCapacityKw * 1000
    );

    const esReportingExclVat = 0;
    const inverterReplacementExclVat = 17 * projectCapacityKw * fxRate;
    const dismantlingCost = assetOwnershipTransferred ? 0 : 0.02 * epcCostExclVat;
    const recCost = recRate * fxRate;

    if (DEBUG) {
        console.log("Tier Table:", tierTable);
        console.log("Policy Table:", policyTable);
        console.log("FX Table:", fxTable);
        console.log("Policy:", policy);

        console.log(`Policy Corporate Tax: ${policy["Corporate Tax"] * 100} % `);
        console.log(`Policy Corporate Tax Exemption Years: ${policy["Corporate Tax Exemption Years"]} years\n`);

        // More debug logs...
    }

    // Find optimal PPA term
    let optimalResults = null;
    let optimalPpaTerm = 0;
    let optimalCashFlows = null;
    let optimalResultTable = null;
    let averageDrexPaymentMonthly;

    for (let ppaTerm = 1; ppaTerm <= 25; ppaTerm++) {
        const [irr, cashFlows, resultTable] = calculateUnleveredIrr(
            ppaTerm,
            inverterReplacementYear,
            annualPowerDegradation,
            projectCountry,
            specificPowerOutput,
            projectCapacityKw,
            projectElectricTariffExclVat,
            opMaintenanceMonitorExpense,
            insuranceRisk,
            totalConstructionCostInclVat,
            assetManagementFee,
            landRentExpense,
            recsEnabled,
            recCost,
            dismantlingCost,
            esReportingExclVat,
            policy,
            fxTable,
            projectVat,
            capexDepreciationYears,
            inverterReplacementExclVat,
            totalProjectCostExclVat,
            totalCapexInclVat
        );

        if (irr >= targetIrr) {
            optimalPpaTerm = ppaTerm;
            optimalCashFlows = cashFlows;
            optimalResultTable = resultTable;

            // Calculate outputs
            const averageAnnualOutput = resultTable["Annual Output (kWh AC)"].reduce((a, b) => a + b, 0) /
                resultTable["Annual Output (kWh AC)"].length;

            const equivalentMonthlyPayment = (averageAnnualOutput * projectElectricTariffExclVat) / 12;
            console.log(`Equivalent Monthly Payment: ${resultTable["EBITDA"].slice(1)}`);

            const netPresentValue = excelNpv(0.10, resultTable["EBITDA"].slice(1));
            const totalRevenue = resultTable["Total Revenue"].reduce((a, b) => a + b, 0);
            const totalGeneration = resultTable["Annual Output (kWh AC)"].reduce((a, b) => a + b, 0);

            // Build comparison data
            const comparisonData = {
                "Year": [],
                "Natural Increase in Existing Tariff": [],
                "Offtaker Savings (annually)": [],
                "DREX Savings (annually)": []
            };

            for (let year = 1; year <= ppaTerm; year++) {
                const natIncrInExistTariff = currentElectricityTariff * Math.pow(1.01, year - 1);
                const offtakerSavings = natIncrInExistTariff * resultTable["Annual Output (kWh AC)"][year];
                const drexSavings = natIncrInExistTariff * savingOnElectricityTariff *
                    resultTable["Annual Output (kWh AC)"][year];

                comparisonData["Year"].push(year);
                comparisonData["Natural Increase in Existing Tariff"].push(natIncrInExistTariff);
                comparisonData["Offtaker Savings (annually)"].push(offtakerSavings);
                comparisonData["DREX Savings (annually)"].push(drexSavings);
            }

            // Calculate financial metrics
            const offtakerSavingsTotal = comparisonData["Offtaker Savings (annually)"].reduce((a, b) => a + b, 0);
            const averageOfftakerSavings = offtakerSavingsTotal / ppaTerm -
                (opMaintenanceMonitorExpenseExclVat + insuranceRisk * totalCapexInclVat);

            const directInvestmentOfftaker = (
                epcCostExclVat
                + projectManagementExcludingVat
                + projectContingenciesExcludingVat
                + epcCostVat
                + projectManagementVat
                + projectContingenciesVat
            );

            const paybackYear = Math.ceil(directInvestmentOfftaker / averageOfftakerSavings);
            const investmentByOfftaker = percentageInvestedByOfftaker * (epcCostExclVat + epcCostVat);

            const drexSavingsTotal = comparisonData["DREX Savings (annually)"].reduce((a, b) => a + b, 0);
            const averageDrexSavings = drexSavingsTotal / ppaTerm;

            const totalRevenueInLocalCurrency = totalRevenue * fxRate;
            const averageDrexPaymentAnnual = totalRevenueInLocalCurrency / ppaTerm;
            averageDrexPaymentMonthly = averageDrexPaymentAnnual / 12;

            // ===== COMPUTE EXIT VALUES HERE =====
            const projectCf = resultTable["Project Cashflow"];
            const exitRecords = computeExitValuesAndIrrs(
                projectCf,
                0.10,  // discount rate
                [5, 10, 15]  // possible exit years
            );
            // Store results for return
            optimalResults = {
                ppaTerm,
                irr,
                averageAnnualOutput,
                equivalentMonthlyPayment,
                netPresentValue,
                totalRevenue,
                totalGeneration,
                paybackYear,
                investmentByOfftaker,
                averageDrexSavings,
                averageDrexPaymentAnnual,
                averageDrexPaymentMonthly,
                comparisonData,
                resultTable,
                savingOnElectricityTariff,
                projectElectricTariffExclVat,
                currentElectricityTariff,
                averageOfftakerSavings,
                directInvestmentOfftaker,
                exitRecords
            };

            // We found an optimal term, no need to continue loop
            break;
        }
    }

    // Format and display results if an optimal term was found
    if (optimalResults) {
        console.log(`Unlevered Post - Tax IRR(%): ${optimalResults.irr.toFixed(2)}`);
        console.log(`\nOptimal Contract Term Simulation`);
        console.log("========================================================");
        console.log(`Contract Term(Optimal Loan Term): ${optimalResults.ppaTerm} years`);
        console.log(`Discount on Existing Energy Tariff: ${optimalResults.savingOnElectricityTariff * 100} % `);
        console.log(`Investment by Offtaker: ${optimalResults.investmentByOfftaker.toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD'
        })
            }`);
        console.log(`Clean Energy Tariff: $${optimalResults.projectElectricTariffExclVat.toFixed(4)} / kWh`);
        console.log(`Average Annual Output: ${optimalResults.averageAnnualOutput.toFixed(2)}`);
        console.log(`Equivalent Monthly Payment: ${averageDrexPaymentMonthly.toFixed(2)}`);
        console.log(`Net Present Value: $${optimalResults.netPresentValue.toFixed(2)}`);
        console.log(`Total Revenue: $${optimalResults.totalRevenue.toLocaleString('en-US')}`);
        console.log(`Total Generation: ${optimalResults.totalGeneration.toLocaleString('en-US')} kWh`);
        console.log(`Payback Year: ${optimalResults.paybackYear}\n`);

        // Create viability comparison table
        const viabilityData = {
            "Current Utility": {
                "Plazo": optimalResults.paybackYear,
                "Inversion": formatCurrency(optimalResults.directInvestmentOfftaker),
                "Tarifa actual": formatCurrency(optimalResults.currentElectricityTariff, 4),
                "Ahorro tarifa": "100%",
                "Tarifa solar": "$0.0000",
                "Ahorro promedio": formatCurrency(optimalResults.averageOfftakerSavings),
                "Pago promedio": "$0.00",
                "Pago a": "Empresa Electrica"
            },
            "Solar Project": {
                "Plazo": optimalResults.ppaTerm,
                "Inversion": formatCurrency(optimalResults.investmentByOfftaker), //change request by trevor (30/07/2025)
                "Tarifa actual": formatCurrency(optimalResults.currentElectricityTariff, 4),
                "Ahorro tarifa": `${(optimalResults.savingOnElectricityTariff * 100).toFixed(1)}% `,
                "Tarifa solar": formatCurrency(optimalResults.projectElectricTariffExclVat, 4),
                "Ahorro promedio": formatCurrency(optimalResults.averageDrexSavings),
                "Pago promedio": formatCurrency(optimalResults.averageDrexPaymentAnnual),
                "Pago a": "SPV DREX"
            }
        };

        console.log("Viability Table");
        console.log("========================================================");
        console.table(viabilityData);
        console.log("\nExit Scenarios (Unlevered, 10% discount on remaining cashflows)");
        console.log("================================================================");

        if (optimalResults.exitRecords.length === 0) {
            console.log("No valid exit years within project tenor.");
        } else {
            console.log("Exit Year | Exit Value ($) | IRR with Exit (%)");
            console.log("-".repeat(50));
            for (const record of optimalResults.exitRecords) {
                console.log(
                    `${record["Exit Year"].toString().padEnd(9)} | ` +
                    `${formatCurrency(record["Exit Value at Year T"]).padEnd(14)} | ` +
                    `${record["IRR with Exit (%)"].toFixed(2)}%`
                );
            }
        }


    } else {
        console.log("No PPA term found that meets the target IRR criteria.");
    }

    return optimalResults;
}

// Helper function to format currency values
function formatCurrency(value, decimals = 2) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(value);
}


async function main() {
    await runCalculation()
}

main()