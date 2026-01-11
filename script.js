const API_BASE_URL = 'http://exam-api-courses.std-900.ist.mospolytech.ru';
const API_KEY = 'e3596f3d-6853-4b81-93ea-105ee937f45e';

const ITEMS_PER_PAGE = 6;

let currentCourses = [];
let currentTutors = [];
let currentOrders = [];
let currentCoursesPage = 1;
let currentOrdersPage = 1;
let selectedTutorId = null;

const OPTIONS_CONFIG = {
    early_registration: { name: 'Ранняя регистрация (скидка 10%)', type: 'discount', value: -0.10 },
    group_enrollment: { name: 'Групповая запись (скидка 15%)', type: 'discount', value: -0.15 },
    intensive_course: { name: 'Интенсивный курс (+20%)', type: 'surcharge', value: 0.20 },
    supplementary: { name: 'Доп. материалы (+2000 ₽/чел)', type: 'surcharge', fixed: 2000 },
    personalized: { name: 'Индивидуальные занятия (+1500 ₽/неделю)', type: 'surcharge', perWeek: 1500 },
    excursions: { name: 'Культурные экскурсии (+25%)', type: 'surcharge', value: 0.25 },
    assessment: { name: 'Оценка уровня (+300 ₽)', type: 'surcharge', fixed: 300 },
    interactive: { name: 'Интерактивная платформа (+50%)', type: 'surcharge', value: 0.50 }
};

function showNotification(message, type = 'info', autoClose = true) {
    const notificationArea = document.getElementById('notification-area');
    if (!notificationArea) return;
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
        <span>${message}</span>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    notificationArea.appendChild(alert);
    
    if (autoClose) {
        setTimeout(() => {
            if (alert.parentNode) {
                alert.classList.remove('show');
                setTimeout(() => alert.remove(), 150);
            }
        }, 5000);
    }
}

function makeApiRequest(url, method = 'GET', data = null) {
    const fullUrl = `${API_BASE_URL}${url}?api_key=${API_KEY}`;
    
    const options = {
        method: method,
        headers: {
            'Accept': 'application/json'
        }
    };
    
    if (data && (method === 'POST' || method === 'PUT')) {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(data);
    }
    
    console.log(`API Request: ${method} ${fullUrl}`, data);
    
    return fetch(fullUrl, options)
        .then(response => {
            console.log(`API Response status: ${response.status} ${response.statusText}`);
            
            if (!response.ok) {
                return response.text().then(text => {
                    let errorMessage = `HTTP ${response.status}`;
                    try {
                        const errorData = JSON.parse(text);
                        errorMessage = errorData.error || errorMessage;
                    } catch (e) {
                        errorMessage = text || errorMessage;
                    }
                    throw new Error(errorMessage);
                });
            }
            
            return response.json().catch(() => {
                throw new Error('Invalid JSON response');
            });
        })
        .then(data => {
            console.log('API Response data:', data);
            return data;
        })
        .catch(error => {
            console.error('API Error:', error);
            showNotification(error.message || 'Ошибка подключения к API', 'danger');
            throw error;
        });
}

function loadCourses() {
    console.log('Loading courses...');
    makeApiRequest('/api/courses')
        .then(data => {
            if (Array.isArray(data)) {
                currentCourses = data;
            } else if (data && typeof data === 'object' && !Array.isArray(data)) {
                currentCourses = [data];
            } else {
                currentCourses = [];
            }
            console.log(`Loaded ${currentCourses.length} courses`);
            displayCourses(currentCourses);
        })
        .catch(error => {
            console.error('Failed to load courses:', error);
            currentCourses = [];
            displayCourses([]);
        });
}

function loadTutors() {
    console.log('Loading tutors...');
    makeApiRequest('/api/tutors')
        .then(data => {
            if (Array.isArray(data)) {
                currentTutors = data;
            } else if (data && typeof data === 'object' && !Array.isArray(data)) {
                currentTutors = [data];
            } else {
                currentTutors = [];
            }
            console.log(`Loaded ${currentTutors.length} tutors`);
            displayTutors(currentTutors);
            populateLanguageFilter(currentTutors);
        })
        .catch(error => {
            console.error('Failed to load tutors:', error);
            currentTutors = [];
            displayTutors([]);
        });
}

function loadOrders() {
    console.log('Loading orders...');
    makeApiRequest('/api/orders')
        .then(data => {
            if (Array.isArray(data)) {
                currentOrders = data;
            } else if (data && typeof data === 'object' && !Array.isArray(data)) {
                currentOrders = [data];
            } else {
                currentOrders = [];
            }
            console.log(`Loaded ${currentOrders.length} orders`);
            displayOrders(currentOrders);
        })
        .catch(error => {
            console.error('Failed to load orders:', error);
            currentOrders = [];
            displayOrders([]);
        });
}

