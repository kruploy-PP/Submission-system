const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby8ndOiJ4-cEbbvLYrn0s0p-pXlFWO7Q-TQe0hl-bx2vh_tGJSeMyBOHubovxx3nz52/exec';
const TEACHER_PASSWORD = 'admin999';

// ========================================
// Utility Functions
// ========================================

/**
 * เลื่อนหน้าไปยังส่วนที่ระบุ
 * @param {string} sectionId - ID ของส่วนที่ต้องการเลื่อนไป
 */
function scrollToSection(sectionId) {
    document.getElementById(sectionId).scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
    });
}

/**
 * แสดง/ซ่อน Loading Animation
 * @param {boolean} show - true = แสดง, false = ซ่อน
 */
function showLoading(show = true) {
    const loading = document.querySelector('.loading');
    const submitText = document.querySelector('.submit-text');
    
    if (show) {
        loading.classList.add('show');
        submitText.textContent = 'กำลังส่ง...';
    } else {
        loading.classList.remove('show');
        submitText.textContent = '🚀 ส่งงาน';
    }
}

/**
 * แสดง Modal แจ้งความสำเร็จ
 */
function showModal() {
    document.getElementById('successModal').classList.remove('hidden');
    document.getElementById('successModal').classList.add('flex');
}

/**
 * ปิด Modal
 */
function closeModal() {
    document.getElementById('successModal').classList.add('hidden');
    document.getElementById('successModal').classList.remove('flex');
}

/**
 * แปลงไฟล์เป็น Base64
 * @param {File} file - ไฟล์ที่ต้องการแปลง
 * @returns {Promise<string>} Base64 string
 */
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = error => reject(error);
    });
}

// ========================================
// Student Form Functions
// ========================================

/**
 * จัดการการส่งฟอร์มของนักเรียน
 */
