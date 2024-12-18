let currentQuestionIndex = 0;
let score = 0;
let currentDifficulty = 1;

// 全ての質問を格納する変数
let questions = [];

// JSONファイルから問題をロード
async function loadQuestions() {
    try {
        const response = await fetch('/static/json/questions.json');
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

    // 10問目以降で診断結果を表示
    if (currentQuestionIndex >= 10) {
        questionContainer.innerHTML = `<p>すべての質問が終了しました。</p>`;
        submitButton.style.display = "block"; // 「診断する」ボタンを表示
        submitButton.disabled = false;
        submitButton.onclick = displayResults; // 診断するボタンの動作
        return;
    }

    submitButton.style.display = "none"; // 診断ボタンを非表示

    // 質問が尽きた場合は結果表示
    if (currentQuestionIndex >= questions.length - 5) {
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

   // JSONから取得した難易度を利用してスコアを計算
   const questionDifficulty = currentQuestion.difficulty; // 難易度を取得
   if (isCorrect) {
       score += questionDifficulty * 2; // 難易度に基づいてスコア加算
   }

    console.log(`問題: ${currentQuestionIndex + 1}, 難易度: ${questionDifficulty}, 現在のスコア: ${score}`);

    currentQuestionIndex++; // 次の質問に進む
    showQuestion(); // 次の質問を表示
}

// スコアの結果を表示
function displayResults() {
    const quizContainer = document.getElementById("quiz-container");
    const recommendationsContainer = document.getElementById("recommendations");

    // クイズ部分を非表示にし、結果部分を表示
    quizContainer.style.display = "none";
    recommendationsContainer.style.display = "block";

    //score = score * 1.7;
    console.log("送信スコア:", score);

    // サーバーにスコアを送信して推薦結果を取得
    fetch("/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score })
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`サーバーエラー: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("サーバーからのレスポンス:", data); // デバッグ用

            // ユーザーレベルを表示
            document.getElementById("user-level").innerHTML = `<h3>あなたのスキルレベル: <span style="color: var(--secondary-color);">${data.level}</span></h3>`;
            console.log("サーバーからのdata.level:", data.level); // デバッグ用
            // 推薦された本を表示
            const bookList = document.getElementById("recommended-books");
            bookList.innerHTML = "<h3>推薦された本:</h3>";
            data.recommended_books.forEach(book => {
                bookList.innerHTML += `
                    <div class="book-card">
                        <a href="${book.URL}" target="_blank">
                            <img src="${book.image || '/static/images/default.png'}" alt="${book.title}" style="width:100px;">
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

            // 推薦結果のコンテナまでスクロール
            recommendationsContainer.scrollIntoView({ behavior: "smooth" });
        })
        .catch(error => {
            console.error("推薦システムのエラー:", error);
            console.log("受信したデータ:", data);
            alert("推薦結果を取得できませんでした。");
        });
}

// 初期化
document.addEventListener("DOMContentLoaded", () => {
    loadQuestions();
});