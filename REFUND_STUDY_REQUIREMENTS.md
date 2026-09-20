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
