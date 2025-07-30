(() => {
  const toggle = document.getElementById("theme-toggle");
  const root = document.documentElement;
  const saved = localStorage.getItem("match3-theme");
  if (saved === "dark") {
    root.classList.add("dark");
    if (toggle) toggle.checked = true;
  }
  if (toggle) {
    toggle.addEventListener("change", () => {
      const wantsDark = toggle.checked;
      root.classList.toggle("dark", wantsDark);
      localStorage.setItem("match3-theme", wantsDark ? "dark" : "light");
    });
  }
})();

const boardSize = 8;
const tileTypes = ["𝅝", "𝅗𝅥", "𝅘𝅥", "𝅘𝅥𝅮", "𝅘𝅥𝅯"];
const board = [];
let firstSelected = null;
let score = 0;
const maxScore = 88;
let timer = 90,
  timeLeft = 90,
  timerInterval = null;

const boardEl = document.getElementById("board");
const scoreEl = document.getElementById("score");
const timerEl = document.getElementById("timer");
const leaderboardEl = document.getElementById("leaderboard");
let currentPlayer = null;

function askPlayerName() {
  let name = "";
  while (!name) {
    name = prompt("შეიყვანეთ თქვენი სახელი თამაშის დასაწყებად:");
    if (name) currentPlayer = name.trim();
  }
}

function createBoard() {
  boardEl.innerHTML = "";
  board.length = 0;
  for (let i = 0; i < boardSize * boardSize; i++) {
    const tile = document.createElement("div");
    tile.classList.add("tile");
    const type = randomType();
    tile.textContent = type;
    tile.dataset.index = i;
    tile.addEventListener("click", handleClick);
    updateTileClass(tile, type);
    board.push({ type, el: tile });
    boardEl.appendChild(tile);
  }
  let tries = 0;
  while (checkMatches(false, false) && tries++ < 10) collapseBoard();
}

function randomType() {
  return tileTypes[Math.floor(Math.random() * tileTypes.length)];
}

function updateTileClass(tile, type) {
  tile.className = "tile";
  tile.classList.add(type);
}

function handleClick(e) {
  const ix = parseInt(e.target.dataset.index);
  if (firstSelected === ix) {
    board[ix].el.style.border = "1px solid #ccc";
    firstSelected = null;
    return;
  }
  if (firstSelected === null) {
    firstSelected = ix;
    board[ix].el.style.border = "2px solid blue";
  } else {
    board[firstSelected].el.style.border = "1px solid #ccc";
    swapTiles(firstSelected, ix);
    firstSelected = null;
  }
}

function areAdjacent(i1, i2) {
  const x1 = i1 % boardSize,
    y1 = Math.floor(i1 / boardSize);
  const x2 = i2 % boardSize,
    y2 = Math.floor(i2 / boardSize);
  return Math.abs(x1 - x2) + Math.abs(y1 - y2) === 1;
}

function swapTiles(i1, i2) {
  if (!areAdjacent(i1, i2)) return;
  [board[i1].type, board[i2].type] = [board[i2].type, board[i1].type];
  board[i1].el.textContent = board[i1].type;
  board[i2].el.textContent = board[i2].type;
  updateTileClass(board[i1].el, board[i1].type);
  updateTileClass(board[i2].el, board[i2].type);
  const matched = checkMatches(true);
  if (matched) checkMatches(false, true);
  else {
    setTimeout(() => {
      [board[i1].type, board[i2].type] = [board[i2].type, board[i1].type];
      board[i1].el.textContent = board[i1].type;
      board[i2].el.textContent = board[i2].type;
      updateTileClass(board[i1].el, board[i1].type);
      updateTileClass(board[i2].el, board[i2].type);
    }, 200);
  }
}

