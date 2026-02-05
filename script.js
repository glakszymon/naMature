const { createApp, ref, computed, onMounted } = Vue;

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyMfloS94ZOdJ49Z5LFU6N2UmabTXF6Wop1_jMLJ-RvQH_0Gk6gD6wgE9ZqoYPCpHpk/exec';

createApp({
    setup() {
        // --- DATA ---
        const question_list = ref([]);
        const answer_database = ref([]);
        const authorized_users = ref([]);
        const all_progress_data = ref({});
        
        const isLoading = ref(true);
        const loginError = ref('');
        const usernameInput = ref('');
        const username = ref('');
        const isLoggedIn = ref(false);
        const userProgress = ref({});

        // Dla egzaminu i wzorca
        const currentQuestion = ref(null);
        const currentPattern = ref(null);
        const checkMode = ref(false);

        // Formularz egzaminu
        const form = ref({
            intro: '', thesis: '',
            arg1: '', arg1_dev: '', arg1_ex: '', arg1_sum: '',
            arg2: '', arg2_dev: '', arg2_ex: '', arg2_sum: '',
            context: '', summary: ''
        });

        const gradeScale = [
            { val: 0, label: 'Źle', class: 'lvl-0' },
            { val: 1, label: 'Średnio', class: 'lvl-1' },
            { val: 2, label: 'Dobrze', class: 'lvl-2' },
            { val: 3, label: 'Bdb', class: 'lvl-3' }
        ];
        const grades = ref({ intro:0, thesis:0, arg1:0, arg1_dev:0, arg1_ex:0, arg1_sum:0, arg2:0, arg2_dev:0, arg2_ex:0, arg2_sum:0, context:0, summary:0 });

        // Struktura porównania (User <-> Pattern)
        const comparisonStructure = {
            section1: {
                title: '1. Wstęp i Teza',
                fields: [
                    { key: 'intro', label: 'Wstęp' },
                    { key: 'thesis', label: 'Teza' }
                ],
                patternFields: [
                    { key: 'wstep', label: 'Wstęp' },
                    { key: 'teza', label: 'Teza' }
                ]
            },
            section2: {
                title: '2. Argument I',
                fields: [
                    { key: 'arg1', label: 'Tytuł' },
                    { key: 'arg1_dev', label: 'Rozwinięcie' },
                    { key: 'arg1_ex', label: 'Przykład' },
                    { key: 'arg1_sum', label: 'Wniosek' }
                ],
                patternFields: [
                    { key: 'arg1_tytul', label: 'Tytuł' },
                    { key: 'arg1_rozwiniecie', label: 'Rozwinięcie' },
                    { key: 'arg1_przyklad', label: 'Przykład' }
                ]
            },
            section3: {
                title: '3. Argument II',
                fields: [
                    { key: 'arg2', label: 'Tytuł' },
                    { key: 'arg2_dev', label: 'Rozwinięcie' },
                    { key: 'arg2_ex', label: 'Przykład' },
                    { key: 'arg2_sum', label: 'Wniosek' }
                ],
                patternFields: [
                    { key: 'arg2_tytul', label: 'Tytuł' },
                    { key: 'arg2_rozwiniecie', label: 'Rozwinięcie' },
                    { key: 'arg2_przyklad', label: 'Przykład' }
                ]
            },
            section4: {
                title: '4. Zakończenie',
                fields: [
                    { key: 'context', label: 'Kontekst' },
                    { key: 'summary', label: 'Podsumowanie' }
                ],
                patternFields: [
                    { key: 'kontekst', label: 'Kontekst' },
                    { key: 'podsumowanie', label: 'Podsumowanie' }
                ]
            }
        };

        // --- FETCHING & INIT ---
        const fetchData = async () => {
            isLoading.value = true;
            try {
                const response = await fetch(GOOGLE_SCRIPT_URL);
                const data = await response.json();
                question_list.value = data.questions || [];
                answer_database.value = data.answers || [];
                authorized_users.value = data.users || [];
                all_progress_data.value = data.progress || {};

                // Auto-login
                const savedUser = localStorage.getItem('matura_last_user');
                if (savedUser) {
                    usernameInput.value = savedUser;
                    login();
                }

                handlePageContext();
            } catch (e) {
                console.error("Błąd pobierania danych", e);
            } finally {
                isLoading.value = false;
            }
        };

        const handlePageContext = () => {
            const path = window.location.pathname;
            if (path.includes('egzamin.html')) {
                const qId = localStorage.getItem('current_exam_id');
                if (qId === 'random') {
                    drawRandomQuestion();
                } else if (qId) {
                    currentQuestion.value = question_list.value.find(q => q.id == qId);
                }
                if (currentQuestion.value) {
                     currentPattern.value = answer_database.value.find(a => Number(a.id) === Number(currentQuestion.value.id));
                }
            }
            if (path.includes('wzorzec.html')) {
                const qId = localStorage.getItem('current_pattern_id');
                if (qId) {
                    currentPattern.value = answer_database.value.find(a => Number(a.id) === Number(qId));
                }
            }
        };

        // --- AUTH & NAV ---
        const login = () => {
            loginError.value = '';
            const input = usernameInput.value.trim();
            if (!input) { loginError.value = "Podaj nazwę."; return; }
            const userExists = authorized_users.value.some(u => u.nazwa.toLowerCase() === input.toLowerCase());
            if (!userExists) { loginError.value = "Brak użytkownika w bazie."; return; }
            const dbUser = authorized_users.value.find(u => u.nazwa.toLowerCase() === input.toLowerCase());
            username.value = dbUser.nazwa;
            userProgress.value = all_progress_data.value[username.value] || {};
            isLoggedIn.value = true;
            localStorage.setItem('matura_last_user', username.value);
        };

        const logout = () => {
            localStorage.removeItem('matura_last_user');
            window.location.href = 'index.html';
        };

        const goHome = () => { window.location.href = 'index.html'; };
        const goToExam = (id) => { localStorage.setItem('current_exam_id', id); window.location.href = 'egzamin.html'; };
        const goToExamRandom = () => { localStorage.setItem('current_exam_id', 'random'); window.location.href = 'egzamin.html'; };
        const goToPattern = (id) => { localStorage.setItem('current_pattern_id', id); window.location.href = 'wzorzec.html'; };

        const drawRandomQuestion = () => {
            if (question_list.value.length === 0) return;
            const idx = Math.floor(Math.random() * question_list.value.length);
            currentQuestion.value = question_list.value[idx];
            localStorage.setItem('current_exam_id', currentQuestion.value.id);
            currentPattern.value = answer_database.value.find(a => Number(a.id) === Number(currentQuestion.value.id));
        };

        const getStatus = (id) => (userProgress.value[id] !== undefined ? Number(userProgress.value[id]) : 0);
        
        const updateStatus = async (id, status) => {
            userProgress.value[id] = status;
            try {
                await fetch(GOOGLE_SCRIPT_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user: username.value, id: id, status: status })
                });
            } catch (e) { console.error(e); }
        };

        const progressCount = computed(() => {
            let count = 0;
            Object.values(userProgress.value).forEach(v => { if (Number(v) === 3) count++; });
            return count;
        });

        // --- EXAM LOGIC ---
        const enableCheckMode = () => { 
            checkMode.value = true; 
            setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100); 
        };
        const setGrade = (field, val) => { grades.value[field] = val; };
        
        const totalScore = computed(() => {
            const fields = Object.keys(grades.value);
            if (fields.length === 0) return 0;
            let sum = 0;
            fields.forEach(f => sum += grades.value[f]);
            return Math.round((sum / (fields.length * 3)) * 100);
        });

        onMounted(fetchData);

        return {
            question_list, answer_database, isLoggedIn, username, usernameInput, loginError,
            login, logout, goHome, goToExam, goToExamRandom, goToPattern,
            getStatus, updateStatus, progressCount, isLoading,
            currentQuestion, currentPattern, form, checkMode,
            enableCheckMode, gradeScale, grades, setGrade, totalScore,
            comparisonStructure
        };
    }
}).mount('#app');