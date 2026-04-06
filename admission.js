(function () {
    'use strict';

    const DATA_FILE = 'data/admissions.json';

    let admissionData = null;

    function resolveDataPath(file) {
        const hostname = window.location.hostname;
        const pathname = window.location.pathname;
        if (hostname.includes('github.io')) {
            const pathParts = pathname.split('/').filter(function (p) {
                return p;
            });
            const repoName = pathParts[0] || 'go_on_to';
            return '/' + repoName + '/' + file;
        }
        return file;
    }

    function getElements() {
        return {
            uni: document.getElementById('admission-university'),
            dept: document.getElementById('admission-department'),
            typeRadios: document.querySelectorAll('input[name="admission-type"]'),
            panel: document.getElementById('admission-detail-panel'),
            disclaimer: document.getElementById('admission-disclaimer'),
            yearLabel: document.getElementById('admission-year-label')
        };
    }

    function findDepartment(uniId, deptId) {
        if (!admissionData || !uniId || !deptId) return null;
        const uni = admissionData.universities.find(function (u) {
            return u.id === uniId;
        });
        if (!uni) return null;
        return uni.departments.find(function (d) {
            return d.id === deptId;
        }) || null;
    }

    function renderFieldBlock(title, detail) {
        if (!detail || String(detail).trim() === '') return '';
        return (
            '<div class="admission-field">' +
            '<div class="admission-field-label">' +
            title +
            '</div>' +
            '<div class="admission-field-value">' +
            escapeHtml(detail) +
            '</div>' +
            '</div>'
        );
    }

    function escapeHtml(s) {
        const div = document.createElement('div');
        div.textContent = s;
        return div.innerHTML;
    }

    function renderSingleType(block, label) {
        if (!block) {
            return (
                '<div class="admission-type-block admission-type-block--empty">' +
                '<span class="admission-type-badge">' +
                label +
                '</span>' +
                '<p class="mb-0 text-muted small">해당 전형 정보는 아직 준비 중이거나, 모집요강에서 직접 확인해야 할 수 있습니다.</p>' +
                '</div>'
            );
        }
        return (
            '<div class="admission-type-block">' +
            '<span class="admission-type-badge">' +
            label +
            '</span>' +
            '<p class="admission-headline">' +
            escapeHtml(block.headline || '') +
            '</p>' +
            renderFieldBlock('모집·정원 안내', block.quota) +
            renderFieldBlock('전형·선발', block.selection) +
            renderFieldBlock('실기·체육 관련', block.peExam) +
            renderFieldBlock('참고', block.etc) +
            '</div>'
        );
    }

    function getSelectedType() {
        const checked = document.querySelector('input[name="admission-type"]:checked');
        return checked ? checked.value : 'all';
    }

    function render() {
        const el = getElements();
        if (!el.panel) return;

        const uniId = el.uni ? el.uni.value : '';
        const deptId = el.dept ? el.dept.value : '';
        const type = getSelectedType();

        if (!uniId || !deptId) {
            el.panel.innerHTML =
                '<div class="admission-empty text-center text-muted py-4">' +
                '<i class="fas fa-university fa-2x mb-3 d-block opacity-50"></i>' +
                '<p class="mb-0">대학과 학과를 선택하면 입시 정보가 표시됩니다.</p>' +
                '</div>';
            return;
        }

        const dept = findDepartment(uniId, deptId);
        if (!dept) {
            el.panel.innerHTML =
                '<div class="alert alert-warning mb-0">선택한 학과 정보를 찾을 수 없습니다.</div>';
            return;
        }

        let html = '';

        if (type === 'all') {
            html +=
                '<div class="row g-3">' +
                '<div class="col-md-6">' +
                renderSingleType(dept.susi, '수시') +
                '</div>' +
                '<div class="col-md-6">' +
                renderSingleType(dept.jeongsi, '정시') +
                '</div>' +
                '</div>';
        } else if (type === 'susi') {
            html += renderSingleType(dept.susi, '수시');
        } else {
            html += renderSingleType(dept.jeongsi, '정시');
        }

        el.panel.innerHTML = html;
    }

    function populateDepartments(uniId) {
        const el = getElements();
        if (!el.dept) return;

        if (!uniId || !admissionData) {
            el.dept.innerHTML = '<option value="">먼저 대학을 선택하세요</option>';
            el.dept.disabled = true;
            return;
        }

        el.dept.innerHTML = '<option value="">학과를 선택하세요</option>';

        const uni = admissionData.universities.find(function (u) {
            return u.id === uniId;
        });
        if (!uni) {
            el.dept.disabled = true;
            return;
        }

        el.dept.disabled = false;
        uni.departments.forEach(function (d) {
            const opt = document.createElement('option');
            opt.value = d.id;
            opt.textContent = d.name;
            el.dept.appendChild(opt);
        });
    }

    function bindEvents() {
        const el = getElements();
        if (el.uni) {
            el.uni.addEventListener('change', function () {
                populateDepartments(el.uni.value);
                el.dept.value = '';
                render();
            });
        }
        if (el.dept) {
            el.dept.addEventListener('change', render);
        }
        el.typeRadios.forEach(function (radio) {
            radio.addEventListener('change', render);
        });
    }

    function setMeta() {
        const el = getElements();
        if (admissionData && admissionData.meta) {
            if (el.disclaimer) {
                el.disclaimer.textContent = admissionData.meta.disclaimer || '';
            }
            if (el.yearLabel) {
                el.yearLabel.textContent = admissionData.meta.year
                    ? '기준: ' + admissionData.meta.year
                    : '';
            }
        }
    }

    function initUniversities() {
        const el = getElements();
        if (!el.uni || !admissionData) return;

        el.uni.innerHTML = '<option value="">대학을 선택하세요</option>';
        admissionData.universities.forEach(function (u) {
            const opt = document.createElement('option');
            opt.value = u.id;
            opt.textContent = u.name + (u.region ? ' (' + u.region + ')' : '');
            el.uni.appendChild(opt);
        });
        if (el.dept) {
            el.dept.disabled = true;
            el.dept.innerHTML = '<option value="">먼저 대학을 선택하세요</option>';
        }
    }

    function load() {
        const path = resolveDataPath(DATA_FILE);
        fetch(path)
            .then(function (res) {
                if (!res.ok) throw new Error(String(res.status));
                return res.json();
            })
            .then(function (data) {
                admissionData = data;
                setMeta();
                initUniversities();
                bindEvents();
                render();
            })
            .catch(function (err) {
                console.error('입시 정보 로드 실패:', path, err);
                const el = getElements();
                if (el.panel) {
                    el.panel.innerHTML =
                        '<div class="alert alert-danger mb-0">' +
                        '<i class="fas fa-exclamation-triangle me-2"></i>' +
                        '입시 정보 파일을 불러오지 못했습니다. 네트워크와 data/admissions.json 경로를 확인해 주세요.' +
                        '</div>';
                }
            });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', load);
    } else {
        load();
    }
})();
