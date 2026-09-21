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


## Utility-record cover-letter inheritance rule

When preparing a new utility-record request, NEC Ledger must review the prior request package for that utility/provider.

- If the prior utility release/request package included a cover letter, the new request package must also include a cover letter unless NEC explicitly instructs otherwise.
- The new cover letter should preserve the same general wording, information scope, and formatting as the prior cover letter.
- Do not add customer-specific information, account numbers, service addresses, requested dates, or other fields to the cover letter unless those items appeared on the prior cover letter or NEC specifically requests them.
- Provider/account/request-period details should remain on the utility release or other page where NEC historically placed them.
- The purpose is to avoid causing the utility to act only on summary information shown on the cover page and overlook the full records request stated on the following page.


## Utility request package delivery rule

When a utility-record request includes a cover letter and utility release, NEC Ledger should package them as one combined multi-page PDF in the correct order:

1. Cover letter
2. Utility release

The combined PDF is the primary deliverable and should be treated as a single document for email attachment, faxing, storage, and drag-and-drop workflows.

Page-level rendered previews may still be generated for visual review, but they are secondary QA artifacts and should not replace the combined PDF as the user-facing deliverable.

If a prior request package contained additional pages, preserve that same package order unless NEC explicitly directs otherwise.


## Signature placement and visual QA

Client signatures used on utility releases and state filing derivatives must be treated as high-risk visual elements because clipping, truncation, poor alignment, or overlap can cause a request or filing to be rejected.

Before finalizing a document:
- Preserve the complete visible signature, including descenders, flourishes, and trailing strokes.
- Do not crop tightly enough to cut any portion of the signature.
- Position the signature naturally on or immediately above the intended signature line, consistent with the source document.
- Keep adequate clearance from the printed signature label and nearby text.
- Do not stretch the signature disproportionately.
- Render the completed page at full size and visually inspect the entire signature region before delivery.
- If the signature is close to an image boundary or form line, use extra crop margin and reposition rather than trimming the source.
- A utility-request package should not be considered complete until the signature is fully visible in the final rendered PDF.


## Multi-page utility package page-size and content-retention rule

All pages in a combined utility-record request package must use the same finished page size and orientation. For standard NEC utility requests, use US Letter portrait (8.5 x 11 inches) for every page unless the source document or NEC explicitly requires another size.

Required QA:
- Never combine pages with different PDF MediaBox / page dimensions in the same outgoing package.
- Scale pages proportionally to fit the common page size; do not crop page edges to force a fit.
- Retain all source wording, labels, lines, signatures, account fields, and other visible form content.
- No text may extend beyond the printable/page boundary or be cut off at the left, right, top, or bottom.
- Preserve blank continuation lines and other form elements that appear on the source form when recreating the page.
- Render every page of the final combined PDF after assembly and visually inspect the full page before delivery.
- The final email/fax deliverable must remain one true multi-page PDF, not a single tall combined image.


## Provider-specific utility authorization forms

The NEC General Utility Release is a fallback / standard form, not a universal form for every utility provider.

Before generating any utility-record request, NEC Ledger must determine whether the utility provider requires or historically uses its own authorization form.

Rules:
- Provider-specific authorization forms override the NEC General Utility Release when NEC has established that the provider uses its own form.
- Cover-letter inheritance is independent of authorization-form selection. If the prior request package for that provider included a cover letter, include the corresponding inherited cover letter unless NEC explicitly directs otherwise.
- Do not force provider-specific requests into the field layout or wording of the NEC General Utility Release.
- Preserve the provider's own field structure, selections, instructions, authorization choices, and signature/date area.
- Provider-specific templates must be versioned. Store provider name, template name, source/revision date when known, date verified, and whether the template is currently approved for use.
- If the provider-specific form is not available or its version is uncertain, block final package generation and require review rather than silently substituting the NEC General Utility Release.

### MidAmerican Energy Company
MidAmerican Energy Company uses its own "Authorization for Release of Information - Historical Customer Usage Information" form.

The provider-specific workflow must support the form's distinct fields and choices, including:
- Customer name and title
- Service address
- Company name
- Customer phone and email
- NEC third-party contact information
- Account-specific request versus aggregate request
- Electric / lighting / gas selection
- Usage only versus amounts billed
- Previous 12 months / previous 24 months / specified period
- Specified-period limit shown on the form
- Utility account number(s)
- Meter number(s), when applicable
- Additional-account / additional-address indicators
- Authorization duration / expiration choice
- Customer signature and date

When MidAmerican is selected as the provider, NEC Ledger should select the MidAmerican provider-specific authorization template rather than the NEC General Utility Release.


### Linn County Rural Electric Cooperative (Linn County REC)

Linn County REC uses its own "Linn County REC Member Usage Authorization Form", but NEC also includes the NEC General Utility Release in the same outgoing request package.

Required package structure:
1. Linn County REC Member Usage Authorization Form
2. NEC General Utility Release

Both pages belong to one combined multi-page utility-record request package.

Signer/signature rule:
- The customer signature used on the Linn County REC provider form should be sourced from the same client-authorized signature on the NEC General Utility Release when the client has authorized NEC to reuse that signed authorization.
- The signature must appear on BOTH the Linn County REC form and the NEC General Utility Release.
- Reuse the same verified signer identity across both pages.
- Preserve the full signature image without clipping, stretching, or cutting off descenders/flourishes.
- Position the signature naturally on each form's designated signature line.
- Visually inspect both signature placements before finalizing the package.

Provider-form rule:
- Preserve Linn County REC's own fields, selections, wording, authorization-duration controls, member information, account information, service address, phone/email, requested-period information, member signature/date, and Authorized Representative section.
- Do not replace the Linn County REC form with the NEC General Utility Release.
- Do not omit the NEC General Utility Release just because the Linn County REC form is present.
- If the prior Linn County REC request package also included a cover letter, preserve the cover letter according to the standard cover-letter inheritance rule.


### Waukee Municipal Utilities

Waukee Municipal uses a three-part outgoing utility-record request package in this order:

1. Waukee "Request for Examination and Copying of Public Records" form
2. NEC utility-record cover letter
3. NEC General Utility Release

The Waukee municipal form is a provider-specific request form and must remain the first page. The NEC cover letter follows it and must preserve the standard inherited wording without adding customer/account/request-period details that were not present on the prior cover. The NEC General Utility Release remains the final page and carries the customer authorization, provider/account information, requested history period, execution date, and customer signature.

Do not substitute the NEC General Utility Release for the Waukee form, and do not omit either the cover letter or the NEC General Utility Release when building a Waukee Municipal request package unless NEC explicitly changes the workflow.

### Configurable provider-template registry

Utility-provider document workflows must be data-driven rather than permanently hard-coded into the application.

NEC Ledger must maintain a provider-template registry that can be changed without redesigning the Refund workflow. Each provider profile should support:
- Provider name and aliases / matching names
- Template/workflow name
- Current provider-form file or files
- Provider-form revision/version, when known
- Date NEC verified the form as current
- Package page order
- Whether an NEC cover letter is required
- Which cover-letter template/version is used
- Whether the NEC General Utility Release is required
- Whether the provider form itself requires the customer signature
- Whether the same verified client-authorized signature must be placed on multiple pages
- Provider-specific completion instructions
- Active/inactive status
- Superseded-template history

When a utility provider changes its required form, NEC must be able to upload the replacement template, update the provider profile, preserve the superseded template for audit/history, and use the newly approved version for future request packages.

When NEC encounters a new provider with a specialized form, the provider can be added to this registry without changing the underlying refund-case data model.

Current known provider workflows:
- Standard / fallback: NEC General Utility Release, plus inherited cover letter when historically used.
- MidAmerican Energy Company: MidAmerican provider-specific authorization form instead of the NEC General Utility Release.
- Linn County REC: Linn County REC Member Usage Authorization Form + NEC General Utility Release; same verified customer signature placed on both authorization forms.
- Waukee Municipal: Waukee public-records request form + NEC cover letter + NEC General Utility Release.


## Historical utility-tax reconstruction by bill period

NEC Ledger must calculate utility-tax refunds from the tax actually charged on each individual utility bill. It must not assume that one tax presentation or one tax rate applies to every provider, county, or period in the claim.

### Bill-by-bill tax classification

