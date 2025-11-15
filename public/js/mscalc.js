// mscalc.js: 중학교 내신 계산기 클라이언트 스크립트
// 로그인 여부를 확인하고, 사용자가 점수와 성취도를 입력하여 총점을 계산할 수 있도록 한다.

// Firebase 인증 토큰을 확인합니다. 토큰이 없으면 로그인 화면으로 이동합니다.
const idToken = localStorage.getItem("idToken");
if (!idToken) {
  location.href = "index.html";
}

// 과목 목록 및 학기 정의
const subjects = [
  "국어",
  "도덕",
  "사회",
  "역사",
  "수학",
  "과학",
  "기술·가정",
  "영어",
  "중국어",
  "체육",
  "미술",
  "음악"
];

// 예체능 과목 구분 (체육, 미술, 음악)
const artSubjects = ["체육", "미술", "음악"];

// 학기 정보: 각 항목은 year_sem 키를 만들어 학기별 계산에 사용합니다.
const semesters = [
  { key: "1_2", label: "1학년 2학기", base: 4, achWeight: 0.8, rawWeight: 0.07 },
  { key: "2_1", label: "2학년 1학기", base: 8, achWeight: 1.6, rawWeight: 0.08 },
  { key: "2_2", label: "2학년 2학기", base: 8, achWeight: 1.6, rawWeight: 0.08 },
  { key: "3_1", label: "3학년 1학기", base: 10, achWeight: 2, rawWeight: 0.1 }
];

