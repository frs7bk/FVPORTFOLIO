#!/usr/bin/env python3
"""
سكربت إعداد بدء التشغيل على Render.com
يقوم بإنشاء المجلدات اللازمة والتحقق من الإعدادات
"""
import os
import logging
import sys

# إعداد التسجيل
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def setup_render_environment():
    """تهيئة البيئة اللازمة للتشغيل على Render"""
    logger.info("بدء إعداد بيئة Render...")
    
    # التحقق من المتغيرات البيئية الأساسية
    required_env_vars = [
        "DATABASE_URL",
        "FLASK_SECRET_KEY",
        "SESSION_SECRET"
    ]
    
    missing_vars = []
    for var in required_env_vars:
        if not os.environ.get(var):
            missing_vars.append(var)
            # إنشاء مفتاح سري افتراضي إذا كان مفقوداً (للتطوير فقط)
            if var in ["FLASK_SECRET_KEY", "SESSION_SECRET"]:
                import secrets
                os.environ[var] = secrets.token_hex(32)
                logger.warning(f"تم إنشاء {var} افتراضي. يرجى تعيين قيمة ثابتة في الإعدادات البيئية لبيئة الإنتاج.")
    
    if missing_vars:
        logger.warning(f"المتغيرات البيئية التالية مفقودة: {', '.join(missing_vars)}")
    else:
        logger.info("تم التحقق من جميع المتغيرات البيئية المطلوبة")
    
    # تحويل عنوان قاعدة البيانات إذا لزم الأمر
    database_url = os.environ.get("DATABASE_URL", "")
    if database_url.startswith("postgres://"):
        new_db_url = database_url.replace("postgres://", "postgresql://", 1)
        os.environ["DATABASE_URL"] = new_db_url
        logger.info("تم تصحيح DATABASE_URL لاستخدام postgresql://")
    
    # إخفاء كلمة المرور في السجلات
    safe_db_url = database_url
    if "@" in safe_db_url and ":" in safe_db_url:
        parts = safe_db_url.split("@")
        auth_parts = parts[0].split(":")
        if len(auth_parts) > 2:
            auth_parts[2] = "****"  # إخفاء كلمة المرور
            parts[0] = ":".join(auth_parts)
            safe_db_url = "@".join(parts)
    
    logger.info(f"رابط قاعدة البيانات: {safe_db_url}")
    
    # اختبار الاتصال بقاعدة البيانات
    try:
        import importlib.util
        if importlib.util.find_spec("test_database_connection"):
            from test_database_connection import test_database_connection
            db_success = test_database_connection(max_retries=3, retry_delay=3)
            if db_success:
                logger.info("تم التحقق من الاتصال بقاعدة البيانات بنجاح.")
            else:
                logger.warning("فشل الاتصال بقاعدة البيانات. قد يواجه التطبيق مشاكل.")
        else:
            logger.warning("ملف اختبار الاتصال بقاعدة البيانات غير متوفر.")
    except Exception as e:
        logger.error(f"خطأ أثناء اختبار الاتصال بقاعدة البيانات: {str(e)}")
    
    # إنشاء المجلدات الضرورية
    upload_folders = [
        "static/uploads",
        "static/uploads/profile",
        "static/uploads/portfolio",
        "static/uploads/carousel",
        "static/uploads/services",
        "static/uploads/projects",
        "instance"
    ]
    
    for folder in upload_folders:
        try:
            os.makedirs(folder, exist_ok=True)
            logger.info(f"تم إنشاء المجلد: {folder}")
        except Exception as e:
            logger.error(f"فشل في إنشاء المجلد {folder}: {str(e)}")
    
    # التأكد من وجود ملف .gitkeep في المجلدات الفارغة للحفاظ عليها
    for folder in upload_folders:
        gitkeep_path = os.path.join(folder, '.gitkeep')
        if not os.path.exists(gitkeep_path):
            try:
                with open(gitkeep_path, 'w') as f:
                    f.write('# هذا الملف يحافظ على المجلد في Git')
                logger.info(f"تم إنشاء ملف .gitkeep في {folder}")
            except Exception as e:
                logger.warning(f"فشل في إنشاء ملف .gitkeep في {folder}: {str(e)}")
    
    # Render يوفر متغير PORT البيئي
    port = os.environ.get("PORT", 5000)
    logger.info(f"سيتم استخدام المنفذ: {port}")
    
    # عرض حالة النظام
    import platform
    import sys
    logger.info(f"نظام التشغيل: {platform.system()} {platform.release()}")
    logger.info(f"إصدار Python: {sys.version}")
    
    logger.info("اكتمل إعداد بيئة Render بنجاح!")
    return True

def run_fixes():
    """تشغيل إصلاحات معروفة بشكل تلقائي"""
    logger.info("بدء تنفيذ الإصلاحات التلقائية...")
    
    # قائمة بملفات الإصلاح الممكنة
    fix_scripts = [
        "fix_admin_access.py",
        "fix_analytics_routes.py",
        "fix_db_missing_columns.py"
    ]
    
    for script in fix_scripts:
        if os.path.exists(script):
            try:
                logger.info(f"تنفيذ إصلاح: {script}")
                # استيراد الإصلاح وتنفيذه
                if script == "fix_admin_access.py":
                    import fix_admin_access
                    logger.info("تم تنفيذ إصلاح الوصول للمدير")
                elif script == "fix_analytics_routes.py":
                    import fix_analytics_routes
                    logger.info("تم تنفيذ إصلاح مسارات التحليلات")
                elif script == "fix_db_missing_columns.py":
                    import fix_db_missing_columns
                    logger.info("تم تنفيذ إصلاح الأعمدة المفقودة")
            except Exception as e:
                logger.error(f"فشل تنفيذ إصلاح {script}: {str(e)}")
        else:
            logger.warning(f"ملف الإصلاح {script} غير موجود")
    
    logger.info("اكتمل تنفيذ الإصلاحات التلقائية")

if __name__ == "__main__":
    try:
        setup_render_environment()
        run_fixes()
        logger.info("تم الانتهاء من الإعداد والإصلاحات بنجاح!")
    except Exception as e:
        logger.error(f"حدث خطأ أثناء الإعداد: {str(e)}")
        sys.exit(1)