from flask import Blueprint, jsonify, request, send_file
from src.models.exchange import db, Debt, Inventory, DebtHistory
from datetime import datetime
import io
from fpdf import FPDF
import arabic_reshaper
from bidi.algorithm import get_display

debts_bp = Blueprint('debts', __name__)

@debts_bp.route('/debts', methods=['GET'])
def get_debts():
    try:
        debts = Debt.query.order_by(Debt.debt_date.desc()).all()
        result = []
        summary = {}
        for debt in debts:
            result.append({
                'id': debt.id,
                'date': debt.debt_date,
                'person_name': debt.person_name,
                'type': debt.type,
                'amount': debt.amount,
                'currency': debt.currency,
                'notes': debt.notes,
                'is_settled': debt.is_settled
            })
            if not debt.is_settled:
                if debt.currency not in summary:
                    summary[debt.currency] = {'li': 0, 'alay': 0, 'net': 0}
                if debt.type == 'borrowed_from_someone':
                    summary[debt.currency]['alay'] += debt.amount
                elif debt.type == 'lent_to_someone':
                    summary[debt.currency]['li'] += debt.amount
        for currency in summary:
            summary[currency]['net'] = summary[currency]['li'] - summary[currency]['alay']
        return jsonify({'debts': result, 'summary': summary})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@debts_bp.route('/debt', methods=['POST'])
def add_debt():
    try:
        data = request.json
        debt_type = data['type']
        debt = Debt(
            debt_date=data.get('date', datetime.now().strftime('%Y-%m-%d')),
            person_name=data['person_name'],
            type=debt_type,
            amount=float(data['amount']),
            currency=data['currency'],
            notes=data.get('notes', ''),
            is_settled=False
        )
        db.session.add(debt)
        # تحديث الجرد حسب نوع الدين
        currency_item = Inventory.query.filter_by(item_name=debt.currency, item_type='currency').first()
        if not currency_item:
            currency_item = Inventory(item_name=debt.currency, balance=0, item_type='currency')
            db.session.add(currency_item)
        if debt_type == 'borrowed_from_someone':
            currency_item.balance -= debt.amount
        elif debt_type == 'lent_to_someone':
            currency_item.balance += debt.amount
        db.session.commit()
        # سجل العملية في history
        history = DebtHistory(
            debt_id=debt.id,
            person_name=debt.person_name,
            type=debt.type,
            amount=debt.amount,
            currency=debt.currency,
            date=debt.debt_date,
            notes=debt.notes,
            action='add'
        )
        db.session.add(history)
        db.session.commit()
        return jsonify({'success': True, 'debt_id': debt.id})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@debts_bp.route('/debt/<int:debt_id>', methods=['PUT'])
def edit_debt(debt_id):
    try:
        debt = Debt.query.get_or_404(debt_id)
        data = request.json
        old_amount = debt.amount
        old_currency = debt.currency
        old_type = debt.type
        debt.debt_date = data.get('date', debt.debt_date)
        debt.type = data.get('type', debt.type)
        debt.person_name = data.get('person_name', debt.person_name)
        debt.amount = float(data.get('amount', debt.amount))
        debt.currency = data.get('currency', debt.currency)
        debt.notes = data.get('notes', debt.notes)
        # تحديث الجرد حسب الفرق
        currency_item = Inventory.query.filter_by(item_name=debt.currency, item_type='currency').first()
        if not currency_item:
            currency_item = Inventory(item_name=debt.currency, balance=0, item_type='currency')
            db.session.add(currency_item)
        # أعد حساب الرصيد بناءً على الفرق
        if old_type == 'borrowed_from_someone':
            currency_item.balance += old_amount
        elif old_type == 'lent_to_someone':
            currency_item.balance -= old_amount
        if debt.type == 'borrowed_from_someone':
            currency_item.balance -= debt.amount
        elif debt.type == 'lent_to_someone':
            currency_item.balance += debt.amount
        db.session.commit()
        # سجل العملية في history
        history = DebtHistory(
            debt_id=debt.id,
            person_name=debt.person_name,
            type=debt.type,
            amount=debt.amount,
            currency=debt.currency,
            date=debt.debt_date,
            notes=debt.notes,
            action='edit'
        )
        db.session.add(history)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@debts_bp.route('/debt/<int:debt_id>/settle', methods=['POST'])
def settle_debt(debt_id):
    try:
        debt = Debt.query.get_or_404(debt_id)
        if debt.is_settled:
            return jsonify({'error': 'Debt already settled'}), 400
        currency_item = Inventory.query.filter_by(item_name=debt.currency, item_type='currency').first()
        if currency_item:
            if debt.type == 'borrowed_from_someone':
                currency_item.balance += debt.amount
            elif debt.type == 'lent_to_someone':
                currency_item.balance -= debt.amount
        debt.is_settled = True
        db.session.commit()
        # سجل العملية في history
        history = DebtHistory(
            debt_id=debt.id,
            person_name=debt.person_name,
            type=debt.type,
            amount=debt.amount,
            currency=debt.currency,
            date=debt.debt_date,
            notes=debt.notes,
            action='settle'
        )
        db.session.add(history)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@debts_bp.route('/debts/unsettled', methods=['GET'])
