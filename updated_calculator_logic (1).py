from __future__ import annotations

import os
import json
import pandas as pd
import numpy as np
import numpy_financial as npf

import bisect
import requests

from datetime import date
from tabulate import tabulate
from typing import Tuple

DEBUG = True

API_KEY = "b3471f654f8b4a0797fb6278010135c3"

CURRENCY_BY_COUNTRY = {
    "Colombia": "COP",
    "Peru": "PEN",
    "Chile": "CLP",
    "Mexico": "MXN",
    "Panama": "USD",
    "Costa Rica": "CRC",
    "Honduras": "HNL",
    "Guatemala": "GTQ",
    "Ecuador": "USD",
}

# Admin config - admin will be able to change these values periodically via admin panel
POLICY_CONFIG: dict[str, dict] = {
    "Colombia": {
        "Currency Unit": "COP",
        "Devaluation Factor": 5.00,  # will be used as 5.00 / 100 = 0.05
        "Electric Tariff Escalator": 7.00,  # will be used as 2.00 / 100 = 0.02
        "O&M Escalator": 2.00,  # 2.00 / 100 = 0.02
        "Land Rent Escalator": 2.00,  # 2.00 / 100 = 0.02
        "VAT": 19.00,  # will be used as 19.00 / 100 = 0.19
        "Corporate Tax": 35.00,  # already in %, leave as-is
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
}


def fetch_latest_fx_cached() -> dict[str, float]:
    today = date.today().isoformat()
    cache_file = f"fx_cache_{today}.json"

    if os.path.exists(cache_file):
        with open(cache_file, "r") as f:
            data = json.load(f)
    else:
        symbols = ",".join(CURRENCY_BY_COUNTRY.values())
        url = "https://openexchangerates.org/api/latest.json"
        params = {"app_id": API_KEY, "symbols": symbols}
        resp = requests.get(url, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        with open(cache_file, "w") as f:
            json.dump(data, f)

    rates = data["rates"]
    fx_map: dict[str, float] = {}
    for country, curr in CURRENCY_BY_COUNTRY.items():
        rate = rates.get(curr)
        if rate is None:
            raise KeyError(f"Missing rate for {curr}")
        fx_map[country] = rate

    return fx_map


def build_country_policy_table() -> pd.DataFrame:
    fx_map = fetch_latest_fx_cached()

    df = pd.DataFrame.from_dict(POLICY_CONFIG, orient="index")
    df.insert(0, "FXrate", [fx_map[c] for c in df.index])

    return df


def dev_build_country_policy_table() -> pd.DataFrame:
    # STATIC VALUES FOR TESTING PURPOSES ONLY (NOT LIVE RATES)
    data = {
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
            5.00,  # Colombia
            3.00,  # Peru
            3.00,  # Chile
            4.00,  # Mexico
            0.00,  # Panama
            4.00,  # Costa Rica
            5.00,  # Honduras
            4.00,  # Guatemala
            0.00,  # Ecuador
        ],
        "Electric Tariff Escalator": [
            7.00,  # Colombia
            5.00,  # Peru
            5.00,  # Chile
            6.00,  # Mexico
            2.00,  # Panama
            6.00,  # Costa Rica
            7.00,  # Honduras
            6.00,  # Guatemala
            2.00,  # Ecuador
        ],
        "O&M Escalator": [2.00] * 9,
        "Land Rent Escalator": [2.00] * 9,
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
    }

    return pd.DataFrame(data).set_index("Country")


def lookup_country_policy(country: str, policy_table: pd.DataFrame) -> dict[str, float]:
    try:
        row = policy_table.loc[country]
    except KeyError as exc:
        raise KeyError(f"Country '{country}' not found in policy table.") from exc

    return {
        "FXrate": float(row["FXrate"]),
        "Currency Unit": str(row["Currency Unit"]),
        "Devaluation Factor": float(row["Devaluation Factor"]) / 100,
        "Electric Tariff Escalator": float(row["Electric Tariff Escalator"]) / 100,
        "O&M Escalator": float(row["O&M Escalator"]) / 100,
        "Land Rent Escalator": float(row["Land Rent Escalator"]) / 100,
        "VAT": float(row["VAT"]) / 100,
        "Corporate Tax": float(row["Corporate Tax"]) / 100,
        "Corporate Tax Exemption Years": int(row["Corporate Tax Exemption Years"]),
    }


def build_tier_table() -> pd.DataFrame:
    return pd.DataFrame(
        {
            "SizeAbove": [0, 500, 1_000, 2_000, 5_000, 10_000],
            "CostPerkWp": [40, 35, 30, 25, 20, 15],
            "FromPreviousTranche": [0, 20_000, 37_500, 67_500, 142_500, 242_500],
        }
    )


def build_fx_table(policy_table: pd.DataFrame) -> pd.DataFrame:
    years = range(1, 26)
    data = {
        year: policy_table["FXrate"]
        * (1 + policy_table["Devaluation Factor"] / 100) ** (year - 1)
        for year in years
    }
    fx_df = pd.DataFrame(data)
    fx_df.index.name = "Country"
    return fx_df


def lookup_fx(country: str, fx_table: pd.DataFrame, year: int = 1) -> float:
    try:
        return float(fx_table.at[country, year])
    except KeyError as exc:
        raise KeyError(f"Country '{country}' not found in FX table.") from exc


def capex_piecewise(
    size_kwp: float,
    fx_rate: float,
    tier_table: pd.DataFrame,
) -> float:

    idx = bisect.bisect_right(tier_table["SizeAbove"], size_kwp) - 1
    if idx < 0:
        raise ValueError("Plant size is below the minimum tier breakpoint.")

    row = tier_table.iloc[idx]
    cumulative_before = row["FromPreviousTranche"]
    prior_break = row["SizeAbove"]
    marginal_cost = row["CostPerkWp"]

    subtotal_local = cumulative_before + (size_kwp - prior_break) * marginal_cost
    return subtotal_local * fx_rate, fx_rate


def total_capex_usd(
    size_kwp: float,
    country: str,
    *,
    tier_table: pd.DataFrame,
    fx_table: pd.DataFrame,
) -> float:
    rate = lookup_fx(country, fx_table)
    return capex_piecewise(size_kwp, rate, tier_table)


def calculate_unlevered_irr(
    ppa_term,
    inverter_replacement_year,
    annual_power_degradation,
    country,
    specific_power_output,
    project_capacity_kw,
    project_electric_tariff_excl_vat,
    op_maintenance_monitor_expense,
    insurance_risk,
    total_construction_cost_incl_vat,
    asset_management_fee,
    land_rent_expense,
    recs_enabled,
    rec_cost,
    dismantling_cost,
    es_reporting_excl_vat,
    policy,
    fx_table,
    project_vat,
    capex_depreciation_years,
    inverter_replacement_excl_vat,
) -> Tuple[float, pd.DataFrame]:
    rows = {
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
        # --- VAT schedule rows ---
        "VAT paid on CAPEX": [],
        "Net op. VAT for Recovery": [],
        "Opening VAT Balance": [],
        "CAPEX VAT Additions": [],
        "CAPEX VAT Recovery": [],
        "Closing VAT Balance": [],
        # --- Ungeared corporate income tax ---
        "CAPEX Depreciation": [],
        "Project Taxable Income": [],
        "Project Tax": [],
        # --- Unlevered IRR post tax ---
        "EBITDA": [],
        "Tax Paid (ungeared)": [],
        "Inverter Replacement": [],
        "Project Cashflow": [],
    }
    cash_flows = []
    corporate_tax_exemption_year = policy["Corporate Tax Exemption Years"]

    # ------------------- initialise VAT year-0 --------------------------------------
    fx_rate_y0 = fx_table.at[country, 1]
    vat_paid_on_capex_y0 = project_vat / fx_rate_y0
    net_op_vat_recovery_y0 = 0.0
    opening_balance_y0 = 0.0
    capex_vat_add_y0 = vat_paid_on_capex_y0
    capex_vat_rec_y0 = -min(
        opening_balance_y0 + capex_vat_add_y0, net_op_vat_recovery_y0
    )
    closing_balance_y0 = opening_balance_y0 + capex_vat_add_y0 + capex_vat_rec_y0

    ebitda_y0 = total_capex_incl_vat / fx_rate_y0

    # store year-0 (no operations yet)
    for label in rows:
        rows[label].append(0.0)
    rows["VAT paid on CAPEX"][0] = vat_paid_on_capex_y0
    rows["Net op. VAT for Recovery"][0] = net_op_vat_recovery_y0
    rows["Opening VAT Balance"][0] = opening_balance_y0
    rows["CAPEX VAT Additions"][0] = capex_vat_add_y0
    rows["CAPEX VAT Recovery"][0] = capex_vat_rec_y0
    rows["Closing VAT Balance"][0] = closing_balance_y0
    rows["EBITDA"][0] = ebitda_y0
    rows["Project Cashflow"][0] = -ebitda_y0

    # ------------------- operational years 1 … ppa_term -----------------------------
    for year in range(1, ppa_term + 1):
        # ---- flags & indices ----
        rows["Energy Project Tenor Flag"].append(1)
        rows["Inverter Replacement Flag"].append(
            1 if year == inverter_replacement_year else 0
        )
        rows["Dismantling Flag"].append(1 if year == ppa_term else 0)
        rows["Corporate Tax Exemption Flag"].append(
            0 if year <= corporate_tax_exemption_year else 1
        )
        rows["Inflation Year Counter"].append(year - 1)

        power_degradation_index = (1 - annual_power_degradation) ** year
        ppa_index = (1 + policy["Electric Tariff Escalator"]) ** (year - 1)
        o_and_m_idx = (1 + policy["O&M Escalator"]) ** (year - 1)
        land_idx = (1 + policy["Land Rent Escalator"]) ** (year - 1)
        fx_rate = fx_table.at[country, year]
        fx_rate_y1 = fx_table.at[country, 1]

        rows["Power Degradation Index"].append(power_degradation_index)
        rows["PPA Inflation Index"].append(ppa_index)
        rows["O&M Inflation Index"].append(o_and_m_idx)
        rows["Land Inflation Index"].append(land_idx)
        rows["FX Rate"].append(fx_rate)

        # ---- output & revenue ----
        annual_output = (
            specific_power_output * project_capacity_kw * power_degradation_index
        )
        energy_price = project_electric_tariff_excl_vat * ppa_index / fx_rate
        revenue = energy_price * annual_output

        # ---- expenses ----
        o_and_m_exp = (
            -o_and_m_idx
            * op_maintenance_monitor_expense
            * project_capacity_kw
            * 1000
            / fx_rate
        )
        ins_exp = (
            -insurance_risk * total_construction_cost_incl_vat * o_and_m_idx / fx_rate
        )
        mgmt_exp = -asset_management_fee * revenue * o_and_m_idx
        land_exp = -(land_idx * land_rent_expense) / fx_rate
        recs_exp = (
            -(annual_output / 1000) * rec_cost * (0.3 if recs_enabled else 0) / fx_rate
        )
        dismant_exp = -dismantling_cost / fx_rate if year == ppa_term else 0
        es_exp = -(es_reporting_excl_vat * o_and_m_idx if year <= 2 else 0) / fx_rate

        total_opex = sum(
            [o_and_m_exp, ins_exp, mgmt_exp, land_exp, recs_exp, dismant_exp, es_exp]
        )
        ebitda = revenue + total_opex

        # ---- VAT schedule ----
        vat_paid_on_capex = 0.0
        net_op_vat = ebitda * policy["VAT"]
        opening_balance = rows["Closing VAT Balance"][year - 1]
        capex_vat_add = vat_paid_on_capex
        capex_vat_rec = -min(opening_balance + capex_vat_add, net_op_vat)
        closing_balance = opening_balance + capex_vat_add + capex_vat_rec

        # --- Ungeared corporate income tax for project IRR ---
        if year <= capex_depreciation_years:
            base_cost = total_project_cost_excl_vat
            if year >= inverter_replacement_year:
                base_cost += inverter_replacement_excl_vat

            capex_depreciation = -(base_cost / capex_depreciation_years) / fx_rate
        else:
            capex_depreciation = 0.0

        project_taxable_income = ebitda + capex_depreciation
        project_tax = -(
            project_taxable_income
            * policy["Corporate Tax"]
            * rows["Corporate Tax Exemption Flag"][year]
        )

        # --- Unlevered IRR Post Tax ---
        tax_paid_ungeared = project_tax - capex_vat_rec
        inverter_replacement = -(
            rows["Inverter Replacement Flag"][year]
            * inverter_replacement_excl_vat
            / fx_rate_y1
        )
        project_cashflow = ebitda + tax_paid_ungeared + inverter_replacement

        # ---- save rows ----
        rows["Annual Output (kWh AC)"].append(annual_output)
        rows["Energy Price ($/kWh, escalated)"].append(energy_price)
        rows["Total Revenue"].append(revenue)
        rows["O&M Expense"].append(o_and_m_exp)
        rows["Insurance Expense"].append(ins_exp)
        rows["Management Expense"].append(mgmt_exp)
        rows["Land Expense"].append(land_exp)
        rows["Renewable Energy Credits"].append(recs_exp)
        rows["Dismantling Expense"].append(dismant_exp)
        rows["ES Expense"].append(es_exp)
        rows["Total OPEX"].append(total_opex)
        rows["EBITDA"].append(ebitda)

        rows["VAT paid on CAPEX"].append(vat_paid_on_capex)
        rows["Net op. VAT for Recovery"].append(net_op_vat)
        rows["Opening VAT Balance"].append(opening_balance)
        rows["CAPEX VAT Additions"].append(capex_vat_add)
        rows["CAPEX VAT Recovery"].append(capex_vat_rec)
        rows["Closing VAT Balance"].append(closing_balance)

        rows["CAPEX Depreciation"].append(capex_depreciation)
        rows["Project Taxable Income"].append(project_taxable_income)
        rows["Project Tax"].append(project_tax)

        rows["Tax Paid (ungeared)"].append(tax_paid_ungeared)
        rows["Inverter Replacement"].append(inverter_replacement)
        rows["Project Cashflow"].append(project_cashflow)

        opening_balance = closing_balance

    # ------------------- investment outflow & IRR -----------------------------------
    irr = npf.irr(rows["Project Cashflow"]) * 100
    df = pd.DataFrame.from_dict(rows, orient="index")
    df = df.reindex(columns=range(0, ppa_term + 1))
    df.index.name = "Metric"

    return irr, cash_flows, df


def excel_npv(rate, values) -> float:
    return (values / (1 + rate) ** np.arange(1, len(values) + 1)).sum()


def pretty_print_debug(df: pd.DataFrame, title: str = "DEBUG TABLE") -> None:
    neat = (
        df.copy()
        .applymap(lambda x: f"{x:,.2f}" if isinstance(x, (int, float)) else x)
        .reset_index()
    )
    print("\n" + "=" * len(title))
    print(title)
    print("=" * len(title))
    print(
        tabulate(neat.values.tolist(), headers=neat.columns.tolist(), tablefmt="github")
    )


def generate_debt_schedule(
    total_project_cost,
    debt_facility_size,
    tenor_of_loan,
    annual_interest_rate,
    min_dscr,
    cash_flows,
) -> Tuple[pd.DataFrame, dict]:

    loan_balance_start = debt_facility_size
    debt_service = [cf / min_dscr for cf in cash_flows[1 : tenor_of_loan + 1]]
    table_data = {
        "Year": list(range(1, len(cash_flows))),
        "Loan Balance (Beginning of Year)": [],
        "Principal Amortization": [],
        "Loan Balance (End of Year)": [],
        "Interest Expense": [],
        "Principal": [],
        "Debt Service": [],
        "DSCR": [],
        "Leveraged Cashflow": [],
    }
    leveraged_cashflow = []

    for year, debt_payment, cash_flow in zip(
        range(1, tenor_of_loan + 1), debt_service, cash_flows[1 : tenor_of_loan + 1]
    ):
        interest_expense = loan_balance_start * annual_interest_rate
        principal = debt_payment - interest_expense
        principal_amortization = -principal
        loan_balance_end = loan_balance_start + principal_amortization
        levered_cf = cash_flow - debt_payment

        table_data["Loan Balance (Beginning of Year)"].append(loan_balance_start)
        table_data["Principal Amortization"].append(principal_amortization)
        table_data["Loan Balance (End of Year)"].append(loan_balance_end)

        table_data["Interest Expense"].append(interest_expense)
        table_data["Principal"].append(principal)
        table_data["Debt Service"].append(debt_payment)
        table_data["DSCR"].append(f"{min_dscr:.2f}x")
        table_data["Leveraged Cashflow"].append(levered_cf)

        # Update
        loan_balance_start = loan_balance_end
        leveraged_cashflow.append(levered_cf)

    # Append zeros for remaining years after the loan term
    for year in range(tenor_of_loan + 1, len(cash_flows)):
        table_data["Loan Balance (Beginning of Year)"].append(0)
        table_data["Principal Amortization"].append(0)
        table_data["Loan Balance (End of Year)"].append(0)

        table_data["Interest Expense"].append(0)
        table_data["Principal"].append(0)
        table_data["Debt Service"].append(0)
        table_data["DSCR"].append("-")
        table_data["Leveraged Cashflow"].append(cash_flows[year])

    df = pd.DataFrame(table_data)
    leverage = debt_facility_size / total_project_cost
    levered_irr = npf.irr(
        [-(total_project_cost - debt_facility_size)] + table_data["Leveraged Cashflow"]
    )

    results = {
        "Debt Facility Size": debt_facility_size,
        "Leverage": leverage,
        "Levered Pre-Tax IRR": levered_irr,
    }
    df_transposed = df.set_index("Year").T

    return df_transposed, results


def compute_exit_values_and_irrs(
    project_cashflows: list[float] | np.ndarray,
    discount_rate: float = 0.10,
    exit_years: list[int] | tuple[int, ...] = (5, 10, 15),
) -> pd.DataFrame:

    cf = np.array(project_cashflows, dtype=float)
    n_years = len(cf) - 1

    valid_exit_years = [T for T in exit_years if 0 < T <= n_years]

    records = []
    for T in valid_exit_years:
        remaining = cf[T + 1 :]
        if remaining.size == 0:
            continue

        # Discount remaining CFs back to year T at discount_rate
        exponents = np.arange(1, remaining.size + 1)
        exit_value = np.sum(remaining / (1.0 + discount_rate) ** exponents)

        # truncated CF series with exit at year T
        cf_exit = cf.copy()
        cf_exit[T] += exit_value
        cf_exit[T + 1 :] = 0.0

        irr_exit = npf.irr(cf_exit) * 100.0  # in %

        records.append(
            {
                "Exit Year": T,
                "Exit Value at Year T": exit_value,
                "IRR with Exit (%)": irr_exit,
            }
        )

    if not records:
        return pd.DataFrame(columns=["Exit Value at Year T", "IRR with Exit (%)"])

    df = pd.DataFrame(records).set_index("Exit Year")
    return df


if __name__ == "__main__":
    # Contractor Inputs
    project_capacity_kw = 1000  # UNIT: kW DC                   # (PREVIOUSLY MAPPED TO proposal_project_peak_capacity)
    percentage_invested_by_offtaker = (
        12 / 100
    )  # UNIT: Convert % to decimal    # (PREVIOUSLY MAPPED TO percentage_offtaker_invested)
    asset_ownership_trasnferred = True  # UNIT: Boolean                 # (NEW INPUT)
    project_sites = 10  # UNIT: Number of sites         # (NEW INPUT)
    project_country = "Colombia"  # UNIT: String                  # (NEW INPUT)
    epc_cost_excl_vat = 2080000000  # UNIT: $                       # (NEW INPUT)
    epc_cost_vat = 336000  # UNIT: $                       # (NEW INPUT)
    current_electricity_tariff = 360  # UNIT: $                       # (PREVIOUSLY MAPPED TO to electricity_tariff)
    saving_on_electricity_tariff = (
        0 / 100
    )  # Convert % to decimal          # (PREVIOUSLY MAPPED TO cost_savings)
    electricity_forecast_p90 = 1275000  # UNIT: kWh                     # (PREVIOUSLY MAPPED TO annual_generation)
    op_maintenance_epc_excl_vat = (
        5000  # UNIT: $                       # (PREVIOUSLY MAPPED TO maintenance_cost)
    )
    surface_area_m2 = 10000  # UNIT: m2                      # (NEW INPUT)
    land_rent_expense = 22330000  # UNIT: $                       # (NEW INPUT)
    land_expense_excl_vat = (
        land_rent_expense / surface_area_m2
    )  # UNIT: $/m2                    # (NEW INPUT)
    recs_enabled = True  # (PREVIOUSLY MAPPED TO recs_enabled)

    # Admin Fixed values (Admin should be able to enter these values somewhere that will change calculations in simulations)
    project_contingenices_percentage = (
        3 / 100
    )  # UNIT: Convert % to decimal    # (NEW VALUE)
    capex_depreciation_years = 20  # UNIT: years                   # (NEW VALUE)
    annual_power_degradation = 0.40 / 100  # UNIT: Convert % to decimal    # (NEW VALUE)
    inverter_replacement_year = 12  # (NEW VALUE)
    insurance_risk = (
        0.5 / 100
    )  # UNIT: Convert % to decimal    # EQUIVALENT OF insurance_risk_percentage in DB
    asset_management_fee = (
        3 / 100
    )  # UNIT: Convert % to decimal    # EQUIVALENT OF management_fee_percentage in DB
    rec_rate = 1.5  # UNIT: $                       # EQUIVALENT OF recs_sale_cost in DB
    target_irr = 12.25

    # Calculated inputs
    tier_table = build_tier_table()
    policy_table = (
        dev_build_country_policy_table() if DEBUG else build_country_policy_table()
    )
    fx_table = build_fx_table(policy_table)

    project_management_excluding_vat, fx_rate = total_capex_usd(
        project_capacity_kw,
        project_country,
        tier_table=tier_table,
        fx_table=fx_table,
    )
    project_readiness_excl_vat = epc_cost_excl_vat * 0.05
    project_es_excluding_vat = epc_cost_excl_vat * 0.01
    project_due_diligence_excl_vat = fx_table.at[project_country, 1] * 10000
    project_contingenices_excluding_vat = project_contingenices_percentage * (
        epc_cost_excl_vat
        + project_management_excluding_vat
        + project_es_excluding_vat
        + project_due_diligence_excl_vat
    )
    total_project_cost_excl_vat = (
        epc_cost_excl_vat
        + project_management_excluding_vat
        + project_readiness_excl_vat
        + project_contingenices_excluding_vat
        + project_es_excluding_vat
        + project_due_diligence_excl_vat
    )

    policy = lookup_country_policy(project_country, policy_table)

    project_management_vat = project_management_excluding_vat * policy["VAT"]
    project_readiness_vat = project_readiness_excl_vat * policy["VAT"]
    project_contingencies_vat = project_contingenices_excluding_vat * policy["VAT"]
    project_es_vat = project_es_excluding_vat * policy["VAT"]
    project_due_diligence_vat = project_due_diligence_excl_vat * policy["VAT"]
    project_vat = (
        epc_cost_vat
        + project_management_vat
        + project_readiness_vat
        + project_contingencies_vat
        + project_es_vat
        + project_due_diligence_vat
    )
    total_project_cost_incl_vat = total_project_cost_excl_vat + project_vat

    specific_project_cost_incl_vat = (
        (1 - percentage_invested_by_offtaker) * (epc_cost_excl_vat + epc_cost_vat)
        + (project_vat - epc_cost_vat)
        + (total_project_cost_excl_vat - epc_cost_excl_vat)
    ) / project_capacity_kw
    total_capex_incl_vat = specific_project_cost_incl_vat * project_capacity_kw
    total_construction_cost_incl_vat = (
        total_capex_incl_vat - project_readiness_excl_vat - project_readiness_vat
    )

    project_electric_tariff_excl_vat = current_electricity_tariff * (
        1 - saving_on_electricity_tariff
    )
    specific_power_output = electricity_forecast_p90 / project_capacity_kw
    capacity_factor = (project_capacity_kw * specific_power_output) / (
        8760 * project_capacity_kw
    )

    op_maintenance_monitor_expense_excl_vat = (
        12 * (1 - 0.2) * project_capacity_kw
        + (240 + (400 * project_capacity_kw / 1000))
    ) * fx_rate
    op_maintenance_monitor_expense = op_maintenance_monitor_expense_excl_vat / (
        project_capacity_kw * 1000
    )
    es_reporting_excl_vat = 0.005 * epc_cost_excl_vat
    inverter_replacement_excl_vat = 17 * project_capacity_kw * fx_rate
    dismantling_cost = 0 if asset_ownership_trasnferred else 0.02 * epc_cost_excl_vat
    rec_cost = rec_rate * fx_rate

    if DEBUG:
        print(tier_table)
        print(policy_table)
        print(fx_table)
        print(policy)

        print(f'Policy Corporate Tax: {policy["Corporate Tax"]}%')
        print(
            f'Policy Corporate Tax Exemption Years: {policy["Corporate Tax Exemption Years"]} years\n'
        )

        print(f"EPC Cost (excl. VAT): {epc_cost_excl_vat}")
        print(
            f"Project Management (excl. VAT): ${project_management_excluding_vat:,.2f}"
        )
        print(f"Project Readiness (excl. VAT): ${project_readiness_excl_vat:,.2f}")
        print(f"Project Contingenices: ${project_contingenices_excluding_vat:,.2f}")
        print(f"Project ES (excl. VAT): ${project_es_excluding_vat:,.2f}")
        print(
            f"Project Due Diligence (excl. VAT): ${project_due_diligence_excl_vat:,.2f}\n"
        )
        print(f"Project VAT: ${project_vat:,.2f}")
        print(f"Total Project Cost (excl. VAT): {total_project_cost_excl_vat}")
        print(f"Total Project Cost (incl. VAT): {total_project_cost_incl_vat}")
        print(f"Specific Project Cost (incl. VAT): {specific_project_cost_incl_vat}")
        print(f"Total CAPEX (incl. VAT): {total_capex_incl_vat}")
        print(
            f"Total Construction Cost (incl. VAT): {total_construction_cost_incl_vat}\n"
        )

        print(f"EPC Cost VAT: ${epc_cost_vat}")
        print(f"Project Management VAT: ${project_management_vat:,.2f}")
        print(f"Project Readiness VAT: ${project_readiness_vat:,.2f}")
        print(f"Project Contingenices VAT: ${project_contingencies_vat:,.2f}")
        print(f"Project ES VAT: ${project_es_vat:,.2f}")
        print(f"Project Due Diligence VAT: ${project_due_diligence_vat:,.2f}")
        print(f"Project Percentage Contingencies: {project_contingenices_percentage}%")
        print(f'Policy Percentage VAT: {policy["VAT"]}%')
        print(f'Corporate Percentage Tax: {policy["Corporate Tax"]}%')
        print(f"CAPEX Depreciation Years: {capex_depreciation_years} years")
        print(
            f'Corporate Tax Exemption Years: {policy["Corporate Tax Exemption Years"]} years\n'
        )

        print(f"Current Electric tariff (excl. VAT): ${current_electricity_tariff}")
        print(f"Saving on Electric Tariff: {saving_on_electricity_tariff}%")
        print(
            f"Project Electric tariff (excl. VAT): ${project_electric_tariff_excl_vat}"
        )
        print(f'Electric Tariff Escalator: {policy["Electric Tariff Escalator"]}%')
        print(f"Electricity Forecast P90: {electricity_forecast_p90} kWh")
        print(f"Specific Power Output: {specific_power_output} kWh/kW DC")
        print(f"Annual power degradation: {annual_power_degradation}%")
        print(f"Capacity Factor: {capacity_factor*100}%\n")

        print(f"O&M EPC (excl. VAT): ${op_maintenance_epc_excl_vat}")
        print(
            f"O&M & Monitoring Expense (excl. VAT): ${op_maintenance_monitor_expense_excl_vat}"
        )
        print(f"O&M & Monitoring Expense: ${op_maintenance_monitor_expense}")
        print(f'O&M Escalator: {policy["O&M Escalator"]*100}%')
        print(f"ES Reporting (excl. VAT): ${es_reporting_excl_vat}")
        print(f'Land Rent Escalator: {policy["Land Rent Escalator"]*100}%')
        print(f"Inverter Replacement (excl. VAT): {inverter_replacement_excl_vat}")
        print(f"Inverter Replacement year: {inverter_replacement_year}")

        print(f"Insurance All Risk: {insurance_risk}% annual")
        print(f"Asset Managmenet fee: {asset_management_fee}% annual")
        print(f"Dismantling Expense: {dismantling_cost}% annual")
        print(f"RECs Cost: ${rec_rate}/REC\n")

    for ppa_term in range(1, 26):
        irr, cash_flows, result_table = calculate_unlevered_irr(
            ppa_term,
            inverter_replacement_year,
            annual_power_degradation,
            project_country,
            specific_power_output,
            project_capacity_kw,
            project_electric_tariff_excl_vat,
            op_maintenance_monitor_expense,
            insurance_risk,
            total_construction_cost_incl_vat,
            asset_management_fee,
            land_rent_expense,
            recs_enabled,
            rec_cost,
            dismantling_cost,
            es_reporting_excl_vat,
            policy,
            fx_table,
            project_vat,
            capex_depreciation_years,
            inverter_replacement_excl_vat,
        )

        if irr >= target_irr:
            # WE ONLY CARE ABOUT THESE OUTPUTS FOR THE CALCULATOR (STEP 1)
            average_annual_output = sum(
                result_table.loc["Annual Output (kWh AC)"]
            ) / len(result_table.loc["Annual Output (kWh AC)"])
            print(result_table.loc["EBITDA", 1:])
            net_present_value = excel_npv(0.10, result_table.loc["EBITDA", 1:])
            total_revenue = result_table.loc["Total Revenue"].sum()
            total_generation = result_table.loc["Annual Output (kWh AC)"].sum()

            comparison_data = {
                "Year": [],
                "Natural Increase in Existing Tariff": [],
                "Offtaker Savings (annually)": [],
                "DREX Savings (annually)": [],
            }

            for year in range(1, int(ppa_term) + 1):
                nat_incr_in_exist_tariff = current_electricity_tariff * (1.01) ** (
                    year - 1
                )
                offtaker_savings = (
                    nat_incr_in_exist_tariff
                    * result_table.loc["Annual Output (kWh AC)", year]
                )
                drex_savings = (
                    nat_incr_in_exist_tariff
                    * saving_on_electricity_tariff
                    * result_table.loc["Annual Output (kWh AC)", year]
                )

                comparison_data["Year"].append(year)
                comparison_data["Natural Increase in Existing Tariff"].append(
                    nat_incr_in_exist_tariff
                )
                comparison_data["Offtaker Savings (annually)"].append(offtaker_savings)
                comparison_data["DREX Savings (annually)"].append(drex_savings)

            comparison_df = pd.DataFrame(comparison_data).set_index("Year").T
            average_offtaker_savings = (
                sum(comparison_df.loc["Offtaker Savings (annually)"]) / ppa_term
            ) - (
                op_maintenance_monitor_expense_excl_vat
                + insurance_risk * total_capex_incl_vat
            )
            direct_investment_offtaker = (
                epc_cost_excl_vat
                + project_management_excluding_vat
                + project_contingenices_excluding_vat
                + epc_cost_vat
                + project_management_vat
                + project_contingencies_vat
            )
            payback_year = np.ceil(
                direct_investment_offtaker / average_offtaker_savings
            )

            investment_by_offtaker = percentage_invested_by_offtaker * (
                epc_cost_excl_vat + epc_cost_vat
            )
            average_drex_savings = (
                sum(comparison_df.loc["DREX Savings (annually)"]) / ppa_term
            )
            average_drex_payment_annual = (
                sum(result_table.loc["Total Revenue"]) * fx_rate / ppa_term
            )
            average_drex_payment_monthly = average_drex_payment_annual / 12

            if DEBUG:
                print("Comparison Table")
                print("========================================================")
                print(comparison_df)
                print(f"Investment Amount by Offtaker: {investment_by_offtaker}")
                print(f"Average DREX savings: {average_drex_savings}")
                print(f"Average DREX payment (annually): {average_drex_payment_annual}")
                print(f"Average DREX payment (monthly): {average_drex_payment_monthly}")

            print(f"Unlevered Post-Tax IRR (%): {irr:.2f}")
            print(f"\nOptimal Contract Term Simulation")
            print("========================================================")
            print(
                f"Contract Term (Optimal Loan Term): {ppa_term} years"
            )  # PREVIOUSLY MAPPED TO Plazo (anos)
            print(
                f"Discount on Existing Energy Tariff: {saving_on_electricity_tariff * 100}%"
            )  # PREVIOUSLY MAPPED TO Discuento en la tarifa energetica vigente (%)
            print(
                f"Investment by Offtaker: {investment_by_offtaker}"
            )  # PREVIOUSLY MAPPED TO Inversion por parte del Comprador (USD)
            print(
                f"Clean Energy Tariff: ${project_electric_tariff_excl_vat:.4f}/kWh"
            )  # PREVIOUSLY MAPPED TO Tarifa de energia limpia (USD/kWh)
            print(f"Average Annual Output: ${average_annual_output:.2f}")
            print(
                f"Equivalent Monthly Payment: ${average_drex_payment_monthly:.2f}"
            )  # PREVIOUSLY MAPPED TO Pago mensual equivalente (USD)
            print(
                f"Net Present Value: ${net_present_value:.2f}"
            )  # PREVIOUSLY MAPPED TO Valor neto actual (USD)
            print(
                f"Total Revenue: ${total_revenue:,.2f}"
            )  # Total revenue over the project lifetime
            print(
                f"Total Generation: {total_generation:,.2f} kWh"
            )  # Total electricity generation over project lifetime
            print(
                f"Payback Year: {payback_year}\n"
            )  # Year when (cumulative revenue - cumulative O&M) / project cost >= 1

            viability_data = {
                "Current Utility": {
                    "Plazo": payback_year,
                    "Inversion": direct_investment_offtaker,
                    "Tarifa actual": current_electricity_tariff,
                    "Ahorro tarifa": "100%",
                    "Tarifa solar": 0,
                    "Ahorro promedio": average_offtaker_savings,
                    "Pago promedio": 0,
                    "Pago a": "Empresa Electrica",
                },
                "Solar Project": {
                    "Plazo": ppa_term,
                    "Inversion": investment_by_offtaker,
                    "Tarifa actual": current_electricity_tariff,
                    "Ahorro tarifa": f"{saving_on_electricity_tariff*100:.1f}%",
                    "Tarifa solar": project_electric_tariff_excl_vat,
                    "Ahorro promedio": average_drex_savings,
                    "Pago promedio": average_drex_payment_annual,
                    "Pago a": "SPV DREX",
                },
            }

            viability_df = pd.DataFrame(viability_data)
            viability_df.loc["Inversion"] = viability_df.loc["Inversion"].map(
                "${:,.2f}".format
            )
            viability_df.loc["Tarifa actual"] = viability_df.loc["Tarifa actual"].map(
                "${:.4f}".format
            )
            viability_df.loc["Tarifa solar"] = viability_df.loc["Tarifa solar"].map(
                "${:.4f}".format
            )
            viability_df.loc["Ahorro promedio"] = viability_df.loc[
                "Ahorro promedio"
            ].map("${:,.2f}".format)
            viability_df.loc["Pago promedio"] = viability_df.loc["Pago promedio"].map(
                "${:,.2f}".format
            )
            viability_df = viability_df.T

            print("Viability Table")
            print("========================================================")
            print(viability_df)

            if DEBUG:
                debug_table = result_table.map(
                    lambda x: f"{x:,.2f}" if isinstance(x, (int, float)) else x
                )
                print(debug_table)
                debug_table.to_excel(f"debug_table_ppa_{ppa_term}.xlsx")

            # --- Exit value analysis at 5, 10, 15 years (unlevered, 10% discount) ---
            project_cf = result_table.loc["Project Cashflow"].values.astype(float)
            exit_df = compute_exit_values_and_irrs(
                project_cf,
                discount_rate=0.10,
                exit_years=[5, 10, 15],
            )

            print("\nExit Scenarios (Unlevered, 10% discount on remaining cashflows)")
            print("================================================================")
            if exit_df.empty:
                print("No valid exit years within project tenor.")
            else:
                print(
                    exit_df.applymap(
                        lambda x: (
                            f"{x:,.2f}"
                            if isinstance(x, (int, float, np.floating))
                            else x
                        )
                    )
                )
            break


"""
    # Debt Inputs
    tenor_of_loan = 8 # years
    annual_interest_rate = 10.50 / 100 # Convert % to decimal
    min_dscr = 1.20 

    debt_service = [cf/min_dscr for cf in cash_flows[1:tenor_of_loan+1]]
    debt_facility_size = excel_npv(annual_interest_rate, debt_service)
    
    # Generate debt schedule and results
    debt_schedule, results = generate_debt_schedule(
        total_project_cost, debt_facility_size, tenor_of_loan, annual_interest_rate, min_dscr, cash_flows
    )
    if DEBUG:
        # Display outputs
        print("Debt Schedule:")
        print(debt_schedule.applymap(lambda x: f"{x:,.2f}" if isinstance(x, (int, float)) else x))
        
    print("\nSculpted Style Amortization:")
    print("========================================================")
    print(f"Debt Facility Size: {results['Debt Facility Size']:.2f}")
    print(f"Leverage (as % of Project Cost): {results['Leverage']*100:.2f}%")
    print(f"Levered Pre Tax IRR (%): {results['Levered Pre-Tax IRR']*100:.2f}%")
"""
