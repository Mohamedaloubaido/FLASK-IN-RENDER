from flask import Blueprint, jsonify, request, send_file
from src.models.exchange import db, Remittance, TransferCompany, Inventory
from datetime import datetime
from fpdf import FPDF
import io
import arabic_reshaper
from bidi.algorithm import get_display
import os

remittances_bp = Blueprint('remittances', __name__)

@remittances_bp.route('/companies', methods=['GET'])
def get_companies():
    try:
        companies = TransferCompany.query.order_by(TransferCompany.order.asc()).all()
        result = []
        
        for company in companies:
            result.append({
                'id': company.id,
                'name': company.company_name
            })
        
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@remittances_bp.route('/remittances', methods=['GET'])
def get_remittances():
    try:
        company_id = request.args.get('company_id')
        
        query = Remittance.query
        if company_id:
            query = query.filter_by(company_id=company_id)
        
        remittances = query.order_by(Remittance.remittance_date.desc()).all()
        result = []
        
        for remittance in remittances:
            result.append({
                'id': remittance.id,
                'date': remittance.remittance_date,
                'type': remittance.type,
                'receipt_number': remittance.receipt_number,
                'person_name': remittance.person_name,
                'amount': remittance.amount,
                'currency': remittance.currency,
                'company_id': remittance.company_id,
                'company_name': remittance.company.company_name,
                'notes': remittance.notes,
                'id_image1': remittance.id_image1,
                'id_image2': remittance.id_image2
            })
        
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@remittances_bp.route('/remittance', methods=['POST'])
def add_remittance():
    try:
        # دعم multipart/form-data
        if request.content_type and request.content_type.startswith('multipart/form-data'):
            data = request.form
            files = request.files
        else:
            data = request.json
            files = None
        # معالجة الصور
        upload_dir = os.path.join(os.path.dirname(__file__), '../static/uploads/ids')
        os.makedirs(upload_dir, exist_ok=True)
        id_image1 = None
        id_image2 = None
        if files:
            if 'id_image1' in files and files['id_image1']:
                f1 = files['id_image1']
                if f1.filename:
                    filename1 = f"id1_{datetime.now().strftime('%Y%m%d%H%M%S%f')}_{f1.filename}"
                    path1 = os.path.join(upload_dir, filename1)
                    f1.save(path1)
                    id_image1 = filename1
            if 'id_image2' in files and files['id_image2']:
                f2 = files['id_image2']
                if f2.filename:
                    filename2 = f"id2_{datetime.now().strftime('%Y%m%d%H%M%S%f')}_{f2.filename}"
                    path2 = os.path.join(upload_dir, filename2)
                    f2.save(path2)
                    id_image2 = filename2
        # Create new remittance
        remittance = Remittance(
            remittance_date=data.get('date', datetime.now().strftime('%Y-%m-%d')),
            type=data['type'],  # 'send' or 'receive'
            receipt_number=data['receipt_number'],
            person_name=data['person_name'],
            amount=float(data['amount']),
            currency=data['currency'],
            company_id=int(data['company_id']),
            notes=data.get('notes', ''),
            id_image1=id_image1,
            id_image2=id_image2
        )
        db.session.add(remittance)
        # Update inventory (الجرد العام)
        currency_item = Inventory.query.filter_by(item_name=remittance.currency, item_type='currency').first()
        if not currency_item:
            currency_item = Inventory(item_name=remittance.currency, balance=0, item_type='currency')
            db.session.add(currency_item)
        # Update company balance
        company = TransferCompany.query.get(remittance.company_id)
        company_item = Inventory.query.filter_by(item_name=f'{company.company_name}__{remittance.currency}', item_type='company').first()
        if not company_item:
            company_item = Inventory(item_name=f'{company.company_name}__{remittance.currency}', item_type='company', balance=0)
            db.session.add(company_item)
        if remittance.type == 'send':
            currency_item.balance -= remittance.amount
            company_item.balance += remittance.amount
        else:
            currency_item.balance += remittance.amount
            company_item.balance -= remittance.amount
        db.session.commit()
        return jsonify({'success': True, 'remittance_id': remittance.id})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@remittances_bp.route('/company/<int:company_id>/balance', methods=['GET'])
def get_company_balance(company_id):
    try:
        # Calculate balance: sent - received
        sent_total = db.session.query(db.func.sum(Remittance.amount)).filter(
            Remittance.company_id == company_id,
            Remittance.type == 'send'
        ).scalar() or 0
        
        received_total = db.session.query(db.func.sum(Remittance.amount)).filter(
            Remittance.company_id == company_id,
            Remittance.type == 'receive'
        ).scalar() or 0
        
        balance = sent_total - received_total
        
        return jsonify({'balance': balance})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def fix_arabic(text):
    reshaped = arabic_reshaper.reshape(text)
    return get_display(reshaped)

