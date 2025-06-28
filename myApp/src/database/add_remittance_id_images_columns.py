import sqlite3

DB_PATH = 'src/database/app.db'

conn = sqlite3.connect(DB_PATH)
c = conn.cursor()

# إضافة العمود الأول إذا لم يكن موجودًا
try:
    c.execute("ALTER TABLE remittances ADD COLUMN id_image1 VARCHAR(200)")
    print('تمت إضافة العمود id_image1')
except Exception as e:
    print('id_image1:', e)

# إضافة العمود الثاني إذا لم يكن موجودًا
try:
    c.execute("ALTER TABLE remittances ADD COLUMN id_image2 VARCHAR(200)")
    print('تمت إضافة العمود id_image2')
except Exception as e:
    print('id_image2:', e)

conn.commit()
conn.close()
print('انتهت الترقية') 