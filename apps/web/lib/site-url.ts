export function publicSiteUrl():string|null {
 const raw=process.env.SITE_URL; if(!raw)return null;
 try {const u=new URL(raw);if(u.protocol!=='https:'||['localhost','127.0.0.1','::1','[::1]'].includes(u.hostname))return null;return u.origin;} catch{return null;}
}
