/**
 * مدير متطور لإيقاف الفيديو للمعرض
 * يتضمن إصلاحات متعددة الطبقات لضمان توقف الفيديو عند إغلاق النافذة المنبثقة
 * 
 * الميزات:
 * - مراقبة جميع أحداث الإغلاق (زر الإغلاق، النقر خارج النافذة، مفتاح ESC)
 * - إيقاف الفيديو بغض النظر عن نوعه (محلي أو خارجي)
 * - تنظيف ذاكرة التخزين المؤقت والموارد
 * - فحص دوري للتأكد من عدم استمرار تشغيل الفيديو
 * - إعادة تعيين عناصر الفيديو عند الانتقال بين المشاريع
 */

// ==== وحدة التحكم في إيقاف الفيديو ====
const VideoStopController = {
    /**
     * الفيديوهات المحلية والخارجية
     */
    videoElements: {
        local: document.getElementById('modal-local-video'),
        external: document.getElementById('modal-external-video'),
        iframe: null, // سيتم تحديثه ديناميكيًا
    },
    
    /**
     * حالة الفيديو
     */
    videoState: {
        isPlaying: false,
        currentType: null, // 'local' أو 'external'
        currentSource: null,
        lastModalId: null,
    },

    /**
     * فترة الفحص الدوري (بالمللي ثانية)
     */
    CHECK_INTERVAL: 1000,
    
    /**
     * مؤقت الفحص الدوري
     */
    periodicCheckTimer: null,
    
    /**
     * تهيئة مدير إيقاف الفيديو
     */
    initialize: function() {
        // تسجيل الدخول لأغراض التصحيح
        console.log('تم تهيئة مدير إيقاف الفيديو المحسن');

        // تحديث مراجع الفيديو
        this.refreshVideoReferences();
        
        // المراقبة المستمرة للتغييرات في الـ DOM
        this.setupMutationObserver();
        
        // تعيين المستمعين للأحداث
        this.setupEventListeners();
        
        // بدء الفحص الدوري
        this.startPeriodicCheck();
    },
    
    /**
     * تحديث مراجع عناصر الفيديو
     */
    refreshVideoReferences: function() {
        this.videoElements.local = document.getElementById('modal-local-video');
        this.videoElements.external = document.getElementById('modal-external-video');
        
        // البحث عن أي إطارات iframe للفيديو
        const iframes = document.querySelectorAll('.modal-video iframe');
        if (iframes.length > 0) {
            this.videoElements.iframe = iframes[0];
        }
    },
    
    /**
     * إعداد مراقب التغييرات في الـ DOM
     */
    setupMutationObserver: function() {
        // مراقبة التغييرات في الـ DOM لتحديث مراجع الفيديو
        const observer = new MutationObserver((mutations) => {
            let shouldRefresh = false;
            
            for (const mutation of mutations) {
                if (mutation.type === 'childList' || mutation.type === 'attributes') {
                    // إذا تم إضافة أو تغيير عناصر الفيديو
                    if (mutation.target.id === 'modal-local-video' || 
                        mutation.target.id === 'modal-external-video' ||
                        mutation.target.classList?.contains('modal-video')) {
                        shouldRefresh = true;
                        break;
                    }
                }
            }
            
            if (shouldRefresh) {
                this.refreshVideoReferences();
            }
        });
        
        // مراقبة التغييرات في كامل المستند
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['src', 'style', 'display']
        });
    },
    
    /**
     * إعداد مستمعي الأحداث
     */
    setupEventListeners: function() {
        // 1. مراقبة أزرار الإغلاق
        const closeButtons = document.querySelectorAll('.close, .modal-close, .close-modal, [data-dismiss="modal"]');
        closeButtons.forEach(button => {
            button.removeEventListener('click', this.stopAllVideos.bind(this));
            button.addEventListener('click', this.stopAllVideos.bind(this));
        });
        
        // 2. مراقبة النقر خارج النافذة المنبثقة
        document.addEventListener('click', (event) => {
            const modals = document.querySelectorAll('.modal, .modal-backdrop');
            modals.forEach(modal => {
                if (event.target === modal) {
                    this.stopAllVideos();
                }
            });
        });
        
        // 3. مراقبة مفتاح ESC
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' || event.keyCode === 27) {
                this.stopAllVideos();
            }
        });
        
        // 4. مراقبة تغيير المشروع المعروض
        document.addEventListener('portfolioItemChanged', (event) => {
            this.stopAllVideos();
            
            // تسجيل معرف المشروع الجديد
            if (event.detail && event.detail.portfolioId) {
                this.videoState.lastModalId = event.detail.portfolioId;
            }
        });
        
        // 5. مراقبة إغلاق النافذة المنبثقة
        document.addEventListener('modalClosed', () => {
            this.stopAllVideos();
        });
        
        // 6. مراقبة نقرات أزرار الفيديو
        const videoButtons = document.querySelectorAll('.video-btn, .video-button, .video-btn-inline, .video-action-button');
        videoButtons.forEach(button => {
            button.removeEventListener('click', this.handleVideoButtonClick.bind(this));
            button.addEventListener('click', this.handleVideoButtonClick.bind(this));
        });
    },
    
    /**
     * معالجة نقر زر الفيديو
     */
    handleVideoButtonClick: function() {
        // تخزين حالة التشغيل
        this.videoState.isPlaying = true;
        
        // تحديد نوع الفيديو الحالي
        const hasVideo = document.getElementById('modal-has-video')?.value === '1';
        const videoType = document.getElementById('modal-video-type')?.value;
        
        if (hasVideo && videoType) {
            this.videoState.currentType = videoType;
            
            if (videoType === 'local') {
                this.videoState.currentSource = document.getElementById('modal-video-file')?.value;
            } else {
                this.videoState.currentSource = document.getElementById('modal-video-url')?.value;
            }
        }
    },
    
    /**
     * بدء فحص دوري لإيقاف الفيديوهات غير المرئية
     */
    startPeriodicCheck: function() {
        if (this.periodicCheckTimer) {
            clearInterval(this.periodicCheckTimer);
        }
        
        this.periodicCheckTimer = setInterval(() => {
            // التحقق مما إذا كانت النافذة المنبثقة مفتوحة
            const portfolioModal = document.getElementById('portfolioModal');
            const modalVideo = document.querySelector('.modal-video');
            
            // إذا كانت النافذة مغلقة ولكن الفيديو يعمل، قم بإيقافه
            if ((!portfolioModal || 
                portfolioModal.style.display === 'none' || 
                !portfolioModal.classList.contains('show')) && 
                this.videoState.isPlaying) {
                
                this.stopAllVideos();
            }
            
            // إذا كان عنصر الفيديو غير مرئي، قم بإيقافه
            if (modalVideo && 
                (modalVideo.style.display === 'none' || getComputedStyle(modalVideo).display === 'none') && 
                this.videoState.isPlaying) {
                
                this.stopAllVideos();
            }
        }, this.CHECK_INTERVAL);
    },
    
    /**
     * إيقاف جميع الفيديوهات
     */
    stopAllVideos: function() {
        // تسجيل الدخول لأغراض التصحيح
        console.log('جاري إيقاف جميع الفيديوهات...');
        
        try {
            // 1. إيقاف الفيديو المحلي
            this.stopLocalVideo();
            
            // 2. إيقاف الفيديو الخارجي
            this.stopExternalVideo();
            
            // 3. إيقاف جميع العناصر <video> في الصفحة
            document.querySelectorAll('video').forEach(video => {
                this.stopVideoElement(video);
            });
            
            // 4. إيقاف جميع العناصر <iframe> التي قد تحتوي على فيديو
            document.querySelectorAll('iframe').forEach(iframe => {
                this.stopIframeVideo(iframe);
            });
            
            // 5. تنظيف عناصر الفيديو
            this.cleanupVideoElements();
            
            // تحديث حالة التشغيل
            this.videoState.isPlaying = false;
            
            // تسجيل الدخول للتأكيد
            console.log('تم إيقاف جميع الفيديوهات بنجاح');
        } catch (error) {
            console.error('حدث خطأ أثناء محاولة إيقاف الفيديوهات:', error);
        }
    },
    
    /**
     * إيقاف الفيديو المحلي
     */
    stopLocalVideo: function() {
        if (this.videoElements.local) {
            this.stopVideoElement(this.videoElements.local);
        }
    },
    
    /**
     * إيقاف الفيديو الخارجي
     */
    stopExternalVideo: function() {
        // إيقاف فيديو خارجي في iframe
        if (this.videoElements.external) {
            const iframe = this.videoElements.external.querySelector('iframe');
            if (iframe) {
                this.stopIframeVideo(iframe);
            }
        }
        
        // إيقاف أي عنصر فيديو في قسم الفيديو الخارجي
        if (this.videoElements.external) {
            const videos = this.videoElements.external.querySelectorAll('video');
            videos.forEach(video => {
                this.stopVideoElement(video);
            });
        }
    },
    
    /**
     * إيقاف عنصر فيديو
     */
    stopVideoElement: function(videoElement) {
        if (!videoElement) return;
        
        try {
            // إيقاف التشغيل
            if (typeof videoElement.pause === 'function') {
                videoElement.pause();
            }
            
            // إعادة تعيين الوقت
            if ('currentTime' in videoElement) {
                videoElement.currentTime = 0;
            }
            
            // إزالة مصدر الفيديو
            if (videoElement.hasAttribute('src')) {
                const originalSrc = videoElement.getAttribute('src');
                videoElement.removeAttribute('src');
                
                // إعادة تحميل العنصر
                if (typeof videoElement.load === 'function') {
                    videoElement.load();
                }
            }
        } catch (e) {
            console.error('خطأ في إيقاف عنصر الفيديو:', e);
        }
    },
    
    /**
     * إيقاف فيديو في iframe
     */
    stopIframeVideo: function(iframe) {
        if (!iframe) return;
        
        try {
            const iframeSrc = iframe.getAttribute('src');
            
            if (!iframeSrc) return;
            
            // يوتيوب
            if (iframeSrc.includes('youtube.com') || iframeSrc.includes('youtu.be')) {
                // إيقاف فيديو يوتيوب
                const newSrc = iframeSrc.includes('?') 
                    ? iframeSrc.split('?')[0] + '?enablejsapi=1'
                    : iframeSrc + '?enablejsapi=1';
                
                iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
                iframe.contentWindow.postMessage('{"event":"command","func":"stopVideo","args":""}', '*');
            }
            
            // فيميو
            else if (iframeSrc.includes('vimeo.com')) {
                // إيقاف فيديو فيميو
                iframe.contentWindow.postMessage('{"method":"pause"}', '*');
            }
            
            // عام - إعادة تحميل الإطار
            const originalSrc = iframe.src;
            iframe.src = '';
            
            // إضافة تأخير قصير قبل استعادة المصدر الأصلي
            setTimeout(() => {
                if (iframe.contentWindow) {
                    iframe.src = originalSrc;
                }
            }, 100);
        } catch (e) {
            console.error('خطأ في إيقاف فيديو iframe:', e);
            
            // طريقة احتياطية - إعادة تحميل الإطار
            try {
                if (iframe.src) {
                    const originalSrc = iframe.src;
                    iframe.src = '';
                    
                    // إضافة تأخير قصير
                    setTimeout(() => {
                        iframe.src = originalSrc;
                    }, 100);
                }
            } catch (backupError) {
                console.error('فشل الإصلاح الاحتياطي:', backupError);
            }
        }
    },
    
    /**
     * تنظيف عناصر الفيديو
     */
    cleanupVideoElements: function() {
        // إخفاء قسم الفيديو
        const modalVideoSection = document.querySelector('.modal-video');
        if (modalVideoSection) {
            modalVideoSection.style.display = 'none';
        }
        
        // إعادة عرض الصورة
        const modalImage = document.querySelector('.modal-image');
        if (modalImage) {
            modalImage.style.display = 'block';
        }
        
        // تنظيف العناصر
        if (this.videoElements.local) {
            this.videoElements.local.innerHTML = '';
        }
        
        if (this.videoElements.external) {
            this.videoElements.external.innerHTML = '';
        }
        
        console.log('تم تنظيف عناصر الفيديو');
    }
};

