// Keep authentication redirects on the local preview origin.
const {spawn}=require('node:child_process');
const origin='http://localhost:3100';
const child=spawn(process.execPath,[require.resolve('next/dist/bin/next'),'start','-p','3100'],{stdio:'inherit',env:{...process.env,AUTH_URL:origin,NEXTAUTH_URL:origin}});
child.on('exit',code=>{process.exitCode=code??1;});
