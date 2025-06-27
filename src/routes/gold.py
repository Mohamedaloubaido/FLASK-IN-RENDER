from flask import Blueprint, jsonify, request
from src.models.exchange import db, GoldTransaction, Inventory
from datetime import datetime

gold_bp = Blueprint('gold', __name__)

@gold_bp.route('/gold/transactions', methods=['GET'])
def get_gold_transactions():
    try:
        transactions = GoldTransaction.query.order_by(GoldTransaction.transaction_date.desc()).all()
        result = []
        
        for transaction in transactions:
            result.append({
                'id': transaction.id,
                'date': transaction.transaction_date,
                'type': transaction.type,
                'item_type': transaction.item_type,
                'quantity': transaction.quantity,
                'currency': transaction.currency,
                'amount': transaction.amount,
                'price_per_unit': transaction.price_per_unit
            })
        
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@gold_bp.route('/gold/transaction', methods=['POST'])
def add_gold_transaction():
    try:
        data = request.json
        
        # Create new transaction
        transaction = GoldTransaction(
            transaction_date=data.get('date', datetime.now().strftime('%Y-%m-%d')),
            type=data['type'],  # 'buy' or 'sell'
            item_type=data['item_type'],  # 'gram' or 'piece'
            quantity=float(data['quantity']),
            currency=data['currency'],
            amount=float(data['amount']),
            price_per_unit=float(data['price_per_unit'])
        )
        
        db.session.add(transaction)
        
        # Update inventory
        # Update gold balance
        gold_item = Inventory.query.filter_by(item_name='Gold', item_type='gold').first()
        if not gold_item:
            gold_item = Inventory(item_name='Gold', balance=0, item_type='gold')
            db.session.add(gold_item)
        
        if transaction.type == 'buy':
            gold_item.balance += transaction.quantity
            # Deduct money from currency
            currency_item = Inventory.query.filter_by(item_name=transaction.currency, item_type='currency').first()
            if currency_item:
                currency_item.balance -= transaction.amount
        else:  # sell
            gold_item.balance -= transaction.quantity
            # Add money to currency
            currency_item = Inventory.query.filter_by(item_name=transaction.currency, item_type='currency').first()
            if not currency_item:
                currency_item = Inventory(item_name=transaction.currency, balance=0, item_type='currency')
                db.session.add(currency_item)
            currency_item.balance += transaction.amount
        
        db.session.commit()
        
        return jsonify({'success': True, 'transaction_id': transaction.id})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@gold_bp.route('/gold/balance', methods=['GET'])
def get_gold_balance():
    try:
        gold_item = Inventory.query.filter_by(item_name='Gold', item_type='gold').first()
        balance = gold_item.balance if gold_item else 0
        
        return jsonify({'balance': balance})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

