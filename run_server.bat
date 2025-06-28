@echo off
echo ========================================
echo    نظام إدارة الصرافة والذهب
echo ========================================
echo.
echo جاري تشغيل الخادم...
echo.

REM تفعيل البيئة الافتراضية إذا كانت موجودة
if exist "venv\Scripts\activate.bat" (
    echo تفعيل البيئة الافتراضية...
    call venv\Scripts\activate.bat
)

REM تثبيت المتطلبات إذا لم تكن مثبتة
echo تثبيت المتطلبات...
pip install -r requirements.txt

REM تشغيل الخادم
echo.
echo بدء تشغيل الخادم...
python src/main.py

pause 