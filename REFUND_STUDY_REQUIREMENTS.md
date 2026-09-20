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


## Operating hours and equipment-use methodology

### Business hours are a required study input
For location-based studies, NEC Ledger should establish the hours the business is actually open because equipment-use percentages are often converted into daily exempt and non-exempt operating hours from those hours.

Business hours may come from:
- Owner / manager interview
- NEC field inventory notes
- Public business listings or the business's own website
- Manual entry by NEC when public information is unavailable or unreliable

When public hours are used, retain:
- Source
- Date retrieved
- Hours found
- Whether NEC confirmed or overrode them

Public customer-facing hours are not always the correct production-hours input. NEC Ledger must support separate schedules for:
- Public / customer business hours
- Production / equipment operating hours
- Seasonal or day-of-week variations

Examples where public hours may not be appropriate include hog farms, concrete plants, manufacturing operations, and other locations where equipment begins operating before the front door opens or continues after customer-facing hours end.

### Equipment-use interview inputs
During the inventory, NEC may ask the owner or operator:
- When is the equipment turned on?
- When is it turned off?
- What percentage of the operating day is it actively cooking / processing?
- What percentage of the day is it warming, idle, holding, or otherwise non-exempt?
- Does the equipment run before opening or after closing?

NEC Ledger should preserve both the raw owner-provided statement and the derived hours used in the study.

### Hour calculation
Where the owner gives a percentage of the relevant operating day:

Exempt hours/day = Relevant operating hours/day × exempt-use percentage

Non-exempt hours/day = Relevant operating hours/day × non-exempt-use percentage

If a piece of equipment has different usage modes, NEC Ledger should allow multiple operating segments for the same piece of equipment rather than forcing one load factor and one usage classification.

### Load-factor library
NEC Ledger should maintain a reusable load-factor library learned from confirmed NEC studies.

Each load-factor rule should include:
- Equipment type
- Operating mode
- Standard load factor
- Typical exempt / non-exempt classification
- Notes / rationale
- Source or prior-study examples
- Whether the value is considered standard or unusual

Confirmed examples:
- Coffee maker, cooking / brewing side: load factor 0.90
- Coffee maker, warming / holding side: load factor 0.25
- Coffee warmer: non-exempt only, load factor 0.50

The same physical equipment may therefore have more than one modeled operating segment with different load factors and tax treatment.

### Variance / exception handling
NEC Ledger should not silently normalize unusual load factors.

If a new study contains a load factor that materially differs from the learned standard for that equipment / operating mode, flag it for review and ask NEC for clarification before treating the new value as a standard.

Possible reasons for a valid variance include:
- Different equipment design
- Unusual operating pattern
- Different use mode
- Location-specific owner information
- Seasonal operation
- Equipment that is rarely encountered

Confirmed outliers may be stored as case-specific exceptions without replacing the standard library value.
