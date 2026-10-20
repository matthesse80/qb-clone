// Review readiness describes available evidence, never merely visited sections.
export function reviewState(data) {
  const issues=data.accounts.flatMap(a=>a.validation.flags.map(f=>({...f,accountId:a.account.id,
    target:/STUDY|BILLS|VARIANCE|USAGE|COVERAGE|CONTINUITY/.test(f.code)?'Study':'Bills'})));
  const tasks=[
    {title:'Bring in the original records',description:data.preview?'These are sample bills. We need the actual utility bills, corrections and prior filing records.':'Original documents must be verified before the case can proceed.',target:'Source Docs',action:'See required records'},
    {title:'Confirm the signer and filing authority',description:'Check the legal entity, signed forms and documented signer history.',target:'State Forms',action:'Review form requirements'},
    {title:'Reconcile the refund calculation',description:'The verified refund amount is pending. Match the calculation workbook to the included bills.',target:'Calculations',action:'Review tax inputs'}
  ];
  const status={Customer:'Needs review','Utility Accounts':'Needs review','Source Docs':'Not started',
    Study:issues.some(f=>f.target==='Study')?'Needs attention':'Needs review',Bills:'Needs review',Validation:issues.length?'Needs attention':'Needs review',
    Calculations:'Not started','State Forms':'Not started',Filing:'Locked','Follow-up':data.followups.length?'Action recorded':'Not started',Refund:'Not started',Invoice:'Not started'};
  return {issues,tasks,status};
}
