from flask import * 
import pandas as pd
import os
import logging

app = Flask(__name__, static_folder='static', static_url_path='/static')

# 本のデータCSV
BOOKS_FILE = "static/csv/final_detail.csv"
#問題
QUESTIONS_FILE = '/static/json/questions.json'

# ユーザーのスキルレベルに基づく難易度範囲
DIFFICULTY_RANGES = {
    "初級者": (0, 10),
    "中級者": (10, 20),
    "上級者": (20, 30),
    "エキスパート": (30, 40)
}

@app.route('/')
def index():
    """
    メインページを表示
    """
    return app.send_static_file('html/index.html')

@app.route('/questions', methods=['GET'])
def get_problems():
    with open(QUESTIONS_FILE, 'r', encoding='utf-8') as file:  
        questions = json.load(file)
    return jsonify(questions)

@app.route('/recommend', methods=['GET','POST'])
def recommend_books():
    logging.info(f"Request received: {request.json}")
    """
    ユーザーのスコアを受け取り、本を推薦
    """
    # クライアントからスコアを取得
    try:
        user_score = request.json.get("score", 0)
        print("Received score:", user_score)  # デバッグログ
        if user_score is None:
            return jsonify({"error": "スコアが提供されていません。"}), 400
    except Exception as e:
        print("Error reading score from request:", e)
        return jsonify({"error": "リクエストからスコアを読み取れませんでした。"}), 400

    # CSVデータを読み込む
    try:
        df = pd.read_csv(BOOKS_FILE, encoding="utf-8-sig")
    except Exception as e:
        return jsonify({"error": f"CSV読み込みエラー: {str(e)}"}), 500

    # 必要な列名を確認
    required_columns = ["Title", "Price", "Pages", "Year", "Diff", "Pass", "URL"]
    missing_columns = [col for col in required_columns if col not in df.columns]
    if missing_columns:
        return jsonify({"error": f"欠損列: {', '.join(missing_columns)}"}), 500
    
    # スキルレベル判定と範囲設定
    for level, (low, high) in DIFFICULTY_RANGES.items():
        if low <= user_score <= high:
            user_level = level
            break
    else:
        user_level = "未知"

    # スコアを 85 点満点にスケーリング
    user_score_scaled = user_score * 85 / 38

    # スコアに最も近い Diff を抽出
    df["ScoreDiff"] = abs(df["Diff"] - user_score_scaled)

    # 上下合わせて10冊を選択
    top_10_books = df.nsmallest(10, "ScoreDiff")

    # デバッグ用: 選択された本のタイトルを出力
    if top_10_books.empty:
        print("No books found.")
        return jsonify({"error": "適切な本が見つかりませんでした。"}), 404

    print("Selected Books:")
    print(top_10_books[["Title", "Diff", "ScoreDiff"]])

    # 金額が最安値の本
    cheapest_book = top_10_books.loc[top_10_books["Price"].idxmin()]
    # ページ数が最小の本
    smallest_pages_book = top_10_books.loc[top_10_books["Pages"].idxmin()]
    # 発行年度が最新の本
    newest_book = top_10_books.loc[top_10_books["Year"].idxmax()]

    # 推薦結果を準備
    recommended_books = [cheapest_book, smallest_pages_book, newest_book]

    # 推薦データをJSON形式でクライアントに返す
    response = {
        "level": user_level,
        "recommended_books": [
            {
                "title": book["Title"],
                "price": book["Price"],
                "pages": book["Pages"],
                "year": book["Year"],
                "image": book["Pass"],
                "URL": book["URL"]  # AmazonのURLを追加
            }
            for _, book in pd.DataFrame(recommended_books).iterrows()
        ]
    }
    print("Response data:", response)  # デバッグログ
    return jsonify(response)

if __name__ == "__main__":
    app.run(debug=True)