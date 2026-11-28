import {createClient} from "npm:@supabase/supabase-js@2.49.4";
Deno.serve(async req=>{
const headers={"Content-Type":"application/json","Cache-Control":"no-store"};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
if(req.method!=="POST")return reply({error:"method_not_allowed"},405);
const token=req.headers.get("Authorization")?.match(/^Bearer (.+)$/i)?.[1];
if(!token)return reply({error:"unauthorized"},401);
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
const {data:{user},error:authError}=await db.auth.getUser(token);
if(authError||!user)return reply({error:"unauthorized"},401);
let body;try{body=await req.json()}catch{return reply({error:"invalid_json"},400)}
const id=body?.order_id;
if(typeof id!=="string"||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return reply({error:"invalid_order"},400);
const {data:order,error:oe}=await db.from("orders").select("id,status,payment_provider").eq("id",id).eq("user_id",user.id).maybeSingle();
if(oe)return reply({error:"database_error"},500);
if(!order||order.payment_provider!=="qpay")return reply({error:"not_found"},404);
const {data:payment,error:pe}=await db.from("qpay_payments").select("invoice_id,amount_mnt,status,qr_image,payment_url,expires_at").eq("order_id",id).maybeSingle();
if(pe)return reply({error:"database_error"},500);
if(!payment)return reply({error:"not_found"},404);
return reply({order_status:order.status,payment});
});