For every utility bill included in a refund calculation, retain at minimum:
- Utility provider
- Customer / service location
- Utility account
- Meter, when available
- Energy type
- Bill date
- Service-period start and end, when available
- Taxable utility charges / tax base, when identifiable
- Every tax line exactly as displayed on the source bill
- Original tax-line label
- Original tax amount
- Source document and source page
- State
- County / local jurisdiction applicable to the service location
- Historical tax-rate rule used for that bill
- Effective date range of the tax-rate rule
- Whether the bill displayed state and local tax separately or as one combined tax line
- Any decomposition of a combined tax line into state and local components
- Whether the decomposition was calculated automatically or required NEC review

### Split-tax bills

If the provider separately states State Tax and county / local-option tax on the bill, NEC Ledger should preserve those actual billed amounts as the source tax amounts.

Do not replace separately stated billed tax amounts with a reconstructed amount merely because a published rate table produces a slightly different result. Differences caused by rounding, tax-base exclusions, provider billing logic, or partial-period treatment should be retained and flagged for reconciliation when material.

### Combined-tax bills

Some providers display one combined tax amount that includes both state sales tax and local / county tax.

For a combined tax line, NEC Ledger must:
1. Determine the applicable service jurisdiction from the service location.
2. Determine the state and local tax rates actually in effect for the bill's applicable period.
3. Use a historical tax-rate table with effective dates rather than the current tax rate.
4. Compare the combined published rate against the effective tax rate implied by the bill when a usable taxable base is available.
5. Break the billed combined tax into state and local components using the applicable historical rates.
6. Preserve the original combined tax amount and the calculated component amounts in the audit trail.
7. Reconcile the calculated state + local components back to the original combined tax charged, allowing only explainable rounding differences.
8. Stop for NEC review when the rate, jurisdiction, tax base, or reconciliation is ambiguous.

### Historical-rate changes inside one claim

Tax rates may change during the refund claim period. Therefore:
- A claim may contain multiple tax-rate periods.
- Tax treatment must be resolved by the bill / service period, not by the claim's end date or by today's rate.
- A new rate must not be applied retroactively to older bills.
- NEC Ledger should maintain effective-from and effective-through dates for each state and local tax-rate rule.
- When a bill's service period crosses a rate-change date and the provider does not already split the tax, NEC Ledger must use the provider's billing-period treatment when known; otherwise require review rather than inventing a proration method.

### County / local-option breakout

The local-option portion of the refund must be accumulated by the county / jurisdiction in which the taxable utility service occurred.

A single refund case may therefore contain:
- State-tax refund totals across all included utility bills
- One or more county / local-option refund subtotals
- Separate electric and gas calculations that ultimately roll into the same state and county filing schedules

The calculation output must show enough detail to reproduce every county subtotal from the underlying bills.

### Refund application

After the original state and local tax paid has been established for each bill, apply the energy-study exempt percentage to each tax component.

For each bill and tax component:

Refundable tax = Original tax paid x Exempt-use percentage

Non-refundable / corrected tax = Original tax paid x Non-exempt-use percentage

State and local calculations must remain separate through the entire calculation chain even when the source bill originally displayed one combined tax line.

### Validation controls

Before finalizing the refund:
- Sum reconstructed state + local tax back to the original billed tax for combined-tax bills.
- Compare historical published rates to the effective rate implied by the bill when the taxable base is available.
- Flag unexpected rate changes, unexplained tax-rate mismatches, missing county assignment, or ambiguous tax labels.
- Do not silently infer a county or historical rate when the service jurisdiction is uncertain.
- Reconcile the final state-tax refund, county/local refund totals, and total refund back to the state filing form.


### Combined-tax bill allocation example rule

A utility bill may contain multiple service descriptions, accounts, meters, or operating areas on the same invoice. NEC Ledger must calculate the refund only from the tax associated with the service/meter that is tied to the studied equipment. It must not use the total tax from unrelated service sections on the same bill.

When the included service shows one combined TAX amount rather than separate state and local amounts, and the applicable historical rates are known, allocate the actual billed tax by the relative rates rather than recalculating tax from unrelated bill totals.

Example method:
- If the applicable historical rate is 6% state plus 1% local, the combined billed tax is a 7% tax amount.
- State tax component = Combined billed tax x 6/7.
- Local tax component = Combined billed tax x 1/7.
- The allocated components must sum back to the original combined billed tax after normal currency rounding.
- If the historical rate structure changes, use the rate structure applicable to that specific bill period rather than assuming 6/1 for the entire claim.

NEC Ledger should then aggregate the reconstructed bill-level state and local components into the reporting periods used by NEC's breakout sheets (for example, monthly, partial-quarter, or quarterly periods) while preserving the underlying bill-level detail.

The energy-study non-exempt percentage is applied independently to each reconstructed state and local tax subtotal:
- Corrected / non-refundable tax = Original tax x non-exempt percentage.
- Refundable tax = Original tax - corrected tax.

The study percentage should be based on the modeled exempt and non-exempt equipment usage used by NEC. Actual meter usage is a reconciliation/validation input; it does not automatically replace the modeled exempt/non-exempt denominator. The study must display the comparison between modeled total usage and actual billed/metered usage and flag material variance for review.


## Bill issue-date assignment and 12-bill study reconciliation

Tax-breakdown period assignment and energy-study usage reconciliation are related but distinct workflows.

### Tax breakdown period is based on bill issue date

Every individual utility bill must be assigned to the tax-breakdown month and quarter in which the bill was issued.

Rules:
- Use the bill's issue / bill date for tax-breakdown placement, not the service-period end date, payment date, due date, or an assumed one-bill-per-month sequence.
- If a provider issues two or more bills in one calendar month, all of those bills belong in that same issue month and their applicable state/local tax amounts are aggregated into that month's tax-breakdown value.
- If no bill is issued in a calendar month, that month contributes zero tax to the tax-breakdown sheet.
- Quarterly breakout totals are the sum of the bills actually issued in the three calendar months of that quarter.
- Preserve each underlying bill as a separate source record even when multiple bills are aggregated into one tax-breakdown line.
- Provider billing cadence must never be normalized to one bill per month merely for convenience.

This is especially important for providers whose billing dates shift over time, including cases where one month contains two issue dates and another contains none.

### Energy-study actual-usage period uses 12 consecutive bills

The electric and gas energy-study reconciliation must be based on the actual usage from the 12-bill period selected for the study, not on an assumption of 12 distinct calendar months.

Rules:
- Select the 12 consecutive utility bills that correspond to the study period / meter-read period established for that fuel.
- Sum the usage from all 12 selected bills.
- Two bills issued in the same calendar month still count as two separate bills if both are part of the selected 12-bill sequence.
- A calendar month with no issued bill does not create a synthetic zero-usage bill.
- Electric and gas may have different 12-bill sequences and different exact study dates.
- Preserve each bill's issue date, service/read dates, usage amount, units, and source page.
- Normalize gas units to the study unit when required, while retaining the original billed unit and conversion method.

### Five-percent study validation

For each fuel separately:

Modeled usage = Exempt modeled usage + Non-exempt modeled usage

Comparison ratio = Modeled usage / Actual usage from the selected 12 bills

Variance % = (Modeled usage - Actual usage) / Actual usage

The completed study is acceptable only when modeled usage is within +/-5% of the actual 12-bill usage.

Controls:
- Electric and gas must each pass the +/-5% test independently.
- A failed comparison blocks finalization until the equipment assumptions, operating hours, load factors, unit conversions, meter linkage, or selected 12-bill period are reviewed.
- Do not alter actual billed usage to force the comparison into range.
- Keep the actual-usage total, modeled exempt total, modeled non-exempt total, comparison percentage, and variance percentage visible in the audit record.

### NEC calculation workbook as refund control

NEC's calculation workbook is a required refund-level check and should be completed for every refund.

The automated workflow should populate a copy of the approved calculation-workbook template with:
- Electric study start/end dates
- The 12 selected electric-bill usage values and total
- Gas study start/end dates
- The 12 selected gas-bill usage values and total
- Gas unit-conversion support where needed
- Bill-level state and local tax amounts assigned by issue month
- Monthly-to-quarterly tax aggregation
- Historical combined-tax decomposition when applicable
- Electric and gas non-exempt percentages from the completed studies
- State Electric, County Electric, State Gas, and County Gas breakout sheets
- Final reconciliation to the IA 843 state-tax, local-option-tax, and total-refund amounts