function checkMatches(returnOnly = false, countScore = true) {
  const toRemove = new Set();
  for (let r = 0; r < boardSize; r++) {
    for (let c = 0; c <= boardSize - 3; c++) {
      const i1 = r * boardSize + c,
        i2 = i1 + 1,
        i3 = i1 + 2;
      if (
        board[i1].type === board[i2].type &&
        board[i2].type === board[i3].type
      )
        toRemove.add(i1).add(i2).add(i3);
    }
  }
  for (let c = 0; c < boardSize; c++) {
    for (let r = 0; r <= boardSize - 3; r++) {
      const i1 = r * boardSize + c,
        i2 = i1 + boardSize,
        i3 = i1 + boardSize * 2;
      if (
        board[i1].type === board[i2].type &&
        board[i2].type === board[i3].type
      )
        toRemove.add(i1).add(i2).add(i3);
    }
  }
  if (returnOnly) return toRemove.size > 0;
  if (!toRemove.size) return false;
  removeTiles([...toRemove], () => checkMatches(false, false), countScore);
  return true;
}

function removeTiles(indices, callback, countScore) {
  indices.forEach((i) => board[i].el.classList.add("removing"));
  setTimeout(() => {
    indices
      .sort((a, b) => b - a)
      .forEach((i) => {
        board[i].type = null;
        board[i].el.textContent = "";
        board[i].el.classList.remove("removing");
      });
    collapseBoard();
    if (countScore) addScore(indices.length);
    if (callback) callback();
  }, 300);
}

function collapseBoard() {
  for (let c = 0; c < boardSize; c++) {
    const col = [];
    for (let r = boardSize - 1; r >= 0; r--) {
      const i = r * boardSize + c;
      if (board[i].type !== null) col.push(board[i].type);
    }
    for (let r = boardSize - 1; r >= 0; r--) {
      const i = r * boardSize + c;
      const type = col.shift() || randomType();
      board[i].type = type;
      board[i].el.textContent = type;
      updateTileClass(board[i].el, type);
    }
  }
}

function addScore(n) {
  score += n;
  scoreEl.textContent = `${Math.min(score, maxScore)} / ${maxScore}`;
  if (score >= maxScore) {
    clearInterval(timerInterval);
    alert("🎉 გილოცავთ!");
    saveToLeaderboard(currentPlayer, score, timeLeft);
  }
}

function saveToLeaderboard(name, score, timeLeft = null) {
  let leaderboard = JSON.parse(localStorage.getItem("leaderboard")) || [];
  const timeStr = new Date().toLocaleTimeString("ka-GE", {
    hour: "2-digit",
    minute: "2-digit"
  });
  let status =
    score >= maxScore
      ? "🎉"
      : timeLeft === 0
      ? "💥 დრო ამოიწურა"
      : timeLeft === "interrupted"
      ? "⏸️ შეჩერდა"
      : `#${leaderboard.length + 1}`;
  leaderboard.unshift({ time: timeStr, name, score, status });
  leaderboard = leaderboard.slice(0, 100);
  localStorage.setItem("leaderboard", JSON.stringify(leaderboard));
  renderLeaderboard();
}

function renderLeaderboard() {
  let leaderboard = JSON.parse(localStorage.getItem("leaderboard")) || [];
  leaderboardEl.innerHTML = "";
  leaderboard.forEach((entry) => {
    const li = document.createElement("li");
    li.textContent = `🕒 ${entry.time} – ${entry.status} ${entry.name}: ${entry.score}`;
    leaderboardEl.appendChild(li);
  });
}

function endGame() {
  saveToLeaderboard(currentPlayer, score, 0);
  alert(`⏰ დრო ამოიწურა! თქვენ დააგროვეთ ${score} ქულა.`);
}

function startTimer() {
  clearInterval(timerInterval);
  timer = 90;
  timeLeft = 90;
  timerEl.textContent = `დრო: ${timer}წ`;
  timerInterval = setInterval(() => {
    timer--;
    timeLeft = timer;
    timerEl.textContent = `დრო: ${timer}წ`;
    if (timer <= 0) {
      clearInterval(timerInterval);
      endGame();
    }
  }, 1000);
}

function restartGame() {
  if (currentPlayer && score > 0 && timeLeft > 0 && score < maxScore) {
    saveToLeaderboard(currentPlayer, score, "interrupted");
  }
  askPlayerName();
  score = 0;
  scoreEl.textContent = `${score} / ${maxScore}`;
  createBoard();
  startTimer();
}

document.getElementById("restart-btn").addEventListener("click", restartGame);

askPlayerName();
createBoard();
startTimer();
renderLeaderboard();