// DOM 요소를 생성하여 과목별 입력 폼을 구성합니다.
function buildForm() {
  const container = document.getElementById("msForm");
  // 기본 테이블 구조 생성
  const table = document.createElement("table");
  table.style.borderCollapse = "collapse";

  // 헤더 행 생성: 첫 번째 셀은 빈 칸, 그 다음 학기별로 원점수/성취도 두 칸씩 생성
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  // 과목 헤더
  const subjectTh = document.createElement("th");
  subjectTh.textContent = "과목";
  headerRow.appendChild(subjectTh);
  // 각 학기별 헤더 생성
  for (const sem of semesters) {
    const thRaw = document.createElement("th");
    thRaw.textContent = `${sem.label} 원점수`;
    const thGrade = document.createElement("th");
    thGrade.textContent = `${sem.label} 성취도`;
    headerRow.appendChild(thRaw);
    headerRow.appendChild(thGrade);
  }
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // 몸체 행 생성
  const tbody = document.createElement("tbody");
  for (const subj of subjects) {
    const tr = document.createElement("tr");
    const tdName = document.createElement("td");
    tdName.textContent = subj;
    tr.appendChild(tdName);
    // 각 학기별로 입력 필드 추가
    for (const sem of semesters) {
      // 원점수 입력
      const tdRaw = document.createElement("td");
      const inputRaw = document.createElement("input");
      inputRaw.type = "number";
      inputRaw.min = 0;
      inputRaw.max = 100;
      inputRaw.value = 0;
      inputRaw.id = `raw_${sem.key}_${subj}`;
      tdRaw.appendChild(inputRaw);
      tr.appendChild(tdRaw);
      // 성취도 입력 (문자 입력: A~E 또는 @)
      const tdGrade = document.createElement("td");
      const inputGrade = document.createElement("input");
      inputGrade.type = "text";
      inputGrade.maxLength = 1;
      inputGrade.placeholder = "A~E 또는 @";
      inputGrade.id = `grade_${sem.key}_${subj}`;
      tdGrade.appendChild(inputGrade);
      tr.appendChild(tdGrade);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  container.appendChild(table);
}

// 서버에서 저장된 데이터를 가져와 폼을 채웁니다.
async function fetchMsData() {
  try {
    const res = await fetch("/api/ms", { headers: { Authorization: "Bearer " + idToken } });
    const { msData } = await res.json();
    if (msData && msData.grades) {
      // 학기와 과목별로 값 채우기
      for (const sem of semesters) {
        const semData = msData.grades[sem.key] || {};
        for (const subj of subjects) {
          const row = semData[subj] || {};
          const rawInput = document.getElementById(`raw_${sem.key}_${subj}`);
          const gradeInput = document.getElementById(`grade_${sem.key}_${subj}`);
          if (rawInput && typeof row.raw === "number") rawInput.value = row.raw;
          if (gradeInput && row.grade) gradeInput.value = row.grade;
        }
      }
      // 출결, 봉사, 수상, 자치회 등 채우기
      if (msData.attendance) {
        [1, 2, 3].forEach((yr) => {
          const a = msData.attendance[yr] || {};
          const t = document.getElementById(`tardy${yr}`);
          const ab = document.getElementById(`absent${yr}`);
          if (t && typeof a.tardy === "number") t.value = a.tardy;
          if (ab && typeof a.absent === "number") ab.value = a.absent;
        });
      }
      if (typeof msData.volunteerHours === "number") {
        const vEl = document.getElementById("volunteerHours");
        if (vEl) vEl.value = msData.volunteerHours;
      }
      if (typeof msData.awards === "number") {
        const aEl = document.getElementById("awards");
        if (aEl) aEl.value = msData.awards;
      }
      if (typeof msData.councilMonths === "number") {
        const cEl = document.getElementById("councilMonths");
        if (cEl) cEl.value = msData.councilMonths;
      }
    }
  } catch (e) {
    console.error("msData load error", e);
  }
}

// 폼 데이터를 수집하여 객체 형태로 반환합니다.
function collectFormData() {
  const grades = {};
  for (const sem of semesters) {
    const semObj = {};
    for (const subj of subjects) {
      const rawInput = document.getElementById(`raw_${sem.key}_${subj}`);
      const gradeInput = document.getElementById(`grade_${sem.key}_${subj}`);
      const rawVal = rawInput ? parseFloat(rawInput.value) : 0;
      const gradeVal = gradeInput ? gradeInput.value.trim().toUpperCase() : "";
      semObj[subj] = { raw: isNaN(rawVal) ? 0 : rawVal, grade: gradeVal };
    }
    grades[sem.key] = semObj;
  }
  // 출결
  const attendance = {};
  [1, 2, 3].forEach((yr) => {
    const tEl = document.getElementById(`tardy${yr}`);
    const aEl = document.getElementById(`absent${yr}`);
    const tardy = tEl ? parseInt(tEl.value) : 0;
    const absent = aEl ? parseInt(aEl.value) : 0;
    attendance[yr] = { tardy: isNaN(tardy) ? 0 : tardy, absent: isNaN(absent) ? 0 : absent };
  });
  // 봉사, 수상, 자치회
  const volunteerHours = parseFloat(document.getElementById("volunteerHours").value) || 0;
  const awards = parseFloat(document.getElementById("awards").value) || 0;
  const councilMonths = parseFloat(document.getElementById("councilMonths").value) || 0;
  return { grades, attendance, volunteerHours, awards, councilMonths };
}

// 성취도 문자를 점수로 변환합니다. A=5, B=4, C=3, D=2, E=1. 기타나 '@'는 0으로 간주합니다.
function gradeToPoint(ch) {
  switch ((ch || "").toUpperCase()) {
    case "A": return 5;
    case "B": return 4;
    case "C": return 3;
    case "D": return 2;
    case "E": return 1;
    default: return 0;
  }
}

// 일반 교과 점수를 계산합니다. 과목수는 해당 학기에 일반교과 성취도/원점수가 존재하는 과목수를 의미합니다.
function calculateSemesterScore(semKey, semData, base, achWeight, rawWeight) {
  let sumAch = 0;
  let sumRaw = 0;
  let count = 0;
  for (const subj of subjects) {
    if (artSubjects.includes(subj)) continue; // 예체능 과목 제외
    const info = semData[subj];
    const raw = info.raw;
    const gradePoint = gradeToPoint(info.grade);
    // 원점수와 성취도 둘 중 하나라도 존재해야 과목수로 인정 (원점수만 있는 경우도 인정)
    if (raw > 0 || gradePoint > 0) {
      if (gradePoint > 0) sumAch += gradePoint;
      if (raw > 0) sumRaw += raw;
      count += 1;
    }
  }
  if (count === 0) return base; // 아무 과목도 없으면 기본점수만
  const avgAch = sumAch / count;
  const avgRaw = sumRaw / count;
  const score = base + avgAch * achWeight + avgRaw * rawWeight;
  return parseFloat(score.toFixed(3));
}

// 체육·예술 교과 점수를 계산합니다. A=3, B=2, C=1, 기타는 0으로 가산합니다.
function calculateArtScore(gradesData) {
  let aCount = 0;
  let bCount = 0;
  let cCount = 0;
  let subjCount = 0;
  // 모든 학기 자료를 순회
  for (const sem of semesters) {
    const semData = gradesData[sem.key];
    if (!semData) continue;
    for (const subj of artSubjects) {
      const info = semData[subj];
      if (!info) continue;
      const g = (info.grade || "").toUpperCase();
      if (g === "A" || g === "B" || g === "C") {
        subjCount += 1;
        if (g === "A") aCount += 1;
        else if (g === "B") bCount += 1;
        else if (g === "C") cCount += 1;
      }
    }
  }
  if (subjCount === 0) return 10; // 예체능 성취도가 하나도 없으면 기본점수만
  const weightedSum = 3 * aCount + 2 * bCount + 1 * cCount;
  const score = 10 + 20 * (weightedSum / (6 * subjCount));
  return parseFloat(score.toFixed(3));
}

// 출결 점수 계산: 학년별로 미인정 지각/조퇴(3회 = 결석 1일) 포함하여 총 결석일수로 환산 후 비율을 적용
function calculateAttendanceScore(attendance) {
  let total = 0;
  for (const year of [1, 2, 3]) {
    const { tardy = 0, absent = 0 } = attendance[year] || {};
    const extraAbs = Math.floor((tardy || 0) / 3);
    const totalAbs = (absent || 0) + extraAbs;
    // 비율 계산: 0→100%,1→90%,2→80%,3→70%,4→60%,5→50%,6+→40%
    let ratio;
    if (totalAbs >= 6) ratio = 0.4;
    else {
      const table = [1.0, 0.9, 0.8, 0.7, 0.6, 0.5];
      ratio = table[totalAbs] ?? 0.4;
    }
    const base = year === 1 ? 6 : 7;
    total += base * ratio;
  }
  return parseFloat(total.toFixed(3));
}

// 봉사활동 점수 계산: 15시간 이상은 20점, 7시간 이하 12점, 그 사이에는 1시간당 1점씩 증가
function calculateVolunteerScore(hours) {
  if (hours >= 15) return 20;
  if (hours <= 7) return 12;
  // 8~14시간: 13~19점
  return 12 + (hours - 7);
}

// 학교활동 점수 계산: 기본 8점 + 수상(0.5점/개) + 자치회(0.1점/월), 가산점 2점 제한
function calculateSchoolActivityScore(awards, months) {
  const awardPoints = awards * 0.5;
  const councilPoints = months * 0.1;
  const extra = Math.min(awardPoints + councilPoints, 2);
  return 8 + extra;
}

// 총점 계산 함수: 학기별 점수, 체육·예술 점수, 출결, 봉사, 학교활동을 모두 더함
function calculateTotal(data) {
  const { grades, attendance, volunteerHours, awards, councilMonths } = data;
  // 학기별 일반 교과 점수 합산
  let gradeSum = 0;
  const semesterScores = {};
  for (const sem of semesters) {
    const s = calculateSemesterScore(sem.key, grades[sem.key], sem.base, sem.achWeight, sem.rawWeight);
    semesterScores[sem.key] = s;
    gradeSum += s;
  }
  // 체육·예술 점수
  const artScore = calculateArtScore(grades);
  // 출결 점수
  const attendanceScore = calculateAttendanceScore(attendance);
  // 봉사 점수
  const volunteerScore = calculateVolunteerScore(volunteerHours);
  // 학교활동 점수
  const schoolActivityScore = calculateSchoolActivityScore(awards, councilMonths);
  const total = parseFloat((gradeSum + artScore + attendanceScore + volunteerScore + schoolActivityScore).toFixed(3));
  return { semesterScores, artScore, attendanceScore, volunteerScore, schoolActivityScore, total };
}

// 결과를 화면에 표시합니다.
function displayResult(result) {
  const area = document.getElementById("result");
  if (!area) return;
  const { semesterScores, artScore, attendanceScore, volunteerScore, schoolActivityScore, total } = result;
  let html = "<h3>계산 결과</h3>";
  html += `<p>1학년 2학기 (일반교과): ${semesterScores["1_2"]}</p>`;
  html += `<p>2학년 1학기 (일반교과): ${semesterScores["2_1"]}</p>`;
  html += `<p>2학년 2학기 (일반교과): ${semesterScores["2_2"]}</p>`;
  html += `<p>3학년 1학기 (일반교과): ${semesterScores["3_1"]}</p>`;
  html += `<p>체육·예술 교과: ${artScore}</p>`;
  html += `<p>출결 점수: ${attendanceScore}</p>`;
  html += `<p>봉사 활동 점수: ${volunteerScore}</p>`;
  html += `<p>학교 활동 점수: ${schoolActivityScore}</p>`;
  html += `<h4>총점: ${total}점 / 200점 만점</h4>`;
  area.innerHTML = html;
}

// 서버에 데이터 저장
async function saveMsData(data, result) {
  // 저장할 객체에 계산 결과를 포함하여 기록
  const payload = { msData: Object.assign({}, data, { result }) };
  try {
    await fetch("/api/ms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + idToken
      },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    console.error("save ms data error", e);
  }
}

// 로그아웃 처리: 대시보드와 동일한 방식으로 로그아웃합니다.
function logout() {
  localStorage.clear();
  firebase.auth().signOut();
  location.href = "index.html";
}

// 초기화: 폼을 생성하고 데이터를 로드한 후 이벤트 리스너를 설정합니다.
function init() {
  buildForm();
  fetchMsData();
  const btn = document.getElementById("calcBtn");
  if (btn) {
    btn.addEventListener("click", () => {
      const data = collectFormData();
      const result = calculateTotal(data);
      displayResult(result);
      saveMsData(data, result);
    });
  }
}

// Firebase 토큰 자동 갱신: 기존 대시보드 로직을 따라 적용
firebase.auth().onIdTokenChanged(async (user) => {
  if (user) {
    const newToken = await user.getIdToken(true);
    localStorage.setItem("idToken", newToken);
  } else {
    localStorage.removeItem("idToken");
  }
});

// 문서 로드 완료 후 초기화 실행
document.addEventListener("DOMContentLoaded", init);