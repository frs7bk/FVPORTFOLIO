/**
 * ملف إصلاح لأخطاء JavaScript
 * يعالج مشكلة "missing ) after argument list"
 */

// تنفيذ فوري لوظيفة الإصلاح
(function() {
    console.log('تشغيل إصلاح أخطاء JavaScript');
    
    // إصلاح مشكلة النوافذ المنبثقة
    window.addEventListener('DOMContentLoaded', function() {
        // التحقق من وجود العناصر وإصلاح أي مشاكل محتملة
        fixJavaScriptErrors();
    });
    
    // دالة الإصلاح الرئيسية
    function fixJavaScriptErrors() {
        // تأكد من وجود الدوال الضرورية
        if (typeof window.showVideo !== 'function') {
            console.log('إضافة دالة showVideo');
            window.showVideo = function() {
                console.log('تم استدعاء دالة عرض الفيديو البديلة');
                const hasVideo = document.getElementById('modal-has-video');
                
                if (!hasVideo || hasVideo.value !== '1') {
                    console.log('لا يوجد فيديو لهذا المشروع');
                    return;
                }
                
                try {
                    const imageContainer = document.getElementById('modal-image-container');
                    const videoContainer = document.getElementById('modal-video-container');
                    
                    if (imageContainer && videoContainer) {
                        imageContainer.style.display = 'none';
                        videoContainer.style.display = 'block';
                        
                        const videoType = document.getElementById('modal-video-type').value;
                        
                        if (videoType === 'external') {
                            const externalVideoContainer = document.getElementById('modal-external-video-container');
                            const localVideoContainer = document.getElementById('modal-local-video-container');
                            const externalVideo = document.getElementById('modal-external-video');
                            const videoUrl = document.getElementById('modal-video-url').value;
                            
                            if (externalVideoContainer && externalVideo && videoUrl) {
                                externalVideo.src = videoUrl;
                                externalVideoContainer.style.display = 'block';
                                if (localVideoContainer) localVideoContainer.style.display = 'none';
                            }
                        } else {
                            const localVideoContainer = document.getElementById('modal-local-video-container');
                            const externalVideoContainer = document.getElementById('modal-external-video-container');
                            const videoSource = document.getElementById('modal-video-source');
                            const localVideo = document.getElementById('modal-local-video');
                            const videoFile = document.getElementById('modal-video-file').value;
                            
                            if (localVideoContainer && videoSource && localVideo && videoFile) {
                                videoSource.src = videoFile;
                                localVideo.load();
                                
                                localVideoContainer.style.display = 'block';
                                if (externalVideoContainer) externalVideoContainer.style.display = 'none';
                                
                                localVideo.play().catch(e => console.log('لم يتم تشغيل الفيديو تلقائياً:', e));
                            }
                        }
                    }
                } catch(err) {
                    console.error('خطأ في تشغيل الفيديو:', err);
                }
            };
        }
        
        // فحص وإصلاح العناصر المفقودة
        if (document.querySelector('.instagram-swiper') &&
            !document.querySelector('script[src*="instagram_carousel.js"]')) {
            console.log('إضافة سكريبت كاروسيل الإنستجرام المفقود');
            
            const script = document.createElement('script');
            script.src = '/static/js/instagram_carousel.js';
            script.defer = true;
            document.head.appendChild(script);
        }
    }
})();