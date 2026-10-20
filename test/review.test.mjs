import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewState} from '../assets/review.mjs';
test('passing sample checks never imply completed review or verified refund',()=>{
  const review=reviewState({preview:true,accounts:[{account:{id:'electric'},validation:{flags:[]}}],followups:[]});
  assert.equal(review.tasks.length,3);
  assert.equal(review.status.Study,'Needs review');
  assert.equal(review.status.Filing,'Locked');
  assert.ok(!Object.values(review.status).includes('Complete'));
});
test('review issues preserve account context and direct to the relevant work',()=>{
  const review=reviewState({accounts:[{account:{id:'gas'},validation:{flags:[{code:'STUDY_DATES',message:'Wrong dates'}]}}],followups:[{}]});
  assert.equal(review.issues[0].accountId,'gas');
  assert.equal(review.issues[0].target,'Study');
  assert.equal(review.status.Study,'Needs attention');
  assert.equal(review.status['Follow-up'],'Action recorded');
});
