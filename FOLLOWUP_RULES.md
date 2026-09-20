# NEC Ledger - Time-Based Follow-Up Rules

## Core design
NEC Ledger supports system-generated and user-configurable time-based follow-up events tied to the underlying customer, refund case, invoice, collection matter, or administrative record.

Follow-up items appear in:
- Home -> Needs Attention
- Reports -> Follow-Ups & Aging
- The related record's activity/history

Completing the underlying triggering condition automatically clears the exception while preserving the event history.

## Rule 1 - Claim not filed within 30 days of utility-record request

**Trigger event:** Utility records requested date is entered for a refund case.

**Exception condition:** More than 30 calendar days have elapsed since the utility-record request date AND the refund case has no Claim Filed Date.

**Behavior:**
- The item becomes overdue on day 31.
- The flag remains active until Claim Filed Date is entered or the case is explicitly closed/cancelled with a documented reason.
- The flag applies whether or not the utility records have been received; the outstanding-record status should be shown so the user can immediately see the blocker.
- The Home dashboard shows the item under Needs Attention.
- The recurring follow-up report includes every active case meeting this condition.
- The report should show at minimum: Customer, Refund Case, Utility Provider, Records Requested Date, Records Received Date/status, Days Since Request, Claim Filed Date/status, Last Follow-Up, Next Action, and Case Owner.
- Clicking the exception opens the associated refund case directly.
- Logging a follow-up adds an immutable activity event and may set a next follow-up date, but does not clear the 30-day claim-filing exception unless the Claim Filed Date is entered or the case is formally closed/cancelled.

## Periodic review
The standard management report for this rule should be generated every two weeks and should include all currently active exceptions, oldest first.

## Future rules
The same follow-up engine should support configurable rules such as:
- X days after filing with no state response
- X days after invoice issue with no payment
- X days after collection referral with no update
- One-time customer follow-up on a selected date
- Recurring administrative deadlines
