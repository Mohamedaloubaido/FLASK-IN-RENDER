import os
import sys
# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory
from flask_cors import CORS
from src.models import db
from src.routes.inventory import inventory_bp
from src.routes.gold import gold_bp
from src.routes.cashbox import cashbox_bp
from src.routes.debts import debts_bp
from src.routes.remittances import remittances_bp
from src.routes.transfers import transfers_bp
from src.routes.shop_gold import shop_gold_bp

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))
app.config['SECRET_KEY'] = 'asdf#FGSgvasgf$5$WGT'
CORS(app)

app.register_blueprint(inventory_bp, url_prefix='/api')
app.register_blueprint(gold_bp, url_prefix='/api')
app.register_blueprint(cashbox_bp, url_prefix='/api')
app.register_blueprint(debts_bp, url_prefix='/api')
app.register_blueprint(remittances_bp, url_prefix='/api')
app.register_blueprint(transfers_bp, url_prefix='/api')
app.register_blueprint(shop_gold_bp, url_prefix='/api')

# uncomment if you need to use database
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(os.path.dirname(__file__), 'database', 'app.db')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)
with app.app_context():
    db.create_all()

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    static_folder_path = app.static_folder
    if static_folder_path is None:
            return "Static folder not configured", 404

    if path != "" and os.path.exists(os.path.join(static_folder_path, path)):
        return send_from_directory(static_folder_path, path)
    else:
        index_path = os.path.join(static_folder_path, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(static_folder_path, 'index.html')
        else:
            return "index.html not found", 404


if __name__ == '__main__':
    try:
        # محاولة تشغيل ngrok إذا كان متاحًا
        from pyngrok import ngrok
        
        # إعداد authtoken
        ngrok.set_auth_token('EIXBFWKFNHBKRCU5RLNPSH7KRDPVUHAO')
        
        print("🚀 بدء تشغيل الخادم مع ngrok...")
        print("⏳ جاري إنشاء رابط عام...")
        
        # تشغيل ngrok
        public_url = ngrok.connect(5000)
        print(f"✅ تم إنشاء الرابط العام: {public_url}")
        print(f"🌐 يمكن الوصول للنظام من أي جهاز عبر: {public_url}")
        print("📱 شارك هذا الرابط مع الأجهزة الأخرى")
        print("-" * 50)
        
    except ImportError:
        print("⚠️  pyngrok غير مثبت. تشغيل الخادم المحلي فقط...")
        print("💡 لتشغيل ngrok: pip install pyngrok")
        public_url = None
    except Exception as e:
        print(f"⚠️  خطأ في تشغيل ngrok: {e}")
        print("🔄 تشغيل الخادم المحلي فقط...")
        public_url = None
    
    print("🖥️  الخادم يعمل على: http://localhost:5000")
    print("🌐 الشبكة المحلية: http://192.168.31.185:5000")
    if public_url:
        print(f"🌍 الرابط العام: {public_url}")
    
    app.run(host='0.0.0.0', port=5000, debug=False)
