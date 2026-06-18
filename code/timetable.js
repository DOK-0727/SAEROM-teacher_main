// Code.gs
function doGet(e) {
// ===== 1. 로그인 사용자 이메일·코드·이름 추출 =====
const email = Session.getActiveUser().getEmail();
const emailPrefix = email.split("@")[0];
const ss = SpreadsheetApp.getActiveSpreadsheet();
const teacherSheet   = ss.getSheetByName("T계정");
const subjectSheet   = ss.getSheetByName("과목개설목록_dummy");
const timetableSheet = ss.getSheetByName("시간표_dummy");

// ===== 2. 교사명 찾아오기 =====
const tData = teacherSheet.getDataRange().getValues();
const tRow = tData.find(r => (r[0]||"").toString().trim().toLowerCase() === email.trim().toLowerCase());
if (!tRow) {
  return HtmlService.createHtmlOutput(
    `<div class="error">교사 정보를 찾을 수 없습니다.<br>(이메일: ${email})</div>`
  );
}
const teacherName = tRow[1];
const teacherFull = `${teacherName} (${emailPrefix})`;

// ===== 3. 내 강의 목록 뽑기 =====
const sData = subjectSheet.getDataRange().getValues();
const header    = sData[0];
const subjIdx   = header.indexOf("개설과목명(학점)");
const roomIdx   = header.indexOf("강의실");
const teacherIdx= header.indexOf("교사명");

const myCourses = sData.slice(1)
  .filter(r => (r[teacherIdx]||"") === teacherFull)
  .map(r => ({
    subject: cleanSubject(r[subjIdx]),
    roomRaw: r[roomIdx]||""
  }));

// ===== 4. 시간표 매칭해서 2차원 배열 채우기 =====
const tt = timetableSheet.getDataRange().getValues();
const days    = 5;  // 월~금
const periods = 7;  // 1~7교시
// tableData[p교시][d요일] = innerHTML
const tableData = Array.from({length:periods}, ()=>Array(days).fill(""));

for (let r = 1; r < tt.length; r++) {
  const row = tt[r];
  const roomLabel = (row[0]||"")+"";
  const roomNum   = (roomLabel.match(/^(\d+)/)||[])[1]||"";

  for (let d = 0; d < days; d++) {
    for (let p = 0; p < periods; p++) {
      const cell = row[1 + d*12 + p];
      if (!cell) continue;
      const subj = cleanSubject(cell);
      const teacherInCell = extractName(cell);

      if (teacherInCell === teacherName &&
          myCourses.some(c => c.subject === subj && c.roomRaw.includes(`${roomNum}(`))) {
        const displayRoom = (roomLabel.match(/\(([^)]+)\)/)||[])[1]||roomNum;
        tableData[p][d] += `<span class="subject-text">${subj}</span><br><small class="teacher-text">(${displayRoom})</small><br>`;
      }
    }
  }
}

// ===== 5. HTML 렌더링 =====
const html = buildHtml(teacherFull, tableData);
return HtmlService.createHtmlOutput(html)
  .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// 과목명만 뽑기
function cleanSubject(str){
return str ? str.toString().split("(")[0].trim() : "";
}
// 괄호 안 교사명만 뽑기
function extractName(str){
if (!str) return "";
const m = str.toString().match(/\(([^)]+)\)/);
return m ? m[1].split(" ")[0] : "";
}

