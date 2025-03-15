let charts = {};

function clearCharts() {
    Object.values(charts).forEach(chart => chart.destroy());
    charts = {};
}

function formatExcelDate(dateValue) {
    if (!dateValue) return 'Unknown';
    if (typeof dateValue === 'string' && dateValue.includes('-')) {
        const [year, month, day] = dateValue.split('-');
        return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}-${year}`;
    }
    const date = XLSX.SSF.parse_date_code(dateValue);
    if (!date) return 'Unknown';
    const month = String(date.m).padStart(2, '0');
    const day = String(date.d).padStart(2, '0');
    const year = date.y;
    return `${month}-${day}-${year}`;
}

function populateTable(tableId, data) {
    const tbody = document.getElementById(tableId);
    tbody.innerHTML = '';
    data.forEach(row => {
        const status = (row['CurrentStatus'] || 'Unknown').toLowerCase();
        const statusClass = status === 'completed' ? 'status-completed' : 
                           status === 'in progress' ? 'status-in-progress' : 
                           status === 'pending' ? 'status-pending' : '';
        const statusIcon = status === 'completed' ? '<i class="bi bi-check-circle-fill me-1"></i>' : 
                           status === 'in progress' ? '<i class="bi bi-hourglass-split me-1"></i>' : 
                           status === 'pending' ? '<i class="bi bi-exclamation-circle-fill me-1"></i>' : '';

        const bugCount = parseInt(row['TodayBugCount']) || 0;
        const bugClass = bugCount === 0 ? 'bug-low' : 
                         bugCount <= 5 ? 'bug-medium' : 'bug-high';
        const bugIcon = bugCount === 0 ? '<i class="bi bi-shield-check me-1"></i>' : 
                        bugCount <= 5 ? '<i class="bi bi-bug me-1"></i>' : '<i class="bi bi-bug-fill me-1"></i>';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><i class="bi bi-calendar-date me-2"></i> ${formatExcelDate(row['TestingDate']) || ''}</td>
            <td><i class="bi bi-folder-fill me-2 text-primary"></i> ${row['ProjectName'] || ''}</td>
            <td><i class="bi bi-person-circle me-2 text-muted"></i> ${row['ClientName'] || ''}</td>
            <td><i class="bi bi-list-check me-2 text-success"></i> ${row['Task'] || ''}</td>
            <td><i class="bi bi-clock me-2 text-info"></i> ${row['PlannedHours'] || ''}</td>
            <td><i class="bi bi-stopwatch me-2 text-warning"></i> ${row['SpentHours'] || ''}</td>
            <td><span class="bug-count ${bugClass}">${bugIcon}${row['TodayBugCount'] || '0'}</span></td>
            <td><span class="status-badge ${statusClass}">${statusIcon}${row['CurrentStatus'] || 'Unknown'}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

function updateSummary(summaryId, data) {
    const totalPlannedHours = data.reduce((sum, row) => sum + (parseFloat(row['PlannedHours']) || 0), 0);
    const totalSpentHours = data.reduce((sum, row) => sum + (parseFloat(row['SpentHours']) || 0), 0);
    const totalBugs = data.reduce((sum, row) => sum + (parseFloat(row['TodayBugCount']) || 0), 0);
    document.getElementById(summaryId).innerHTML = `
        <span><i class="bi bi-clock-fill me-2"></i> <strong>Planned Hours:</strong> ${totalPlannedHours.toFixed(1)}</span>
        <span><i class="bi bi-stopwatch-fill me-2"></i> <strong>Spent Hours:</strong> ${totalSpentHours.toFixed(1)}</span>
        <span><i class="bi bi-bug-fill me-2"></i> <strong>Total Bugs:</strong> ${totalBugs.toFixed(1)}</span>
    `;
}

function createCharts(prefix, data) {
    const trendsByDate = {};
    data.forEach(row => {
        const date = formatExcelDate(row['TestingDate']);
        trendsByDate[date] = (trendsByDate[date] || 0) + (parseFloat(row['SpentHours']) || 0);
    });
    const trendsLabels = Object.keys(trendsByDate).sort();
    const trendsData = trendsLabels.map(date => trendsByDate[date]);
    charts[`${prefix}Trends`] = new Chart(document.getElementById(`trendsChart${prefix}`).getContext('2d'), {
        type: 'bar',
        data: { labels: trendsLabels, datasets: [{ label: 'Spending Hours', data: trendsData, backgroundColor: '#17a2b8', borderWidth: 1 }] },
        options: { 
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true }, x: { ticks: { maxRotation: 45, minRotation: 45 } } },
            plugins: { legend: { position: 'top' } }
        }
    });

    const hoursByProject = {};
    data.forEach(row => {
        const project = row['ProjectName'] || 'Unknown';
        hoursByProject[project] = (hoursByProject[project] || 0) + (parseFloat(row['SpentHours']) || 0);
    });
    const projectLabels = Object.keys(hoursByProject);
    const projectData = projectLabels.map(project => hoursByProject[project]);
    charts[`${prefix}ProjectHours`] = new Chart(document.getElementById(`projectHoursChart${prefix}`).getContext('2d'), {
        type: 'pie',
        data: { labels: projectLabels, datasets: [{ data: projectData, backgroundColor: ['#ff6384', '#36a2eb', '#ffce56', '#4bc0c0', '#9966ff', '#ff9f40'], borderWidth: 1 }] },
        options: { 
            maintainAspectRatio: false,
            plugins: { legend: { position: 'right' } }
        }
    });

    const bugsByProject = {};
    data.forEach(row => {
        const project = row['ProjectName'] || 'Unknown';
        bugsByProject[project] = (bugsByProject[project] || 0) + (parseFloat(row['TodayBugCount']) || 0);
    });
    const bugProjectLabels = Object.keys(bugsByProject);
    const bugProjectData = bugProjectLabels.map(project => bugsByProject[project]);
    charts[`${prefix}BugCount`] = new Chart(document.getElementById(`bugCountChart${prefix}`).getContext('2d'), {
        type: 'bar',
        data: { labels: bugProjectLabels, datasets: [{ label: 'Bug Count', data: bugProjectData, backgroundColor: '#ffce56', borderWidth: 1 }] },
        options: { 
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true }, x: { ticks: { maxRotation: 45, minRotation: 45 } } },
            plugins: { legend: { position: 'top' } }
        }
    });

    const hoursByStatus = {};
    data.forEach(row => {
        const status = row['CurrentStatus'] || 'Unknown';
        hoursByStatus[status] = (hoursByStatus[status] || 0) + (parseFloat(row['SpentHours']) || 0);
    });
    const statusLabels = Object.keys(hoursByStatus);
    const statusData = statusLabels.map(status => hoursByStatus[status]);
    charts[`${prefix}StatusHours`] = new Chart(document.getElementById(`statusHoursChart${prefix}`).getContext('2d'), {
        type: 'pie',
        data: { labels: statusLabels, datasets: [{ data: statusData, backgroundColor: ['#ff6384', '#36a2eb', '#ffce56', '#4bc0c0', '#9966ff', '#ff9f40'], borderWidth: 1 }] },
        options: { 
            maintainAspectRatio: false,
            plugins: { legend: { position: 'right' } }
        }
    });

    const hoursByTask = {};
    data.forEach(row => {
        const task = row['Task'] || 'Unknown';
        hoursByTask[task] = (hoursByTask[task] || 0) + (parseFloat(row['SpentHours']) || 0);
    });
    const taskLabels = Object.keys(hoursByTask);
    const taskData = taskLabels.map(task => hoursByTask[task]);
    charts[`${prefix}Task`] = new Chart(document.getElementById(`taskChart${prefix}`).getContext('2d'), {
        type: 'bar',
        data: { labels: taskLabels, datasets: [{ label: 'Spending Hours', data: taskData, backgroundColor: '#6f42c1', borderWidth: 1 }] },
        options: { 
            indexAxis: 'y',
            maintainAspectRatio: false,
            scales: { x: { beginAtZero: true } },
            plugins: { legend: { position: 'top' } }
        }
    });
}

function createTabContent(testerName, data) {
    const tabId = testerName.toLowerCase().replace(/\s+/g, '');
    const capitalizedName = testerName.charAt(0).toUpperCase() + testerName.slice(1).toLowerCase();

    const tabPane = document.createElement('div');
    tabPane.className = 'tab-pane fade';
    tabPane.id = tabId;
    tabPane.role = 'tabpanel';

    tabPane.innerHTML = `
        <div class="card mt-3">
            <div class="card-header bg-dark text-white"><i class="bi bi-clipboard-data me-2"></i> Summary</div>
            <div class="card-body">
                <div class="summary-stats" id="${tabId}Summary"></div>
            </div>
        </div>
        <div class="card mt-3">
            <div class="card-header bg-primary text-white"><i class="bi bi-table me-2"></i> Project Details</div>
            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-striped table-hover">
                        <thead class="table-dark">
                            <tr>
                                <th>Date</th><th>Project</th><th>Client</th><th>Task</th><th>Plan Hrs</th><th>Spent Hrs</th><th>Bugs</th><th>Status</th>
                            </tr>
                        </thead>
                        <tbody id="${tabId}Table"></tbody>
                    </table>
                </div>
            </div>
        </div>
        <div class="row mt-3">
            <div class="col-md-6 chart-row">
                <div class="card">
                    <div class="card-header bg-info text-white"><i class="bi bi-clock-history me-2"></i> Spending Hours Trend</div>
                    <div class="card-body chart-container"><canvas id="trendsChart${capitalizedName}"></canvas></div>
                </div>
            </div>
            <div class="col-md-6 chart-row">
                <div class="card">
                    <div class="card-header bg-success text-white"><i class="bi bi-pie-chart-fill me-2"></i> Spending Hours by Project</div>
                    <div class="card-body chart-container"><canvas id="projectHoursChart${capitalizedName}"></canvas></div>
                </div>
            </div>
        </div>
        <div class="row mt-3">
            <div class="col-md-6 chart-row">
                <div class="card">
                    <div class="card-header bg-warning text-white"><i class="bi bi-bug-fill me-2"></i> Bug Count by Project</div>
                    <div class="card-body chart-container"><canvas id="bugCountChart${capitalizedName}"></canvas></div>
                </div>
            </div>
            <div class="col-md-6 chart-row">
                <div class="card">
                    <div class="card-header bg-danger text-white"><i class="bi bi-flag-fill me-2"></i> Spending Hours by Status</div>
                    <div class="card-body chart-container"><canvas id="statusHoursChart${capitalizedName}"></canvas></div>
                </div>
            </div>
        </div>
        <div class="row mt-3">
            <div class="col-12 chart-row">
                <div class="card">
                    <div class="card-header bg-purple text-white" style="background-color: #6f42c1;"><i class="bi bi-list-task me-2"></i> Spending Hours by Task</div>
                    <div class="card-body chart-container"><canvas id="taskChart${capitalizedName}"></canvas></div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('reportTabsContent').insertBefore(tabPane, document.getElementById('overall'));
    populateTable(`${tabId}Table`, data);
    updateSummary(`${tabId}Summary`, data);
    createCharts(capitalizedName, data);
}