async function handleStudentFormSubmission(e) {
    e.preventDefault();
    showLoading(true);

    try {
        const fileInput = document.getElementById('fileUpload');
        const formData = new FormData();
        
        // เพิ่มข้อมูลฟอร์มลงใน FormData
        formData.append('studentNumber', document.getElementById('studentNumber').value);
        formData.append('studentName', document.getElementById('studentName').value);
        formData.append('classroom', document.getElementById('classroom').value);
        formData.append('assignmentType', document.getElementById('assignmentNumber').value);
        formData.append('description', document.getElementById('description').value);
        formData.append('workLink', document.getElementById('workLink').value);
        formData.append('submissionDate', new Date().toLocaleString('th-TH'));
        
        // จัดการการอัพโหลดไฟล์
        if (fileInput.files[0]) {
            const file = fileInput.files[0];
            
            // ตรวจสอบขนาดไฟล์ (จำกัด 10MB)
            if (file.size > 10 * 1024 * 1024) {
                alert('ไฟล์มีขนาดใหญ่เกินไป (เกิน 10MB)');
                showLoading(false);
                return;
            }
            
            formData.append('file', file);
        }

        // ส่งข้อมูลไปยัง Google Apps Script
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        // ตรวจสอบผลลัพธ์
        if (result.status === 'success') {
            showModal();
            document.getElementById('studentForm').reset();
            updateDashboard(); // รีเฟรชแดชบอร์ด
        } else {
            throw new Error(result.message);
        }

    } catch (error) {
        console.error('Error:', error);
        alert('เกิดข้อผิดพลาดในการส่งงาน: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// ========================================
// Teacher Functions
// ========================================

/**
 * เข้าสู่ระบบครู
 */
function teacherLogin() {
    const password = document.getElementById('teacherPassword').value;
    
    if (password === TEACHER_PASSWORD) {
        document.getElementById('teacherLogin').style.display = 'none';
        document.getElementById('teacherPanel').classList.remove('hidden');
        loadSubmissions();
    } else {
        alert('รหัสผ่านไม่ถูกต้อง');
        document.getElementById('teacherPassword').value = '';
    }
}

/**
 * โหลดรายการงานที่ส่งสำหรับครู
 */
async function loadSubmissions() {
    try {
        const response = await fetch(APPS_SCRIPT_URL + '?action=getSubmissions');
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        const data = await response.json();
        
        const submissionsList = document.getElementById('submissionsList');
        submissionsList.innerHTML = '';
        
        if (data.status === 'success' && data.data && data.data.length > 0) {
            data.data.forEach((submission, index) => {
                const submissionCard = createSubmissionCard(submission, index);
                submissionsList.appendChild(submissionCard);
            });
        } else {
            submissionsList.innerHTML = '<p class="text-gray-500 text-center py-8">ยังไม่มีงานที่ส่ง</p>';
        }
    } catch (error) {
        console.error('Error loading submissions:', error);
        alert('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + error.message);
    }
}
/**
 * สร้างการ์ดแสดงงานที่ส่งสำหรับครู
 * @param {Array} submission - ข้อมูลงานที่ส่ง
 * @param {number} index - ลำดับของงาน
 * @returns {HTMLElement} การ์ดงานที่ส่ง
 */
function createSubmissionCard(submission, index) {
    const card = document.createElement('div');
    card.className = 'bg-gray-50 rounded-xl p-4 border-l-4 border-pink-400';
    
    // ตรวจสอบว่ามีข้อมูลสถานะหรือไม่
    const status = submission['สถานะ'] || 'รอตรวจ';
    const isChecked = status === 'ตรวจแล้ว';
    const statusClass = isChecked ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700';
    
    card.innerHTML = `
        <div class="flex justify-between items-start mb-3">
            <div>
                <h4 class="font-semibold text-lg">${submission['ชื่อ-นามสกุล'] || 'ไม่มีข้อมูล'} (เลขที่ ${submission['เลขที่'] || 'ไม่มีข้อมูล'})</h4>
                <p class="text-gray-600">${submission['ชั้น/ห้อง'] || 'ไม่มีข้อมูล'} - ${submission['ชิ้นงานที่ส่ง'] || 'ไม่มีข้อมูล'}</p>
                <p class="text-sm text-gray-500">ส่งเมื่อ: ${submission['วันเวลาที่ส่ง'] ? new Date(submission['วันเวลาที่ส่ง']).toLocaleString('th-TH') : 'ไม่มีข้อมูล'}</p>
            </div>
            <span class="px-3 py-1 rounded-full text-sm ${statusClass}">
                ${status}
            </span>
        </div>
        
        ${submission['คำอธิบาย'] ? `<p class="text-gray-700 mb-2"><strong>คำอธิบาย:</strong> ${submission['คำอธิบาย']}</p>` : ''}
        ${submission['ลิงก์ผลงาน'] ? `<p class="mb-2"><strong>ลิงก์:</strong> <a href="${submission['ลิงก์ผลงาน']}" target="_blank" class="text-blue-500 hover:underline">ดูผลงาน</a></p>` : ''}
        ${submission['ไฟล์แนบ'] ? `<p class="mb-3"><strong>ไฟล์:</strong> <a href="${submission['ไฟล์แนบ']}" target="_blank" class="text-blue-500 hover:underline">ดาวน์โหลด</a></p>` : ''}
        
        <div class="flex gap-3 mt-4">
            <input type="number" id="score_${index}" placeholder="คะแนน" min="0" max="100" 
                   value="${submission['คะแนน'] || ''}"
                   class="px-3 py-2 border border-gray-300 rounded-lg w-24">
            <input type="text" id="comment_${index}" placeholder="ความคิดเห็น" 
                   value="${submission['ความคิดเห็นครู'] || ''}"
                   class="flex-1 px-3 py-2 border border-gray-300 rounded-lg">
            <button onclick="updateGrade(${index}, '${submission['เลขที่'] || ''}', '${submission['ชื่อ-นามสกุล'] || ''}')" 
                    class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors">
                บันทึก
            </button>
        </div>
    `;
    
    return card;
}
/**
 * อัพเดทคะแนนและความคิดเห็น
 * @param {number} index - ลำดับของงาน
 * @param {string} studentNumber - เลขที่นักเรียน
 * @param {string} studentName - ชื่อนักเรียน
 */
async function updateGrade(index, studentNumber, studentName) {
    const score = document.getElementById(`score_${index}`).value;
    const comment = document.getElementById(`comment_${index}`).value;

    if (score && (isNaN(score) || score < 0 || score > 100)) {
        alert('กรุณาใส่คะแนนระหว่าง 0-100');
        return;
    }

    try {
        const formData = new FormData();
        formData.append('action', 'updateGrade');
        formData.append('studentNumber', studentNumber);
        formData.append('studentName', studentName);
        formData.append('score', score);
        formData.append('comment', comment);

        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.status === 'success') {
            alert('บันทึกคะแนนสำเร็จ');
            loadSubmissions();
            updateDashboard();
        } else {
            throw new Error(result.message);
        }

    } catch (error) {
        console.error('Error updating grade:', error);
        alert('เกิดข้อผิดพลาดในการบันทึกคะแนน: ' + error.message);
    }
}

/**
 * รีเฟรชรายการงานที่ส่ง
 */
function refreshSubmissions() {
    loadSubmissions();
    updateDashboard();
}

// ========================================
// Dashboard Functions
// ========================================

/**
 * อัพเดทสถิติในแดชบอร์ด
 */
async function loadRecentSubmissions() {
    try {
        const response = await fetch(APPS_SCRIPT_URL + '?action=getSubmissions');
        const data = await response.json();

        const recentContainer = document.getElementById('recentSubmissions');
        recentContainer.innerHTML = '';

        if (data.status === 'success' && data.data.length > 0) {
            // เอา 5 งานล่าสุด
            const recent = data.data.slice(-5).reverse();

            recent.forEach(submission => {
                const item = document.createElement('div');
                item.className = 'flex justify-between items-center p-3 bg-gray-50 rounded-lg';
                item.innerHTML = `
                    <div>
                        <span class="font-medium">${submission['ชื่อ-นามสกุล']}</span>
                        <span class="text-gray-500 ml-2">${submission['ชิ้นงานที่ส่ง']}</span>
                    </div>
                    <span class="text-sm text-gray-500">${new Date(submission['วันเวลาที่ส่ง']).toLocaleString('th-TH')}</span>
                `;
                recentContainer.appendChild(item);
            });
        } else {
            recentContainer.innerHTML = '<p class="text-gray-500 text-center py-4">ยังไม่มีงานที่ส่ง</p>';
        }

    } catch (error) {
        console.error('Error loading recent submissions:', error);
    }
}
async function updateDashboard() {
    try {
        const response = await fetch(APPS_SCRIPT_URL + '?action=getStats');
        const stats = await response.json();
        
        if (stats.status === 'success' && stats.data) {
            document.getElementById('totalSubmissions').textContent = stats.data.totalSubmissions || 0;
            document.getElementById('checkedSubmissions').textContent = stats.data.statusCounts['ตรวจแล้ว'] || 0;
            document.getElementById('pendingSubmissions').textContent = stats.data.statusCounts['รอตรวจ'] || 0;
        }

        // โหลดงานล่าสุด
        loadRecentSubmissions();

    } catch (error) {
        console.error('Error updating dashboard:', error);
    }
}


// ========================================
// Event Listeners & Initialization
// ========================================

/**
 * เริ่มต้นระบบเมื่อหน้าเว็บโหลดเสร็จ
 */
document.addEventListener('DOMContentLoaded', function() {
    // ผูก Event Listener กับฟอร์มส่งงาน
    const studentForm = document.getElementById('studentForm');
    if (studentForm) {
        studentForm.addEventListener('submit', handleStudentFormSubmission);
    }
    
    // ผูก Event Listener กับการกด Enter ในช่องรหัสผ่านครู
    const teacherPasswordInput = document.getElementById('teacherPassword');
    if (teacherPasswordInput) {
        teacherPasswordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                teacherLogin();
            }
        });
    }
    
    // โหลดสถิติเริ่มต้น
    updateDashboard();
    
    console.log('ระบบส่งงานออนไลน์เริ่มต้นเรียบร้อยแล้ว');
});

