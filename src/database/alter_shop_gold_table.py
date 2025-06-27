import sqlite3

DB_PATH = 'src/database/app.db'
conn = sqlite3.connect(DB_PATH)
c = conn.cursor()

# إضافة الحقول إذا لم تكن موجودة
try:
    c.execute("ALTER TABLE shop_gold ADD COLUMN piece_type VARCHAR(50) NOT NULL DEFAULT 'غير محدد'")
    print("تمت إضافة الحقل piece_type")
except Exception as e:
    print("piece_type:", e)

try:
    c.execute("ALTER TABLE shop_gold ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1")
    print("تمت إضافة الحقل quantity")
except Exception as e:
    print("quantity:", e)

conn.commit()
conn.close()
print("انتهى التعديل") 