"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import {API} from "@/lib/api";

async function detail(response:Response){
  try{const body=await response.json();return body.detail||JSON.stringify(body)}
  catch{return await response.text()||`${response.status} ${response.statusText}`}
}

export default function RebuildBrainButton({productId}:{productId:string}){
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  async function rebuild(){
    setBusy(true);setMessage("Reading current public sources…");
    try{
      const ingest=await fetch(`${API}/v1/products/${productId}/ingest`,{method:"POST"});
      if(!ingest.ok)throw new Error(`Source refresh failed: ${await detail(ingest)}`);
      setMessage("Building a verified Product Brain…");
      const brain=await fetch(`${API}/v1/products/${productId}/build-brain`,{method:"POST"});
      if(!brain.ok)throw new Error(`Analysis failed: ${await detail(brain)}`);
      setMessage("Analysis updated.");router.refresh();
    }catch(error){setMessage(error instanceof Error?error.message:"Analysis failed")}
    finally{setBusy(false)}
  }
  return <div><button className="button" type="button" disabled={busy} onClick={rebuild}>{busy?"Analyzing…":"Refresh and rebuild analysis"}</button>{message&&<p>{message}</p>}</div>;
}