The workbook should function as an independent control against NEC Ledger's internal calculation. The final refund should not be considered ready until the workbook and NEC Ledger totals reconcile.

Any fixed tax-split helper in a workbook template (for example 6/7 state and 1/7 local) is only a convenience for periods where that historical rate structure actually applies. NEC Ledger must determine the applicable historical rate first and must not blindly apply a fixed split across all providers or periods.


## Multi-premise bills, fuel-specific study periods, and load-factor library

### Multi-premise / multi-service utility bills

A single utility invoice may contain multiple premises, accounts, meters, or service types. NEC Ledger must not assume that every electric, gas, tax, or usage value appearing on the invoice belongs to the refund study.

For each refund:
- Identify the exact studied service address / premise, utility account, meter, and fuel.
- Link each study to the corresponding meter(s).
- Extract usage and tax only from the service sections tied to the studied location and equipment.
- Exclude unrelated residential premises, other business premises, water, internet/telecom, lighting-only accounts, or other utility services unless NEC has explicitly included them in the study.
- Preserve the source invoice and source page plus the specific service-section identity used.
- If one invoice contains both included and excluded services, keep the invoice as one source document but maintain separate service-section records so the audit trail shows exactly what was used and what was ignored.

A filing-package cover note may be required when the customer is served by multiple accounts/meters and the study covers only a specific premise or subset.

### Electric and gas study periods may differ

The 12-bill reconciliation period is selected independently for each fuel/meter.

- Electric and gas do not need identical start/end dates.
- Each fuel must have its own 12 consecutive source-bill sequence, actual usage total, modeled usage total, and +/-5% validation.
- The refund claim period may be longer than the 12-bill energy-study period. The approved study percentage can then be applied to the tax paid during the eligible claim period according to NEC's methodology.
- Store both the claim period and each fuel's study period explicitly; never infer one from the other.

### Standard load-factor library

NEC Ledger should support an editable NEC load-factor library used to prepopulate initial energy-study rows.

A load factor is the fraction of the equipment's nameplate/rated energy draw expected during the modeled operating hours. It is not the exempt-use percentage.

The energy calculation remains:
- Electric: quantity x rated kW (or calculated kW) x load factor x modeled hours/day x days/year.
- Gas: quantity x rated CCF/hour x load factor x modeled hours/day x days/year.
- When gas nameplate data is in BTU/hour, preserve the source rating and conversion method used to obtain CCF/hour.

The library should store:
- Canonical equipment category
- Fuel / energy type
- Optional equipment subtype or operating mode
- Default load factor
- Observed range, when NEC has multiple historical examples
- Source/provenance (prior NEC study, manufacturer data, field observation, or other support)
- Number of prior NEC studies supporting the default
- Confidence / review status
- Notes explaining why the factor is used
- Date last reviewed
- Whether the value is a suggested default or a locked rule

Load-factor defaults must always be editable at the study level.

### Load factor versus hours and tax classification

Do not encode exempt/non-exempt status into the load factor itself.

The same equipment can appear on both the exempt and non-exempt sides of a study with the same load factor but different modeled hours. This is the preferred representation when one appliance performs both processing and non-processing functions.

Likewise, a load factor of 1.00 does not mean an appliance runs all business hours. It may mean that the entered hours already represent actual energized/run time and the equipment is assumed to draw at rated load during those hours.

Therefore NEC Ledger should treat these as independent inputs:
1. Nameplate / rated energy draw
2. Load factor
3. Hours per day
4. Days per year
5. Exempt versus non-exempt activity allocation

### Working NEC load-factor observations from reviewed restaurant studies

These are historical NEC working observations, not universal engineering constants, and should initially be stored as suggested defaults subject to review:

- Deep fryer: 0.50
- Convection / commercial oven: 0.50
- Gas griddle: 0.50
- Food warmer: 0.50
- Fry warmer: 0.50
- Steam table: 0.45 (standard NEC default)
- Prep table / refrigerated prep table: 0.30
- Coffee maker: 0.90 when modeled as exempt brewing/processing; 0.25 observed for non-exempt use
- Soda fountain / soda charger: 0.25
- Ice maker: about 0.42
- Slushy maker: 0.40 (standard NEC default)
- Ice cream maker: 0.40 (standard NEC default)
- Dishwasher: 0.75
- Reach-in / standard refrigerator or freezer: about 0.50
- Walk-in cooler: about 0.35
- Walk-in freezer: about 0.40
- Air conditioning: variable by location, climate, building, and study year; do not use a fixed NEC standard without study-specific support
- Gas furnace: variable by location, climate, building, and study year; do not use a fixed NEC standard without study-specific support
- Gas water heater: about 0.15 in a reviewed restaurant study
- Lighting / signs / TV / POS / hand dryer / many fans: 1.00 when modeled hours represent the energized period
- Microwave / toaster / open burner: 1.00 in reviewed studies where entered hours represent active use

These defaults should gain or lose confidence as additional NEC studies are reviewed.


### Climate-dependent HVAC load factors

Furnace and air-conditioning load factors are not fixed NEC standards.

Their load factors may vary based on:
- Geographic location and climate
- Study year and weather conditions
- Building envelope and insulation
- Equipment age and efficiency
- Thermostat settings
- Occupancy and operating schedule
- Other site-specific heating/cooling characteristics

NEC Ledger should therefore:
- Never auto-apply one permanent furnace or A/C load factor across all clients.
- Treat prior HVAC values only as historical observations.
- Require a study-specific HVAC load factor or explicit NEC approval before finalizing the study.
- Allow location/year-specific defaults to be developed later if NEC establishes enough historical support.


## Missing-bill and service-period continuity control

NEC Ledger must check the continuity of utility service periods before a refund is finalized. A missing utility bill can reduce the refund because tax and usage from the omitted service period are not captured.

This continuity check is separate from tax-breakdown period assignment:
- Tax-breakdown placement is based on the bill ISSUE DATE.
- Missing-bill detection is based primarily on SERVICE-PERIOD / METER-READ COVERAGE.

### Continuity logic

