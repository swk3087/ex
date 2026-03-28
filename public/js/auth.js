function showTab(name) {
  const loginTab = document.getElementById("loginTab");
  const registerTab = document.getElementById("registerTab");
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");

  if (name === "login") {
    loginTab.classList.add("active");
    registerTab.classList.remove("active");
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");
  } else {
    loginTab.classList.remove("active");
    registerTab.classList.add("active");
    loginForm.classList.add("hidden");
    registerForm.classList.remove("hidden");
  }

  document.getElementById("msg").textContent = "";
}

function msg(text) {
  document.getElementById("msg").textContent = text;
}

function v(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

async function login() {
  try {
    const email   = v("loginEmail");
    const password= v("loginPassword");

    // 1️⃣ Firebase 로그인
    const cred = await firebase.auth().signInWithEmailAndPassword(email, password);

    // 2️⃣ 이메일 인증 확인
    if (!cred.user.emailVerified) {
      msg("이메일 인증이 완료되지 않았습니다.");
      await firebase.auth().signOut();
      return;
    }

    // 3️⃣ 최신 토큰
    const idToken = await cred.user.getIdToken(true);

    // ✅ 성공
    localStorage.setItem("idToken", idToken);
    // 기존에는 바로 dashboard.html로 이동했으나, 로그인 후 선택 페이지로 이동한다.
    location.href = "choice.html";

  } catch (e) {
    msg("로그인 실패: " + e.message);
  }
}

async function register() {
  try {
    const email = v("registerEmail");
    const password = v("registerPassword");
    const stunum = v("registerStunum");

    if (!/^\d{4}$/.test(stunum)) {
      msg("학번은 4자리 숫자입니다.");
      return;
    }

    const cred = await firebase.auth().createUserWithEmailAndPassword(email, password);
    const idToken = await cred.user.getIdToken();

    const regResp = await fetch("/api/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + idToken
      },
      body: JSON.stringify({ stunum })
    });
    const regBody = await regResp.json().catch(() => ({}));

    if (!regResp.ok) {
      await cred.user.delete().catch(() => {});
      await firebase.auth().signOut().catch(() => {});
      msg("회원가입 실패: " + (regBody.error || "서버 오류"));
      return;
    }

    await cred.user.sendEmailVerification();

    msg("이메일 인증 링크를 보냈습니다. 99%로 스팸함에 있습니다.");
    await firebase.auth().signOut();
  } catch (e) {
    await firebase.auth().signOut().catch(() => {});
    msg("회원가입 실패: " + e.message);
  }
}