// ========================================
// Auto Refresh
// ========================================

/**
 * รีเฟรชแดชบอร์ดอัตโนมัติทุก 30 วินาที
 */
setInterval(updateDashboard, 30000);

// ========================================
// Additional Helper Functions
// ========================================

/**
 * ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต
 * @returns {boolean} สถานะการเชื่อมต่อ
 */
function checkInternetConnection() {
    return navigator.onLine;
}

/**
 * แสดงข้อความแจ้งเตือนแบบกำหนดเอง
 * @param {string} message - ข้อความที่ต้องการแสดง
 * @param {string} type - ประเภทข้อความ (success, error, warning, info)
 */
function showNotification(message, type = 'info') {
    // สร้าง notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${getNotificationClass(type)}`;
    notification.textContent = message;
    
    // เพิ่มเข้าไปในหน้า
    document.body.appendChild(notification);
    
    // ลบออกหลัง 3 วินาที
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

/**
 * ได้รับ CSS class สำหรับ notification
 * @param {string} type - ประเภทข้อความ
 * @returns {string} CSS class
 */
function getNotificationClass(type) {
    switch (type) {
        case 'success':
            return 'bg-green-500 text-white';
        case 'error':
            return 'bg-red-500 text-white';
        case 'warning':
            return 'bg-yellow-500 text-white';
        default:
            return 'bg-blue-500 text-white';
    }
}

/**
 * ล้างข้อมูลในฟอร์ม
 * @param {string} formId - ID ของฟอร์ม
 */
function clearForm(formId) {
    const form = document.getElementById(formId);
    if (form) {
        form.reset();
    }
}

/**
 * ตรวจสอบความถูกต้องของอีเมล
 * @param {string} email - อีเมลที่ต้องการตรวจสอบ
 * @returns {boolean} ผลการตรวจสอบ
 */
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * ตรวจสอบความถูกต้องของ URL
 * @param {string} url - URL ที่ต้องการตรวจสอบ
 * @returns {boolean} ผลการตรวจสอบ
 */
function validateURL(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

// ========================================
// Export Functions (สำหรับใช้ในไฟล์อื่น)
// ========================================

// หากต้องการใช้ในรูปแบบ Module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        scrollToSection,
        showLoading,
        showModal,
        closeModal,
        teacherLogin,
        updateGrade,
        refreshSubmissions,
        updateDashboard,
        showNotification,
        validateEmail,
        validateURL
    };
}