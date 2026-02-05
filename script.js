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

                // Page Specific Logic
                handlePageContext();

            } catch (e) {
                console.error("Błąd pobierania danych", e);
            } finally {
                isLoading.value = false;
            }
        };

        const handlePageContext = () => {
            const path = window.location.pathname;
            
            // Logic for Egzamin.html
            if (path.includes('egzamin.html')) {
                const qId = localStorage.getItem('current_exam_id');
                
                if (qId === 'random') {
                    drawRandomQuestion();
                } else if (qId) {
                    currentQuestion.value = question_list.value.find(q => q.id == qId);
                }
                
                // Load key if available for check mode
                if (currentQuestion.value) {
                     currentPattern.value = answer_database.value.find(a => Number(a.id) === Number(currentQuestion.value.id));
                }
            }

            // Logic for Wzorzec.html
            if (path.includes('wzorzec.html')) {
                const qId = localStorage.getItem('current_pattern_id');
                if (qId) {
                    currentPattern.value = answer_database.value.find(a => Number(a.id) === Number(qId));
                }
            }
        };

        // --- AUTH ---
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

        // --- NAVIGATION ACTIONS ---
        const goHome = () => {
            window.location.href = 'index.html';
        };

        const goToExam = (id) => {
            localStorage.setItem('current_exam_id', id);
            window.location.href = 'egzamin.html';
        };

        const goToExamRandom = () => {
            localStorage.setItem('current_exam_id', 'random');
            window.location.href = 'egzamin.html';
        };

        const goToPattern = (id) => {
            localStorage.setItem('current_pattern_id', id);
            window.location.href = 'wzorzec.html';
        };

        // --- LOGIC ---
        const drawRandomQuestion = () => {
            if (question_list.value.length === 0) return;
            const idx = Math.floor(Math.random() * question_list.value.length);
            currentQuestion.value = question_list.value[idx];
            // Update storage so refresh keeps the same question
            localStorage.setItem('current_exam_id', currentQuestion.value.id);
            // Load answer key for this random question
            currentPattern.value = answer_database.value.find(a => Number(a.id) === Number(currentQuestion.value.id));
        };

        const getStatus = (id) => {
            return userProgress.value[id] !== undefined ? Number(userProgress.value[id]) : 0;
        };

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

        const getLabel = (key) => {
            const map = {
                'intro': 'Wstęp', 'thesis': 'Teza',
                'arg1': 'Arg I', 'arg1_dev': 'Rozwinięcie', 'arg1_ex': 'Przykład', 'arg1_sum': 'Wniosek',
                'arg2': 'Arg II', 'arg2_dev': 'Rozwinięcie', 'arg2_ex': 'Przykład', 'arg2_sum': 'Wniosek',
                'context': 'Kontekst', 'summary': 'Podsumowanie'
            };
            return map[key] || key;
        };

        onMounted(fetchData);

        return {
            question_list, answer_database, isLoggedIn, username, usernameInput, loginError,
            login, logout, goHome, goToExam, goToExamRandom, goToPattern,
            getStatus, updateStatus, progressCount, isLoading,
            currentQuestion, currentPattern, form, checkMode,
            enableCheckMode, gradeScale, grades, setGrade, totalScore, getLabel
        };
    }
}).mount('#app');