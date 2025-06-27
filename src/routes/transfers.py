from flask import Blueprint, jsonify, request
from src.models.exchange import db, CompanyTransfer, CurrencyConversion, TransferCompany, Inventory
from datetime import datetime

transfers_bp = Blueprint('transfers', __name__)

@transfers_bp.route('/company-transfers', methods=['GET'])
def get_company_transfers():
    try:
        transfers = CompanyTransfer.query.order_by(CompanyTransfer.transfer_date.desc()).all()
        result = []
        
        for transfer in transfers:
            result.append({
                'id': transfer.id,
                'date': transfer.transfer_date,
                'from_company_id': transfer.from_company_id,
                'from_company_name': transfer.from_company.company_name,
                'to_company_id': transfer.to_company_id,
                'to_company_name': transfer.to_company.company_name,
                'amount': transfer.amount,
                'currency': transfer.currency
            })
        
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@transfers_bp.route('/company-transfer', methods=['POST'])
def add_company_transfer():
    try:
        data = request.json
        
        # Create new transfer
        transfer = CompanyTransfer(
            transfer_date=data.get('date', datetime.now().strftime('%Y-%m-%d')),
            from_company_id=int(data['from_company_id']),
            to_company_id=int(data['to_company_id']),
            amount=float(data['amount']),
            currency=data['currency']
        )
        
        db.session.add(transfer)
        db.session.commit()
        
        return jsonify({'success': True, 'transfer_id': transfer.id})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@transfers_bp.route('/currency-conversions', methods=['GET'])
def get_currency_conversions():
    try:
        conversions = CurrencyConversion.query.order_by(CurrencyConversion.conversion_date.desc()).all()
        result = []
        
        for conversion in conversions:
            result.append({
                'id': conversion.id,
                'date': conversion.conversion_date,
                'from_currency': conversion.from_currency,
                'to_currency': conversion.to_currency,
                'from_amount': conversion.from_amount,
                'to_amount': conversion.to_amount,
                'exchange_rate': conversion.exchange_rate
            })
        
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@transfers_bp.route('/currency-conversion', methods=['POST'])
def add_currency_conversion():
    try:
        data = request.json
        company_id = data.get('company_id')
        # Create new conversion
        conversion = CurrencyConversion(
            conversion_date=data.get('date', datetime.now().strftime('%Y-%m-%d')),
            from_currency=data['from_currency'],
            to_currency=data['to_currency'],
            from_amount=float(data['from_amount']),
            to_amount=float(data['to_amount']),
            exchange_rate=float(data['exchange_rate'])
        )
        db.session.add(conversion)
        # Update inventory
        from_currency_item = Inventory.query.filter_by(item_name=conversion.from_currency, item_type='currency').first()
        if not from_currency_item:
            from_currency_item = Inventory(item_name=conversion.from_currency, balance=0, item_type='currency')
            db.session.add(from_currency_item)
        to_currency_item = Inventory.query.filter_by(item_name=conversion.to_currency, item_type='currency').first()
        if not to_currency_item:
            to_currency_item = Inventory(item_name=conversion.to_currency, balance=0, item_type='currency')
            db.session.add(to_currency_item)
        if company_id:
            company = TransferCompany.query.get(int(company_id))
            # رصيد الشركة بالعملة الأولى
            from_company_item = Inventory.query.filter_by(item_name=f'{company.company_name}__{conversion.from_currency}', item_type='company').first()
            if not from_company_item:
                from_company_item = Inventory(item_name=f'{company.company_name}__{conversion.from_currency}', item_type='company', balance=0)
                db.session.add(from_company_item)
            # رصيد الشركة بالعملة الثانية
            to_company_item = Inventory.query.filter_by(item_name=f'{company.company_name}__{conversion.to_currency}', item_type='company').first()
            if not to_company_item:
                to_company_item = Inventory(item_name=f'{company.company_name}__{conversion.to_currency}', item_type='company', balance=0)
                db.session.add(to_company_item)
            # خصم من رصيد الشركة بالعملة الأولى
            from_company_item.balance -= conversion.from_amount
            # إضافة لرصيد الشركة بالعملة الثانية
            to_company_item.balance += conversion.to_amount
        # تعديل الجرد العام
        from_currency_item.balance -= conversion.from_amount
        to_currency_item.balance += conversion.to_amount
        db.session.commit()
        return jsonify({'success': True, 'conversion_id': conversion.id})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