def get_unsettled_debts():
    try:
        debts = Debt.query.filter_by(is_settled=False).order_by(Debt.debt_date.desc()).all()
        result = []
        
        for debt in debts:
            result.append({
                'id': debt.id,
                'date': debt.debt_date,
                'person_name': debt.person_name,
                'type': debt.type,
                'amount': debt.amount,
                'currency': debt.currency,
                'notes': debt.notes
            })
        
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@debts_bp.route('/debt/<int:debt_id>', methods=['DELETE'])
def delete_debt(debt_id):
    try:
        debt = Debt.query.get_or_404(debt_id)
        # عكس الأثر المالي على الجرد
        currency_item = Inventory.query.filter_by(item_name=debt.currency, item_type='currency').first()
        if currency_item:
            if debt.type == 'borrowed_from_someone':
                currency_item.balance += debt.amount
            elif debt.type == 'lent_to_someone':
                currency_item.balance -= debt.amount
        db.session.delete(debt)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@debts_bp.route('/debts/pdf', methods=['GET'])
def export_debts_pdf():
    try:
        debts = Debt.query.order_by(Debt.debt_date.desc()).all()
        pdf = FPDF()
        pdf.add_page()
        pdf.add_font('Amiri', '', 'src/static/fonts/Amiri-Regular.ttf', uni=True)
        pdf.set_font('Amiri', '', 14)
        pdf.cell(0, 10, get_display(arabic_reshaper.reshape('دفتر الديون')), ln=True, align='C')
        pdf.ln(5)
        headers = ['التاريخ', 'اسم الشخص', 'النوع', 'المبلغ', 'العملة', 'ملاحظات', 'الحالة']
        for h in headers:
            pdf.cell(30, 10, get_display(arabic_reshaper.reshape(h)), border=1, align='C')
        pdf.ln()
        for debt in debts:
            row = [
                debt.debt_date,
                debt.person_name,
                'اتدينت من شخص' if debt.type == 'borrowed_from_someone' else 'شخص تدين مني',
                str(debt.amount),
                debt.currency,
                debt.notes or '-',
                'مسدد' if debt.is_settled else 'غير مسدد'
            ]
            for item in row:
                pdf.cell(30, 10, get_display(arabic_reshaper.reshape(str(item))), border=1, align='C')
            pdf.ln()
        pdf_output = io.BytesIO()
        pdf.output(pdf_output)
        pdf_output.seek(0)
        return send_file(pdf_output, as_attachment=True, download_name='debt_book.pdf', mimetype='application/pdf')
    except Exception as e:
        return {'error': str(e)}, 500

@debts_bp.route('/debt/history/<int:debt_id>', methods=['GET'])
def get_debt_history(debt_id):
    history = DebtHistory.query.filter_by(debt_id=debt_id).order_by(DebtHistory.timestamp.asc()).all()
    return jsonify([h.to_dict() for h in history])

@debts_bp.route('/debt/person_history/<person_name>', methods=['GET'])
def get_person_debt_history(person_name):
    history = DebtHistory.query.filter_by(person_name=person_name).order_by(DebtHistory.timestamp.asc()).all()
    return jsonify([h.to_dict() for h in history])

@debts_bp.route('/debt/<int:debt_id>/partial_settle', methods=['POST'])
def partial_settle_debt(debt_id):
    try:
        debt = Debt.query.get_or_404(debt_id)
        data = request.get_json() or request.form
        amount = float(data.get('amount', 0))
        if amount <= 0 or amount > debt.amount:
            return jsonify({'error': 'مبلغ غير صالح'}), 400
        # تحديث الجرد حسب نوع الدين
        currency_item = Inventory.query.filter_by(item_name=debt.currency, item_type='currency').first()
        if not currency_item:
            currency_item = Inventory(item_name=debt.currency, balance=0, item_type='currency')
            db.session.add(currency_item)
        if debt.type == 'borrowed_from_someone':
            currency_item.balance += amount
        elif debt.type == 'lent_to_someone':
            currency_item.balance -= amount
        # إذا تم تسديد كامل المبلغ
        if amount == debt.amount:
            debt.is_settled = True
        else:
            debt.amount -= amount
        db.session.commit()
        # سجل العملية في history
        history = DebtHistory(
            debt_id=debt.id,
            person_name=debt.person_name,
            type=debt.type,
            amount=amount,
            currency=debt.currency,
            date=debt.debt_date,
            notes=debt.notes,
            action='partial_settle'
        )
        db.session.add(history)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

