#!/bin/bash

echo "========================================"
echo "   نظام إدارة الصرافة والذهب"
echo "========================================"
echo ""
echo "جاري تشغيل الخادم..."
echo ""

# تفعيل البيئة الافتراضية إذا كانت موجودة
if [ -d "venv" ]; then
    echo "تفعيل البيئة الافتراضية..."
    source venv/bin/activate
fi

# تثبيت المتطلبات
echo "تثبيت المتطلبات..."
pip install -r requirements.txt

# تشغيل الخادم
echo ""
echo "بدء تشغيل الخادم..."
python src/main.py 