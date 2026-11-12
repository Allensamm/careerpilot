import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = process.env.TEST_URL || "http://127.0.0.1:8000/";
const widths = [{width:1440,height:900},{width:768,height:1024},{width:390,height:844},{width:320,height:700}];
const browser = await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
let errors = 0;
try{
  for (const size of widths){
    const page=await browser.newPage({viewport:size,reducedMotion:size.width<900?"reduce":"no-preference"});
    const crashes=[];
    page.on("pageerror",e=>crashes.push(e.message));
    await page.goto(base,{waitUntil:"domcontentloaded",timeout:25000});
    await page.locator("#hero-title").waitFor({state:"visible"});
    assert.match(await page.locator("#hero-title").innerText(),/Your experience deserves to be/i);
    const dimensions=await page.evaluate(()=>({
      doc:document.documentElement.scrollWidth,viewport:window.innerWidth,
      heroVisible:(()=>{const e=document.getElementById("hero-title");return !!e && getComputedStyle(e).visibility!=="hidden"})()
    }));
    assert.ok(dimensions.doc<=dimensions.viewport+2,
      "Horizontal overflow at "+size.width+"px: scroll width "+dimensions.doc);
    assert.ok(dimensions.heroVisible,"Hero missing at "+size.width);
    if(size.width<=960){
      await page.locator("#menu-toggle").click();
      assert.equal(await page.locator("#mobile-nav").isVisible(),true,"Mobile menu didn't open");
      await page.locator("#mobile-nav a[href='#how-it-works']").click();
      assert.equal(await page.locator("#mobile-nav").isVisible(),false,"Mobile menu didn't close");
    }else{
      assert.equal(await page.locator(".cp-nav a[href='#platform']").isVisible(),true);
    }
    await page.locator("#tab-linkedin").click();
    assert.equal(await page.locator("#panel-linkedin").isVisible(),true,
      "LinkedIn explanation tab didn't switch");
    assert.equal(await page.locator("#panel-cv").isVisible(),false);
    assert.deepEqual(crashes,[],"Page JS errors at "+size.width);
    await page.close();
    console.log("PASS",size.width+"x"+size.height,"no overflow, navigation and tabs work");
  }
}finally{
  await browser.close();
}
if(errors)process.exitCode=1;