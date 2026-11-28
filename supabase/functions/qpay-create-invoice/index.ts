import {createClient} from "npm:@supabase/supabase-js@2.49.4";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"POST,OPTIONS","Cache-Control":"no-store"};
Deno.serve(async req=>{
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:cors});
if(req.method==="OPTIONS")return new Response(null,{headers:cors});
if(req.method!=="POST")return reply({error:"method_not_allowed"},405);
if(Deno.env.get("QPAY_ENABLE_REAL_INVOICES")!=="true")return reply({error:"real_invoices_disabled"},503);
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
const token=req.headers.get("Authorization")?.match(/^Bearer (.+)$/i)?.[1];
if(!token)return reply({error:"unauthorized"},401);
const {data:{user},error:ae}=await db.auth.getUser(token);
if(ae||!user)return reply({error:"unauthorized"},401);

 // Staging activation is intentionally restricted to a separately configured test user.
if(user.id!==Deno.env.get("QPAY_TEST_USER_ID"))return reply({error:"test_user_required"},403);
const names=["QPAY_API_KEY","QPAY_MERCHANT_ID","QPAY_BANK_CODE","QPAY_ACCOUNT_NUMBER","QPAY_IBAN","QPAY_ACCOUNT_NAME","QPAY_CALLBACK_URL"];
const cfg=Object.fromEntries(names.map(n=>[n,Deno.env.get(n)?.trim()||""]));
if(names.some(n=>!cfg[n]))return reply({error:"configuration_missing"},503);
let callback:URL;try{callback=new URL(cfg.QPAY_CALLBACK_URL);if(callback.protocol!=="https:"||callback.hostname!==new URL(Deno.env.get("SUPABASE_URL")!).hostname)throw Error()}catch{return reply({error:"invalid_callback_configuration"},503)}
let b;try{b=await req.json()}catch{return reply({error:"invalid_json"},400)}
if(typeof b?.checkout_key!=="string"||!/^[0-9a-f-]{36}$/i.test(b.checkout_key)||!Array.isArray(b.items)||!b.address)return reply({error:"invalid_checkout"},400);
const {data:id,error:ce}=await db.rpc("meiro_create_qpay_order",{p_items:b.items,p_address:b.address,p_key:b.checkout_key,p_user:user.id});
if(ce||!id)return reply({error:"checkout_failed"},409);
const fields="invoice_id,amount_mnt,status,qr_image,payment_url,expires_at";
const {data:claim,error:cl}=await db.from("qpay_payments").update({invoice_requested_at:new Date().toISOString()}).eq("order_id",id).eq("status","creating").is("invoice_requested_at",null).select(fields).maybeSingle();
if(cl)return reply({error:"database_error",order_id:id},500);
if(!claim){const {data:p,error:e}=await db.from("qpay_payments").select(fields).eq("order_id",id).maybeSingle();return reply({order_id:id,payment:p},e?500:200)}
let response:Response;let result:any;
try{response=await fetch("https://api.sutainbuyant.com/api/v1/qpay-gateway/invoices",{method:"POST",redirect:"error",headers:{Authorization:"Bearer "+cfg.QPAY_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({merchant_id:cfg.QPAY_MERCHANT_ID,amount:claim.amount_mnt,description:"MEIRO-"+id,callback_url:callback.href,expires_in_days:1,bank_accounts:[{bank_code:cfg.QPAY_BANK_CODE,account_number:cfg.QPAY_ACCOUNT_NUMBER,iban_number:cfg.QPAY_IBAN,account_name:cfg.QPAY_ACCOUNT_NAME,is_default:true}]}),signal:AbortSignal.timeout(15000)});result=await response.json()}catch{await db.from("qpay_payments").update({status:"unknown"}).eq("order_id",id);return reply({error:"invoice_outcome_unknown",order_id:id},502)}
if(!response.ok||typeof result.id!=="string"||!result.id){await db.from("qpay_payments").update({status:"unknown"}).eq("order_id",id);return reply({error:"invoice_not_confirmed",gateway_status:response.status,order_id:id},502)}
const {data:payment,error:save}=await db.from("qpay_payments").update({invoice_id:result.id,status:"pending",qr_image:typeof result.qr_image==="string"?result.qr_image:null,payment_url:typeof result.qPay_shortUrl==="string"&&result.qPay_shortUrl.startsWith("https://")?result.qPay_shortUrl:null,updated_at:new Date().toISOString()}).eq("order_id",id).select(fields).single();
if(save)return reply({error:"invoice_reconciliation_required",order_id:id},500);
return reply({order_id:id,payment});
});