@remittances_bp.route('/export/remittances/pdf', methods=['GET'])
def export_remittances_pdf():
    try:
        remittances = Remittance.query.order_by(Remittance.remittance_date.desc()).all()
        pdf = FPDF()
        pdf.add_page()
        pdf.add_font('Amiri', '', 'src/static/fonts/Amiri-Regular.ttf', uni=True)
        pdf.set_font('Amiri', '', 14)
        pdf.cell(0, 10, fix_arabic('تقرير الحوالات'), ln=1, align='C')
        pdf.set_font('Amiri', '', 11)
        headers = ['التاريخ', 'النوع', 'رقم الإشعار', 'اسم الشخص', 'المبلغ', 'العملة', 'اسم الشركة', 'ملاحظات']
        for h in headers:
            pdf.cell(30, 8, fix_arabic(h), border=1)
        pdf.ln()
        for r in remittances:
            pdf.cell(30, 8, fix_arabic(str(r.remittance_date)), border=1)
            pdf.cell(30, 8, fix_arabic('استلام' if r.type == 'receive' else 'إرسال'), border=1)
            pdf.cell(30, 8, fix_arabic(str(r.receipt_number)), border=1)
            pdf.cell(30, 8, fix_arabic(str(r.person_name)), border=1)
            pdf.cell(30, 8, fix_arabic(str(r.amount)), border=1)
            pdf.cell(30, 8, fix_arabic(str(r.currency)), border=1)
            pdf.cell(30, 8, fix_arabic(str(r.company.company_name)), border=1)
            pdf.cell(30, 8, fix_arabic(str(r.notes or '-')), border=1)
            pdf.ln()
        pdf_output = io.BytesIO()
        pdf.output(pdf_output)
        pdf_output.seek(0)
        return send_file(pdf_output, as_attachment=True, download_name='remittances_report.pdf', mimetype='application/pdf')
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@remittances_bp.route('/remittance/<int:remittance_id>', methods=['POST', 'PUT'])
def edit_remittance(remittance_id):
    try:
        remittance = Remittance.query.get_or_404(remittance_id)
        # دعم multipart/form-data
        if request.content_type and request.content_type.startswith('multipart/form-data'):
            data = request.form
            files = request.files
        else:
            data = request.json
            files = None
        # معالجة الصور
        upload_dir = os.path.join(os.path.dirname(__file__), '../static/uploads/ids')
        os.makedirs(upload_dir, exist_ok=True)
        # صور الهوية
        if files:
            if 'id_image1' in files and files['id_image1']:
                f1 = files['id_image1']
                if f1.filename:
                    filename1 = f"id1_{datetime.now().strftime('%Y%m%d%H%M%S%f')}_{f1.filename}"
                    path1 = os.path.join(upload_dir, filename1)
                    f1.save(path1)
                    remittance.id_image1 = filename1
            if 'id_image2' in files and files['id_image2']:
                f2 = files['id_image2']
                if f2.filename:
                    filename2 = f"id2_{datetime.now().strftime('%Y%m%d%H%M%S%f')}_{f2.filename}"
                    path2 = os.path.join(upload_dir, filename2)
                    f2.save(path2)
                    remittance.id_image2 = filename2
        # تعديل الحقول الأخرى
        old_amount = remittance.amount
        old_currency = remittance.currency
        old_type = remittance.type
        remittance.remittance_date = data.get('date', remittance.remittance_date)
        remittance.type = data.get('type', remittance.type)
        remittance.receipt_number = data.get('receipt_number', remittance.receipt_number)
        remittance.person_name = data.get('person_name', remittance.person_name)
        remittance.amount = float(data.get('amount', remittance.amount))
        remittance.currency = data.get('currency', remittance.currency)
        remittance.company_id = int(data.get('company_id', remittance.company_id))
        remittance.notes = data.get('notes', remittance.notes)
        # تحديث رصيد الجرد إذا تغيرت القيم
        if old_currency != remittance.currency or old_type != remittance.type or old_amount != remittance.amount:
            # أعد الأثر القديم
            currency_item = Inventory.query.filter_by(item_name=old_currency, item_type='currency').first()
            if old_type == 'send':
                currency_item.balance += old_amount
            else:
                currency_item.balance -= old_amount
            # طبق الأثر الجديد
            new_currency_item = Inventory.query.filter_by(item_name=remittance.currency, item_type='currency').first()
            if not new_currency_item:
                new_currency_item = Inventory(item_name=remittance.currency, balance=0, item_type='currency')
                db.session.add(new_currency_item)
            if remittance.type == 'send':
                new_currency_item.balance -= remittance.amount
            else:
                new_currency_item.balance += remittance.amount
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

