async function submit(form,path,message){
  message.textContent='Working…';
  const input=Object.fromEntries(new FormData(form));
  const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
  const result=await response.json();
  if(!response.ok)throw new Error(result.error??'Unable to complete the request.');
  return result;
}
const login=document.querySelector('#login-form');const loginMessage=document.querySelector('#login-message');
login.addEventListener('submit',async event=>{event.preventDefault();try{await submit(login,'/api/auth/login',loginMessage);location.assign('/workspace.html');}catch(error){loginMessage.textContent=error.message;}});
const recovery=document.querySelector('#recovery-form');const recoveryMessage=document.querySelector('#recovery-message');
recovery.addEventListener('submit',async event=>{event.preventDefault();try{const result=await submit(recovery,'/api/auth/recover',recoveryMessage);
  recoveryMessage.textContent=`Access reset. Save this new recovery code now: ${result.recoveryCode}`;recovery.reset();}catch(error){recoveryMessage.textContent=error.message;}});
