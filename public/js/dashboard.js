const idToken = localStorage.getItem("idToken");
if(!idToken) location.href="index.html";

async function loadData(){
  const res = await fetch("/api/user",{headers:{"Authorization":"Bearer "+idToken}});
  const { userData, defaultData, maxData } = await res.json();
  const c=document.getElementById("scoreArea");
  c.innerHTML="";
  const subjects=["korean","math","history","science","english","chinese","morality","pe","tech","art"];

  // 평균 계산용 변수
  let firstSum=0, firstCount=0;
  let secondSum=0, secondCount=0;

  for(const s of subjects){
    if(!userData[s]) continue;
    const d=document.createElement("div");
    d.className="subject-card";
    d.innerHTML=`<h3>${translate(s)}</h3>`;
    let total=0;
    for(const [key,v] of Object.entries(userData[s])){
      const name=defaultData[s]?.[key]?.name??key;
      const maxR1=maxData[s]?.[key]?.r1??100;
      total+=v.r2??0;

      // 🔹 1차/2차지필 평균용 데이터 수집
      if(name.includes("1차지필") && v.r1>0){ firstSum+=v.r1; firstCount++; }
      if(name.includes("2차지필") && v.r1>0){ secondSum+=v.r1; secondCount++; }

      d.innerHTML+=`<center>
        <label>${name} 만점 : ${maxR1}</label>
        <input type="number" min="0" max="${maxR1}" value="${v.r1}" onchange="update('${s}','${key}',this.value)">
        <span>→ ${v.r2}</span><br><center>`;
    }
    d.innerHTML+=`<b>총점: ${total.toFixed(2)}</b>`;
    c.appendChild(d);
  }

  // 🔹 평균 표시
  calcAverages(firstSum, firstCount, secondSum, secondCount);
}

function calcAverages(fSum, fCnt, sSum, sCnt){
  const firstAvg = fCnt>0 ? (fSum/fCnt).toFixed(2) : "-";
  const secondAvg = sCnt>0 ? (sSum/sCnt).toFixed(2) : "-";

  let avgBox = document.getElementById("avgBox");
  if(!avgBox){
    avgBox = document.createElement("div");
    avgBox.id = "avgBox";
    avgBox.style.marginBottom = "20px";
    avgBox.style.fontWeight = "600";
    document.body.insertBefore(avgBox, document.getElementById("scoreArea"));
  }
  avgBox.innerHTML = `1차지필 평균: ${firstAvg} / 2차지필 평균: ${secondAvg}`;
}

async function update(subject,key,value){
  await fetch("/api/update",{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "Authorization":"Bearer "+idToken
    },
    body:JSON.stringify({subject,key,value})
  });
  loadData(); // 자동 갱신
}

// 🔹 ID 토큰 자동 갱신 (Firebase 공식 방식)
firebase.auth().onIdTokenChanged(async (user) => {
  if (user) {
    const idToken = await user.getIdToken(true); // true = 강제 갱신
    localStorage.setItem("idToken", idToken);
  } else {
    localStorage.removeItem("idToken");
  }
});

function logout(){localStorage.clear();firebase.auth().signOut();location.href="index.html";}
function translate(s){return{ korean:"국어",math:"수학",history:"역사",science:"과학",english:"영어",chinese:"중국어",morality:"도덕",pe:"체육",tech:"기술·가정",art:"미술"}[s]||s;}

loadData();

