from flask import Blueprint, jsonify, request
from src.models.exchange import db, CashBoxEntry, Inventory
from datetime import datetime

cashbox_bp = Blueprint('cashbox', __name__)

@cashbox_bp.route('/cashbox/entries', methods=['GET'])
def get_cashbox_entries():
    try:
        entries = CashBoxEntry.query.order_by(CashBoxEntry.entry_date.desc()).all()
        result = []
        
        for entry in entries:
            result.append({
                'id': entry.id,
                'date': entry.entry_date,
                'currency': entry.currency,
                'amount': entry.amount
            })
        
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@cashbox_bp.route('/cashbox/entry', methods=['POST'])
def add_cashbox_entry():
    try:
        data = request.json
        
        # Create new entry
        entry = CashBoxEntry(
            entry_date=data.get('date', datetime.now().strftime('%Y-%m-%d')),
            currency=data['currency'],
            amount=float(data['amount'])
        )
        
        db.session.add(entry)
        
        # Update inventory - add to currency balance
        currency_item = Inventory.query.filter_by(item_name=entry.currency, item_type='currency').first()
        if not currency_item:
            currency_item = Inventory(item_name=entry.currency, balance=0, item_type='currency')
            db.session.add(currency_item)
        
        currency_item.balance += entry.amount
        
        db.session.commit()
        
        return jsonify({'success': True, 'entry_id': entry.id})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@cashbox_bp.route('/cashbox/clear', methods=['POST'])
def clear_cashbox():
    try:
        # Delete all cashbox entries
        CashBoxEntry.query.delete()
        db.session.commit()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@cashbox_bp.route('/cashbox/summary', methods=['GET'])
def get_cashbox_summary():
    try:
        # Get summary by currency
        summary = db.session.query(
            CashBoxEntry.currency,
            db.func.sum(CashBoxEntry.amount).label('total')
        ).group_by(CashBoxEntry.currency).all()
        
        result = {}
        for currency, total in summary:
            result[currency] = total
        
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

