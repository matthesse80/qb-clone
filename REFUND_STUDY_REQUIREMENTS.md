# NEC Ledger - Refund / Energy Study Requirements

## Meter and account linkage

Every energy study must be tied to the exact utility account and the specific meter or meters that serve the inventoried equipment.

Required fields for each study:
- Customer / physical location
- Utility provider
- Utility account number
- Service address
- Meter number / meter ID
- Meter description or location, when available
- Energy type: electric or gas
- Study period
- Source bills / records used
- Whether the study uses one meter or multiple meters

### Multiple-meter rule
If a utility account contains multiple meters, NEC Ledger must not automatically combine all meter usage.

The study must explicitly identify which meter(s) correspond to the equipment included in the inventory and energy study. Usage from unrelated meters must be excluded from the study calculation.

If more than one meter serves the same studied equipment or operating area:
- Allow multiple meter associations on the same study.
- Show each included meter separately.
- Preserve each meter's original billed usage and unit.
- Sum only the explicitly included meters into the study's actual-usage total.
- Clearly display all included meter IDs on the study output.

### Auditability
The study record must retain:
- Utility account
- Included meter(s)
- Excluded meter(s), when they appear on the same source bill and are intentionally not part of the study
- Original billed usage by meter
- Any unit conversions applied
- Normalized usage used in the study
- Source document reference for each usage period

The goal is to make it possible to trace any study percentage back to the exact customer account, meter, bill, and equipment inventory used.

## Study calculation chain

Inventory -> equipment-to-meter association -> modeled equipment usage -> actual meter usage -> validation / reconciliation -> exempt and non-exempt percentages -> historical tax calculation -> refund claim.

The equipment inventory and the energy study must therefore share the same meter context. NEC Ledger should not allow a study to be finalized if the applicable utility account and meter association are missing.
