import sqlite3

DB_PATH = 'src/database/app.db'

conn = sqlite3.connect(DB_PATH)
c = conn.cursor()

# إنشاء جدول shop_gold إذا لم يكن موجودًا
c.execute("""
CREATE TABLE IF NOT EXISTS shop_gold (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gold_type VARCHAR(20) NOT NULL,
    weight FLOAT NOT NULL,
    karat FLOAT NOT NULL,
    price_per_gram FLOAT NOT NULL,
    entry_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes VARCHAR(200)
)
""")

conn.commit()
conn.close()
print("تم إنشاء جدول shop_gold (أو كان موجودًا بالفعل).") 