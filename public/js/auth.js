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
    const stunum  = v("loginStunum");

    if (!/^\d{4}$/.test(stunum)) {
      msg("학번은 4자리 숫자입니다.");
      return;
    }

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

    // 4️⃣ 학번 확인 함수
    const loginCheck = async () => {
      const resp = await fetch("/api/login-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + idToken
        },
        body: JSON.stringify({ stunum })
      });
      const body = await resp.json().catch(() => ({}));
      return { ok: resp.ok, status: resp.status, body };
    };

    // 5️⃣ 첫 로그인 체크
    let { ok, status, body } = await loginCheck();

    // 6️⃣ 학번 미등록(400)은 무조건 자동 등록 시도
    if (status === 400) {
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
        msg("학번 등록 실패: " + (regBody.error || "서버 오류"));
        await firebase.auth().signOut();
        return;
      }

      // 재확인
      ({ ok, status, body } = await loginCheck());
    }

    // 7️⃣ 불일치(403) 또는 기타 실패
    if (!ok) {
      msg("로그인 실패: " + (body.error || `서버 오류 (${status})`));
      await firebase.auth().signOut();
      return;
    }

    // ✅ 성공
    localStorage.setItem("idToken", idToken);
    location.href = "dashboard.html";

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
    await cred.user.sendEmailVerification();

    msg("이메일 인증 링크를 보냈습니다. 99%로 스팸함에 있습니다.");
    await firebase.auth().signOut();
  } catch (e) {
    msg("회원가입 실패: " + e.message);
  }
}
