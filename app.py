from flask import Flask, json, request, jsonify, render_template
import pandas as pd

app = Flask(__name__, static_folder='.', static_url_path='')

# 本のデータCSV
BOOKS_FILE = "/static/csv/final_detail.csv"

# ユーザーのスキルレベルに基づく難易度範囲
DIFFICULTY_RANGES = {
    "初級者": (0, 50),
    "中級者": (50, 75),
    "上級者": (75, 90),
    "エキスパート": (90, 100)
}

@app.route('/')
def index():
    """
    メインページを表示
    """
    return app.send_static_file('static/html/index.html')

@app.route('/questions', methods=['GET'])
def get_problems():
    with open('/static/json/questions.json', 'r', encoding='utf-8') as file:  # 
        questions = json.load(file)
    return jsonify(questions)

@app.route('/recommend', methods=['POST'])
def recommend_books():
    """
    ユーザーのスコアを受け取り、本を推薦
    """
    # クライアントからスコアを取得
    user_score = request.json.get("score", 0)

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

    # 難易度で本を絞り込む
    filtered_books = df[(df["Diff"] >= low) & (df["Diff"] <= high)]
    if filtered_books.empty:
        return jsonify({"error": "適切な本が見つかりませんでした。"}), 404
    top_10_books = filtered_books.sort_values("Diff", ascending=False).head(10)

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
    return jsonify(response)

if __name__ == "__main__":
    app.run(debug=True)