document.getElementById('excelFile').addEventListener('change', function(e) {
    const file = e.target.files[0];
    const errorMessageDiv = document.getElementById('errorMessage');

    if (!file) {
        errorMessageDiv.textContent = "Please select an Excel file.";
        errorMessageDiv.classList.remove('d-none');
        return;
    }

    errorMessageDiv.textContent = '';
    errorMessageDiv.classList.add('d-none');
    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array', dateNF: 'yyyy-mm-dd' });

            const sheetName = workbook.SheetNames[0];
            if (!sheetName) {
                errorMessageDiv.textContent = "No sheets found in the Excel file.";
                errorMessageDiv.classList.remove('d-none');
                return;
            }

            const allData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
            console.log("All Data:", allData);

            const tabContent = document.getElementById('reportTabsContent');
            const existingTabs = tabContent.querySelectorAll('.tab-pane:not(#overall)');
            existingTabs.forEach(tab => tab.remove());

            const navTabs = document.getElementById('reportTabs');
            navTabs.innerHTML = '<li class="nav-item"><button class="nav-link" id="overall-tab" data-bs-toggle="tab" data-bs-target="#overall" type="button" role="tab"><i class="bi bi-globe me-2"></i> Overall Report</button></li>';

            const dataByTester = {};
            allData.forEach(row => {
                const tester = row['TestedBy']?.toLowerCase().trim();
                if (tester) {
                    if (!dataByTester[tester]) dataByTester[tester] = [];
                    dataByTester[tester].push(row);
                }
            });

            if (Object.keys(dataByTester).length === 0) {
                errorMessageDiv.textContent = "No valid 'TestedBy' data found in the Excel file.";
                errorMessageDiv.classList.remove('d-none');
                return;
            }

            clearCharts();

            Object.keys(dataByTester).forEach((tester, index) => {
                const tabId = tester.toLowerCase().replace(/\s+/g, '');
                const capitalizedName = tester.charAt(0).toUpperCase() + tester.slice(1).toLowerCase();

                const li = document.createElement('li');
                li.className = 'nav-item';
                li.innerHTML = `<button class="nav-link ${index === 0 ? 'active' : ''}" id="${tabId}-tab" data-bs-toggle="tab" data-bs-target="#${tabId}" type="button" role="tab"><i class="bi bi-person-lines-fill me-2"></i> ${capitalizedName}</button>`;
                navTabs.insertBefore(li, navTabs.querySelector('#overall-tab').parentNode);

                createTabContent(tester, dataByTester[tester]);
            });

            const overallData = allData.filter(row => row['TestedBy']);
            if (overallData.length > 0) {
                updateSummary('overallSummary', overallData);
                createCharts('Overall', overallData);
            } else {
                document.getElementById('overallSummary').innerHTML = "No data available.";
            }

            const firstTab = navTabs.querySelector('.nav-link:not(#overall-tab)');
            if (firstTab) {
                firstTab.classList.add('active');
                const firstTabPane = document.getElementById(firstTab.getAttribute('data-bs-target').substring(1));
                firstTabPane.classList.add('show', 'active');
            }

        } catch (error) {
            console.error("Error processing Excel file:", error);
            errorMessageDiv.textContent = "Error processing the Excel file. Check the console for details.";
            errorMessageDiv.classList.remove('d-none');
        }
    };

    reader.readAsArrayBuffer(file);
});