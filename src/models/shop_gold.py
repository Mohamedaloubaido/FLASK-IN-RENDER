from datetime import datetime
from . import db

class ShopGold(db.Model):
    __tablename__ = 'shop_gold'
    id = db.Column(db.Integer, primary_key=True)
    gold_type = db.Column(db.String(20), nullable=False)  # جديد، مستعمل، خشر
    piece_type = db.Column(db.String(50), nullable=False)  # اسم نوع القطعة (أساور، خواتم ...)
    quantity = db.Column(db.Integer, nullable=False, default=1)  # عدد القطع
    weight = db.Column(db.Float, nullable=False)
    karat = db.Column(db.Float, nullable=False)  # العيار
    price_per_gram = db.Column(db.Float, nullable=False)  # سعر الغرام
    entry_date = db.Column(db.DateTime, default=datetime.utcnow)
    notes = db.Column(db.String(200))

    def to_dict(self):
        return {
            'id': self.id,
            'gold_type': self.gold_type,
            'piece_type': self.piece_type,
            'quantity': self.quantity,
            'weight': self.weight,
            'karat': self.karat,
            'price_per_gram': self.price_per_gram,
            'entry_date': self.entry_date.strftime('%Y-%m-%d %H:%M:%S'),
            'notes': self.notes
        } 