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
    const leftAvg = avg(bucket[dimKey]);         // ex) E 평균
    const rightAvg = 100 - leftAvg;              // ex) I 평균
    const letter = leftAvg > 50 ? leftChar : rightChar; // 50:50 불가능
    return { letter, leftAvg: Number(leftAvg.toFixed(1)), rightAvg: Number(rightAvg.toFixed(1)) };
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