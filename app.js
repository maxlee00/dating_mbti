// app.js
const EXP_KEY = "hp_variant_v1";

function initExperiment() {
  // 이미 배정되어 있으면 유지
  let v = localStorage.getItem(EXP_KEY);
  if (!v) {
    v = Math.random() < 0.5 ? "A" : "B";
    localStorage.setItem(EXP_KEY, v);
  }
  return v;
}

function getVariant() {
  return localStorage.getItem(EXP_KEY) || "A";
}

// GA4 이벤트 전송 (필수: variant 자동 포함)
function track(eventName, params = {}) {
  const payload = {
    variant: getVariant(),
    ...params
  };

  // gtag가 없으면(로컬/차단 등) 콘솔만
  if (typeof gtag !== "function") {
    console.log("[track]", eventName, payload);
    return;
  }
  gtag("event", eventName, payload);
}

// ===== MBTI 계산
const WEIGHTS_4 = [88, 62, 34, 16]; 
// index 0..3 선택지에 대응하는 "왼쪽 성향 %" (오른쪽은 100 - left)

function avg(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * picks: 질문별 선택 index (0~3) 배열
 * questions: quiz.html의 questions 배열(각 문항에 dim, leftChar, rightChar 필요)
 * return: { mbti, score } 
 */
function calcWeightedMbti(picks, questions) {
  const bucket = {
    EI: [], NS: [], TF: [], JP: []
  };

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const pickIdx = picks[i]; // 0~3
    const leftPct = WEIGHTS_4[pickIdx]; // 90/66/41/9
    bucket[q.dim].push(leftPct);
  }

  function pickLetter(dimKey, leftChar, rightChar) {
    const arr = bucket[dimKey];     // leftPct들
    const n = arr.length;

    const sum = arr.reduce((a,b)=>a+b, 0);
    const minSum = 16 * n;
    const maxSum = 88 * n;

    // 0~100으로 정규화 (올-왼쪽이면 100)
    const leftScore = ((sum - minSum) / (maxSum - minSum)) * 100;

    // 표시용(정수)
    let leftPctShown = Math.round(leftScore);
    let rightPctShown = 100 - leftPctShown;

    // 판정(동일하게 단조 증가라 결과 동일)
    // ✅ 판정 기준을 leftScore로 두는 게 더 일관적임
    const letter = leftScore > 50 ? leftChar : rightChar;

    // ✅ 50:50이면 letter 기준으로 51:49로 깨기
    if (leftPctShown === 50 && rightPctShown === 50) {
      if (letter === leftChar) {
        leftPctShown = 51; rightPctShown = 49;
      } else {
        leftPctShown = 49; rightPctShown = 51;
      }
    }

    return {
      letter,
      leftAvg: leftPctShown,
      rightAvg: rightPctShown
    };
  }

  const rEI = pickLetter("EI", "E", "I");
  const rNS = pickLetter("NS", "N", "S");
  const rTF = pickLetter("TF", "T", "F");
  const rJP = pickLetter("JP", "J", "P");

  const mbti = rEI.letter + rNS.letter + rTF.letter + rJP.letter;

  return {
    mbti,
    score: {
      EI: { E: rEI.leftAvg, I: rEI.rightAvg },
      NS: { N: rNS.leftAvg, S: rNS.rightAvg },
      TF: { T: rTF.leftAvg, F: rTF.rightAvg },
      JP: { J: rJP.leftAvg, P: rJP.rightAvg }
    }
  };
}

const ctaArea = document.getElementById('ctaArea');
if (ctaArea) {
  ctaArea.innerHTML = `
    <button class="btn btn-primary" id="ctaBtn">
      이 성향에 맞는 데이트 코스 추천 받기
    </button>
    <button class="btn btn-secondary" id="retryBtn" type="button">
      테스트 다시하기
    </button>
  `;
}

const matchBox = document.getElementById("matchBox");

