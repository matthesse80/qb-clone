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


## Client intake documents and completion rules

NEC commonly begins a refund case with three client-provided document types:

### 1. Contract
The NEC contract is generally completed in full when the client is new.

For an existing client, NEC may only require a new signature rather than re-completing every field on the contract.

NEC Ledger should therefore distinguish:
- New-client contract
- Existing-client signature-only renewal / reauthorization

The signed source contract must be preserved as originally received. Any later completed version should be stored as a separate derivative document.

### 2. "Blanks" package
The document package NEC calls "blanks" is returned by the client with only the required signatures and initials completed.

The following are intentionally left blank at the time the client signs and are completed later by NEC from the customer/refund database:
- Printed name
- Date
- Customer / taxpayer identifying information
- Address and contact information
- Filing / refund period
- Other customer-specific form fields required for the filing

Fields relating to National Energy Consultants and Matthew Hesse may already be pre-populated in the blank source form.

NEC Ledger should:
- Preserve the original signed/initialed blank form as immutable source evidence.
- Populate the remaining authorized fields later from verified database information.
- Create a separate completed derivative PDF.
- Never recreate, redraw, or fabricate a signature or initials.
- Preserve the location and appearance of the original client signature / initials when producing the completed derivative.

### 3. General Utility Release
NEC's "general utility release" is a broadly usable signed authorization for obtaining utility billing records.

At client intake, the client generally signs the release. NEC completes the provider-specific and account-specific information later as needed.

One signed general utility release may support separate record requests to different utility providers, including one provider for electricity and another provider for natural gas, when the signed authorization permits both.

For each resulting utility-record request, NEC Ledger should create a provider-specific derivative while preserving the original signed release.

Provider-specific request data may include:
- Utility provider
- Electric and/or gas selection
- Customer / account name
- Service address
- Utility account number(s)
- Meter number(s), if known and relevant
- Requested historical period
- Provider-specific instructions or contact information
- NEC cover letter

Each generated request should remain linked back to:
- The original signed general utility release
- The customer
- The refund case
- The applicable utility account and meter(s)
- The date the records were requested

### Source-versus-derivative rule
Signed client documents are source documents and must never be overwritten.

Any form completed later by NEC Ledger is a derivative document linked to its source. The audit history should show:
- Source document
- Date received
- Fields added later
- Data source for those fields
- Date derivative was generated
- User who approved / generated it


## Signer-name consistency control

Before NEC Ledger fills a "Print name", "Printed name", owner, or authorized-signer field on a derivative document, it must verify the signer name from reliable customer records and prior completed signed documents.

Required process:
- Use prior NEC documents where the signer name and role were already recorded on the same signed form.
- Cross-check the current customer's legal entity, owner / authorized signer records, title, and historical signed-document history.
- Do not fill a printed-name field solely from a generic contact record when more than one authorized person may sign for the business.
- If the current signed document does not clearly indicate which authorized signer signed it, or if historical records conflict, stop and require manual NEC review.
- Record which prior document or customer record was used as the source for the printed name.

NEC Ledger should not make a legal or biometric determination about a signature. The control is intended to ensure the printed name is grounded in the customer's documented signer history and that ambiguous cases are reviewed rather than guessed.


## State filing forms signed blank and completed later by NEC

The same source-versus-completed-document workflow applies to state filing forms when the client intentionally signs and/or initials forms while leaving the remaining client-specific fields blank for NEC to complete later.

For these state forms:
- Client signatures and initials may already be present on the reusable signed source.
- NEC may later complete authorized fields such as printed name, date, taxpayer/entity information, address, filing period, refund amounts, title, and other case-specific information.
- The date is an NEC-completed field when the client intentionally leaves it blank for NEC to complete as part of the filing workflow.
- NEC Ledger must use the date provided or confirmed by NEC for the filing; it should not independently invent or backdate a filing date.
- The printed signer name must be checked against the customer's documented signer history before insertion.
- The original signed/initialed source form should remain preserved in the case record, while the completed filing version is stored as a separate derivative document.
- NEC-specific and Matthew Hesse-specific fields that are already part of the standard form/template may remain pre-populated.


## Execution-date rule for utility release forms

This rule applies only to general utility release forms. It does not automatically apply to state filing forms, contracts, powers of attorney, or other NEC documents.

For a general utility release whose execution/date field is completed by NEC after the client has signed or otherwise authorized completion:

- The execution date should be a weekday (Monday through Friday).
- It should fall within the seven calendar days immediately preceding the document creation date.
- Unless NEC specifies a different qualifying weekday, use the most recent weekday before the creation date.
- Never use a weekend date for the utility release execution date.
- If NEC provides a specific utility release execution date, use that date only if it satisfies the rule or NEC explicitly overrides the rule for that case.

Example: if a utility release is created on Sunday, September 20, 2026, the default execution date is Friday, September 18, 2026.


## Iowa state filing form masters and quarterly version control

NEC's current Iowa filing masters are:

### IA 843 Refund Return
- Page 1: form 22-009a, revision date 07/01/2025
- Page 2: form 22-009b, revision date 07/17/2025
- Current master packet length: 2 pages

### IA 2848 Iowa Department of Revenue Power of Attorney
- Pages 1-4: forms 14-101a through 14-101d
- Revision date: 06/18/2026
- Current master packet length: 4 pages

NEC Ledger must check the official Iowa Department of Revenue source every three months to verify that these forms, page counts, form numbers, and revision dates are still current. If Iowa publishes a newer version, the NEC master must be replaced before new filing packets are assembled.

### Client signature-page assembly rule

Clients may return only the signature page(s), rather than the complete state form packet.

When NEC receives only a signed portion:
- Preserve the signed page exactly as the source document.
- Identify the form and revision from the footer / form number on the signed page.
- Confirm the signed page belongs to the same current form revision as the NEC master.
- Add the missing current blank/master pages needed to reconstruct the complete filing packet.
- Populate the authorized case-specific fields on the completed packet as part of NEC's normal filing workflow.
- Do not combine a signed page from an older revision with blank pages from a newer revision without NEC review.

For the current masters:
- IA 843: if the client supplies only signed page 2, add current page 1 to complete the 2-page packet.
- IA 2848: if the client supplies only signed page 4, add current pages 1-3 to complete the 4-page packet.

The completed derivative filing packet must retain a link to the original client-supplied signed page(s) in the case history.