For each provider + utility account + meter + fuel/service combination:
1. Sort the source bills by service-period start/end date (or meter-read dates when those are the provider's coverage boundaries).
2. Compare each bill's coverage end with the next bill's coverage start.
3. Treat normal boundary conventions as continuous when the next period starts on the same date as the prior period ends, or no more than one calendar day later.
4. If the uncovered interval is more than one day, flag a potential missing bill / missing service period.
5. Do not infer that a bill is missing merely because one calendar month has no bill issue date. Some providers issue two bills in one month and none in another.
6. Do not use due date or payment date for continuity testing.
7. If a provider does not show explicit service dates, use meter-read dates or other reliable coverage dates when available.
8. If reliable coverage dates are unavailable, flag continuity as "Unable to verify" rather than inventing a service period.

The gap record should retain:
- Provider
- Account
- Meter
- Fuel/service type
- Prior bill issue date
- Prior coverage start/end
- Next bill issue date
- Next coverage start/end
- Number of uncovered days
- Estimated missing period
- Source pages / bill identifiers
- Review status
- NEC decision

### Filing decision when a gap exists

A detected service-period gap is a filing decision gate, not an automatic permanent filing block.

NEC Ledger must present Matt with these choices:
- Request missing bill / postpone filing
- Proceed despite missing period
- Not actually a gap / resolved

Default behavior is to hold final filing until a decision is recorded.

If "Request missing bill / postpone filing" is selected:
- Mark the refund as waiting for missing utility records.
- Prevent the case from being marked filed.
- Create/fill a follow-up action for the utility provider.
- Re-run continuity review when replacement/additional bills are received.

If "Proceed despite missing period" is selected:
- Require a short decision note.
- Preserve the gap warning and decision in the audit trail.
- Allow calculation/filing to continue using only the bills actually received.
- Do not fabricate usage, tax, or a synthetic bill for the missing period.
- Make clear that the resulting refund may be lower because the missing period was excluded.

If "Not actually a gap / resolved" is selected:
- Require a brief resolution note or reference to the bill/document that closes the gap.
- Remove the filing hold but preserve the original flag and resolution history.

### Multiple gaps

If multiple service-period gaps are found, track each independently. Final filing can proceed only when every gap has either:
- been resolved, or
- received an explicit "Proceed despite missing period" decision.

### 12-bill study impact

A bill with missing coverage can also affect the 12-bill usage study.

The selected 12-bill study sequence must be reviewed for service-period continuity. If one of the selected 12 bills is missing:
- Do not silently substitute a zero-usage month.
- Prefer obtaining the missing bill before finalizing the study.
- If NEC intentionally uses a different continuous 12-bill sequence, record the selected sequence and reason.
- If Matt explicitly proceeds with an incomplete usage sequence, flag the study as requiring manual approval and do not represent the +/-5% comparison as fully validated without that approval.


## Bill-date fallback continuity, editable Excel studies, and fuel-specific filing periods

### Bill-date fallback when service dates are absent

Some municipal utilities do not state explicit service-period start/end dates. In those cases, NEC Ledger may use the sequence of bill ISSUE DATES as the fallback continuity evidence.

Rules:
- Explicit service-period or meter-read coverage remains the preferred source.
- When no reliable service dates are shown, treat the period between consecutive bill dates as the best available proxy for coverage.
- Conceptually, the coverage interval is inferred from the prior billing date through the day before the subsequent bill issuance.
- Preserve the fact that this is an inferred period, not a provider-stated service period.
- Review the normal billing cadence for that provider/account before deciding that a bill is missing.
- If the bill-date sequence shows an apparent skipped billing cycle, unusually long gap, or missing calendar-period pattern compared with surrounding bills, flag a possible missing bill.
- A month with no bill issue date is not automatically an error if the provider commonly shifts issue dates; use the surrounding sequence and provider cadence.
- If there is any uncertainty about whether the bill set is complete, NEC Ledger must surface the uncertainty to Matt before final calculation, filing-form generation, or final rendering.
- Do not silently assume continuity when the evidence is ambiguous.

### Energy studies must be delivered as editable Excel workbooks

NEC's working energy study is an editable Excel workbook, even when the historical filing package contains only a scanned PDF version.

For every new or updated energy study, NEC Ledger should create an editable .xlsx working file that preserves formulas and allows Matt to change:
- Equipment list
- Quantity
- Nameplate / rated input
- Units
- Load factor
- Exempt hours/day
- Non-exempt hours/day
- Days/year
- Exempt/non-exempt classification
- Study-period usage inputs
- Electric/gas study start and end dates
- Any site-specific assumptions

The Excel workbook is the operational working document. A PDF may be generated later for a filing package, but the PDF must not replace the editable Excel source.

Derived usage values must remain formula-driven in the workbook. Changes to hours, days, quantity, load factor, or rated input should automatically recalculate modeled annual usage and the +/-5% comparison.

### Electric and gas refund history must be tracked separately

NEC Ledger must track the last filed refund period independently for electric and gas.

For each fuel, retain:
- Last filed claim start
- Last filed claim end
- Date filed
- Utility provider/account/meter used
- Refund amount
- Whether the filing was part of a combined electric+gas claim or a fuel-specific claim

Do not assume that the most recent electric and gas filing periods are identical.

When preparing a new refund request, the next eligible period for each fuel begins after that fuel's own last filed end date.

### Fuel-specific source periods versus filing-form claim period

The electric and gas source-bill periods may differ.

Before generating IA 843 or power-of-attorney filing documents, compare:
- Earliest included electric bill
- Latest included electric bill
- Earliest included gas bill
- Latest included gas bill

The overall filing-form claim period must be decided only after that comparison.

Possible filing strategies include:
1. Combined filing using one overall claim period that spans the included electric and gas records.
2. Separate electric and gas claims so each fuel can preserve its own available end date and any missing later period can be claimed separately.
3. Aligning the fuel periods to a common end date by intentionally excluding one or more later bills from the longer fuel history.

NEC Ledger must NOT choose among these strategies automatically when electric and gas periods differ.

If there is a variance between electric and gas beginning/end dates, NEC Ledger must stop before completing the IA 843 and POA forms and ask Matt how the filing should be handled.

### Common one-month variance

NEC commonly files electric and gas together when their available records differ by only about one month, but this is a business judgment rather than an automatic rule.

Factors that may affect the choice include:
- Size of the operation
- Estimated tax/refund value of the unmatched month
- Whether the missing utility records are expected soon
- Whether preserving a future fuel-specific claim is worthwhile
- Whether parity between the two fuel periods is preferable for the filing package

For a large operation, NEC may choose to exclude the most recent bill from the longer fuel history so that electric and gas end on the same period.

The selected strategy, excluded bills (if any), and Matt's decision must be preserved in the audit trail.

### Filing-form period construction

Once Matt approves the filing strategy:
- For a combined claim, the IA 843 / POA claim period begins with the earliest included bill period and ends with the latest included bill period across the fuel records included in that filing.
- For separate claims, each filing uses the beginning and ending period supported by the bills included in that fuel-specific claim.
- If a later bill is intentionally excluded for parity, that bill must remain available for a future claim and must not be marked as already refunded.
- Never silently discard an unmatched bill or mark its period as claimed unless it was actually included in the filed claim.


## Energy-study workbook formula fidelity and industrial-equipment observations

NEC Ledger should reproduce the calculation logic used in NEC's working Excel energy-study workbook rather than substitute a different engineering formula unless Matt explicitly changes the methodology.

### Electric row formula priority

For each equipment row, calculate annual kWh from the first available rating method in this order:

1. Watts:
   quantity x (watts / 1000) x load factor x hours/day x days/year
2. Volts and amps:
   quantity x (volts x amps / 1000) x load factor x hours/day x days/year
3. Horsepower:
   quantity x (horsepower x 746 / 1000) x load factor x hours/day x days/year

Round each equipment row to the nearest whole kWh, matching the existing NEC workbook.

NEC calculation rule: treat all electrical equipment as single-phase for study calculations. Do not apply three-phase multipliers, square-root-of-three (1.732) adjustments, phase corrections, or power-factor modifications. Use the entered/nameplate volts, amps, watts, or horsepower directly within the standard NEC formulas.

### Study totals

- Total exempt kWh = sum of exempt equipment rows.
- Total non-exempt kWh = sum of non-exempt equipment rows.
- Exempt percentage = total exempt / (total exempt + total non-exempt).
- Non-exempt percentage = total non-exempt / (total exempt + total non-exempt).
- Comparison = (total exempt + total non-exempt) / actual kWh from selected study bills.
- Variance = comparison - 1.00.
- Final validation remains within +/-5% of actual usage.

### Pallet / wood-products manufacturing observations

The Odessa Wood Products study provides useful historical NEC observations for industrial equipment. These are not yet universal defaults unless separately identified as established NEC standards.

Observed exempt-side load factors:
- Pallet dismantler: 1.00
- Chop saw: 1.00
- Radial arm saw: 1.00
- Horizontal band resaw: 1.00
- Band saw: 1.00
- Swing saw: 1.00
- Double-head notcher: 1.00
- Pallet-making machine: 1.00
- Pop-up saw: 1.00
- Roto chopper grinder: 1.00
- Air compressor for nailers: 0.70 on one group and 1.00 on another unit in the reviewed study

Observed non-exempt-side factors:
- Conveyor for pallet machine: 1.00
- Dust collector: 1.00
- Microwave: 1.00
- Computer: 1.00
- Ceiling fan: 1.00
- Electric water heater: 0.15
- LED lighting: 1.00
- Coffee maker: 0.30 in this historical study
- Refrigerator: 0.50
- Pop machine: 0.33
- A/C: 0.36 in this site/year-specific historical study only
- Security lights: 1.00

The historical coffee-maker 0.30 observation does not override NEC's currently established standard/default where Matt has specified a different value. HVAC remains site/year-specific and should not be standardized from this example.

### Utility-bill corrections and mixed-source packets

Utility source packets may contain:
- corrected bills,
- correction tables,
- multiple bill sections on one issued bill,
- multiple service addresses or premises,
- or pages that are not part of the studied meter/premise.

NEC Ledger must preserve the provider's corrected bill amounts and must identify the exact service address/account/meter tied to the study before using usage or tax data.

When a provider issues a corrected bill that changes previously billed tax or usage:
- retain both original and corrected source references,
- use the provider's final corrected amount for the refund calculation,
- record the correction in the audit trail,
- and do not double-count the original and corrected bill.


### Load-factor versus operating-hours modeling convention

NEC uses two valid ways to represent intermittent equipment use. NEC Ledger must preserve the modeling choice rather than force every appliance into one convention.

1. **Direct run-time convention**
   - For equipment that draws its rated load consistently while it is actually running, a load factor of **1.00** is generally appropriate.
   - The entered hours/day should then represent the equipment's actual operating/run time, not merely the hours the facility is open.
   - Example: a grinder may be available during the entire manufacturing shift but actually operate about one hour/day. Model it with load factor 1.00 and about one hour/day when that best reflects the operation.

2. **Open-hours / duty-cycle convention**
   - For equipment whose modeled hours represent the hours the business or service is available rather than literal energized run time, the load factor may represent the fraction of that period during which the equipment is actually drawing load.
   - Example: a convenience-store fuel pump may use all store-open hours as the time basis, while the load factor represents the portion of those hours during which customers are actually pumping fuel.

Rules:
- Do not automatically lower a load factor merely because equipment is not used continuously throughout the business day.
- First determine whether NEC intends to represent intermittent use through **hours/day** or through **load factor**.
- For direct-use production machinery, a 1.00 load factor is a reasonable initial default when entered hours can represent actual run time.
- Do not double-discount intermittent use by both reducing hours to actual run time and also applying a duty-cycle load factor unless NEC intentionally wants both adjustments.
- The study should make the chosen convention apparent enough that a reviewer can understand whether intermittency is represented by hours, load factor, or both.
- Convenience-store, grain-operation, and other industry-specific defaults should be added as NEC provides completed examples; do not invent those defaults before examples are reviewed.

### Corrected utility-bill precedence

Provider-issued corrections can materially alter usage and tax totals and must be handled as first-class source records.

When a utility provider issues a corrected bill or correction table:
- Identify the original bill/charge being corrected.
- Link the correction to that original bill.
- Use the provider's final corrected usage and tax values for the refund calculation.
- Do not add the corrected amount on top of the original amount.
- Preserve both original and correction documents in the audit trail.
- If a correction affects only selected service addresses, meters, or bill components, apply it only to those affected records.
- Re-run tax-breakdown totals, 12-bill usage totals, and +/-5% study validation when corrected data changes an included study period.
- Flag any correction whose relationship to the original bill is ambiguous for Matt's review before finalization.


## Convenience-store and car-wash study observations

### Service-account isolation at shared / adjacent locations

A physical address, legal entity, or adjacent business complex can contain more than one utility account and more than one energy study.

Rules:
- Never merge utility usage, tax, equipment, or refund history merely because two operations share the same legal owner or street address.
- The working study unit is the specific utility provider + account + meter/service + fuel tied to the equipment being studied.
- A convenience store and an adjacent car wash may therefore require separate studies and separate refund calculations even when owned by the same company and located at the same address.
- Store the doing-business-as / operating unit on the utility service record when useful to distinguish adjacent operations.
- Bills, study periods, exempt percentages, non-exempt percentages, tax breakdowns, and prior-filed-through dates must remain linked to the correct account/service unit.
- If multiple accounts are ultimately combined on one filing, preserve the account-level calculations underneath the combined filing totals.

### Convenience-store load-factor observations

Reviewed NEC convenience-store studies reinforce the distinction between actual run-time hours and open-hours/duty-cycle modeling.

Working recurring observations:
- Fuel/gas pump: about 0.07-0.08 when hours/day represent the broad store-open / available period. Treat this as a duty-cycle style factor, not as a universal fixed value.
- Coffee maker, exempt brewing/processing: 0.90.
- Coffee maker, non-exempt holding/availability: 0.25.
- Cappuccino maker, exempt processing: 0.90.
- Cappuccino maker, non-exempt availability/holding: 0.25.
- Soda/pop fountain: 0.25.
- Popcorn maker: 0.25.
- Slushy maker: 0.40.
- Ice cream maker: 0.40.
- Ice maker: about 0.42.
- Grill: 0.50.
- Deep fryer: 0.50.
- Commercial oven: 0.50.
- Food warmer / hot holding equipment: 0.50 unless a more specific historical NEC factor applies.
- Walk-in freezer: 0.40.
- Walk-in cooler: 0.35.
- Reach-in / open / branded beverage refrigerator: 0.50.
- Lighting, canopy lighting, POS/cash register, ATM, computers, and most simple ventilation loads: 1.00 when hours represent energized time.
- Water heater: historical convenience-store observations range about 0.15-0.20; keep editable and do not treat one value as universal.
- A/C remains location/year/site-specific and should not be standardized from these examples.

Additional historical observations that need more examples before becoming universal defaults:
- Hot dog roller: 0.71 in one reviewed convenience-store study.
- Creamer/chiller dispenser: 0.50 in one reviewed study.
- Malt mixer / ice cream mixer: 1.00 where entered hours represent actual short run time.
- Microwave: 1.00 where entered hours represent actual active use.
- Hood vent: 1.00 where hours represent energized operation.

### Car-wash observations

A reviewed stand-alone car-wash account modeled:
- Car-wash drive/pump equipment: load factor 1.00 with hours/day representing actual operating time.
- Drying fan: load factor 1.00 with hours/day representing actual operating time.
- Vacuum: load factor 1.00 with short actual run-time hours.
- Interior/exterior lighting: load factor 1.00 with hours/day representing energized time.

This supports the general NEC rule that direct-run motors can normally start at load factor 1.00 and represent intermittency through hours/day unless a duty-cycle convention is more appropriate.

### Equipment can appear on both sides of the study

Convenience-store studies frequently place the same appliance category on both the exempt and non-exempt sides with different hours and sometimes different load factors.

Examples include:
- Coffee makers
- Cappuccino makers
- Grills
- Fryers
- Ovens

NEC Ledger should therefore support duplicate equipment instances or split-use rows rather than force each equipment item into only one tax classification.


## Grain, fertilizer, and agricultural-facility study observations

The reviewed 21st Century Cooperative locations reinforce that one legal entity can have multiple physical locations with very different business functions, utility accounts, meters, study periods, and exempt-use percentages. Each physical location / utility service must remain a separate customer-location and study unit even when the FEIN/legal entity is shared.

### Fertilizer production

A reviewed fertilizer-production location used a highly seasonal / as-needed operating pattern rather than normal weekly business hours.

Historical NEC observations from that study:
- Fertilizer mixer motors: load factor 1.00, with intermittency represented through actual hours/day and days/year.
- Elevator/leg motor: 1.00.
- Pit auger: 1.00.
- Facility lighting, office lighting, garage-door motor, computer, printer, and exterior lights: generally 1.00 when entered hours represent energized/run time.
- Mini-split HVAC: study-specific historical factor only; do not standardize.
- Refrigerator: 0.50.

The modeled total in that reviewed study was within the NEC +/-5% validation range of the selected 12-bill actual usage.

### Grain dryer - gas

A reviewed stand-alone grain-dryer gas study treated the dryer gas usage as 100% exempt processing use.

Historical observation:
- Sukup TC245 grain dryer: 100 CCF/hour rating, load factor 0.18, 24 hours/day, 18 days/year in that specific study.

This 0.18 factor is a historical observation, not yet a universal grain-dryer default. Grain-dryer duty can vary materially with crop moisture, harvest conditions, weather, dryer design, throughput, and study year.

Gas grain-drying studies may legitimately have 0% non-exempt usage when the metered gas account serves only qualifying drying/processing equipment.

### Grain elevator / office

A reviewed grain-elevator study showed:
- Corn drying bin fans: 15 HP each, historical load factor 0.80, with seasonal hours/days.
- Grain-elevator leg motors: 1.00 where hours/day reflect actual run time.
- Drag motors: 1.00 where hours/day reflect actual run time.
- Office computer, microwave, printer, lighting: 1.00 when hours represent actual energized/use time.
- Refrigerator: 0.50.
- Coffee maker: 0.90 in the reviewed study.
- A/C: site/year-specific historical value only; do not standardize.

The corn-bin fan 0.80 observation should remain provisional until additional grain-operation studies establish whether it is a repeatable NEC default.

### Seasonal agricultural-operation rule

Grain, fertilizer, and similar agricultural operations may not have meaningful fixed "business open" hours.

NEC Ledger must support:
- "As needed" or seasonal operation.
- Equipment-specific hours/day and days/year that differ substantially from office/open hours.
- Crop/harvest-year notes.
- Seasonal equipment that may run 24 hours/day for a limited number of days.
- Direct-run motors at load factor 1.00 when actual run-time hours are known.
- Duty-cycle factors where hours represent a broader operating window.

Do not force agricultural facilities into a standard 5-day/52-week retail schedule.

### Shared legal entity, different operating locations

When one legal entity operates fertilizer plants, grain dryers, grain elevators, convenience stores, or other facilities:
- Keep each physical location as its own customer/location record.
- Link locations to the same parent/legal entity when useful.
- Keep utility accounts, meters, filing history, study periods, equipment, and refund calculations at the location/account level.
- Never carry one location's load factors, exempt percentage, or filed-through date into another location merely because the FEIN or owner is the same.


### Grain-operation seasonal spike modeling

For grain operations, the actual utility-usage profile should be used to identify the realistic operating window for major seasonal equipment before assigning annual hours/days.

Grain dryers are the clearest example because they are often the dominant gas load and may also drive substantial electric use through dryer fans, legs, augers, conveyors, and related handling equipment.

Rules:
- Review the 12-bill actual-usage series before finalizing dryer and related grain-handling operating assumptions.
- Identify the seasonal high-usage window and the lower off-season / baseload pattern.
- If the bills show a concentrated spike (for example, roughly 45 days of materially elevated usage with only trivial usage during the rest of the year), the major seasonal drying/handling equipment should be modeled substantially within that observed spike window rather than spread evenly across the year.
- Set days/year for the dryer and other harvest-related heavy-use equipment commensurate with the observed seasonal window.
- Adjust hours/day within those seasonal days to represent the modeled equipment run time and to reconcile the study with actual usage.
- Do not increase annual operating days for a dryer merely to force the model to match annual usage if the billing profile shows that the load was concentrated into a short harvest period.
- Likewise, do not attribute off-season baseload to the dryer when other equipment, office loads, heaters, lighting, controls, or other continuous/occasional loads better explain it.
- Where electric usage spikes during the same period as gas-dryer usage, evaluate associated electric equipment such as dryer fans, grain legs, augers, conveyors, bin fans, and handling motors for operation during the same seasonal window.
- Equipment does not have to share identical hours/day or days/year merely because it participates in the same grain operation; use the observed usage shape plus the equipment's actual role.
- Preserve a note identifying the observed high-usage period used to support the seasonal assumptions.

### Seasonal-profile reconciliation

The +/-5% annual usage test remains required, but grain-operation studies should also receive a reasonableness check against the shape of actual usage.

A study can be within +/-5% annually and still be poorly modeled if it assigns heavy dryer usage throughout the year while the source bills show a narrow harvest spike.

For seasonal grain studies, NEC Ledger should therefore display:
- The selected 12 actual bill usage values in chronological order.
- The apparent high-usage / harvest window.
- Off-season baseline usage.
- Modeled seasonal equipment days/year.
- Modeled hours/day.
- Annual modeled usage.
- Annual actual-vs-modeled variance.

If the modeled operating window materially conflicts with the bill pattern, flag the study for review even when total annual modeled usage is within +/-5%.


## Energy-study training and change-review workflow

When ChatGPT/NEC Ledger modifies an existing energy study during training or production review, the first editable Excel output should be a marked-up review copy rather than an immediately "clean" replacement.

### Review-copy workflow

1. Preserve the original workbook unchanged.
2. Create a working review copy.
3. Visually highlight every cell or row changed, added, or materially recalculated by ChatGPT/NEC Ledger.
4. Keep formulas functional so Matt can test changes by modifying hours, days, load factors, quantities, or ratings.
5. Include a concise change log identifying:
   - Sheet
   - Cell/row or equipment item
   - Original value
   - Proposed value
   - Reason for change
   - Whether the change was formula-driven, bill-derived, or judgment/assumption
6. Matt reviews the marked-up workbook and accepts, rejects, or revises changes.
7. After approval, create a clean working copy with the review highlighting removed but the approved values/formulas retained.

### Suggested visual markup

Use a consistent workbook markup convention:
- Yellow fill: value or assumption changed by ChatGPT/NEC Ledger and awaiting review.
- Green fill: newly added row/equipment/item.
- Blue fill: formula or source-linked calculation changed.
- Red/pink fill: unresolved issue, missing data, or item requiring Matt's decision.

The exact colors may be changed later, but one stable legend should be used across all studies.

### Auditability

The clean approved workbook should not lose the training history. Preserve either:
- a separate "Change Log" worksheet in the review copy, or
- a separate archived review workbook plus the clean approved workbook.

Do not remove or overwrite the original study source.

During initial training, default to highlighting more rather than less. Once NEC's standard rules are mature, routine formula-driven changes may be handled with lighter review while unusual assumptions, load-factor changes, equipment additions/removals, study-period changes, and manual bill corrections remain prominently flagged.


### Single-phase-only calculation rule

For NEC energy studies, all electrical calculations must be performed as though the equipment is single-phase.

Rules:
- Never apply a 1.732 / square-root-of-three multiplier.
- Never convert or adjust voltage because equipment is three-phase.
- Never apply phase correction factors.
- Never add power-factor adjustments unless Matt explicitly changes NEC methodology in the future.
- If a nameplate indicates three-phase equipment, preserve that fact only as source/reference information; it must not change the calculation.
- Use the standard NEC watts, volts x amps, or horsepower formulas exactly as though the equipment were single-phase.


## Iowa energy sales-tax exemption certificate engagements

NEC occasionally prepares an Iowa Sales Tax Exemption Certificate for Energy Used in Processing or Agriculture instead of, or in addition to, a prior-period refund claim.

The current NEC master supplied for this workflow is:
- Iowa Sales Tax Exemption Certificate - Energy Used in Processing or Agriculture
- Form 31-113a (06/19/19), with instructions 31-113b (06/14/16)

This certificate is for FUTURE energy purchases. It is provided to the energy seller / utility, not filed with the Iowa Department of Revenue. Prior-period refunds continue to use IA 843. The certificate may be valid for up to three years and must be supported by documentation showing the exempt/taxable energy-use percentages when separate metering is impractical.

### Ledger case type

NEC Ledger must support a case type of:
- Utility Refund
- Energy Tax Exemption Certificate

Exemption-certificate cases are uncommon but must remain searchable and linked to the same customer/location, utility provider, account, meter, energy study, documents, activity, and receivables history.

### Exemption-certificate fields

Track at minimum:
- Customer/location
- Utility seller/provider
- Fuel: Electricity, Gas, or Other
- Reason for exemption: Grain drying, Raising livestock, Generating electricity, Data center, Processing, Manufacturing, or Other
- Effective date
- Certificate expiration / renewal-due date
- Meter number
- Utility account number
- Exempt percentage
- Taxable percentage
- Supporting energy-study status
- Date certificate provided to seller
- Date seller acceptance/confirmation was received, if available
- Negotiated flat NEC fee
- Status / next action / notes
- Current certificate form version used

Exempt % + Taxable % must equal 100% before the certificate is considered ready.

### Fee treatment

Exemption-certificate work is billed as a negotiated FLAT FEE rather than NEC's percentage-of-refund fee.

NEC Ledger must:
- store the negotiated flat fee on the case;
- display it as the projected invoice amount;
- carry that amount to Receivables when an invoice is created;
- not calculate a percentage fee from a refund amount for an exemption-only case.

### Renewal control

Because the supplied Iowa certificate states that certificates are valid for up to three years:
- store an explicit expiration / renewal-due date;
- suggest a date three years after the effective date when no shorter date is known;
- keep the suggested date editable;
- surface an attention flag as renewal approaches or becomes overdue;
- preserve prior certificates rather than overwriting them when a renewal is prepared.

### Document-generation gate

Before generating a final exemption certificate, confirm:
- the correct customer/location;
- seller/provider;
- fuel;
- reason for exemption;
- effective date;
- meter/account;
- exempt/taxable percentages totaling 100%;
- supporting energy study when required;
- authorized signer information.

The final certificate must be delivered to the utility/seller and retained in the NEC case file. Do not route it to Iowa DOR as though it were an IA 843 refund filing.


## Service-address identity, three-year lookback, and study/refund-period overlap

### Service address must match the energy study

The utility SERVICE ADDRESS, not the mailing/remittance address, is the location that must correspond to the energy study.

Rules:
- Match the energy study to the utility service address tied to the studied account/meter.
- Ignore mailing address differences when validating location identity.
- A provider bill may abbreviate the service address or omit the city/state and show only the street number/name. That is acceptable when the street address, account/meter, customer/location context, and surrounding records make the service-location identity clear.
- Do not reject a valid match solely because the bill omits the city.
- If the bill shows a materially different service street/address from the study, stop and flag the mismatch before using the bill in the study or tax calculation.
- Preserve the source service address as shown on the bill and the normalized study service address used for matching.

### NEC operational three-year lookback rule

For NEC refund preparation, do not include tax periods that go back more than three years from the contemplated filing date / current filing window.

Operational rule:
- Treat three years as the normal maximum lookback.
- When the oldest potentially refundable month is the currently open month three years prior, NEC may choose to sacrifice/exclude that oldest partial/open month rather than risk including an out-of-window period.
- Example business rule: if filing around August 31, 2026, do not attempt to claim August 2023 simply to capture the oldest edge month.
- It is acceptable to exclude one older bill/period at the beginning of the claim when needed to keep the filing comfortably within the three-year window.
- Excluding an older bill from the REFUND CLAIM does not require excluding it from a separate 12-bill ENERGY-STUDY validation period if that bill is otherwise part of the representative consecutive-bill study.
- Record any intentionally excluded edge bill/period in the audit trail and mark it "not claimed" rather than "previously refunded."

Before final filing, NEC Ledger should compare the proposed claim start with the filing-date lookback window and flag any period that may be outside NEC's three-year operating rule.

### Energy-study period may overlap a prior refund period

The 12 consecutive bills used to validate an energy study are a REPRESENTATIVE USAGE STUDY PERIOD and do not have to equal the tax-refund claim period.

Therefore:
- The selected 12-bill energy-study period may overlap months/bills that were already included in a prior filed refund.
- Prior-refund overlap does NOT invalidate those bills for purposes of calculating actual 12-bill usage and validating the equipment model.
- The +/-5% usage validation should continue to use all 12 selected consecutive study bills.
- The TAX BREAKOUT sheets for the new refund must exclude any tax periods already included in a prior filed refund.
- Never double-claim tax merely because an overlapping bill was used in the energy-study usage validation.

For a repeat refund:
1. Determine the prior filed-through date separately for electric and gas.
2. Select the representative 12-bill study period needed to validate current equipment usage.
3. Calculate actual study usage from all selected study bills, even if early bills overlap the prior refund.
4. Determine the new eligible refund period beginning after the prior filed-through date, subject also to the three-year lookback rule.
5. Populate the state/county tax-breakout sheets only with bills/tax attributable to the new unclaimed refund period.
6. Preserve a bill-level flag showing whether each source bill is:
   - Study + claim
   - Study only (already refunded / overlap)
   - Claim only
   - Excluded / not claimed

This separation between STUDY PERIOD and REFUND PERIOD is mandatory in NEC Ledger and in the Excel working workbook.


## Service-address matching and three-year refund lookback

### Service address controls the study linkage

For utility bills used in an NEC energy study or refund calculation, the SERVICE ADDRESS / service location must match the location shown on the energy study.

Rules:
- Do not use the mailing address as the location-matching field.
- Match on service address, account, meter/service identifier, and fuel as available.
- A bill may omit the city/state and show only the street number/name; that can still be an acceptable match when the street address, account, meter, provider, and customer context clearly identify the same service location.
- If the service address conflicts with the study location, flag the bill for review and do not silently include it.
- Mailing-address differences alone are not a reason to reject a bill.

### Three-year refund lookback

NEC refund claims may not reach back more than three years from the filing date.

NEC Ledger must calculate an earliest normally-eligible claim date from the intended filing date and flag any bill/period older than that boundary.

Business rule:
- Do not automatically include a full calendar month that clearly falls outside the three-year lookback.
- NEC may use judgment near a month boundary when the current month has not closed and may prefer to preserve one newer month at the front end rather than force inclusion of an older month at the back end.
- Matt makes that judgment; NEC Ledger should flag the boundary and show which bill(s) would be dropped or retained.
- Example principle: if filing at the end of August 2026, do not attempt to claim August 2023 merely to maximize the back end.
- Any intentionally excluded older bill remains excluded from the refund calculation and audit trail rather than being marked as refunded.

### Study period may overlap a prior refund

The 12-consecutive-bill period used to validate an energy study is independent from the tax-refund claim period.

Therefore:
- It is acceptable for the 12-bill study period to overlap months already included in a prior filed refund.
- Prior-refund overlap does NOT invalidate the energy study.
- The tax breakout sheets must include only tax from periods that are eligible for the NEW refund claim.
- Never carry overlapping prior-refund tax into the new State or County tax breakdown merely because those bills were used in the 12-bill usage study.
- Keep the bill available as study evidence while marking its tax component as previously claimed / excluded from the new refund.

For a repeat refund:
1. Determine the last filed-through date separately for electric and gas.
2. Determine the three-year lookback boundary from the intended new filing date.
3. Set the new tax-claim start to the later of:
   - the day after that fuel's prior filed-through date, or
   - the earliest date NEC elects to use under the three-year lookback rule.
4. Use the selected 12 consecutive bills for study validation even if some begin before the new tax-claim start.
5. Build State/County tax breakdowns only from bills/portions assigned to the new eligible claim period.

### Woodbine Food Land live-training example

Prior filed electric refund period: 12/1/2021 through 11/30/2023.
Current 12-bill study period reviewed: 8/18/2023 through 8/18/2024.

The August-November 2023 bills may remain in the 12-bill energy-study usage validation, but their tax must not appear on the next refund's tax-breakdown sheets because those periods were already included in the prior refund. The new electric refund tax period begins after 11/30/2023, subject to the three-year filing-date rule and the actual bills available for the new claim.


### Bill-level rounding before state/local split

The Woodbine Food Land repeat-refund review confirms an NEC calculation convention for combined state + local tax.

When the electric tax for a bill must be reconstructed from the taxable electric charges:
1. Calculate the combined electric tax at the applicable combined historical rate.
2. Round that combined bill-level tax to cents.
3. Split the rounded combined tax into state and local components according to the applicable state/local rate ratio.
4. Round each component to cents.
5. Aggregate those bill-level state/local components into the monthly/quarterly tax-breakdown rows.
6. Only then apply the study non-exempt percentage to the aggregated state/local tax row.

Example for a 7% combined rate consisting of 6% state + 1% local:
- Combined electric tax = ROUND(electric taxable base x 7%, 2)
- State tax = ROUND(combined electric tax x 6/7, 2)
- Local tax = ROUND(combined electric tax x 1/7, 2)

This bill-level rounding convention reproduces the prior NEC Woodbine breakout more closely than applying 6% and 1% independently to an unrounded base.

If the bill's Sales Tax line covers only the studied electric service, use the actual billed Sales Tax amount as the combined electric tax. If the bill combines tax from electric plus another taxable fuel/service, reconstruct only the studied electric portion from the electric taxable charges and applicable historical rate; do not use the whole bill's combined tax line.


### Woodbine Municipal electric tax isolation rule

For Woodbine Municipal Food Land-style bills, the displayed Sales Tax line can include tax attributable to electric, gas, and potentially other taxable items on the same invoice. Therefore the displayed whole-bill Sales Tax line must not be used as the electric tax amount.

For electric refund calculations:
- Electric taxable base = Electric charge + Demand charge.
- Electric combined tax = ROUND(Electric taxable base x 7%, 2), for periods where the applicable historical combined rate is 7%.
- State component = ROUND(Electric combined tax x 6/7, 2).
- Local component = ROUND(Electric combined tax x 1/7, 2).
- The whole-bill Sales Tax line is retained only as a reconciliation/cross-check field.
- This rule applies even when the bill shows no gas usage, because other taxable line items may still be included in the bill-level Sales Tax total.

The prior Woodbine filing provides a validation example: the October and November 2023 bill-level electric calculations aggregate to the same state and local original-tax amounts shown on NEC's prior tax-breakdown sheets.


## Exact NEC calculation-sheet and tax-breakout template fidelity

For future refund workbooks, NEC Ledger / ChatGPT must use the approved NEC Excel workbook layout as a TEMPLATE, not redesign the visible calculation or tax-breakout sheets.

### Visible-sheet rule

The following sheets must remain visually and structurally the same as the approved NEC example workbook:
- NEC calcs
- State Electric
- County Electric
- State Gas
- County Gas

Only case-specific data should change, including:
- Period / study dates
- Monthly or quarterly period labels required by the claim
- Electric or gas non-exempt percentage
- Usage amounts
- Original tax amounts
- Corrected amounts
- Refund / LOST amounts
- Applicable formulas needed to calculate those values

Do not add review banners, methodology notes, source-detail tables, explanatory paragraphs, or redesigned headers to these visible sheets.

If audit/support detail is useful, place it on separate support sheets and hide those sheets in the clean/final working workbook unless Matt asks to see them.

### Remove County # column

The "County #" column is no longer part of NEC's working tax-breakout format.

For all future State Electric, County Electric, State Gas, and County Gas sheets:
- Remove the County # column.
- Shift the remaining columns left while preserving the original NEC formatting, widths, formulas, totals, and print layout as closely as possible.
- Do not reintroduce County # unless Matt explicitly requests it.

### Template-first generation

Whenever possible, generate a new calculation workbook by copying an approved NEC example/template workbook and changing only the case-specific cells rather than recreating the workbook design from scratch.

This rule applies to both review copies and clean approved copies. Review highlighting may be used temporarily during training, but the underlying visible-sheet layout must still match the NEC template. Once approved, remove training highlighting from the clean copy without changing the template structure.

### NEC calculation-sheet formula workflow

The NEC calculation workbook is designed to provide a visible calculation trail that Matt can independently check.

For the electric portion of the NEC calcs sheet:

1. Enter the monthly electric taxable base in the lower helper section. For Woodbine-style bills this is the total of the Electric charge plus the Electric Demand charge, excluding gas and unrelated taxable charges.
2. In the helper rows, calculate:
   - State electric tax = taxable electric base x 6%
   - Local option electric tax = taxable electric base x 1%
   - Total electric tax = taxable electric base x 7%
3. Preserve those helper cells as Excel formulas, following the original NEC workbook design.
4. Copy the resulting monthly State and Local amounts into the corresponding month rows in the upper calculation section. This upper area acts as the source for the quarterly/monthly tax-period rollups used on the breakout sheets.
5. Do not bypass the lower helper calculation by directly hardcoding only the quarterly breakout values. Matt must be able to see and check the monthly calculation trail.

For Woodbine Food Land in the current training example, the relevant lower helper rows are 60-68, with taxable electric base in column F, State in D, Local in E, and total tax in G.

### State Electric formula chain

In the approved NEC tax-breakout template after removal of the County # column:
- Cell C5 contains the electric non-exempt percentage.
- Column B contains Original State Tax.
- Column C contains Corrected Amount, calculated as ROUND(B[row] * $C$5, 2).
- Column D contains Tax to be Refunded, calculated as B[row] - C[row].
- Row 32 totals the original, corrected, and refund columns.
- State Electric D33 links to the combined local-option refund from County Electric D33.
- State Electric D34 equals State Electric D32 + D33 and is the total electric refund due.

These cells must remain formulas in the Excel workbook so Matt can inspect and modify inputs and see the workbook recalculate.

### County Electric formula chain

In the approved NEC template after removal of the County # column:
- County Electric C5 links automatically to State Electric C5.
- Column B contains Original Local Option Tax.
- Column C contains Corrected Amount, calculated as ROUND(B[row] * $C$5, 2).
- Column D contains LOST / refundable local tax, calculated as B[row] - C[row].
- Row 32 totals the original, corrected, and LOST columns.
- D33 equals D32 and is linked back to State Electric D33.

The same formula-chain concept applies to State Gas and County Gas when gas is part of the claim.

### Formula-preservation control

Do not replace derived cells with hardcoded calculated results when the approved NEC template expects formulas. User-entered/source-derived inputs may be hardcoded, but corrected amounts, refunds, subtotals, cross-sheet links, and total-refund cells must remain formulas.

Excel calculation mode should be set to automatic/full recalculation on open so the formulas update when Matt changes an input.

### Visible NEC calculation roll-up mapping

For the current NEC calculation-sheet layout, preserve the following visible roll-up behavior so Matt can audit the work directly in the workbook.

Electric State roll-up on NEC calcs:
- D15 contains Month 12 2023 State tax and G7 must equal D15.
- D16:D18 are Q1 2024 monthly State tax and G8 must equal SUM(D16:D18).
- D19:D21 are Q2 2024 monthly State tax and G9 must equal SUM(D19:D21).
- D22:D23 are Months 7 and 8 2024 State tax and G10 must equal SUM(D22:D23).

Electric Local Option roll-up on NEC calcs:
- E15 contains Month 12 2023 local tax; F23 must read `Month 12 2023` and G23 must equal E15.
- E16:E18 are Q1 2024 local tax and G24 must equal SUM(E16:E18).
- E19:E21 are Q2 2024 local tax and G25 must equal SUM(E19:E21).
- E22:E23 are Months 7 and 8 2024 local tax and G26 must equal SUM(E22:E23).

The lower helper section remains the visible source calculation:
- F60:F68 = monthly electric taxable base (Electric + Electric Demand only for Woodbine).
- D60:D68 = F row x 6% State.
- E60:E68 = F row x 1% Local Option.
- G60:G68 = F row x 7% total electric tax.

### Visible formula-result requirement

Formula cells must not only contain formulas; their calculated numeric results must also be visible when the workbook is opened or previewed.

For generated workbooks:
- Preserve formulas in derived cells.
- Save/recalculate so the workbook contains current displayed values for those formulas.
- Validate that State Electric corrected amounts/refunds, County Electric corrected amounts/LOST, NEC calcs helper taxes, period roll-ups, subtotals, and total refund cells all display numeric results rather than blanks.
- A workbook with correct formulas but blank visible results is not complete.

For State Electric specifically:
- C11:C31 calculate Original State Tax x C5 non-exempt percentage.
- D11:D31 calculate B minus C.
- D32 is total State refund.
- D33 links the total County Electric local-option refund.
- D34 equals D32 + D33 and is the total electric refund.

For County Electric:
- C5 links to State Electric C5.
- C11:C31 calculate Original Local Tax x C5.
- D11:D31 calculate B minus C.
- D32 totals the local-option refund.
- D33 equals D32 and feeds State Electric D33.

### Remove legacy SILO label from state breakout sheets

The legacy SILO header must not be visible on printed State Electric breakout sheets.

Rules:
- Clear/remove the SILO header from the State Electric tax-breakout template.
- Do not print or display SILO to the customer, utility provider, or state.
- Preserve all other approved State Electric formatting and formula behavior.
- When State Gas is built from the same legacy template logic, use the same clean state-facing presentation and do not surface an obsolete SILO label unless Matt explicitly requests it.

### Gas calculation workflow mirrors electric

The gas side should use the same general audit logic as the approved electric workflow:
- isolate only the taxable gas/fuel charges relevant to the studied service;
- calculate applicable historical state/local tax using visible helper formulas;
- carry monthly values into the upper NEC-calcs period rollups;
- feed those rollups into State Gas and County Gas breakout sheets;
- apply the gas non-exempt percentage through formulas;
- calculate corrected tax, refundable tax, subtotals, local-option totals, and total refund through linked formulas;
- keep all derived results visible so Matt can independently audit the workbook.

Do not combine electric, gas, or unrelated taxable charges when calculating the fuel-specific tax base.

### Rolling NEC-calcs calendar template

Maintain a reusable master NEC-calcs workbook instead of rebuilding the month/year calendar from scratch for each refund.

Template maintenance rule:
- Keep roughly 3 to 3.5 years of monthly rows available in the calculation sheet.
- About every three months, remove the oldest three months that are clearly beyond any realistic refund lookback and append the next three months at the bottom.
- Update every synchronized month/year area on the NEC-calcs sheet together so helper sections and rollup sections stay aligned.
- Preserve formulas, formatting, print layout, and tax-breakout links when rolling the calendar forward.
- If six or more obsolete months have accumulated, it is acceptable to roll six months at once.
- Do not remove months that could still be needed for a pending refund, a representative 12-bill study, or an unresolved prior-period review.

This rolling-calendar rule is a template-maintenance task and should not require rebuilding each customer workbook from scratch.
