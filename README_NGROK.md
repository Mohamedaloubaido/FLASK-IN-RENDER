# 🌐 تشغيل النظام عن بعد باستخدام ngrok

## 📋 المتطلبات
- Python 3.7+
- اتصال بالإنترنت
- حساب مجاني على ngrok.com (اختياري)

## 🚀 التشغيل السريع

### الطريقة الأولى: ملف التشغيل التلقائي
```bash
# في Windows
run_server.bat

# في Linux/Mac
chmod +x run_server.sh
./run_server.sh
```

### الطريقة الثانية: التشغيل اليدوي
```bash
# 1. تثبيت المتطلبات
pip install -r requirements.txt

# 2. تشغيل الخادم
python src/main.py
```

## 📱 الوصول من الأجهزة الأخرى

### 1. من لابتوب آخر في نفس الشبكة
```
http://IP_LAPTOP_MAIN:5000
```
- استخدم `ipconfig` (Windows) أو `ifconfig` (Linux/Mac) لمعرفة IP

### 2. من الجوالات أو أي جهاز (عبر ngrok)
```
https://abc123.ngrok.io
```
- سيظهر الرابط في terminal عند تشغيل الخادم

## 🔧 إعدادات متقدمة

### 1. الحصول على رابط ثابت (اختياري)
1. سجل حساب على [ngrok.com](https://ngrok.com)
2. احصل على authtoken
3. أضف التوكن في الكود:
```python
from pyngrok import ngrok
ngrok.set_auth_token('YOUR_TOKEN')
```

### 2. تغيير المنفذ
```python
# في src/main.py
app.run(host='0.0.0.0', port=8080, debug=False)
```

### 3. إيقاف ngrok
```python
# في terminal
ngrok.kill()
```

## 🛠️ استكشاف الأخطاء

### مشكلة: ngrok لا يعمل
```bash
# تأكد من تثبيت pyngrok
pip install pyngrok

# أو استخدم ngrok مباشرة
ngrok http 5000
```

### مشكلة: لا يمكن الوصول من الأجهزة الأخرى
1. تأكد من تشغيل الخادم على `0.0.0.0`
2. تحقق من إعدادات Firewall
3. استخدم ngrok للحصول على رابط عام

### مشكلة: بطء في الاتصال
- استخدم ngrok للحصول على رابط أسرع
- تأكد من سرعة الإنترنت

## 📞 الدعم
إذا واجهت أي مشاكل:
1. تأكد من تثبيت جميع المتطلبات
2. تحقق من رسائل الخطأ في terminal
3. تأكد من اتصال الإنترنت

## 🎯 المميزات
- ✅ يعمل من أي مكان في العالم
- ✅ آمن (HTTPS)
- ✅ مجاني
- ✅ سهل الاستخدام
- ✅ لا يحتاج إعدادات معقدة 