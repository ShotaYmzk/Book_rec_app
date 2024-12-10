let currentQuestionIndex = 0;
let score = 0;
let currentDifficulty = 1;

// 全ての質問を格納する変数
let questions = [];

// JSONファイルから問題をロード
async function loadQuestions() {
    try {
        const response = await fetch('/static/json/questions.json');
        console.log("HTTP Status Code:", response.status);
        console.log("Fetching from:", response.url); // URLを確認
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        questions = await response.json();
        console.log("Loaded questions:", questions);
        showQuestion();
    } catch (error) {
        console.error("質問データの読み込みエラー:", error);
        alert("問題データをロードできませんでした。");
    }
}

// 現在の質問を表示
function showQuestion() {
    const questionContainer = document.getElementById("question-container");
    const submitButton = document.getElementById("submit-answer");

    // 質問が尽きた場合は結果表示
    if (currentQuestionIndex >= questions.length) {
        submitButton.textContent = "診断する";
        submitButton.onclick = displayResults;
        submitButton.disabled = false;
        return;
    }

    const currentQuestion = questions[currentQuestionIndex];
    questionContainer.innerHTML = `
        <h2>問題 ${currentQuestionIndex + 1}: ${currentQuestion.question}</h2>
        ${currentQuestion.options.map((option, index) => `
            <div>
                <input type="radio" id="option${index}" name="option" value="${option.isCorrect}">
                <label for="option${index}">${option.text}</label>
            </div>
        `).join('')}
        <button type="button" id="next-question" disabled>次の問題へ</button>
    `;

    // ラジオボタン選択で「次の問題へ」ボタンを有効化
    document.querySelectorAll('input[name="option"]').forEach(input => {
        input.addEventListener('change', () => {
            document.getElementById("next-question").disabled = false;
        });
    });

    // 次の問題ボタンの動作を設定
    document.getElementById("next-question").onclick = () => handleAnswer(currentQuestion);
}

// 回答を処理
function handleAnswer(currentQuestion) {
    const selectedOption = document.querySelector('input[name="option"]:checked');
    if (!selectedOption) {
        alert("選択肢を選んでください。");
        return;
    }

    const isCorrect = selectedOption.value === "true";
    if (isCorrect) {
        score += currentDifficulty * 10; // 正解でスコア加算
        currentDifficulty = Math.min(currentDifficulty + 1, 5); // 難易度を上げる
    } else {
        currentDifficulty = Math.max(currentDifficulty - 1, 1); // 難易度を下げる
    }
    //answeredQuestions++;
    currentQuestionIndex++; // 次の質問に進む
    showQuestion(); // 次の質問を表示
}

document.getElementById("submit-answer").addEventListener("click", async () => {
    // サーバーにスコアを送信
    const response = await fetch("/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score })
    });

    // サーバーからのレスポンスを確認
    if (!response.ok) {
        console.error("サーバーエラー:", response.status, response.statusText);
        alert("推薦システムでエラーが発生しました。");
        return;
    }

    const data = await response.json();

    if (data.error) {
        alert(data.error);
        return;
    }

    // 推薦結果を表示
    document.getElementById("quiz-container").style.display = "none";
    document.getElementById("recommendations").style.display = "block";

    document.getElementById("user-level").innerHTML = `<h3>あなたのスキルレベル: <span style="color: var(--secondary-color);">${data.level}</span></h3>`;

    // 推薦された本を表示
    const bookList = document.getElementById("recommended-books");
    bookList.innerHTML = "<h3>推薦された本:</h3>";
    data.recommended_books.forEach(book => {
        bookList.innerHTML += `
            <div class="book-card">
                <a href="${book.URL}" target="_blank">
                    <img src="${book.image}" alt="${book.title}" style="width:100px;">
                    <h4 class="book-title">${book.title}</h4>
                    <div class="book-info">
                        <span>金額: ${book.price} 円</span>
                        <span>ページ数: ${book.pages}</span>
                        <span>発行年度: ${book.year}</span>
                    </div>
                </a>
            </div>
        `;
    });

    // 結果までスクロール
    document.getElementById("recommendations").scrollIntoView({ behavior: "smooth" });
});

// 初期化
document.addEventListener("DOMContentLoaded", () => {
    loadQuestions();
});