// ==== تهيئة مدير إيقاف الفيديو ====
document.addEventListener('DOMContentLoaded', function() {
    VideoStopController.initialize();
    
    // إضافة مستمع للنوافذ المنبثقة الجديدة
    const portfolioModals = document.querySelectorAll('.portfolio-item, .portfolio-link');
    portfolioModals.forEach(item => {
        item.addEventListener('click', function() {
            // إعادة تهيئة المراقبة بعد فتح نافذة منبثقة جديدة
            setTimeout(() => {
                VideoStopController.refreshVideoReferences();
                VideoStopController.setupEventListeners();
            }, 500);
        });
    });
});

// ==== الإصلاح العام للفيديو ====
// تشغيل وظيفة إيقاف الفيديو قبل إغلاق الصفحة
window.addEventListener('beforeunload', function() {
    VideoStopController.stopAllVideos();
});

// تشغيل وظيفة إيقاف الفيديو عند تغيير حجم النافذة (قد يحدث عند تبديل الشاشات)
window.addEventListener('resize', function() {
    // التحقق مما إذا كانت النافذة المنبثقة مفتوحة
    const portfolioModal = document.getElementById('portfolioModal');
    if (!portfolioModal || portfolioModal.style.display === 'none') {
        VideoStopController.stopAllVideos();
    }
});

// يعمل مع أزرار الفيديو المضافة ديناميكيًا
document.addEventListener('click', function(event) {
    if (event.target.classList.contains('video-btn') || 
        event.target.classList.contains('video-button') || 
        event.target.classList.contains('video-btn-inline') || 
        event.target.classList.contains('video-action-button') ||
        event.target.parentElement.classList.contains('video-btn') ||
        event.target.parentElement.classList.contains('video-button') ||
        event.target.parentElement.classList.contains('video-btn-inline') ||
        event.target.parentElement.classList.contains('video-action-button')) {
        
        // تحديث حالة الفيديو
        setTimeout(() => {
            VideoStopController.handleVideoButtonClick();
        }, 100);
    }
});