function populateLanguageFilter(tutors) {
    const languageSelect = document.getElementById('languageSelect');
    if (!languageSelect) return;
    
    const languages = new Set();
    tutors.forEach(tutor => {
        if (tutor.languages_offered && Array.isArray(tutor.languages_offered)) {
            tutor.languages_offered.forEach(lang => {
                if (lang && typeof lang === 'string') {
                    languages.add(lang);
                }
            });
        }
    });
    
    languageSelect.innerHTML = '<option value="">Все языки</option>';
    Array.from(languages).sort().forEach(lang => {
        const option = document.createElement('option');
        option.value = lang;
        option.textContent = lang;
        languageSelect.appendChild(option);
    });
}

function displayCourses(courses) {
    const coursesList = document.getElementById('coursesList');
    const pagination = document.getElementById('coursesPagination');
    
    if (!coursesList) return;
    
    const filteredCourses = filterCourses(courses);
    const totalPages = Math.ceil(filteredCourses.length / ITEMS_PER_PAGE);
    
    const startIndex = (currentCoursesPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const pageCourses = filteredCourses.slice(startIndex, endIndex);
    
    coursesList.innerHTML = '';
    
    if (pageCourses.length === 0) {
        coursesList.innerHTML = '<div class="col-12 text-center"><p class="text-muted">Курсы не найдены</p></div>';
        if (pagination) pagination.innerHTML = '';
        return;
    }
    
    pageCourses.forEach(course => {
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4 mb-4';
        
        const description = course.description || '';
        const shortDescription = description.length > 80 ? description.substring(0, 80) + '...' : description;
        
        col.innerHTML = `
            <div class="card h-100">
                <div class="card-body">
                    <span class="badge bg-secondary float-end">${course.level || ''}</span>
                    <h5 class="card-title" title="${course.name}">${course.name.length > 30 ? course.name.substring(0, 30) + '...' : course.name}</h5>
                    <p class="card-text"><i class="bi bi-person me-1"></i>${course.teacher || 'Не указан'}</p>
                    <p class="card-text"><i class="bi bi-clock me-1"></i>${course.total_length || 0} недель</p>
                    <p class="card-text"><i class="bi bi-cash me-1"></i>${course.course_fee_per_hour || 0} ₽/час</p>
                    <p class="card-text small text-muted" title="${description}">${shortDescription}</p>
                    <div class="d-flex justify-content-between align-items-center mt-3">
                        <strong class="text-dark">${calculateCoursePrice(course)} ₽</strong>
                        <button class="btn btn-sm btn-dark" onclick="openOrderModal('course', ${course.id})">
                            Подать заявку
                        </button>
                    </div>
                </div>
            </div>
        `;
        coursesList.appendChild(col);
    });
    
    if (pagination) {
        updatePagination(pagination, totalPages, currentCoursesPage, 'courses');
    }
}

function calculateCoursePrice(course) {
    if (!course.course_fee_per_hour || !course.total_length || !course.week_length) return 0;
    const totalHours = course.total_length * course.week_length;
    return course.course_fee_per_hour * totalHours;
}

function filterCourses(courses) {
    const searchInput = document.getElementById('courseSearchInput');
    const levelSelect = document.getElementById('levelSelect');
    
    if (!searchInput && !levelSelect) return courses;
    
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const level = levelSelect ? levelSelect.value : '';
    
    return courses.filter(course => {
        const matchesSearch = !searchTerm || 
            course.name.toLowerCase().includes(searchTerm) ||
            (course.description && course.description.toLowerCase().includes(searchTerm));
        
        const matchesLevel = !level || course.level === level;
        
        return matchesSearch && matchesLevel;
    });
}

function displayTutors(tutors) {
    const tableBody = document.getElementById('tutorsTableBody');
    if (!tableBody) return;
    
    const filteredTutors = filterTutors(tutors);
    
    tableBody.innerHTML = '';
    
    if (filteredTutors.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Репетиторы не найдены</td></tr>';
        return;
    }
    
    filteredTutors.forEach(tutor => {
        const row = document.createElement('tr');
        row.id = `tutor-${tutor.id}`;
        row.className = selectedTutorId === tutor.id ? 'selected-tutor' : '';
        
        const languagesOffered = Array.isArray(tutor.languages_offered) ? 
            tutor.languages_offered.join(', ') : 
            (tutor.languages_offered || '');
        
        row.innerHTML = `
            <td>
                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(tutor.name)}&background=6c757d&color=fff&size=40" 
                     alt="${tutor.name}" class="rounded-circle" width="40" height="40">
            </td>
            <td>${tutor.name || 'Не указано'}</td>
            <td>${tutor.language_level || ''}</td>
            <td>${languagesOffered}</td>
            <td>${tutor.work_experience || 0}</td>
            <td>${tutor.price_per_hour || 0} ₽</td>
            <td>
                <button class="btn btn-sm btn-dark" onclick="openOrderModal('tutor', ${tutor.id})">
                    Записаться
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function filterTutors(tutors) {
    const languageSelect = document.getElementById('languageSelect');
    const levelSelect = document.getElementById('tutorLevelSelect');
    
    if (!languageSelect && !levelSelect) return tutors;
    
    const language = languageSelect ? languageSelect.value : '';
    const level = levelSelect ? levelSelect.value : '';
    
    return tutors.filter(tutor => {
        const matchesLanguage = !language || 
            (Array.isArray(tutor.languages_offered) && tutor.languages_offered.includes(language)) ||
            (typeof tutor.languages_offered === 'string' && tutor.languages_offered.includes(language));
        
        const matchesLevel = !level || tutor.language_level === level;
        
        return matchesLanguage && matchesLevel;
    });
}

function openOrderModal(type, id) {
    const modal = new bootstrap.Modal(document.getElementById('orderModal'));
    const title = document.getElementById('orderModalTitle');
    
    document.getElementById('orderId').value = '';
    document.getElementById('orderType').value = type;
    document.getElementById('submitOrderBtn').textContent = 'Отправить';
    
    if (type === 'course') {
        document.getElementById('selectedCourseId').value = id;
        document.getElementById('selectedTutorId').value = '';
        title.textContent = 'Оформление заявки на курс';
        document.getElementById('courseFields').style.display = 'block';
        document.getElementById('tutorFields').style.display = 'none';
        
        const course = currentCourses.find(c => c.id === id);
        if (course) {
            populateCourseForm(course);
            calculatePrice();
        } else {
            makeApiRequest(`/api/course/${id}`)
                .then(course => {
                    populateCourseForm(course);
                    calculatePrice();
                })
                .catch(() => {
                    showNotification('Ошибка загрузки данных курса', 'danger');
                });
        }
    } else {
        document.getElementById('selectedCourseId').value = '';
        document.getElementById('selectedTutorId').value = id;
        title.textContent = 'Запись к репетитору';
        document.getElementById('courseFields').style.display = 'none';
        document.getElementById('tutorFields').style.display = 'block';
        
        const tutor = currentTutors.find(t => t.id === id);
        if (tutor) {
            populateTutorForm(tutor);
            calculatePrice();
        }
    }
    
    populateOptions();
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('tutorStartDate').min = tomorrow.toISOString().split('T')[0];
    document.getElementById('tutorStartDate').value = tomorrow.toISOString().split('T')[0];
    
    modal.show();
}

function populateCourseForm(course) {
    document.getElementById('courseName').value = course.name || '';
    document.getElementById('courseTeacher').value = course.teacher || '';
    document.getElementById('durationWeeks').value = course.total_length || 0;
    document.getElementById('hoursPerWeek').value = course.week_length || 0;
    document.getElementById('lessonDuration').value = '2 часа';
    document.getElementById('hourlyPrice').value = course.course_fee_per_hour || 0;
    
    const startDateSelect = document.getElementById('startDate');
    const startTimeSelect = document.getElementById('startTime');
    
    startDateSelect.innerHTML = '<option value="">Выберите дату</option>';
    startTimeSelect.innerHTML = '<option value="">Выберите время</option>';
    startTimeSelect.disabled = true;
    
    if (course.start_dates && Array.isArray(course.start_dates) && course.start_dates.length > 0) {
        const dateMap = new Map();
        
        course.start_dates.forEach(dateStr => {
            try {
                const date = new Date(dateStr);
                if (!isNaN(date.getTime())) {
                    const dateOnly = date.toISOString().split('T')[0];
                    const timeOnly = date.toTimeString().split(' ')[0].substring(0, 5);
                    
                    if (!dateMap.has(dateOnly)) {
                        dateMap.set(dateOnly, []);
                    }
                    dateMap.get(dateOnly).push(timeOnly);
                }
            } catch (e) {
                console.error('Invalid date format:', dateStr);
            }
        });
        
        Array.from(dateMap.keys()).sort().forEach(dateStr => {
            const date = new Date(dateStr);
            const option = document.createElement('option');
            option.value = dateStr;
            option.textContent = date.toLocaleDateString('ru-RU');
            startDateSelect.appendChild(option);
        });
        
        startDateSelect.addEventListener('change', function() {
            if (this.value && dateMap.has(this.value)) {
                const times = dateMap.get(this.value);
                
                startTimeSelect.innerHTML = '<option value="">Выберите время</option>';
                startTimeSelect.disabled = false;
                
                times.sort().forEach(time => {
                    const option = document.createElement('option');
                    option.value = time;
                    option.textContent = time;
                    startTimeSelect.appendChild(option);
                });
                
                calculatePrice();
            } else {
                startTimeSelect.innerHTML = '<option value="">Выберите время</option>';
                startTimeSelect.disabled = true;
            }
        });
    }
    
    startTimeSelect.addEventListener('change', calculatePrice);
    document.getElementById('persons').addEventListener('input', calculatePrice);
    
    updateEndDate();
}

function populateTutorForm(tutor) {
    document.getElementById('tutorName').value = tutor.name || '';
    document.getElementById('tutorHourlyPrice').value = tutor.price_per_hour || 0;
    
    document.getElementById('tutorDuration').addEventListener('input', calculatePrice);
    document.getElementById('tutorStartDate').addEventListener('change', calculatePrice);
    document.getElementById('tutorStartTime').addEventListener('change', calculatePrice);
    document.getElementById('tutorPersons').addEventListener('input', calculatePrice);
}

function updateEndDate() {
    const weeks = parseInt(document.getElementById('durationWeeks').value) || 0;
    const startDate = document.getElementById('startDate').value;
    
    if (startDate && weeks > 0) {
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + (weeks * 7));
        document.getElementById('endDate').value = endDate.toLocaleDateString('ru-RU');
    } else {
        document.getElementById('endDate').value = '';
    }
}

function populateOptions() {
    const container = document.getElementById('optionsContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    Object.entries(OPTIONS_CONFIG).forEach(([key, config]) => {
        const col = document.createElement('div');
        col.className = 'col-md-6 mb-2';
        col.innerHTML = `
            <div class="form-check">
                <input class="form-check-input option-checkbox" type="checkbox" id="option-${key}" 
                       data-key="${key}" onchange="calculatePrice()">
                <label class="form-check-label" for="option-${key}">
                    ${config.name}
                </label>
            </div>
        `;
        container.appendChild(col);
    });
}

function calculatePrice() {
    const type = document.getElementById('orderType').value;
    let basePrice = 0;
    let totalHours = 0;
    let weeks = 0;
    let persons = 1;
    
    if (type === 'course') {
        const hourlyPrice = parseFloat(document.getElementById('hourlyPrice').value) || 0;
        weeks = parseInt(document.getElementById('durationWeeks').value) || 0;
        const hoursPerWeek = parseInt(document.getElementById('hoursPerWeek').value) || 0;
        persons = parseInt(document.getElementById('persons').value) || 1;
        
        totalHours = weeks * hoursPerWeek;
        basePrice = hourlyPrice * totalHours;
        
        const startTime = document.getElementById('startTime').value;
        const startDate = document.getElementById('startDate').value;
        
        if (startTime && startDate) {
            const [hours] = startTime.split(':').map(Number);
            const date = new Date(startDate);
            const dayOfWeek = date.getDay();
            
            let multiplier = 1;
            let morningSurcharge = 0;
            let eveningSurcharge = 0;
            
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                multiplier = 1.5;
            }
            
            if (hours >= 9 && hours < 12) {
                morningSurcharge = 400;
            } else if (hours >= 18 && hours < 20) {
                eveningSurcharge = 1000;
            }
            
            basePrice = (hourlyPrice * totalHours * multiplier) + 
                       (morningSurcharge * weeks) + 
                       (eveningSurcharge * weeks);
        }
    } else {
        const hourlyPrice = parseFloat(document.getElementById('tutorHourlyPrice').value) || 0;
        const duration = parseInt(document.getElementById('tutorDuration').value) || 1;
        persons = parseInt(document.getElementById('tutorPersons').value) || 1;
        
        totalHours = duration;
        basePrice = hourlyPrice * totalHours;
        
        const startTime = document.getElementById('tutorStartTime').value;
        const startDate = document.getElementById('tutorStartDate').value;
        
        if (startTime && startDate) {
            const [hours] = startTime.split(':').map(Number);
            const date = new Date(startDate);
            const dayOfWeek = date.getDay();
            
            let multiplier = 1;
            let morningSurcharge = 0;
            let eveningSurcharge = 0;
            
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                multiplier = 1.5;
            }
            
            if (hours >= 9 && hours < 12) {
                morningSurcharge = 400;
            } else if (hours >= 18 && hours < 20) {
                eveningSurcharge = 1000;
            }
            
            basePrice = (hourlyPrice * totalHours * multiplier) + 
                       (morningSurcharge * duration) + 
                       (eveningSurcharge * duration);
        }
    }
    
    const basePriceElement = document.getElementById('basePrice');
    if (basePriceElement) {
        basePriceElement.textContent = `${Math.round(basePrice)} ₽`;
    }
    
    const discountsContainer = document.getElementById('discountsContainer');
    const surchargesContainer = document.getElementById('surchargesContainer');
    if (!discountsContainer || !surchargesContainer) return 0;
    
    discountsContainer.innerHTML = '';
    surchargesContainer.innerHTML = '';
    
    let totalDiscount = 0;
    let totalSurcharge = 0;
    
    const checkboxes = document.querySelectorAll('.option-checkbox:checked');
    const options = {};
    checkboxes.forEach(cb => {
        options[cb.dataset.key] = true;
    });
    
    Object.entries(OPTIONS_CONFIG).forEach(([key, config]) => {
        if (options[key]) {
            let amount = 0;
            let text = '';
            
            if (config.type === 'discount') {
                amount = basePrice * config.value;
                text = `${config.name}: ${Math.round(amount)} ₽`;
                totalDiscount += amount;
                
                const div = document.createElement('div');
                div.className = 'row mb-1 text-success';
                div.innerHTML = `
                    <div class="col-6">${text}</div>
                    <div class="col-6 text-end">${Math.round(amount)} ₽</div>
                `;
                discountsContainer.appendChild(div);
            } else {
                if (config.fixed) {
                    amount = config.fixed * persons;
                    text = `${config.name}: ${amount} ₽`;
                } else if (config.perWeek) {
                    amount = config.perWeek * (weeks || 1) * persons;
                    text = `${config.name}: ${amount} ₽`;
                } else if (config.value) {
                    amount = basePrice * config.value;
                    text = `${config.name}: ${Math.round(amount)} ₽`;
                }
                
                totalSurcharge += amount;
                
                const div = document.createElement('div');
                div.className = 'row mb-1 text-danger';
                div.innerHTML = `
                    <div class="col-6">${text}</div>
                    <div class="col-6 text-end">+${Math.round(amount)} ₽</div>
                `;
                surchargesContainer.appendChild(div);
            }
        }
    });
    
    let total = basePrice - totalDiscount + totalSurcharge;
    
    if (type === 'course') {
        const startDate = document.getElementById('startDate').value;
        if (startDate) {
            const daysUntilStart = Math.floor((new Date(startDate) - new Date()) / (1000 * 60 * 60 * 24));
            if (daysUntilStart >= 30 && !options.early_registration) {
                const discount = total * 0.1;
                totalDiscount += discount;
                
                const div = document.createElement('div');
                div.className = 'row mb-1 text-success';
                div.innerHTML = `
                    <div class="col-6">Ранняя регистрация (авто): ${Math.round(discount)} ₽</div>
                    <div class="col-6 text-end">${Math.round(discount)} ₽</div>
                `;
                discountsContainer.appendChild(div);
            }
        }
        
        if (persons >= 5 && !options.group_enrollment) {
            const discount = total * 0.15;
            totalDiscount += discount;
            
            const div = document.createElement('div');
            div.className = 'row mb-1 text-success';
            div.innerHTML = `
                <div class="col-6">Групповая запись (авто): ${Math.round(discount)} ₽</div>
                <div class="col-6 text-end">${Math.round(discount)} ₽</div>
            `;
            discountsContainer.appendChild(div);
        }
        
        const hoursPerWeek = parseInt(document.getElementById('hoursPerWeek').value) || 0;
        if (hoursPerWeek >= 5 && !options.intensive_course) {
            const surcharge = total * 0.2;
            totalSurcharge += surcharge;
            
            const div = document.createElement('div');
            div.className = 'row mb-1 text-danger';
            div.innerHTML = `
                <div class="col-6">Интенсивный курс (авто): ${Math.round(surcharge)} ₽</div>
                <div class="col-6 text-end">+${Math.round(surcharge)} ₽</div>
            `;
            surchargesContainer.appendChild(div);
        }
    }
    
    total = basePrice - totalDiscount + totalSurcharge;
    total *= persons;
    
    const totalPriceElement = document.getElementById('totalPrice');
    if (totalPriceElement) {
        totalPriceElement.textContent = `${Math.round(total)} ₽`;
    }
    
    return Math.round(total);
}

function submitOrder() {
    const orderId = document.getElementById('orderId').value;
    const type = document.getElementById('orderType').value;
    const totalPrice = calculatePrice();
    
    const checkboxes = document.querySelectorAll('.option-checkbox');
    const options = {};
    checkboxes.forEach(cb => {
        options[cb.dataset.key] = cb.checked;
    });
    
    let orderData = {
        ...options,
        price: totalPrice
    };
    
    if (type === 'course') {
        const courseId = parseInt(document.getElementById('selectedCourseId').value);
        const startDate = document.getElementById('startDate').value;
        const startTime = document.getElementById('startTime').value;
        const persons = parseInt(document.getElementById('persons').value) || 1;
        const weeks = parseInt(document.getElementById('durationWeeks').value) || 0;
        const hoursPerWeek = parseInt(document.getElementById('hoursPerWeek').value) || 0;
        
        if (!courseId || !startDate || !startTime || persons < 1) {
            showNotification('Заполните все обязательные поля', 'danger');
            return;
        }
        
        orderData = {
            ...orderData,
            tutor_id: 0,
            course_id: courseId,
            date_start: startDate,
            time_start: startTime,
            duration: weeks * hoursPerWeek,
            persons: persons
        };
    } else {
        const tutorId = parseInt(document.getElementById('selectedTutorId').value);
        const startDate = document.getElementById('tutorStartDate').value;
        const startTime = document.getElementById('tutorStartTime').value;
        const duration = parseInt(document.getElementById('tutorDuration').value) || 1;
        const persons = parseInt(document.getElementById('tutorPersons').value) || 1;
        
        if (!tutorId || !startDate || !startTime || duration < 1 || persons < 1) {
            showNotification('Заполните все обязательные поля', 'danger');
            return;
        }
        
        orderData = {
            ...orderData,
            tutor_id: tutorId,
            course_id: 0,
            date_start: startDate,
            time_start: startTime,
            duration: duration,
            persons: persons
        };
    }
    
    const url = orderId ? `/api/orders/${orderId}` : '/api/orders';
    const method = orderId ? 'PUT' : 'POST';
    
    console.log(`Submitting order: ${method} ${url}`, orderData);
    
    makeApiRequest(url, method, orderData)
        .then(response => {
            showNotification(orderId ? 'Заявка обновлена' : 'Заявка создана', 'success');
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('orderModal'));
            if (modal) modal.hide();
            
            document.getElementById('orderForm').reset();
            selectedTutorId = null;
            
            loadOrders();
        })
        .catch(error => {
            showNotification('Ошибка сохранения заявки: ' + error.message, 'danger');
        });
}

function displayOrders(orders) {
    const tableBody = document.getElementById('ordersTableBody');
    const pagination = document.getElementById('ordersPagination');
    const noOrdersMessage = document.getElementById('noOrdersMessage');
    
    if (!tableBody) return;
    
    const totalPages = Math.ceil(orders.length / ITEMS_PER_PAGE);
    const startIndex = (currentOrdersPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const pageOrders = orders.slice(startIndex, endIndex);
    
    tableBody.innerHTML = '';
    
    if (pageOrders.length === 0) {
        if (noOrdersMessage) noOrdersMessage.style.display = 'block';
        if (pagination) pagination.innerHTML = '';
        return;
    }
    
    if (noOrdersMessage) noOrdersMessage.style.display = 'none';
    
    pageOrders.forEach(order => {
        const isCourse = order.course_id && order.course_id > 0;
        let name = '';
        let type = '';
        
        if (isCourse) {
            const course = currentCourses.find(c => c.id === order.course_id);
            name = course ? course.name : `Курс #${order.course_id}`;
            type = 'Курс';
        } else {
            const tutor = currentTutors.find(t => t.id === order.tutor_id);
            name = tutor ? tutor.name : `Репетитор #${order.tutor_id}`;
            type = 'Репетитор';
        }
        
        const date = order.date_start ? new Date(order.date_start) : new Date();
        const time = order.time_start || '';
        const dateTime = order.date_start ? 
            `${date.toLocaleDateString('ru-RU')} ${time}` : 
            'Не указано';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>#${order.id}</td>
            <td>${type}</td>
            <td title="${name}">${name.length > 20 ? name.substring(0, 20) + '...' : name}</td>
            <td>${dateTime}</td>
            <td>${order.price || 0} ₽</td>
            <td><span class="status-badge status-active">Активна</span></td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-dark" onclick="viewOrder(${order.id})" title="Просмотр">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-outline-dark" onclick="editOrder(${order.id})" title="Редактировать">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-outline-dark" onclick="deleteOrder(${order.id})" title="Удалить">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
    
    if (pagination) {
        updatePagination(pagination, totalPages, currentOrdersPage, 'orders');
    }
}

function viewOrder(orderId) {
    makeApiRequest(`/api/orders/${orderId}`)
        .then(order => {
            let message = `Заявка #${order.id}\n`;
            message += `Тип: ${order.course_id > 0 ? 'Курс' : 'Репетитор'}\n`;
            message += `Дата: ${order.date_start} ${order.time_start}\n`;
            message += `Количество человек: ${order.persons}\n`;
            message += `Стоимость: ${order.price} ₽\n\n`;
            message += 'Опции:\n';
            
            let hasOptions = false;
            Object.keys(OPTIONS_CONFIG).forEach(key => {
                if (order[key]) {
                    message += `• ${OPTIONS_CONFIG[key].name}\n`;
                    hasOptions = true;
                }
            });
            
            if (!hasOptions) {
                message += 'Нет дополнительных опций\n';
            }
            
            alert(message);
        })
        .catch(error => {
            showNotification('Ошибка загрузки заявки', 'danger');
        });
}

function editOrder(orderId) {
    console.log('Starting to edit order:', orderId);
    
    makeApiRequest(`/api/orders/${orderId}`)
        .then(order => {
            console.log('Order data received:', order);
            
            const modal = new bootstrap.Modal(document.getElementById('orderModal'));
            const title = document.getElementById('orderModalTitle');
            
            document.getElementById('orderId').value = order.id;
            document.getElementById('submitOrderBtn').textContent = 'Сохранить';
            
            if (order.course_id > 0) {
                console.log('Editing course order, course_id:', order.course_id);
                document.getElementById('orderType').value = 'course';
                document.getElementById('selectedCourseId').value = order.course_id;
                document.getElementById('selectedTutorId').value = '';
                title.textContent = 'Редактирование заявки на курс';
                document.getElementById('courseFields').style.display = 'block';
                document.getElementById('tutorFields').style.display = 'none';
                
                const course = currentCourses.find(c => c.id === order.course_id);
                if (course) {
                    console.log('Course found in cache:', course);
                    populateCourseForm(course);
                    
                    document.getElementById('startDate').value = order.date_start;
                    document.getElementById('persons').value = order.persons;
                    
                    setTimeout(() => {
                        const startTimeSelect = document.getElementById('startTime');
                        if (startTimeSelect) {
                            startTimeSelect.value = order.time_start;
                            console.log('Set start time to:', order.time_start);
                        }
                        
                        Object.keys(OPTIONS_CONFIG).forEach(key => {
                            const checkbox = document.getElementById(`option-${key}`);
                            if (checkbox) {
                                checkbox.checked = order[key] === true;
                                console.log(`Set option ${key} to:`, order[key]);
                            }
                        });
                        
                        calculatePrice();
                        modal.show();
                    }, 300);
                } else {
                    console.log('Course not in cache, loading from API...');
                    makeApiRequest(`/api/course/${order.course_id}`)
                        .then(course => {
                            console.log('Course loaded from API:', course);
                            populateCourseForm(course);
                            
                            document.getElementById('startDate').value = order.date_start;
                            document.getElementById('persons').value = order.persons;
                            
                            setTimeout(() => {
                                const startTimeSelect = document.getElementById('startTime');
                                if (startTimeSelect) {
                                    startTimeSelect.value = order.time_start;
                                }
                                
                                Object.keys(OPTIONS_CONFIG).forEach(key => {
                                    const checkbox = document.getElementById(`option-${key}`);
                                    if (checkbox) {
                                        checkbox.checked = order[key] === true;
                                    }
                                });
                                
                                calculatePrice();
                                modal.show();
                            }, 300);
                        })
                        .catch(error => {
                            console.error('Error loading course:', error);
                            showNotification('Ошибка загрузки данных курса', 'danger');
                        });
                }
            } else {
                console.log('Editing tutor order, tutor_id:', order.tutor_id);
                document.getElementById('orderType').value = 'tutor';
                document.getElementById('selectedCourseId').value = '';
                document.getElementById('selectedTutorId').value = order.tutor_id;
                title.textContent = 'Редактирование записи к репетитору';
                document.getElementById('courseFields').style.display = 'none';
                document.getElementById('tutorFields').style.display = 'block';
                
                const tutor = currentTutors.find(t => t.id === order.tutor_id);
                if (tutor) {
                    console.log('Tutor found in cache:', tutor);
                    populateTutorForm(tutor);
                    
                    document.getElementById('tutorStartDate').value = order.date_start;
                    document.getElementById('tutorStartTime').value = order.time_start;
                    document.getElementById('tutorDuration').value = order.duration;
                    document.getElementById('tutorPersons').value = order.persons;
                    
                    Object.keys(OPTIONS_CONFIG).forEach(key => {
                        const checkbox = document.getElementById(`option-${key}`);
                        if (checkbox) {
                            checkbox.checked = order[key] === true;
                        }
                    });
                    
                    calculatePrice();
                    modal.show();
                } else {
                    console.log('Tutor not in cache');
                    showNotification('Данные репетитора не найдены', 'warning');
                }
            }
        })
        .catch(error => {
            console.error('Error loading order:', error);
            showNotification('Ошибка загрузки заявки: ' + error.message, 'danger');
        });
}

function deleteOrder(orderId) {
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    
    confirmBtn.onclick = () => {
        makeApiRequest(`/api/orders/${orderId}`, 'DELETE')
            .then(() => {
                showNotification('Заявка удалена', 'success');
                deleteModal.hide();
                loadOrders();
            })
            .catch(error => {
                showNotification('Ошибка удаления заявки', 'danger');
                deleteModal.hide();
            });
    };
    
    deleteModal.show();
}

function updatePagination(pagination, totalPages, currentPage, type) {
    if (!pagination) return;
    
    pagination.innerHTML = '';
    
    if (totalPages <= 1) return;
    
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#" onclick="changePage('${type}', ${currentPage - 1}); return false;">&laquo;</a>`;
    pagination.appendChild(prevLi);
    
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    
    if (endPage - startPage + 1 < maxPagesToShow) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${i === currentPage ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#" onclick="changePage('${type}', ${i}); return false;">${i}</a>`;
        pagination.appendChild(li);
    }
    
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#" onclick="changePage('${type}', ${currentPage + 1}); return false;">&raquo;</a>`;
    pagination.appendChild(nextLi);
}

function changePage(type, page) {
    if (type === 'courses') {
        currentCoursesPage = page;
        displayCourses(currentCourses);
    } else {
        currentOrdersPage = page;
        displayOrders(currentOrders);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('Page loaded, initializing...');
    
    if (API_KEY && API_KEY !== 'ваш_api_ключ') {
        console.log('API Key found, loading data...');
        
        if (window.location.pathname.includes('account.html')) {
            loadOrders();
            loadCourses();
            loadTutors();
        } else {
            loadCourses();
            loadTutors();
            loadOrders();
        }
        
        const courseSearchForm = document.getElementById('courseSearchForm');
        if (courseSearchForm) {
            courseSearchForm.addEventListener('submit', function(e) {
                e.preventDefault();
                displayCourses(currentCourses);
            });
        }
        
        const tutorFilterForm = document.getElementById('tutorFilterForm');
        if (tutorFilterForm) {
            tutorFilterForm.addEventListener('submit', function(e) {
                e.preventDefault();
                displayTutors(currentTutors);
            });
        }
        
        const courseSearchInput = document.getElementById('courseSearchInput');
        if (courseSearchInput) {
            courseSearchInput.addEventListener('input', function() {
                displayCourses(currentCourses);
            });
        }
        
        const levelSelect = document.getElementById('levelSelect');
        if (levelSelect) {
            levelSelect.addEventListener('change', function() {
                displayCourses(currentCourses);
            });
        }
        
        const languageSelect = document.getElementById('languageSelect');
        if (languageSelect) {
            languageSelect.addEventListener('change', function() {
                displayTutors(currentTutors);
            });
        }
        
        const tutorLevelSelect = document.getElementById('tutorLevelSelect');
        if (tutorLevelSelect) {
            tutorLevelSelect.addEventListener('change', function() {
                displayTutors(currentTutors);
            });
        }
    } else {
        console.error('API Key is not set!');
        showNotification('API ключ не установлен. Пожалуйста, установите API_KEY в скрипте.', 'danger', false);
    }
    
    const submitOrderBtn = document.getElementById('submitOrderBtn');
    if (submitOrderBtn) {
        submitOrderBtn.addEventListener('click', submitOrder);
    }
    
    const startDateInput = document.getElementById('startDate');
    if (startDateInput) {
        startDateInput.addEventListener('change', updateEndDate);
    }
    
    const durationWeeksInput = document.getElementById('durationWeeks');
    if (durationWeeksInput) {
        durationWeeksInput.addEventListener('input', updateEndDate);
    }
    
    const startDateInputs = document.querySelectorAll('input[type="date"]');
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    startDateInputs.forEach(input => {
        input.min = tomorrow.toISOString().split('T')[0];
        
        const defaultDate = new Date(today);
        defaultDate.setDate(defaultDate.getDate() + 7);
        input.value = defaultDate.toISOString().split('T')[0];
    });
    
    console.log('Initialization complete');
});