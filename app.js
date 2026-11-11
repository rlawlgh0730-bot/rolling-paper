// ============================================================================
// [중요] 아래 두 줄에 본인의 Supabase URL과 API Key(anon public)를 붙여넣으세요!
// ============================================================================
const SUPABASE_URL = "https://stzpbluilapjaadfzudz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_tQQFRauqEo1HfxXeKGy0ng_ERDdNBE2";

// Supabase가 정상적으로 입력되었는지 확인
const isSupabaseConfigured =
  SUPABASE_URL.startsWith("https://") &&
  SUPABASE_ANON_KEY.length > 20 &&
  !SUPABASE_ANON_KEY.startsWith("https://") &&
  !SUPABASE_ANON_KEY.includes("여기에_");

const supabaseClient = isSupabaseConfigured
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// HTML 요소 가져오기
const memoForm = document.getElementById("memoForm");
const nicknameInput = document.getElementById("nickname");
const contentInput = document.getElementById("content");
const colorPicker = document.getElementById("colorPicker");
const submitBtn = document.getElementById("submitBtn");
const memoBoard = document.getElementById("memoBoard");
const memoCount = document.getElementById("memoCount");
const refreshBtn = document.getElementById("refreshBtn");
const setupNotice = document.getElementById("setupNotice");

let selectedColor = "yellow";

// 1. 포스트잇 색상 선택 이벤트
colorPicker.addEventListener("click", (e) => {
  const btn = e.target.closest(".color-btn");
  if (!btn) return;

  document.querySelectorAll(".color-btn").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  selectedColor = btn.dataset.color;
});

// 2. 날짜를 보기 좋게 포맷팅하는 함수
function formatDate(isoString) {
  const date = new Date(isoString);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${month}월 ${day}일 ${hours}:${minutes}`;
}

// 3. XSS 방지용 안전한 텍스트 변환 함수
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// 4. 화면에 포스트잇 목록을 그리는 함수
function renderMemos(memos) {
  memoCount.textContent = memos.length;

  if (memos.length === 0) {
    memoBoard.innerHTML = `
      <div class="empty-state">
        ✨ 아직 남겨진 포스트잇이 없어요.<br/>첫 번째 롤링 페이퍼의 주인공이 되어보세요!
      </div>
    `;
    return;
  }

  memoBoard.innerHTML = memos
    .map(
      (memo) => `
      <article class="note-card ${escapeHtml(memo.color || "yellow")}">
        <div class="note-content">${escapeHtml(memo.content)}</div>
        <div class="note-footer">
          <span class="note-author">From. ${escapeHtml(memo.nickname)}</span>
          <span class="note-date">${formatDate(memo.created_at)}</span>
        </div>
      </article>
    `
    )
    .join("");
}

// 5. 메모 불러오기 (Supabase 연결 시 DB에서, 미연결 시 브라우저 임시 저장소에서)
async function loadMemos() {
  if (!isSupabaseConfigured) {
    setupNotice.style.display = "block";
    const localData = JSON.parse(localStorage.getItem("demo_rolling_papers") || "[]");
    renderMemos(localData);
    return;
  }

  setupNotice.style.display = "none";

  const { data, error } = await supabaseClient
    .from("rolling_papers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("데이터 불러오기 오류:", error);
    memoBoard.innerHTML = `
      <div class="empty-state">
        ⚠️ 데이터를 불러오지 못했습니다: ${escapeHtml(error.message)}<br/>
        Supabase에서 <code>supabase_setup.sql</code>을 실행했는지 확인해주세요!
      </div>
    `;
    return;
  }

  renderMemos(data || []);
}

// 6. 새 메모 저장하기
memoForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nickname = nicknameInput.value.trim();
  const content = contentInput.value.trim();

  if (!nickname || !content) return;

  submitBtn.disabled = true;
  submitBtn.textContent = "붙이는 중...";

  try {
    if (!isSupabaseConfigured) {
      // 미연결 시 테스트용 로컬 저장
      const localData = JSON.parse(localStorage.getItem("demo_rolling_papers") || "[]");
      localData.unshift({
        id: Date.now(),
        nickname,
        content,
        color: selectedColor,
        created_at: new Date().toISOString(),
      });
      localStorage.setItem("demo_rolling_papers", JSON.stringify(localData));
    } else {
      // Supabase DB에 저장
      const { error } = await supabaseClient
        .from("rolling_papers")
        .insert([{ nickname, content, color: selectedColor }]);

      if (error) throw error;
    }

    // 입력창 초기화 및 목록 새로고침
    contentInput.value = "";
    await loadMemos();
  } catch (err) {
    alert("메모 저장 중 오류가 발생했습니다: " + err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "📌 롤링 페이퍼 붙이기";
  }
});

// 새로고침 버튼 클릭 이벤트
refreshBtn.addEventListener("click", loadMemos);

// 페이지 첫 로드 시 실행
loadMemos();

