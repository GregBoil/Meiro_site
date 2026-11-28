// Staging observation endpoint only. No payment or inventory mutation.
Deno.serve(async req=>{
 if(req.method!=="GET"&&req.method!=="POST")return new Response(null,{status:405});
 const url=new URL(req.url);
 const keys=[...new Set(url.searchParams.keys())].slice(0,30).map(k=>k.slice(0,80));
 console.info(JSON.stringify({event:"qpay_callback_unverified",method:req.method,queryKeys:keys,contentType:req.headers.get("content-type")?.slice(0,100),signatureHeaderPresent:req.headers.has("x-signature"),timestampHeaderPresent:req.headers.has("x-timestamp")}));
 return Response.json({received:true,verified:false},{status:202,headers:{"Cache-Control":"no-store"}});
});