// mscalc.js: 중학교 내신 계산기 클라이언트 스크립트
// 로그인 여부를 확인하고, 사용자가 점수와 성취도를 입력하여 총점을 계산할 수 있도록 한다.

// Firebase 인증 토큰을 확인합니다. 토큰이 없으면 로그인 화면으로 이동합니다.
const idToken = localStorage.getItem("idToken");
if (!idToken) {
  location.href = "login.html";
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
  // 각 학기별로 독립된 테이블을 생성하여 세로로 긴 레이아웃을 구현한다.
  for (const sem of semesters) {
    // 학기 제목 표시
    const semHeader = document.createElement("h4");
    semHeader.textContent = sem.label;
    container.appendChild(semHeader);
    // 테이블 생성
    const table = document.createElement("table");
    table.style.borderCollapse = "collapse";
    // 헤더 행: 과목, 원점수, 성취도
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    const thSubject = document.createElement("th");
    thSubject.textContent = "과목";
    headerRow.appendChild(thSubject);
    const thRaw = document.createElement("th");
    thRaw.textContent = "원점수";
    headerRow.appendChild(thRaw);
    const thGrade = document.createElement("th");
    thGrade.textContent = "성취도";
    headerRow.appendChild(thGrade);
    thead.appendChild(headerRow);
    table.appendChild(thead);
    // 몸체: 각 과목별 입력 행
    const tbody = document.createElement("tbody");
    for (const subj of subjects) {
      const tr = document.createElement("tr");
      // 과목명
      const tdName = document.createElement("td");
      tdName.textContent = subj;
      tr.appendChild(tdName);
      // 원점수 입력
      const tdRaw = document.createElement("td");
      const inputRaw = document.createElement("input");
      inputRaw.type = "text";
      inputRaw.pattern = "^\\d{1,3}$|^@$";
      inputRaw.placeholder = "점수 또는 @";
      // 기본값을 설정하지 않아 빈 입력 상태로 둡니다. (디폴트 '0' 제거)
      inputRaw.id = `raw_${sem.key}_${subj}`;
      tdRaw.appendChild(inputRaw);
      tr.appendChild(tdRaw);
      // 성취도 입력
      const tdGrade = document.createElement("td");
      const inputGrade = document.createElement("input");
      inputGrade.type = "text";
      inputGrade.maxLength = 1;
      inputGrade.placeholder = "A~E 또는 @";
      inputGrade.id = `grade_${sem.key}_${subj}`;
      tdGrade.appendChild(inputGrade);
      tr.appendChild(tdGrade);
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    container.appendChild(table);
  }
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
          if (rawInput) {
            if (typeof row.raw === "number") {
              // 저장된 숫자 점수는 그대로 표시합니다.
              rawInput.value = row.raw;
            } else if (row.raw === "@") {
              // 사용자가 '@'를 입력한 경우 저장된 대로 표시합니다.
              rawInput.value = "@";
            } else {
              // 저장된 값이 null 또는 undefined이면 빈 칸으로 남겨둡니다.
              rawInput.value = "";
            }
          }
          if (gradeInput && row.grade) {
            gradeInput.value = row.grade;
          }
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
      // 원점수는 숫자 또는 '@'를 입력 받을 수 있다. '@'나 빈 값은 null로 처리한다.
      let rawVal = null;
      if (rawInput) {
        const rawStr = (rawInput.value || "").trim();
        if (rawStr === "") {
          // 빈 문자열은 null로 저장하여 미입력으로 처리합니다.
          rawVal = null;
        } else if (rawStr === "@") {
          // '@' 기호는 그대로 문자열로 저장합니다.
          rawVal = "@";
        } else {
          const parsed = parseFloat(rawStr);
          rawVal = isNaN(parsed) ? null : parsed;
        }
      }
      const gradeVal = gradeInput ? gradeInput.value.trim().toUpperCase() : "";
      semObj[subj] = { raw: rawVal, grade: gradeVal };
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
    // 원점수와 성취도 둘 중 하나라도 존재하면 과목수로 인정합니다.
    // raw가 null 또는 '@'이면 미입력으로 간주하여 평균 계산에서 제외합니다.
    if ((raw !== null && raw !== "@") || gradePoint > 0) {
      if (gradePoint > 0) sumAch += gradePoint;
      if (raw !== null && raw !== "@") sumRaw += raw;
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
// 총점 계산과 누락된 값 제외한 감점(마이너스) 계산
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
  // 감점(마이너스) 계산: 입력된 값들만 기준으로 각 영역 최대 점수와의 차이를 합산
  let minus = 0;
  // 일반 교과: 학기별 최대 점수는 base + 성취도 최대(5) * achWeight + 원점수 최대(100) * rawWeight
  for (const sem of semesters) {
    // 학기 데이터 존재 여부 판별 (원점수 또는 성취도 중 하나라도 입력된 과목이 있는지)
    const semData = data.grades[sem.key] || {};
    let hasData = false;
    for (const subj of subjects) {
      if (artSubjects.includes(subj)) continue;
      const info = semData[subj] || {};
      const raw = info.raw;
      const gp = gradeToPoint(info.grade);
      if ((raw !== null && raw !== "@" && raw !== undefined) || gp > 0) {
        hasData = true;
        break;
      }
    }
    if (hasData) {
      const maxScore = sem.base + 5 * sem.achWeight + 100 * sem.rawWeight;
      const actual = semesterScores[sem.key];
      // 음수가 나오지 않도록 0 이상으로 제한
      const diff = maxScore - actual;
      if (diff > 0) minus += diff;
    }
  }
  // 체육·예술: 최대 20점, 단 입력된 성취도가 있을 때만 계산
  // count art subjects with A/B/C grades
  let artSubjectCount = 0;
  for (const sem of semesters) {
    const semData = data.grades[sem.key] || {};
    for (const subj of artSubjects) {
      const info = semData[subj] || {};
      const g = (info.grade || "").toUpperCase();
      if (g === "A" || g === "B" || g === "C") {
        artSubjectCount += 1;
      }
    }
  }
  if (artSubjectCount > 0) {
    const diffArt = 20 - artScore;
    if (diffArt > 0) minus += diffArt;
  }
  // 출결: 최대 20점 (1학년 6 + 2·3학년 7씩). 항상 계산
  const diffAttendance = 20 - attendanceScore;
  if (diffAttendance > 0) minus += diffAttendance;
  // 봉사: 최대 20점. 항상 계산
  const diffVolunteer = 20 - volunteerScore;
  if (diffVolunteer > 0) minus += diffVolunteer;
  // 학교 활동: 최대 10점. 항상 계산
  const diffSchool = 10 - schoolActivityScore;
  if (diffSchool > 0) minus += diffSchool;

  // 소수점 셋째 자리까지 반올림
  minus = parseFloat(minus.toFixed(3));

  return { semesterScores, artScore, attendanceScore, volunteerScore, schoolActivityScore, total, minus };
}

// 결과를 화면에 표시합니다.
function displayResult(result) {
  const area = document.getElementById("result");
  if (!area) return;
  const { semesterScores, artScore, attendanceScore, volunteerScore, schoolActivityScore, total, minus } = result;
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
  // 감점 결과 표시: 입력되지 않은 값(원점수 null/@, 성취도 미입력) 제외한 감점 합산
  if (typeof minus === 'number') {
    html += `<p>[(입력되지 않은 값 제외한 마이너스된 점수) - ${minus}점]</p>`;
  }
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

// 실시간 자동 저장을 위한 변수 및 함수
let saveTimeout = null;
function autoSave() {
  // 입력 변경 시 일정 시간 지연 후 자동 저장합니다.
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    const data = collectFormData();
    // 변화를 반영하여 점수를 계산하고 저장합니다.
    const result = calculateTotal(data);
    saveMsData(data, result);
    // 결과를 즉시 화면에 표시하지는 않으나 필요하면 다음 줄을 활성화하세요.
    // displayResult(result);
  }, 1000);
}

// 입력 요소에 자동 저장 이벤트를 바인딩합니다.
function attachAutoSave() {
  const inputs = document.querySelectorAll('#msForm input, #extraInputs input');
  inputs.forEach((el) => {
    // input 이벤트는 값 변경시마다 발생합니다.
    el.addEventListener('input', autoSave);
  });
}

// 로그아웃 처리: 대시보드와 동일한 방식으로 로그아웃합니다.
function logout() {
  localStorage.clear();
  firebase.auth().signOut();
  location.href = "login.html";
}

// 초기화: 폼을 생성하고 데이터를 로드한 후 이벤트 리스너를 설정합니다.
async function init() {
  buildForm();
  // 저장된 데이터를 불러올 때까지 기다립니다.
  await fetchMsData();
  // 자동 저장 이벤트를 바인딩합니다.
  attachAutoSave();
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