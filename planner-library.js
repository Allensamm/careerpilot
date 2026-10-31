/* CareerPilot planner library: discovery, PDF preview and interactive worksheets */
(() => {
  const init = () => {
    const grid = document.getElementById("digital-planner-grid");
    if (!grid) return;
    const cards = Array.from(grid.querySelectorAll(".digital-planner-card"));
    const search = document.getElementById("planner-search");
    const count = document.getElementById("planner-result-count");
    const empty = document.getElementById("planner-no-results");
    const filters = Array.from(document.querySelectorAll("[data-planner-filter]"));
    const dialog = document.getElementById("planner-experience");
    const status = document.getElementById("planner-experience-status");
    const previewView = document.getElementById("planner-preview-view");
    const workspaceView = document.getElementById("planner-workspace-view");
    const strip = document.getElementById("planner-page-strip");
    const canvas = document.getElementById("planner-document-canvas");
    const pageIndicator = document.getElementById("planner-page-indicator");
    const workspacePages = document.getElementById("planner-workspace-pages");
    const workspaceContent = document.getElementById("planner-workspace-content");
    const saveState = document.getElementById("planner-save-state");
    const pageCache = new Map();
    let active = "all";
    let current = null;
    let currentPdf = null;
    let currentPages = [];
    let currentPreviewPage = 1;
    let currentWorksheet = 0;
    let renderTask = null;
    let localStorageAvailable = true;
    let currentState = { pages:{} };

    const escapeHtml = value => String(value == null ? "" : value)
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
    const safeFileName = value => String(value || "careerpilot-planner").toLowerCase().replace(/[^a-z0-9-]+/g,"-");
    const normalise = value => String(value || "").replace(/\s+/g," ").trim().toUpperCase();

    const filterCards = () => {
      const query = (search?.value || "").trim().toLowerCase();
      let visible = 0;
      cards.forEach(card => {
        const categoryMatch = active === "all" || card.dataset.category === active;
        const searchMatch = !query || (card.dataset.search || "").includes(query);
        const show = categoryMatch && searchMatch;
        card.hidden = !show;
        if (show) visible++;
      });
      if (count) count.textContent = visible === 1 ? "Showing 1 planner" : "Showing " + visible + " planners";
      if (empty) empty.hidden = visible !== 0;
    };
    filters.forEach(button => button.addEventListener("click", () => {
      active = button.dataset.plannerFilter || "all";
      filters.forEach(item => {
        const selected = item === button;
        item.classList.toggle("is-active", selected);
        item.setAttribute("aria-pressed", selected ? "true" : "false");
      });
      filterCards();
    }));
    if (search) search.addEventListener("input", filterCards);
    filterCards();

    const cardDetails = button => {
      const card = button.closest(".digital-planner-card");
      if (!card) return null;
      const link = card.querySelector(".planner-download");
      if (!link) return null;
      const file = link.getAttribute("href");
      return {
        card,
        title: card.querySelector("h3")?.textContent.trim() || "CareerPilot planner",
        description: card.querySelector(".planner-card-body > p")?.textContent.trim() || "",
        url: new URL(file, window.location.href).href,
        file,
        slug: safeFileName(file.split("/").pop().replace(/\.pdf$/i,"")),
        fallbackTitles: Array.from(card.querySelectorAll(".planner-preview li")).map(item => item.textContent.trim()),
        download: link
      };
    };

    const parsePdfPage = (items, pageNumber, fallbackTitle) => {
      const texts = items.map(item => String(item.str || "").trim()).filter(Boolean);
      const find = value => texts.findIndex(text => normalise(text) === normalise(value));
      const pageMarker = texts.findIndex(text => /^PAGE\s+\d+\s+\/\s+\d+$/i.test(text));
      const thinkIndex = find("THINK IT THROUGH");
      const progressIndex = find("PROGRESS / TRACKING");
      const reviewIndex = find("REVIEW AND NEXT STEP");
      const checklistLabelIndex = progressIndex >= 6 ? progressIndex - 6 : -1;
      const title = pageMarker >= 0 ? texts[pageMarker + 1] : (fallbackTitle || "Worksheet " + pageNumber);
      const subtitle = pageMarker >= 0 ? (texts[pageMarker + 2] || "") : "";
      const thinkingPrompt = thinkIndex >= 0 && checklistLabelIndex > thinkIndex
        ? texts.slice(thinkIndex + 1, checklistLabelIndex).join(" ")
        : "What is important to consider before you begin?";
      const checklistTitle = checklistLabelIndex >= 0 ? texts[checklistLabelIndex] : "Checklist";
      const checklistItems = progressIndex >= 6 ? texts.slice(progressIndex - 5, progressIndex) : [];
      let columns = [];
      if (progressIndex >= 0) {
        const firstRow = texts.findIndex((text,index) => index > progressIndex && /^0?1$/.test(text));
        if (firstRow > progressIndex) columns = texts.slice(progressIndex + 1, firstRow);
      }
      columns = columns.filter(Boolean).slice(0,5);
      if (columns.length < 2) columns = ["Task / item","Owner","Due date","Status"];
      const reflectionPrompt = reviewIndex >= 0 ? (texts[reviewIndex + 1] || "What is your next step?") : "What will you do next?";
      return {
        number:pageNumber, title, subtitle, thinkingPrompt, checklistTitle,
        checklistItems:checklistItems.length ? checklistItems : ["Confirm the priority","Identify the next action","Assign an owner","Set a realistic deadline","Review progress"],
        columns, reflectionPrompt
      };
    };

    const loadPlanner = async info => {
      if (pageCache.has(info.slug)) return pageCache.get(info.slug);
      const result = { pdf:null, pages:[], pageCount:8, pdfError:false };
      const fallback = info.fallbackTitles;
      if (window.pdfjsLib) {
        try {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
          const pdf = await window.pdfjsLib.getDocument({url:info.url}).promise;
          result.pdf = pdf;
          result.pageCount = pdf.numPages;
          for (let pageNumber=1; pageNumber<=pdf.numPages; pageNumber++) {
            if (pageNumber === 1) {
              result.pages.push({number:1,title:"Cover",subtitle:info.title,cover:true,checklistItems:[],columns:[]});
              continue;
            }
            const page = await pdf.getPage(pageNumber);
            const content = await page.getTextContent();
            result.pages.push(parsePdfPage(content.items,pageNumber,fallback[pageNumber-2]));
          }
        } catch (error) {
          console.warn("CareerPilot planner preview could not render PDF:",error);
          result.pdfError = true;
        }
      } else {
        result.pdfError = true;
      }
      if (!result.pages.length) {
        result.pages = [{number:1,title:"Cover",subtitle:info.title,cover:true}];
        fallback.forEach((title,index)=>result.pages.push({
          number:index+2,title,subtitle:info.description,
          thinkingPrompt:"Use this worksheet to capture your plan and next steps.",
          checklistTitle:"Checklist",
          checklistItems:["Clarify the outcome","Identify the next action","Assign an owner","Set a deadline","Review progress"],
          columns:["Task / item","Owner","Due date","Status"],
          reflectionPrompt:"What is your next step?"
        }));
        result.pageCount = result.pages.length;
      }
      pageCache.set(info.slug,result);
      return result;
    };

    const setStatus = message => { if(status) status.textContent = message || ""; };
    const setTab = tab => {
      const preview = tab === "preview";
      previewView.hidden = !preview;
      workspaceView.hidden = preview;
      dialog.querySelectorAll("[data-experience-tab]").forEach(button => {
        const selected = button.dataset.experienceTab === tab;
        button.classList.toggle("is-active",selected);
        button.setAttribute("aria-pressed",selected ? "true" : "false");
      });
      setStatus(preview ? "Previewing all pages · Select a page thumbnail to inspect it." : "Your work is saved in this browser on this device.");
      if (!preview && currentPages.length) renderWorkspace();
    };

    const openDialog = async (button,tab) => {
      const info = cardDetails(button);
      if (!info) return;
      current = info;
      currentPdf = null;
      currentPages = [];
      currentPreviewPage = 1;
      currentWorksheet = 0;
      currentState = {pages:{}};
      document.getElementById("planner-experience-title").textContent = info.title;
      document.getElementById("planner-experience-subtitle").textContent = info.description;
      const download = document.getElementById("planner-modal-download");
      download.href = info.url;
      download.download = info.file.split("/").pop();
      strip.innerHTML = "";
      workspacePages.innerHTML = "";
      workspaceContent.innerHTML = "";
      if (canvas) {
        const context = canvas.getContext("2d");
        if (context) context.clearRect(0,0,canvas.width,canvas.height);
      }
      setTab(tab);
      if (typeof dialog.showModal === "function") {
        if (!dialog.open) dialog.showModal();
      } else {
        dialog.setAttribute("open","");
      }
      setStatus("Loading all planner pages…");
      try {
        const data = await loadPlanner(info);
        currentPdf = data.pdf;
        currentPages = data.pages.slice(1);
        renderThumbnails(data);
        if (currentPdf) {
          await renderPreviewPage(1);
          setStatus("All " + data.pageCount + " pages are ready to explore.");
        } else {
          renderFallbackPreview(info,data);
          setStatus("The page reader is unavailable in this browser. The complete PDF is still available in the preview below and the online worksheets are ready.");
        }
        loadSavedState();
        if (tab === "workspace") renderWorkspace();
      } catch (error) {
        console.error(error);
        setStatus("We could not load the page preview. You can still use the online worksheets or download the PDF.");
        loadSavedState();
        if (tab === "workspace") renderWorkspace();
      }
    };

    const renderThumbnails = data => {
      if (!strip) return;
      strip.innerHTML = "";
      for (let pageNumber=1; pageNumber<=data.pageCount; pageNumber++) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "planner-thumb" + (pageNumber === currentPreviewPage ? " is-active" : "");
        button.dataset.previewPage = String(pageNumber);
        button.setAttribute("aria-label","Preview page " + pageNumber);
        const thumbCanvas = document.createElement("canvas");
        const label = document.createElement("span");
        label.textContent = pageNumber === 1 ? "Cover" : "Page " + pageNumber;
        button.appendChild(thumbCanvas);
        button.appendChild(label);
        strip.appendChild(button);
        if (data.pdf) {
          data.pdf.getPage(pageNumber).then(page => {
            const viewport = page.getViewport({scale:0.22});
            const ctx = thumbCanvas.getContext("2d");
            thumbCanvas.width = viewport.width;
            thumbCanvas.height = viewport.height;
            return page.render({canvasContext:ctx,viewport}).promise;
          }).catch(error => console.warn("Planner thumbnail error",error));
        } else {
          thumbCanvas.width = 120;
          thumbCanvas.height = 170;
          const ctx = thumbCanvas.getContext("2d");
          ctx.fillStyle = "#f0f2f6";ctx.fillRect(0,0,120,170);
          ctx.fillStyle = "#52647c";ctx.font = "11px Arial";ctx.fillText(pageNumber===1?"COVER":"WORKSHEET",12,30);
          ctx.fillStyle = "#9aa6b7";ctx.fillRect(12,45,96,2);ctx.fillRect(12,55,80,2);ctx.fillRect(12,65,90,2);
          ctx.strokeStyle = "#b7c2d0";ctx.strokeRect(12,85,96,55);
        }
      }
      updateThumbSelection();
    };

    const updateThumbSelection = () => {
      strip.querySelectorAll("[data-preview-page]").forEach(button => {
        const selected = Number(button.dataset.previewPage) === currentPreviewPage;
        button.classList.toggle("is-active",selected);
        if (selected) button.setAttribute("aria-current","page");
        else button.removeAttribute("aria-current");
      });
      if (pageIndicator) pageIndicator.textContent = "Page " + currentPreviewPage + " of " + (currentPdf ? currentPdf.numPages : 8);
    };

    const renderPreviewPage = async pageNumber => {
      if (!currentPdf || !canvas) return;
      currentPreviewPage = Math.max(1,Math.min(currentPdf.numPages,pageNumber));
      updateThumbSelection();
      const page = await currentPdf.getPage(currentPreviewPage);
      const baseViewport = page.getViewport({scale:1});
      const scale = Math.min(1.45, 1050 / baseViewport.width);
      const viewport = page.getViewport({scale:scale});
      const context = canvas.getContext("2d");
      if (renderTask) {
        try { renderTask.cancel(); } catch (error) {}
      }
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      renderTask = page.render({canvasContext:context,viewport});
      try { await renderTask.promise; } catch (error) { if (error?.name !== "RenderingCancelledException") throw error; }
    };

    const renderFallbackPreview = (info,data) => {
      const stage = document.getElementById("planner-document-stage");
      if (!stage) return;
      stage.innerHTML = '<iframe title="Full PDF planner preview" src="' + escapeHtml(info.url) + '#page=1&zoom=page-fit" style="width:100%;height:72vh;border:0;background:#fff"></iframe>';
      strip.innerHTML = "";
      data.pages.forEach((page,index) => {
        const button = document.createElement("button");
        button.type="button";button.className="planner-thumb";
        button.innerHTML='<span>' + escapeHtml(index===0?"Cover":"Page "+(index+1)) + '</span>';
        button.addEventListener("click",() => {
          const frame=stage.querySelector("iframe");
          if(frame)frame.src=info.url+"#page="+(index+1)+"&zoom=page-fit";
        });
        strip.appendChild(button);
      });
    };

    const getPageState = index => currentState.pages[index] || {
      date:"",period:"",thinking:"",checklist:[],table:[],reflection:""
    };
    const renderWorkspace = () => {
      if (!current || !currentPages.length) {
        workspaceContent.innerHTML = '<p class="planner-worksheet-intro">Loading worksheet details…</p>';
        return;
      }
      currentWorksheet = Math.max(0,Math.min(currentPages.length-1,currentWorksheet));
      workspacePages.innerHTML = "";
      currentPages.forEach((page,index) => {
        const button=document.createElement("button");
        button.type="button";
        button.className="planner-workspace-page-link"+(index===currentWorksheet?" is-active":"");
        button.dataset.worksheetIndex=String(index);
        button.innerHTML='<span>'+(index+1)+'</span><span>'+escapeHtml(page.title)+'</span>';
        workspacePages.appendChild(button);
      });
      const page=currentPages[currentWorksheet];
      const state=getPageState(currentWorksheet);
      const cols=page.columns && page.columns.length>1?page.columns:["Task / item","Owner","Due date","Status"];
      const checklist=page.checklistItems || [];
      const tableRows=Array.from({length:5},(_,row)=> {
        const values=state.table && state.table[row] ? state.table[row] : [];
        return '<tr>'+cols.map((col,colIndex)=>'<td><input type="text" aria-label="'+escapeHtml(col)+' row '+(row+1)+'" data-table-row="'+row+'" data-table-col="'+colIndex+'" value="'+escapeHtml(values[colIndex]||"")+'" placeholder="'+escapeHtml(col)+'"></td>').join("")+'</tr>';
      }).join("");
      const checks=checklist.map((item,index)=>'<label class="planner-check-item"><input type="checkbox" data-check-index="'+index+'" '+(state.checklist && state.checklist.includes(index)?"checked":"")+'><span>'+escapeHtml(item)+'</span></label>').join("");
      workspaceContent.innerHTML=
        '<div class="planner-worksheet" data-current-worksheet="'+currentWorksheet+'">'+
          '<span class="planner-worksheet-kicker">WORKSHEET '+(currentWorksheet+1)+' / '+currentPages.length+'</span>'+
          '<h3>'+escapeHtml(page.title)+'</h3>'+
          '<p class="planner-worksheet-intro">'+escapeHtml(page.subtitle || current.description)+'</p>'+
          '<div class="planner-field-grid">'+
            '<label>Date<input type="date" data-workspace-field="date" value="'+escapeHtml(state.date)+'"></label>'+
            '<label>Period / project<input type="text" data-workspace-field="period" value="'+escapeHtml(state.period)+'" placeholder="e.g. November, Q1 or Client project"></label>'+
          '</div>'+
          '<section class="planner-online-block"><h4>Think it through</h4><p class="planner-online-prompt">'+escapeHtml(page.thinkingPrompt || "What matters most for this worksheet?")+'</p><textarea data-workspace-field="thinking" placeholder="Write your thoughts, ideas or plan here…">'+escapeHtml(state.thinking)+'</textarea></section>'+
          '<section class="planner-online-block"><h4>'+escapeHtml(page.checklistTitle || "Checklist")+'</h4><div class="planner-checklist">'+checks+'</div></section>'+
          '<section class="planner-online-block"><h4>Progress / tracking</h4><div class="planner-online-table-wrap"><table class="planner-online-table"><thead><tr>'+cols.map(col=>'<th>'+escapeHtml(col)+'</th>').join("")+'</tr></thead><tbody>'+tableRows+'</tbody></table></div></section>'+
          '<section class="planner-online-block"><h4>Review and next step</h4><p class="planner-online-prompt">'+escapeHtml(page.reflectionPrompt || "What will you do next?")+'</p><textarea data-workspace-field="reflection" placeholder="Capture your learning and next action…">'+escapeHtml(state.reflection)+'</textarea></section>'+
        '</div>';
      if(document.getElementById("planner-workspace-page-count")) document.getElementById("planner-workspace-page-count").textContent="Worksheet "+(currentWorksheet+1)+" of "+currentPages.length;
      if(saveState) saveState.textContent="Saved on this device";
      const previous=document.getElementById("planner-work-prev");
      const next=document.getElementById("planner-work-next");
      if(previous)previous.disabled=currentWorksheet===0;
      if(next)next.textContent=currentWorksheet===currentPages.length-1?"Back to first worksheet":"Next worksheet →";
    };

    const collectPageState = () => {
      if (!workspaceContent || !workspaceContent.querySelector(".planner-worksheet")) return;
      const values={date:"",period:"",thinking:"",checklist:[],table:[],reflection:""};
      workspaceContent.querySelectorAll("[data-workspace-field]").forEach(input=>values[input.dataset.workspaceField]=input.value);
      workspaceContent.querySelectorAll("[data-check-index]").forEach(input=>{if(input.checked)values.checklist.push(Number(input.dataset.checkIndex));});
      workspaceContent.querySelectorAll("[data-table-row]").forEach(input=>{
        const row=Number(input.dataset.tableRow),col=Number(input.dataset.tableCol);
        if(!values.table[row])values.table[row]=[];
        values.table[row][col]=input.value;
      });
      currentState.pages[currentWorksheet]=values;
      return values;
    };
    const persistState = () => {
      if (!current) return;
      collectPageState();
      try {
        localStorage.setItem("careerpilot-planner-"+current.slug+"-v1",JSON.stringify(currentState));
        localStorageAvailable=true;
        if(saveState)saveState.textContent="Saved on this device";
      } catch (error) {
        localStorageAvailable=false;
        if(saveState)saveState.textContent="Browser storage unavailable";
      }
    };
    const loadSavedState = () => {
      try {
        const raw=localStorage.getItem("careerpilot-planner-"+current.slug+"-v1");
        currentState=raw?JSON.parse(raw):{pages:{}};
        if(!currentState || typeof currentState!=="object")currentState={pages:{}};
        if(!currentState.pages)currentState.pages={};
        localStorageAvailable=true;
      } catch (error) {
        currentState={pages:{}};
        localStorageAvailable=false;
      }
      if(saveState)saveState.textContent=localStorageAvailable?"Saved on this device":"Browser storage unavailable";
    };

    const exportBackup = () => {
      persistState();
      const blob=new Blob([JSON.stringify({planner:current.title,exportedAt:new Date().toISOString(),pages:currentState.pages},null,2)],{type:"application/json"});
      const url=URL.createObjectURL(blob);
      const anchor=document.createElement("a");
      anchor.href=url;anchor.download=current.slug+"-progress.json";
      document.body.appendChild(anchor);anchor.click();anchor.remove();
      URL.revokeObjectURL(url);
    };
    const printWorkbook = () => {
      persistState();
      const printWindow=window.open("","_blank");
      if(!printWindow){setStatus("Allow pop-ups to print or save your completed planner.");return;}
      const sheets=currentPages.map((page,index)=>{
        const state=getPageState(index);
        const cols=page.columns && page.columns.length>1?page.columns:["Task / item","Owner","Due date","Status"];
        const rows=Array.from({length:5},(_,row)=>{
          const values=state.table && state.table[row] ? state.table[row] : [];
          return "<tr>"+cols.map((col,colIndex)=>"<td>"+escapeHtml(values[colIndex]||"")+"</td>").join("")+"</tr>";
        }).join("");
        const checklist=(page.checklistItems||[]).map((item,checkIndex)=>"<p class='print-check'>"+(state.checklist && state.checklist.includes(checkIndex)?"☑":"☐")+" "+escapeHtml(item)+"</p>").join("");
        return "<section class='print-sheet'><div class='print-meta'>CAREERPILOT / "+escapeHtml(current.title.toUpperCase())+" · WORKSHEET "+(index+1)+"</div><h1>"+escapeHtml(page.title)+"</h1><p>"+escapeHtml(page.subtitle||"")+"</p><p class='print-meta'>Date: "+escapeHtml(state.date||"________________")+" · Period / project: "+escapeHtml(state.period||"________________")+"</p><h2>Think it through</h2><p>"+escapeHtml(page.thinkingPrompt||"")+"</p><div class='print-line'>"+escapeHtml(state.thinking||"")+"</div><h2>"+escapeHtml(page.checklistTitle||"Checklist")+"</h2>"+checklist+"<h2>Progress / tracking</h2><table><thead><tr>"+cols.map(col=>"<th>"+escapeHtml(col)+"</th>").join("")+"</tr></thead><tbody>"+rows+"</tbody></table><h2>Review and next step</h2><p>"+escapeHtml(page.reflectionPrompt||"")+"</p><div class='print-line'>"+escapeHtml(state.reflection||"")+"</div></section>";
      }).join("");
      printWindow.document.open();
      printWindow.document.write("<!doctype html><html><head><title>"+escapeHtml(current.title)+" - CareerPilot</title><meta charset='utf-8'><style>body{margin:0;color:#172b47;font:11pt/1.5 Arial,sans-serif}.print-sheet{page-break-after:always;break-after:page;padding:16mm 14mm}.print-sheet h1{font-size:23pt;margin:0 0 5mm}.print-sheet h2{font-size:13pt;margin:7mm 0 2mm}.print-meta{color:#596a80;font-size:9pt;margin-bottom:5mm}.print-line{min-height:18mm;border-bottom:1px solid #cbd4df;white-space:pre-wrap}.print-check{margin:2mm 0}table{width:100%;border-collapse:collapse;margin-top:4mm}th,td{border:1px solid #b9c5d3;padding:3mm;text-align:left;vertical-align:top}th{background:#eef2f7}@page{margin:12mm}</style></head><body>"+sheets+"</body></html>");
      printWindow.document.close();
      printWindow.focus();
      printWindow.setTimeout(()=>printWindow.print(),350);
    };

    grid.addEventListener("click",event=>{
      const button=event.target.closest("[data-planner-action]");
      if(button)openDialog(button,button.dataset.plannerAction==="use"?"workspace":"preview");
    });
    dialog.addEventListener("click",event=>{
      if(event.target===dialog || event.target.closest("[data-planner-close]")){
        if(typeof dialog.close==="function")dialog.close();else dialog.removeAttribute("open");
      }
      const tab=event.target.closest("[data-experience-tab]");
      if(tab)setTab(tab.dataset.experienceTab);
      const thumb=event.target.closest("[data-preview-page]");
      if(thumb){
        const number=Number(thumb.dataset.previewPage);
        if(currentPdf)renderPreviewPage(number);
        else{
          currentPreviewPage=number;updateThumbSelection();
          const frame=document.querySelector("#planner-document-stage iframe");
          if(frame)frame.src=current.url+"#page="+number+"&zoom=page-fit";
        }
      }
      const worksheet=event.target.closest("[data-worksheet-index]");
      if(worksheet){persistState();currentWorksheet=Number(worksheet.dataset.worksheetIndex);renderWorkspace();}
    });
    dialog.addEventListener("input",event=>{
      if(event.target.closest("#planner-workspace-content"))persistState();
    });
    dialog.addEventListener("change",event=>{
      if(event.target.closest("#planner-workspace-content"))persistState();
    });
    document.getElementById("planner-page-prev").addEventListener("click",()=>renderPreviewPage(currentPreviewPage-1));
    document.getElementById("planner-page-next").addEventListener("click",()=>renderPreviewPage(currentPreviewPage+1));
    document.getElementById("planner-work-prev").addEventListener("click",()=>{
      persistState();currentWorksheet=Math.max(0,currentWorksheet-1);renderWorkspace();
    });
    document.getElementById("planner-work-next").addEventListener("click",()=>{
      persistState();currentWorksheet=(currentWorksheet+1)%currentPages.length;renderWorkspace();
    });
    document.getElementById("planner-print").addEventListener("click",printWorkbook);
    document.getElementById("planner-export").addEventListener("click",exportBackup);
    document.getElementById("planner-reset").addEventListener("click",()=>{
      if(!current || !window.confirm("Clear all saved entries for this planner on this device?"))return;
      try{localStorage.removeItem("careerpilot-planner-"+current.slug+"-v1");}catch(error){}
      currentState={pages:{}};
      renderWorkspace();
      setStatus("Your saved entries for this planner have been cleared on this device.");
    });
    dialog.addEventListener("close",()=>{
      if(renderTask){try{renderTask.cancel();}catch(error){}renderTask=null;}
      current=null;currentPdf=null;currentPages=[];
    });
    document.addEventListener("keydown",event=>{
      if(event.key==="Escape" && dialog.open && typeof dialog.close!=="function")dialog.removeAttribute("open");
    });
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();
