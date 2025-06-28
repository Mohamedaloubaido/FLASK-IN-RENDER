from datetime import datetime
from . import db

class Inventory(db.Model):
    __tablename__ = 'inventory'
    id = db.Column(db.Integer, primary_key=True)
    item_name = db.Column(db.String(50), nullable=False, unique=True)
    balance = db.Column(db.Float, nullable=False, default=0.0)
    item_type = db.Column(db.String(20), nullable=False)  # 'currency', 'gold', 'company'

class GoldTransaction(db.Model):
    __tablename__ = 'gold_transactions'
    id = db.Column(db.Integer, primary_key=True)
    transaction_date = db.Column(db.String(20), nullable=False)
    type = db.Column(db.String(10), nullable=False)  # 'buy' or 'sell'
    item_type = db.Column(db.String(10), nullable=False)  # 'gram' or 'piece'
    quantity = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(10), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    price_per_unit = db.Column(db.Float, nullable=False)

class CashBoxEntry(db.Model):
    __tablename__ = 'cash_box_entries'
    id = db.Column(db.Integer, primary_key=True)
    entry_date = db.Column(db.String(20), nullable=False)
    currency = db.Column(db.String(10), nullable=False)
    amount = db.Column(db.Float, nullable=False)

class Debt(db.Model):
    __tablename__ = 'debts'
    id = db.Column(db.Integer, primary_key=True)
    debt_date = db.Column(db.String(20), nullable=False)
    person_name = db.Column(db.String(100), nullable=False)
    type = db.Column(db.String(20), nullable=False)  # 'owed_to_me' or 'i_owe'
    amount = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(10), nullable=False)
    notes = db.Column(db.Text)
    is_settled = db.Column(db.Boolean, nullable=False, default=False)

class TransferCompany(db.Model):
    __tablename__ = 'transfer_companies'
    id = db.Column(db.Integer, primary_key=True)
    company_name = db.Column(db.String(100), nullable=False, unique=True)
    order = db.Column(db.Integer, nullable=False, default=0)

class Remittance(db.Model):
    __tablename__ = 'remittances'
    id = db.Column(db.Integer, primary_key=True)
    remittance_date = db.Column(db.String(20), nullable=False)
    type = db.Column(db.String(10), nullable=False)  # 'send' or 'receive'
    receipt_number = db.Column(db.String(50), nullable=False)
    person_name = db.Column(db.String(100), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(10), nullable=False)
    company_id = db.Column(db.Integer, db.ForeignKey('transfer_companies.id'), nullable=False)
    notes = db.Column(db.Text)
    id_image1 = db.Column(db.String(200))  # اسم أو مسار صورة الهوية الأولى
    id_image2 = db.Column(db.String(200))  # اسم أو مسار صورة الهوية الثانية
    
    company = db.relationship('TransferCompany', backref=db.backref('remittances', lazy=True))

class CompanyTransfer(db.Model):
    __tablename__ = 'company_transfers'
    id = db.Column(db.Integer, primary_key=True)
    transfer_date = db.Column(db.String(20), nullable=False)
    from_company_id = db.Column(db.Integer, db.ForeignKey('transfer_companies.id'), nullable=False)
    to_company_id = db.Column(db.Integer, db.ForeignKey('transfer_companies.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(10), nullable=False)
    
    from_company = db.relationship('TransferCompany', foreign_keys=[from_company_id])
    to_company = db.relationship('TransferCompany', foreign_keys=[to_company_id])

class CurrencyConversion(db.Model):
    __tablename__ = 'currency_conversions'
    id = db.Column(db.Integer, primary_key=True)
    conversion_date = db.Column(db.String(20), nullable=False)
    from_currency = db.Column(db.String(10), nullable=False)
    to_currency = db.Column(db.String(10), nullable=False)
    from_amount = db.Column(db.Float, nullable=False)
    to_amount = db.Column(db.Float, nullable=False)
    exchange_rate = db.Column(db.Float, nullable=False)

class Amanah(db.Model):
    __tablename__ = 'amanat'
    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(10), nullable=False)  # 'gold' or 'money'
    person_name = db.Column(db.String(100), nullable=False)
    currency = db.Column(db.String(10))  # للعملات فقط
    amount = db.Column(db.Float, nullable=False)  # وزن الذهب أو مبلغ المال
    date = db.Column(db.String(20), nullable=False)
    notes = db.Column(db.Text)

class DebtHistory(db.Model):
    __tablename__ = 'debt_history'
    id = db.Column(db.Integer, primary_key=True)
    debt_id = db.Column(db.Integer, nullable=True)  # يمكن أن يكون None إذا لم يعدل دين موجود
    person_name = db.Column(db.String(100), nullable=False)
    type = db.Column(db.String(30), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(10), nullable=False)
    date = db.Column(db.String(20), nullable=False)
    notes = db.Column(db.String(200))
    action = db.Column(db.String(20), nullable=False)  # add/edit/settle
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'debt_id': self.debt_id,
            'person_name': self.person_name,
            'type': self.type,
            'amount': self.amount,
            'currency': self.currency,
            'date': self.date,
            'notes': self.notes,
            'action': self.action,
            'timestamp': self.timestamp.strftime('%Y-%m-%d %H:%M:%S')
        }

