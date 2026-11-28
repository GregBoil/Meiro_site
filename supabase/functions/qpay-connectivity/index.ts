import { createClient } from "npm:@supabase/supabase-js@2.49.4";
Deno.serve(async (req) => {
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
 if(req.method!=="POST") return reply({error:"Method not allowed"},405);
 const auth=req.headers.get("Authorization")??"";
 const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if (!(serviceKey && auth === "Bearer "+serviceKey)) {
 const client=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:auth}}});
 const {data,error}=await client.auth.getUser();
 if(error||!data.user) return reply({error:"Unauthorized"},401);
 const {data:allowed,error:checkError}=await client.rpc("is_meiro_admin");
 if(checkError||allowed!==true) return reply({error:"Forbidden"},403);
 }
 const key=Deno.env.get("QPAY_API_KEY");
 if(!key) return reply({error:"QPAY_API_KEY not configured"},503);
 try {
 const r=await fetch("https://api.sutainbuyant.com/api/v1/qpay-gateway/invoices",{method:"POST",headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json"},body:"{}",signal:AbortSignal.timeout(10000)});
 return reply({gateway_status:r.status,authentication_probe:r.status===422?"accepted_validation_rejected":r.status===401?"unauthorized":r.status===403?"forbidden":"unexpected_response"});
 } catch {return reply({error:"Gateway unreachable"},502);}
});