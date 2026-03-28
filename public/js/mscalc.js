const idToken = localStorage.getItem("idToken");
if (!idToken) {
  location.href = "login.html";
}

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

const artSubjects = ["체육", "미술", "음악"];
const thirdSemesterToggleId = "useThirdGradeSecondSemester";
const thirdSemesterKey = "3_2";

const semesters = [
  { key: "1_2", label: "1학년 2학기", base: 4, achWeight: 0.8, rawWeight: 0.04, maxScore: 12 },
  { key: "2_1", label: "2학년 1학기", base: 8, achWeight: 1.6, rawWeight: 0.08, maxScore: 24 },
  { key: "2_2", label: "2학년 2학기", base: 8, achWeight: 1.6, rawWeight: 0.08, maxScore: 24 },
  { key: "3_1", label: "3학년 1학기", base: 10, achWeight: 2, rawWeight: 0.1, maxScore: 30 },
  { key: "3_2", label: "3학년 2학기", base: 10, achWeight: 2, rawWeight: 0.1, maxScore: 30 }
];

function buildForm() {
  const container = document.getElementById("msForm");
  container.innerHTML = "";

  for (const sem of semesters) {
    const section = document.createElement("section");
    section.className = "semester-section";
    section.id = `semesterSection_${sem.key}`;
    section.dataset.semKey = sem.key;

    const semHeader = document.createElement("h4");
    semHeader.textContent = sem.label;
    section.appendChild(semHeader);

    const table = document.createElement("table");
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

    const tbody = document.createElement("tbody");
    for (const subj of subjects) {
      const tr = document.createElement("tr");

      const tdName = document.createElement("td");
      tdName.textContent = subj;
      tr.appendChild(tdName);

      const tdRaw = document.createElement("td");
      const inputRaw = document.createElement("input");
      inputRaw.type = "text";
      inputRaw.pattern = "^\\d{1,3}$|^@$";
      inputRaw.placeholder = "점수 또는 @";
      inputRaw.id = `raw_${sem.key}_${subj}`;
      tdRaw.appendChild(inputRaw);
      tr.appendChild(tdRaw);

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
    section.appendChild(table);
    container.appendChild(section);
  }

  updateThirdSemesterVisibility();
}

function isThirdSemesterEnabled() {
  return document.getElementById(thirdSemesterToggleId)?.checked ?? false;
}

function updateThirdSemesterVisibility() {
  const enabled = isThirdSemesterEnabled();
  const section = document.getElementById(`semesterSection_${thirdSemesterKey}`);
  if (section) {
    section.classList.toggle("is-hidden", !enabled);
  }

  const state = document.getElementById("thirdSemesterState");
  if (state) {
    state.textContent = enabled ? "O" : "X";
  }

  const helper = document.getElementById("thirdSemesterHelper");
  if (helper) {
    helper.textContent = enabled
      ? "O면 3학년 1학기와 2학기를 각각 반영합니다."
      : "X면 3학년 2학기를 숨기고 1학기 성적으로 3학년 전체를 계산합니다.";
  }
}

async function fetchMsData() {
  try {
    const res = await fetch("/api/ms", { headers: { Authorization: "Bearer " + idToken } });
    const { msData } = await res.json();

    const toggle = document.getElementById(thirdSemesterToggleId);
    if (toggle) {
      toggle.checked = Boolean(msData?.useThirdGradeSecondSemester);
    }
    updateThirdSemesterVisibility();

    if (msData?.grades) {
      for (const sem of semesters) {
        const semData = msData.grades[sem.key] || {};
        for (const subj of subjects) {
          const row = semData[subj] || {};
          const rawInput = document.getElementById(`raw_${sem.key}_${subj}`);
          const gradeInput = document.getElementById(`grade_${sem.key}_${subj}`);

          if (rawInput) {
            if (typeof row.raw === "number") {
              rawInput.value = row.raw;
            } else if (row.raw === "@") {
              rawInput.value = "@";
            } else {
              rawInput.value = "";
            }
          }

          if (gradeInput) {
            gradeInput.value = row.grade || "";
          }
        }
      }
    }

    if (msData?.attendance) {
      [1, 2, 3].forEach((yr) => {
        const attendance = msData.attendance[yr] || {};
        const tardyInput = document.getElementById(`tardy${yr}`);
        const absentInput = document.getElementById(`absent${yr}`);
        if (tardyInput && typeof attendance.tardy === "number") tardyInput.value = attendance.tardy;
        if (absentInput && typeof attendance.absent === "number") absentInput.value = attendance.absent;
      });
    }

    if (typeof msData?.volunteerHours === "number") {
      document.getElementById("volunteerHours").value = msData.volunteerHours;
    }
    if (typeof msData?.awards === "number") {
      document.getElementById("awards").value = msData.awards;
    }
    if (typeof msData?.councilMonths === "number") {
      document.getElementById("councilMonths").value = msData.councilMonths;
    }
  } catch (e) {
    console.error("msData load error", e);
  }
}

function collectFormData() {
  const grades = {};

  for (const sem of semesters) {
    const semObj = {};
    for (const subj of subjects) {
      const rawInput = document.getElementById(`raw_${sem.key}_${subj}`);
      const gradeInput = document.getElementById(`grade_${sem.key}_${subj}`);

      let rawVal = null;
      if (rawInput) {
        const rawStr = (rawInput.value || "").trim();
        if (rawStr === "") {
          rawVal = null;
        } else if (rawStr === "@") {
          rawVal = "@";
        } else {
          const parsed = parseFloat(rawStr);
          rawVal = Number.isNaN(parsed) ? null : parsed;
        }
      }

      const gradeVal = gradeInput ? gradeInput.value.trim().toUpperCase() : "";
      semObj[subj] = { raw: rawVal, grade: gradeVal };
    }
    grades[sem.key] = semObj;
  }

  const attendance = {};
  [1, 2, 3].forEach((yr) => {
    const tardyInput = document.getElementById(`tardy${yr}`);
    const absentInput = document.getElementById(`absent${yr}`);
    const tardy = tardyInput ? parseInt(tardyInput.value, 10) : 0;
    const absent = absentInput ? parseInt(absentInput.value, 10) : 0;
    attendance[yr] = {
      tardy: Number.isNaN(tardy) ? 0 : tardy,
      absent: Number.isNaN(absent) ? 0 : absent
    };
  });

  return {
    grades,
    attendance,
    volunteerHours: parseFloat(document.getElementById("volunteerHours").value) || 0,
    awards: parseFloat(document.getElementById("awards").value) || 0,
    councilMonths: parseFloat(document.getElementById("councilMonths").value) || 0,
    useThirdGradeSecondSemester: isThirdSemesterEnabled()
  };
}

function isExcludedSubject(info = {}) {
  return info.raw === "@" || (info.grade || "").trim() === "@";
}

function rawToNumber(raw) {
  if (typeof raw !== "number") return null;
  return Number.isFinite(raw) ? raw : null;
}

function inferGradeFromRaw(raw) {
  const numericRaw = rawToNumber(raw);
  if (numericRaw === null) return "";
  if (numericRaw >= 90) return "A";
  if (numericRaw >= 80) return "B";
  if (numericRaw >= 70) return "C";
  if (numericRaw >= 60) return "D";
  return "E";
}

function resolveGeneralGrade(raw, grade) {
  const normalizedGrade = (grade || "").trim().toUpperCase();
  if (normalizedGrade) {
    return normalizedGrade === "@" ? "" : normalizedGrade;
  }
  return inferGradeFromRaw(raw);
}

function gradeToPoint(grade) {
  switch ((grade || "").toUpperCase()) {
    case "A": return 5;
    case "B": return 4;
    case "C": return 3;
    case "D": return 2;
    case "E": return 1;
    default: return 0;
  }
}

function cloneSemesterData(semData = {}) {
  const cloned = {};
  for (const subj of subjects) {
    const row = semData[subj] || {};
    cloned[subj] = {
      raw: row.raw ?? null,
      grade: row.grade ?? ""
    };
  }
  return cloned;
}

function buildEffectiveGrades(grades = {}, useThirdGradeSecondSemester = false) {
  const effectiveGrades = {};
  for (const sem of semesters) {
    effectiveGrades[sem.key] = cloneSemesterData(grades[sem.key]);
  }

  if (!useThirdGradeSecondSemester) {
    effectiveGrades[thirdSemesterKey] = cloneSemesterData(grades["3_1"]);
  }

  return effectiveGrades;
}

function calculateSemesterScore(semData = {}, base, achWeight, rawWeight) {
  let sumAch = 0;
  let sumRaw = 0;
  let count = 0;

  for (const subj of subjects) {
    if (artSubjects.includes(subj)) continue;

    const info = semData[subj] || {};
    if (isExcludedSubject(info)) continue;

    const raw = rawToNumber(info.raw);
    const gradePoint = gradeToPoint(resolveGeneralGrade(raw, info.grade));

    if (raw !== null || gradePoint > 0) {
      if (gradePoint > 0) sumAch += gradePoint;
      if (raw !== null) sumRaw += raw;
      count += 1;
    }
  }

  if (count === 0) return base;

  const avgAch = sumAch / count;
  const avgRaw = sumRaw / count;
  return parseFloat((base + avgAch * achWeight + avgRaw * rawWeight).toFixed(3));
}

function calculateArtScore(gradesData) {
  let aCount = 0;
  let bCount = 0;
  let cCount = 0;
  let subjCount = 0;

  for (const sem of semesters) {
    const semData = gradesData[sem.key] || {};
    for (const subj of artSubjects) {
      const info = semData[subj] || {};
      if (isExcludedSubject(info)) continue;

      const grade = (info.grade || "").trim().toUpperCase();
      if (grade === "A" || grade === "B" || grade === "C") {
        subjCount += 1;
        if (grade === "A") aCount += 1;
        else if (grade === "B") bCount += 1;
        else cCount += 1;
      }
    }
  }

  if (subjCount === 0) return 16.667;

  const weightedSum = 3 * aCount + 2 * bCount + cCount;
  return parseFloat((10 + 20 * (weightedSum / (3 * subjCount))).toFixed(3));
}

function calculateAttendanceScore(attendance) {
  let total = 0;
  for (const year of [1, 2, 3]) {
    const { tardy = 0, absent = 0 } = attendance[year] || {};
    const extraAbs = Math.floor((tardy || 0) / 3);
    const totalAbs = (absent || 0) + extraAbs;

    let ratio;
    if (totalAbs >= 6) ratio = 0.4;
    else ratio = [1.0, 0.9, 0.8, 0.7, 0.6, 0.5][totalAbs] ?? 0.4;

    total += (year === 1 ? 6 : 7) * ratio;
  }

  return parseFloat(total.toFixed(3));
}

function calculateVolunteerScore(hours) {
  if (hours >= 15) return 20;
  if (hours <= 7) return 12;
  return 12 + (hours - 7);
}

function calculateSchoolActivityScore(awards, months) {
  return 8 + Math.min(awards * 0.5 + months * 0.1, 2);
}

function semesterHasData(semData = {}, isArtSemester = false) {
  for (const subj of subjects) {
    if (!isArtSemester && artSubjects.includes(subj)) continue;

    const info = semData[subj] || {};
    if (isExcludedSubject(info)) continue;

    const raw = rawToNumber(info.raw);
    const grade = isArtSemester
      ? (info.grade || "").trim().toUpperCase()
      : resolveGeneralGrade(raw, info.grade);

    if (raw !== null || gradeToPoint(grade) > 0) {
      return true;
    }
  }
  return false;
}

function calculateTotal(data) {
  const {
    grades,
    attendance,
    volunteerHours,
    awards,
    councilMonths,
    useThirdGradeSecondSemester
  } = data;

  const effectiveGrades = buildEffectiveGrades(grades, useThirdGradeSecondSemester);
  const semesterScores = {};
  let gradeSum = 0;

  for (const sem of semesters) {
    const score = calculateSemesterScore(
      effectiveGrades[sem.key],
      sem.base,
      sem.achWeight,
      sem.rawWeight
    );
    semesterScores[sem.key] = score;
    gradeSum += score;
  }

  const artScore = calculateArtScore(effectiveGrades);
  const attendanceScore = calculateAttendanceScore(attendance);
  const volunteerScore = calculateVolunteerScore(volunteerHours);
  const schoolActivityScore = calculateSchoolActivityScore(awards, councilMonths);
  const total = parseFloat((
    gradeSum + artScore + attendanceScore + volunteerScore + schoolActivityScore
  ).toFixed(3));

  let minus = 0;

  for (const sem of semesters) {
    if (semesterHasData(effectiveGrades[sem.key])) {
      const diff = sem.maxScore - semesterScores[sem.key];
      if (diff > 0) minus += diff;
    }
  }

  if (semesterHasData(effectiveGrades["1_2"], true) ||
      semesterHasData(effectiveGrades["2_1"], true) ||
      semesterHasData(effectiveGrades["2_2"], true) ||
      semesterHasData(effectiveGrades["3_1"], true) ||
      semesterHasData(effectiveGrades["3_2"], true)) {
    const diffArt = 30 - artScore;
    if (diffArt > 0) minus += diffArt;
  }

  const diffAttendance = 20 - attendanceScore;
  if (diffAttendance > 0) minus += diffAttendance;

  const diffVolunteer = 20 - volunteerScore;
  if (diffVolunteer > 0) minus += diffVolunteer;

  const diffSchool = 10 - schoolActivityScore;
  if (diffSchool > 0) minus += diffSchool;

  return {
    semesterScores,
    artScore,
    attendanceScore,
    volunteerScore,
    schoolActivityScore,
    total,
    minus: parseFloat(minus.toFixed(3)),
    useThirdGradeSecondSemester
  };
}

function displayResult(result) {
  const area = document.getElementById("result");
  if (!area) return;

  const thirdSemesterNote = result.useThirdGradeSecondSemester
    ? ""
    : " (3학년 1학기 성적으로 계산)";

  area.innerHTML = `
    <h3>계산 결과</h3>
    <p>1학년 2학기 (일반교과): ${result.semesterScores["1_2"]}</p>
    <p>2학년 1학기 (일반교과): ${result.semesterScores["2_1"]}</p>
    <p>2학년 2학기 (일반교과): ${result.semesterScores["2_2"]}</p>
    <p>3학년 1학기 (일반교과): ${result.semesterScores["3_1"]}</p>
    <p>3학년 2학기 (일반교과): ${result.semesterScores["3_2"]}${thirdSemesterNote}</p>
    <p>체육·예술 교과: ${result.artScore}</p>
    <p>출결 점수: ${result.attendanceScore}</p>
    <p>봉사 활동 점수: ${result.volunteerScore}</p>
    <p>학교 활동 점수: ${result.schoolActivityScore}</p>
    <h4>총점: ${result.total}점 / 200점 만점</h4>
    <p>[(입력되지 않은 값 제외한 마이너스된 점수) - ${result.minus}점]</p>
  `;
}

async function saveMsData(data, result) {
  try {
    await fetch("/api/ms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + idToken
      },
      body: JSON.stringify({ msData: Object.assign({}, data, { result }) })
    });
  } catch (e) {
    console.error("save ms data error", e);
  }
}

let saveTimeout = null;
function autoSave() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    const data = collectFormData();
    const result = calculateTotal(data);
    displayResult(result);
    saveMsData(data, result);
  }, 300);
}

function attachAutoSave() {
  const inputs = document.querySelectorAll("#semesterControls input, #msForm input, #extraInputs input");
  inputs.forEach((el) => {
    const eventName = el.type === "checkbox" ? "change" : "input";
    el.addEventListener(eventName, () => {
      if (el.id === thirdSemesterToggleId) {
        updateThirdSemesterVisibility();
      }
      autoSave();
    });
  });
}

function logout() {
  localStorage.clear();
  firebase.auth().signOut();
  location.href = "login.html";
}

async function init() {
  buildForm();
  await fetchMsData();
  updateThirdSemesterVisibility();
  attachAutoSave();

  const initialResult = calculateTotal(collectFormData());
  displayResult(initialResult);

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

firebase.auth().onIdTokenChanged(async (user) => {
  if (user) {
    const newToken = await user.getIdToken(true);
    localStorage.setItem("idToken", newToken);
  } else {
    localStorage.removeItem("idToken");
  }
});

document.addEventListener("DOMContentLoaded", init);
