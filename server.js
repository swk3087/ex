import express from "express";
import bodyParser from "body-parser";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import { readJSON, writeJSON, ensureDir } from "./utils/fileUtil.js";
import { calculateR2 } from "./utils/scoreUtil.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 2222;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

const dataDir = path.join(__dirname, "data");
const usersDir = path.join(dataDir, "users");
const logDir = path.join(__dirname, "log");
const stunumFile = path.join(dataDir, "stunum.json");

await ensureDir(usersDir);
await ensureDir(logDir);
if (!fs.existsSync(stunumFile)) await writeJSON(stunumFile, {});
// 🔹 요청 로깅 미들웨어
app.use((req, res, next) => {
  const now = new Date();
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  const logLine = `[${now.toLocaleString("ko-KR")}] [REQ] ${ip} ${req.method} ${req.originalUrl}\n`;
  
  // 콘솔 출력
  console.log(logLine.trim());

  // 파일 로그
  const logFile = path.join(logDir, `${now.toISOString().split("T")[0]}.log`);
  fs.appendFileSync(logFile, logLine);

  next();
});

// 🔹 Firebase Admin 초기화 (공식 방식)
const serviceAccount = JSON.parse(
  fs.readFileSync(path.join(__dirname, "firebase-admin.json"), "utf8")
);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

async function createInitialUserData() {
  const max = await readJSON(path.join(dataDir, "maxinput.json"));
  const data = {};

  for (const [subject, items] of Object.entries(max)) {
    data[subject] = {};
    for (const [key] of Object.entries(items)) {
      data[subject][key] = { r1: 0, r2: 0 };
    }
  }

  return data;
}

async function ensureUserDataFile(uid) {
  const userPath = path.join(usersDir, `${uid}.json`);
  if (fs.existsSync(userPath)) return userPath;

  const data = await createInitialUserData();
  await writeJSON(userPath, data);
  return userPath;
}

// 🔹 로그 함수
function log(type, msg) {
  const now = new Date();
  const file = path.join(logDir, `${now.toISOString().split("T")[0]}.log`);
  const line = `[${now.toLocaleString("ko-KR")}] [${type}] ${msg}\n`;
  fs.appendFileSync(file, line);
  console.log(line.trim());
}

async function verifyRequestToken(req, res) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing token" });
    return null;
  }
  const token = header.split(" ")[1];
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.uid = decoded.uid;
    req.email = decoded.email;
    req.emailVerified = decoded.email_verified;
    return decoded;
  } catch (err) {
    console.error("verifyIdToken error:", err.message);
    res.status(401).json({ error: "Invalid token" });
    return null;
  }
}

// 🔹 인증 미들웨어
async function requireToken(req, res, next) {
  const decoded = await verifyRequestToken(req, res);
  if (decoded) next();
}

async function requireAuth(req, res, next) {
  const decoded = await verifyRequestToken(req, res);
  if (!decoded) return;
  if (!decoded.email_verified) {
    return res.status(403).json({ error: "이메일 인증이 완료되지 않았습니다." });
  }
  next();
}

// 🔹 회원가입: 학번 등록
app.post("/api/register", requireToken, async (req, res) => {
  try {
    const { stunum } = req.body;
    if (!/^\d{4}$/.test(stunum))
      return res.status(400).json({ error: "학번은 4자리 숫자입니다." });

    const stunumData = await readJSON(stunumFile);
    const registeredStunum = stunumData[req.uid];

    if (
      Object.entries(stunumData).some(
        ([uid, value]) => uid !== req.uid && value === stunum
      )
    )
      return res.status(400).json({ error: "이미 등록된 학번입니다." });

    if (registeredStunum && registeredStunum !== stunum) {
      return res
        .status(400)
        .json({ error: "이 계정에는 이미 다른 학번이 등록되어 있습니다." });
    }

    await ensureUserDataFile(req.uid);
    stunumData[req.uid] = stunum;
    await writeJSON(stunumFile, stunumData);

    if (registeredStunum !== stunum) {
      log("REGISTER", `✅ ${req.email}(${req.uid}) → 학번 ${stunum} 등록`);
    }

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "서버 오류" });
  }
});


// 🔹 사용자 데이터 불러오기
app.get("/api/user", requireAuth, async (req, res) => {
  const stunumData = await readJSON(stunumFile);
  const stunum = stunumData[req.uid] ?? null;

  const userPath = await ensureUserDataFile(req.uid);

  const userData = await readJSON(userPath);
  const defaultData = await readJSON(path.join(dataDir, "default.json"));
  const maxData = await readJSON(path.join(dataDir, "maxinput.json"));
  res.json({ userData, defaultData, maxData, stunum });
});
// 중학교 내신 데이터 조회
app.get("/api/ms", requireAuth, async (req, res) => {
  const userPath = await ensureUserDataFile(req.uid);
  const userData = await readJSON(userPath);
  const msData = userData.ms || {};
  res.json({ msData });
});

// 중학교 내신 데이터 저장
app.post("/api/ms", requireAuth, async (req, res) => {
  try {
    const { msData } = req.body;
    if (!msData) {
      return res.status(400).json({ error: "msData가 필요합니다." });
    }
    const userPath = await ensureUserDataFile(req.uid);
    const userData = await readJSON(userPath);
    userData.ms = msData;
    await writeJSON(userPath, userData);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "저장 실패" });
  }
});

// 🔹 점수 수정
app.post("/api/update", requireAuth, async (req, res) => {
  const { subject, key, value } = req.body;
  const userPath = await ensureUserDataFile(req.uid);

  const userData = await readJSON(userPath);
  const def = await readJSON(path.join(dataDir, "default.json"));
  const max = await readJSON(path.join(dataDir, "maxinput.json"));

  const maxR1 = max[subject]?.[key]?.r1 ?? 0;
  const b = def[subject]?.[key]?.b ?? 0;
  const v = Number(value);

  if (isNaN(v) || v < 0 || v > maxR1)
    return res.status(400).json({ error: `0~${maxR1} 범위 입력 필요` });

  userData[subject][key].r1 = v;
  userData[subject][key].r2 = calculateR2(v, b);
  await writeJSON(userPath, userData);
  res.json({ success: true });
});

// 🔹 서버 시작
app.listen(PORT, () => log("SYSTEM", `🚀 Running at http://localhost:${PORT}`));
