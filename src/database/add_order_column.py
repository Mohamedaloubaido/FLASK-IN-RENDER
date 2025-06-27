import sqlite3
from src.models.exchange import db, TransferCompany
from src.main import app

DB_PATH = 'src/database/app.db'

conn = sqlite3.connect(DB_PATH)
c = conn.cursor()

# تحقق إن كان العمود موجودًا
c.execute("PRAGMA table_info(transfer_companies)")
columns = [row[1] for row in c.fetchall()]

if 'order' not in columns:
    print('Adding column order...')
    c.execute('ALTER TABLE transfer_companies ADD COLUMN "order" INTEGER DEFAULT 0')
    conn.commit()
    # تعبئة القيم الافتراضية (اجعل order = id)
    c.execute('UPDATE transfer_companies SET "order" = id')
    conn.commit()
    print('Column order added and filled.')
else:
    print('Column order already exists.')

conn.close()

with app.app_context():
    # جلب جميع الشركات مرتبة حسب id
    companies = TransferCompany.query.order_by(TransferCompany.id.asc()).all()
    for idx, company in enumerate(companies, 1):
        company.order = idx
    db.session.commit()
    print(f"تم تحديث ترتيب {len(companies)} شركة بنجاح.") 