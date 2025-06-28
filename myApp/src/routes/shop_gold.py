from flask import Blueprint, request, jsonify
from src.models.shop_gold import ShopGold, db
from sqlalchemy import func

shop_gold_bp = Blueprint('shop_gold', __name__)

@shop_gold_bp.route('/shop_gold', methods=['POST'])
def add_gold():
    data = request.json
    gold = ShopGold(
        gold_type=data['gold_type'],
        piece_type=data['piece_type'],
        quantity=int(data.get('quantity', 1)),
        weight=float(data['weight']),
        karat=float(data['karat']),
        price_per_gram=float(data['price_per_gram']),
        notes=data.get('notes', '')
    )
    db.session.add(gold)
    db.session.commit()
    return jsonify({'success': True, 'gold': gold.to_dict()})

@shop_gold_bp.route('/shop_gold', methods=['GET'])
def list_gold():
    gold_list = ShopGold.query.all()
    return jsonify([g.to_dict() for g in gold_list])

@shop_gold_bp.route('/shop_gold/<int:gold_id>', methods=['PUT'])
def update_gold(gold_id):
    gold = ShopGold.query.get_or_404(gold_id)
    data = request.json
    gold.gold_type = data.get('gold_type', gold.gold_type)
    gold.piece_type = data.get('piece_type', gold.piece_type)
    gold.quantity = int(data.get('quantity', gold.quantity))
    gold.weight = float(data.get('weight', gold.weight))
    gold.karat = float(data.get('karat', gold.karat))
    gold.price_per_gram = float(data.get('price_per_gram', gold.price_per_gram))
    gold.notes = data.get('notes', gold.notes)
    db.session.commit()
    return jsonify({'success': True, 'gold': gold.to_dict()})

@shop_gold_bp.route('/shop_gold/<int:gold_id>', methods=['DELETE'])
def delete_gold(gold_id):
    gold = ShopGold.query.get_or_404(gold_id)
    db.session.delete(gold)
    db.session.commit()
    return jsonify({'success': True})

@shop_gold_bp.route('/shop_gold/summary', methods=['GET'])
def gold_summary():
    buy_price = float(request.args.get('buy_price', 0))
    sell_price = float(request.args.get('sell_price', 0))
    # الوزن الكلي = sum(weight * quantity)
    total_weight = db.session.query(func.sum(ShopGold.weight * ShopGold.quantity)).scalar() or 0
    total_value_buy = total_weight * buy_price
    total_value_sell = total_weight * sell_price
    return jsonify({
        'total_weight': total_weight,
        'total_value_buy': total_value_buy,
        'total_value_sell': total_value_sell
    }) 