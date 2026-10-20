"use strict";

// 第1〜5問＋最後の合言葉で合計6ステージ。
// 「seikai」の画像は images/seikai.png に入れてください。
const STAMP_IMAGE_PATH = "images/seikai.png";


const STORAGE_KEY = "ramii_anniversary_progress_v2";
const TOTAL_STAGES = 6;
const sections = [...document.querySelectorAll(".stage")];
const progressLabel = document.getElementById("progress-label");
const progressBar = document.getElementById("progress-bar");
const ending = document.getElementById("ending");
let progress = loadProgress();
let nextStageTimer = null;

function loadProgress() {
  try {
    const saved = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isInteger(saved) && saved >= 0 && saved <= TOTAL_STAGES ? saved : 0;
  } catch (error) {
    return 0;
  }
}

function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, String(progress));
  } catch (error) {
    // 保存できない環境でも現在のページ内では回答可能。
  }
}

// 全角・カタカナ入力にも対応。
function normalizeAnswer(value) {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[ァ-ヶ]/g, char => String.fromCharCode(char.charCodeAt(0) - 0x60));
}

// 第1〜5問クリア後に、次の問題の「画像の上」に出す文章。
const STORY_MESSAGES = [
  "時計のそばを探すと、次の謎が見つかった。",
  "暖炉のそばで、古い紙切れを見つけた。そこには次の手がかりが記されている。",
  "物置の奥で、ひっそりと隠された扉を見つけた。まだ探索は終わらない。",
  "地下室を調べていると、最後の招待状が姿を現した。",
  "お祝いの準備は整った。あと必要なのは、最後の合言葉だけ。"
];

// HTMLが旧版・新版のどちらでも動くよう、JS側で表示位置をそろえる。
sections.forEach((section, index) => {
  // 古い版で前の問題の下に置いていた独立メッセージ欄を消す。
  section.querySelectorAll(".story-bridge").forEach(node => node.remove());

  if (index > 0) {
    const content = section.querySelector(".puzzle-content");
    const previousStories = [...content.querySelectorAll(".story-intro")];
    const intro = previousStories.shift() || document.createElement("p");
    previousStories.forEach(node => node.remove());
    intro.className = "story-intro";
    intro.textContent = STORY_MESSAGES[index - 1];

    // 第4問の「2枚の画像を使おう」の案内よりも前に置く。
    const first = content.firstElementChild;
    content.insertBefore(intro, first);
  }

  // 各問題の画像の右下にスタンプを重ねる。
  const imageButton = section.querySelector(".image-open");
  if (imageButton && !imageButton.querySelector(".correct-stamp")) {
    const stamp = document.createElement("span");
    stamp.className = "correct-stamp";
    stamp.setAttribute("aria-hidden", "true");

    const image = document.createElement("img");
    image.className = "stamp-art";
    image.alt = "";
    image.src = STAMP_IMAGE_PATH;
    image.addEventListener("error", () => stamp.classList.add("image-missing"));
    image.addEventListener("load", () => stamp.classList.remove("image-missing"));

    const fallback = document.createElement("span");
    fallback.className = "stamp-fallback";
    fallback.textContent = "正解";

    stamp.append(image, fallback);
    imageButton.appendChild(stamp);
  }
});

// 合言葉クリア後の文章は、独立の枠を作らずエンディング内に表示。
if (!ending.querySelector(".ending-story")) {
  const text = document.createElement("p");
  text.className = "ending-story";
  text.textContent = "合言葉を唱えると、パーティーの扉が静かに開いた。";
  ending.insertBefore(text, ending.firstElementChild);
}

function renderProgress(justSolved = -1) {
  const cleared = Math.min(progress, 5);
  progressLabel.textContent = progress === 6
    ? "すべてクリア！"
    : progress === 5
      ? "5 / 5 問クリア・最後の謎へ"
      : `${cleared} / 5 問クリア`;
  progressBar.style.width = `${(cleared / 5) * 100}%`;

  sections.forEach((section, index) => {
    const isVisible = index <= progress;
    const isSolved = index < progress;
    section.hidden = !isVisible;
    section.classList.toggle("is-solved", isSolved);
    section.querySelector(".stage-status").textContent = isSolved
      ? "解決済み"
      : index === 5 ? "あと少し" : "挑戦中";

    // 解いた直後はスタンプを見られるよう問題を閉じない。
    const details = section.querySelector("details");
    details.open = isVisible && (index === progress || index === justSolved || (progress === 6 && index === 5));

  });

  ending.hidden = progress !== 6;
}

for (const form of document.querySelectorAll(".answer-area")) {
  form.addEventListener("submit", event => {
    event.preventDefault();
    const index = Number(form.dataset.stage);
    if (index !== progress) return;

    const input = form.querySelector("input");
    const message = form.querySelector(".message");
    const actual = normalizeAnswer(input.value);
    const expected = form.dataset.answer;

    if (actual !== expected) {
      message.textContent = "違うみたい。もう一度考えてみよう。";
      input.focus();
      return;
    }

    message.textContent = "正解！";
    progress += 1;
    saveProgress();
    renderProgress(index);

    // スタンプが現れてから次の謎へ移動。前の問題は見返せる。
    const solvedImage = sections[index].querySelector(".image-open");
    if (solvedImage) {
      requestAnimationFrame(() => {
        solvedImage.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }

    if (nextStageTimer !== null) clearTimeout(nextStageTimer);
    nextStageTimer = setTimeout(() => {
      nextStageTimer = null;
      if (progress !== index + 1) return;

      sections[index].querySelector("details").open = false;
      const next = index === TOTAL_STAGES - 1 ? ending : sections[index + 1];
      if (next && index < TOTAL_STAGES - 1) {
        next.querySelector("details").open = true;
      }
      if (next) next.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 1350);
  });
}

const dialog = document.getElementById("image-dialog");
const zoomedImage = document.getElementById("zoomed-image");
for (const button of document.querySelectorAll("[data-zoom]")) {
  button.addEventListener("click", () => {
    zoomedImage.src = button.dataset.zoom;
    zoomedImage.alt = button.querySelector("img.puzzle-image").alt;
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      window.open(button.dataset.zoom, "_blank", "noopener,noreferrer");
    }
  });
}

document.getElementById("close-dialog").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", event => {
  if (event.target === dialog) dialog.close();
});

document.getElementById("reset-button").addEventListener("click", () => {
  if (!window.confirm("すべての進捗を消して、最初からやり直しますか？")) return;
  if (nextStageTimer !== null) {
    clearTimeout(nextStageTimer);
    nextStageTimer = null;
  }
  progress = 0;
  try { localStorage.removeItem(STORAGE_KEY); } catch (error) { /* 保存無効 */ }
  for (const form of document.querySelectorAll(".answer-area")) {
    form.reset();
    form.querySelector(".message").textContent = "";
  }
  renderProgress();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

renderProgress();