// 전체 HTML 생성 (테마 팝업 + 강조 기능 포함)
function buildHtml(title, tableData) {
const yoils = ["월","화","수","목","금"];
// table rows
let rows = "";
for(let p=0; p<7; p++){
  if(p===4){
    rows += `<tr class="lunch-row"><td>점심시간</td><td colspan="5">🍱 점심시간 🍱</td></tr>`;
  }
  rows += `<tr><td>${p+1}교시</td>`;
  for(let d=0; d<5; d++){
    const cell = tableData[p][d]||"-";
    rows += `<td>${cell||"-"}</td>`;
  }
  rows += `</tr>`;
}

return `
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8"/>
<title>MY 시간표</title>
<style>
  :root {
    --bg-color: linear-gradient(to right,#eef2f3,#8e9eab);
    --header-bg: #4a69bd;
    --text-color: #333;
    --lunch-color: #ffeaa7;
    --hover-color: #dff9fb;
    --button-bg: #4a69bd;
    --button-color: #fff;
    --button-hover: #2e59a3;
    --h1-color: #2f415b;
    --left-bg: #f3f5fa;
    --left-color: #30323a;
  }
  html,body {
    margin:0;
    padding:36px 0;
    font-family:'Segoe UI',sans-serif;
    background:#f5f6fa;
    display:flex;
    flex-direction:column;
    align-items:center;
  }
  h1 {
    text-align: center;
    width: 100%;
    margin: 0 0 8px;
    color: var(--h1-color);
    font-size: 1.2em;
    font-weight: 700;
    letter-spacing: -1px;
  }
  .timetable-container {
    background: var(--bg-color);
    border-radius: 15px;
    box-shadow: 0 8px 20px rgba(0,0,0,0.08);
    padding: 18px 6px 13px;
    max-width: 540px;
    width: 95vw;
    position: relative;
  }
  .theme-top-wrap {
    position: absolute;
    top: 10px; left: 10px;
    z-index: 2;
  }
  .theme-btn {
    padding: 7px 13px;
    font-size: .83em;
    border: none;
    border-radius: 7px;
    background: var(--button-bg);
    color: var(--button-color);
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(60,80,140,0.07);
    transition: background .22s,color .22s;
    font-weight: 500;
  }
  .theme-btn:hover { background: var(--button-hover); }
  .student-info {
    text-align: center;
    margin-bottom: 8px;
    font-weight: bold;
    font-size: .91em;
    color: var(--text-color);
    letter-spacing: .01em;
  }
  table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    background: #fff;
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 3px 10px rgba(60,80,140,0.09);
  }
  th, td {
    padding: 5px 2.5px;
    text-align: center;
    font-size: .79em;
    position: relative;
  }
  th {
    background: var(--header-bg);
    color: #fff;
    font-size: .93em;
    font-weight: bold;
    letter-spacing: .02em;
  }
  th:first-child { border-top-left-radius: 10px; }
  th:last-child  { border-top-right-radius: 10px; }
  td:first-child {
    background: var(--left-bg);
    color: var(--left-color);
    font-weight: bold;
    border-left: 2px solid #e0e4ed;
    font-size: .85em;
    letter-spacing: -.5px;
  }
  tr:last-child td:first-child { border-bottom-left-radius: 10px; }
  tr:last-child td:last-child  { border-bottom-right-radius: 10px; }
  tr.lunch-row td {
    background: var(--lunch-color)!important;
    font-weight: bold;
    font-size: .97em;
    letter-spacing: .1em;
    border-top: 1.2px solid #f2e4a6;
    border-bottom: 1.2px solid #f2e4a6;
  }
  td:hover { background: var(--hover-color); transition: background .18s; }
  td { border-right:1px solid #e4e8f0; border-bottom:1px solid #e4e8f0; }
  td:last-child { border-right:none; }
  tr:last-child td { border-bottom:none; }




  .subject-text { font-weight: 700; }
  .teacher-text { font-size: .74em; color: #888; }
  .error {
    color: #e74c3c;
    font-weight: bold;
    padding: 12px;
    text-align: center;
    font-size: .95em;
  }
  .now-active {
    background: linear-gradient(90deg,#ffe08c77,#ffe08c33,#fff8e377);
    box-shadow: 0 0 0 2px #ffd60066;
    font-weight: bold;
    animation: popnow 1.2s cubic-bezier(.7,.2,.3,1) 1;
  }
  @keyframes popnow {
    0%{transform:scale(1.04)}60%{transform:scale(1.045)}80%{transform:scale(1.01)}100%{transform:scale(1)}
  }

  /* 테마 팝업 */
  .theme-picker-popup {
    position: fixed; top:90px; left:50%;
    transform: translateX(-50%);
    background:#fff; border-radius:18px;
    box-shadow:0 5px 28px rgba(40,45,80,0.13);
    padding:22px 28px 20px; z-index:9999;
    min-width:260px; display:flex;
    flex-direction:column; align-items:center;
    animation: popAppear .28s;
  }
  @keyframes popAppear {0%{opacity:0;transform:translateX(-50%) scale(.8)}100%{opacity:1;transform:translateX(-50%) scale(1)}}
  .theme-picker-row { display:flex; gap:13px; margin:8px 0; flex-wrap:wrap; justify-content:center; }
  .close-btn {
    position:absolute; top:9px; right:18px;
    background:none; border:none; font-size:22px; color:#666; cursor:pointer; line-height:1; transition:color .14s;
  }
  .close-btn:hover { color:#e74c3c; }
  .theme-circle {
    width:28px;height:28px;border-radius:50%;border:2px solid transparent;
    cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,0.08);
    display:flex;align-items:center;justify-content:center;
    transition:border .15s,box-shadow .15s;
  }
  .theme-circle.selected { border:2px solid #222; box-shadow:0 2px 8px rgba(0,0,0,0.13); }
  .theme-name-label { margin-top:2px; font-size:12px; color:#555; text-align:center; }
  div class="main-container" style="display:flex;gap:15px;align-items:flex-start;justify-content:center;"
</style>
</head>
<body>

 <!-- 시간표 영역 -->
 <div class="timetable-container">
   <div class="theme-top-wrap">
     <button class="theme-btn" onclick="openThemePopup()">🎨 테마 바꾸기</button>
   </div>
   <h1>MY 시간표</h1>
   <div class="student-info">${title}</div>
   <div id="result">
     <table>
       <thead>
         <tr><th>교시</th>${yoils.map(y=>`<th>${y}</th>`).join("")}</tr>
       </thead>
       <tbody>${rows}</tbody>
     </table>
   </div>
 </div>

 <!-- 메모 영역 -->
 <div class="memo-container" style="background:#fff;padding:12px;border-radius:10px;box-shadow:0 3px 10px rgba(60,80,140,0.09);max-width:200px;">
   <h2 style="font-size:1em;margin-top:0;color:var(--h1-color);text-align:center;">📝 메모</h2>
   <textarea id="timetable-memo" placeholder="메모를 입력하세요..." style="width:180px;height:380px;padding:8px;font-size:.83em;resize:vertical;border-radius:7px;border:1px solid #ccc;outline:none;"></textarea>
 </div>


</div>

<script>
 // 메모 기능
 const memoArea = document.getElementById("timetable-memo");

 // 로컬 스토리지에서 메모 로딩
 function loadMemo() {
   const memo = localStorage.getItem("timetableMemo") || "";
   memoArea.value = memo;
 }

 // 로컬 스토리지에 메모 저장
 function saveMemo() {
   localStorage.setItem("timetableMemo", memoArea.value);
 }

 // 메모 입력 시 자동 저장
 memoArea.addEventListener("input", saveMemo);

 document.addEventListener("DOMContentLoaded", loadMemo);
</script>

  // 테마 목록 (원하시는 만큼 늘릴 수 있습니다)
     const themes = [
   { name: "클래식",       left:"#f3f5fa #30323a", bg:"linear-gradient(to right,#eef2f3,#8e9eab)", header:"#4a69bd", text:"#333",    lunch:"#ffeaa7", hover:"#dff9fb", buttonBg:"#4a69bd", buttonColor:"#fff", buttonHover:"#2e59a3", h1Color:"#2f415b" },
   { name: "핑크캔디",     left:"#fde7f5 #b3355e", bg:"linear-gradient(to right,#ffd6e7,#fff0f5)", header:"#f78fb3", text:"#5c2a50", lunch:"#ffdaec", hover:"#f3d9ec", buttonBg:"#f78fb3", buttonColor:"#fff", buttonHover:"#fd6bcb", h1Color:"#e64c91" },
   { name: "민트그린",     left:"#d4f4ea #036159", bg:"linear-gradient(to right,#c8e6c9,#e0f2f1)", header:"#009688", text:"#004d40", lunch:"#b2dfdb", hover:"#c8f7f0", buttonBg:"#009688", buttonColor:"#fff", buttonHover:"#00695c", h1Color:"#009688" },
   { name: "딥다크",       left:"#323a47 #fff",    bg:"linear-gradient(to right,#2f3542,#57606f)", header:"#1e272e", text:"#fff",    lunch:"#898989", hover:"#DBDBDB", buttonBg:"#1e272e", buttonColor:"#fff", buttonHover:"#2f3542", h1Color:"#fff" },
   { name: "레드프레시",   left:"#ffe1bb #c03000", bg:"linear-gradient(120deg,#a80000 0%,#fa5858 50%,#ffd6d6 100%)", header:"#d7263d", text:"#fff",    lunch:"#ffe5e0", hover:"#ffd5d5", buttonBg:"#d7263d", buttonColor:"#fff", buttonHover:"#ad1032", h1Color:"#ffe05b" },
   { name: "오렌지버스트", left:"#ffe3c0 #b56000", bg:"linear-gradient(100deg,#fcb045 0%,#fd6e50 100%)", header:"#fd6e50", text:"#432800", lunch:"#ffe4b5", hover:"#ffe5cf", buttonBg:"#fd6e50", buttonColor:"#fff", buttonHover:"#d44824", h1Color:"#ff6b00" },
   { name: "옐로우팝",     left:"#fff3c1 #a68501", bg:"linear-gradient(120deg,#ffc300 0%,#fff200 50%,#fffbe5 100%)", header:"#ffe200", text:"#4a4300", lunch:"#fff9c4", hover:"#fff7a8", buttonBg:"#ffe200", buttonColor:"#4a4300", buttonHover:"#ffcc00", h1Color:"#ffbf01" },
   { name: "퍼플드림",     left:"#ece2fc #7639b8", bg:"linear-gradient(100deg,#c471f5 0%,#fa71cd 100%)", header:"#8e54e9", text:"#fff",    lunch:"#f3d0fb", hover:"#f8e1ff", buttonBg:"#8e54e9", buttonColor:"#fff", buttonHover:"#7b34c6", h1Color:"#8e54e9" },
   // ── 추가 테마 ──
   { name: "라벤더 필드", left:"#d4fc79 #7dd56f", bg:"linear-gradient(to right,#d4fc79,#96e6a1)", header:"#7dd56f", text:"#3c4a3d", lunch:"#b8e8a5", hover:"#d0f1bf", buttonBg:"#7dd56f", buttonColor:"#fff", buttonHover:"#67b85a", h1Color:"#fff" },
   { name: "민트 리프",   left:"#a8edea #00a3ff", bg:"linear-gradient(to right,#a8edea,#fed6e3)", header:"#6dd5ed", text:"#2f4858", lunch:"#d1f4f9", hover:"#dff8fb", buttonBg:"#6dd5ed", buttonColor:"#fff", buttonHover:"#56b1d6", h1Color:"#fff" },{
 name: "베이지",
 left: "#f5f1e9 #6b5e43",
 bg:    "linear-gradient(to right,#f9f4eb,#e5dec9)",
 header:"#a1866f",
 text:  "#4a3f2a",
 lunch: "#f3e9d2",
 hover: "#f0e6ca",
 buttonBg:    "#a1866f",
 buttonColor: "#fff",
 buttonHover: "#8b795b",
 h1Color:     "#6b5e43"
}
 ];

  let currentTheme = 0;

  function openThemePopup(){
    if(document.getElementById("theme-picker-popup")) return;
    const root = document.getElementById("theme-popup-root")||document.body;
    const popup = document.createElement("div");
    popup.id="theme-picker-popup"; popup.className="theme-picker-popup";
    // 닫기 버튼
    const closeBtn = document.createElement("button");
    closeBtn.className="close-btn"; closeBtn.innerText="✖️";
    closeBtn.onclick=e=>{e.stopPropagation(); closeThemePopup();};
    popup.appendChild(closeBtn);
    // 테마 원
    const row = document.createElement("div"); row.className="theme-picker-row";
    themes.forEach((t,i)=>{
      const c=document.createElement("div");
      c.className="theme-circle"+(i===currentTheme?" selected":"");
      c.style.background=t.bg; c.title=t.name;
      c.onclick=e=>{
        e.stopPropagation(); applyTheme(i);
        document.querySelectorAll(".theme-circle").forEach((el,idx)=>el.classList.toggle("selected",idx===i));
      };
      row.appendChild(c);
    });
    popup.appendChild(row);
    // 이름 라벨
    const lbl=document.createElement("div");
    lbl.className="theme-name-label";
    lbl.innerText=themes[currentTheme].name;
    popup.appendChild(lbl);
    root.appendChild(popup);
    setTimeout(()=>document.addEventListener("mousedown",clickOut),50);
    function clickOut(e){
      if(!popup.contains(e.target)) closeThemePopup();
    }
  }
  function closeThemePopup(){
    const p=document.getElementById("theme-picker-popup");
    if(p) p.remove();
    document.removeEventListener("mousedown",clickOut);
  }
  function applyTheme(idx){
    currentTheme=idx;
    const t=themes[idx], r=document.documentElement;
    r.style.setProperty("--bg-color",t.bg);
    r.style.setProperty("--header-bg",t.header);
    r.style.setProperty("--text-color",t.text);
    r.style.setProperty("--lunch-color",t.lunch);
    r.style.setProperty("--hover-color",t.hover);
    r.style.setProperty("--button-bg",t.buttonBg);
    r.style.setProperty("--button-color",t.buttonColor);
    r.style.setProperty("--button-hover",t.buttonHover);
    r.style.setProperty("--h1-color",t.h1Color);
    const [lb,lc] = t.left.split(" ");
    r.style.setProperty("--left-bg",lb);
    r.style.setProperty("--left-color",lc);
  }

  // ===== 강조 기능 =====
  const periods = [
    {name:"1교시",start:"08:00",end:"09:28"},
    {name:"2교시",start:"09:28",end:"10:28"},
    {name:"3교시",start:"10:28",end:"11:28"},
    {name:"4교시",start:"11:28",end:"12:28"},
    {name:"점심시간",start:"12:28",end:"13:28"},
    {name:"5교시",start:"13:28",end:"14:28"},
    {name:"6교시",start:"14:28",end:"15:28"},
    {name:"7교시",start:"15:28",end:"16:28"}
  ];
  function isNowInPeriod(p,now){
    const [sh,sm]=p.start.split(":").map(Number);
    const [eh,em]=p.end.split(":").map(Number);
    const s=new Date(now.getFullYear(),now.getMonth(),now.getDate(),sh,sm);
    const e=new Date(now.getFullYear(),now.getMonth(),now.getDate(),eh,em);
    return now>=s&&now<e;
  }
  function highlightCurrentPeriod(){
    const now=new Date();
    const wd=now.getDay();
    if(wd<1||wd>5) return;
    const di=wd-1;
    const trs=document.querySelectorAll("#result table tbody tr");
    let cnt=0;
    trs.forEach(tr=>{
      if(tr.classList.contains("lunch-row")){
        if(isNowInPeriod(periods[4],now)){
          tr.querySelectorAll("td").forEach((td,i)=>td.classList.toggle("now-active",i===di+1));
        }
      } else {
        const pidx = cnt<4?cnt:cnt+1;
        tr.querySelectorAll("td").forEach((td,i)=>{
          td.classList.toggle("now-active", i===di+1 && isNowInPeriod(periods[pidx],now));
        });
        cnt++;
      }
    });
  }
  document.addEventListener("DOMContentLoaded",()=>{
    // 초기 테마 복원
    try{
      const idx=parseInt(localStorage.getItem("student_timetable_theme_idx")||"0");
      if(!isNaN(idx)&&idx<themes.length) applyTheme(idx);
    }catch{}
    highlightCurrentPeriod();
    setInterval(highlightCurrentPeriod,60000);
  });
</script>
</body>
</html>
`;
}