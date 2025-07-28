const fs = require('fs');
const path = require('path');

class ReportGenerator {
    constructor() {
        this.reportsDir = path.join(__dirname, '../../reports');
        this.templatesDir = path.join(__dirname, '../../templates');
        this.ensureDirectories();
    }

    ensureDirectories() {
        if (!fs.existsSync(this.reportsDir)) {
            fs.mkdirSync(this.reportsDir, { recursive: true });
        }
    }

    async generateHtmlReport(testResult) {
        const htmlContent = this.createHtmlContent(testResult);
        const reportPath = path.join(this.reportsDir, `${testResult.testId}.html`);
        
        fs.writeFileSync(reportPath, htmlContent);
        console.log(`HTML report generated: ${reportPath}`);
        
        return reportPath;
    }

    createHtmlContent(testResult) {
        const statusClass = testResult.status === 'passed' ? 'success' : 'danger';
        const statusIcon = testResult.status === 'passed' ? '✓' : '✗';
        
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TestWeaver Report - ${testResult.testId}</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        .status-badge { font-size: 1.2em; }
        .step-item { margin-bottom: 1rem; }
        .step-success { border-left: 4px solid #28a745; }
        .step-failed { border-left: 4px solid #dc3545; }
        .screenshot-container { max-width: 100%; margin: 1rem 0; }
        .screenshot-container img { max-width: 100%; height: auto; border: 1px solid #ddd; }
        .error-item { background: #f8d7da; color: #721c24; }
        .code-block { background: #f8f9fa; padding: 1rem; border-radius: 0.25rem; }
    </style>
</head>
<body>
    <div class="container mt-4">
        <!-- Header -->
        <div class="row mb-4">
            <div class="col-12">
                <div class="card">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h1 class="card-title">
                                    <i class="fas fa-robot"></i> TestWeaver Report
                                </h1>
                                <p class="text-muted">AI-Powered Test Automation System</p>
                            </div>
                            <div>
                                <span class="badge bg-${statusClass} status-badge">
                                    ${statusIcon} ${testResult.status.toUpperCase()}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Test Information -->
        <div class="row mb-4">
            <div class="col-md-8">
                <div class="card">
                    <div class="card-header">
                        <h5><i class="fas fa-info-circle"></i> Test Information</h5>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-6">
                                <p><strong>Test ID:</strong> <code>${testResult.testId}</code></p>
                                <p><strong>URL:</strong> <a href="${testResult.url}" target="_blank">${testResult.url}</a></p>
                                <p><strong>Start Time:</strong> ${new Date(testResult.startTime).toLocaleString()}</p>
                            </div>
                            <div class="col-md-6">
                                <p><strong>Status:</strong> <span class="badge bg-${statusClass}">${testResult.status}</span></p>
                                <p><strong>Duration:</strong> ${testResult.duration}ms</p>
                                <p><strong>End Time:</strong> ${testResult.endTime ? new Date(testResult.endTime).toLocaleString() : 'N/A'}</p>
                            </div>
                        </div>
                        <div class="mt-3">
                            <p><strong>User Story:</strong></p>
                            <div class="code-block">${testResult.userStory}</div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card">
                    <div class="card-header">
                        <h5><i class="fas fa-chart-bar"></i> Summary</h5>
                    </div>
                    <div class="card-body">
                        <div class="row text-center">
                            <div class="col-6">
                                <h4 class="text-primary">${testResult.steps.length}</h4>
                                <small>Total Steps</small>
                            </div>
                            <div class="col-6">
                                <h4 class="text-success">${testResult.steps.filter(s => s.success).length}</h4>
                                <small>Successful</small>
                            </div>
                            <div class="col-6">
                                <h4 class="text-danger">${testResult.steps.filter(s => !s.success).length}</h4>
                                <small>Failed</small>
                            </div>
                            <div class="col-6">
                                <h4 class="text-info">${testResult.screenshots.filter(screenshot => screenshot.stepNumber).length}</h4>
                                <small>Screenshots</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Test Steps -->
        <div class="row mb-4">
            <div class="col-12">
                <div class="card">
                    <div class="card-header">
                        <h5><i class="fas fa-list-ol"></i> Test Steps</h5>
                    </div>
                    <div class="card-body">
                        ${this.renderSteps(testResult.steps)}
                    </div>
                </div>
            </div>
        </div>

        <!-- Screenshots -->
        ${testResult.screenshots.length > 0 ? this.renderScreenshots(testResult.screenshots) : ''}

        <!-- Errors -->
        ${testResult.errors.length > 0 ? this.renderErrors(testResult.errors) : ''}

        <!-- Footer -->
        <div class="row mt-5">
            <div class="col-12">
                <div class="card">
                    <div class="card-body text-center">
                        <p class="text-muted">
                            Report generated by TestWeaver AI Test Automation System<br>
                            <small>Generated on ${new Date().toLocaleString()}</small>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>`;
    }

    renderSteps(steps) {
        if (steps.length === 0) {
            return '<p class="text-muted">No steps executed.</p>';
        }

        return steps.map((step, index) => {
            const statusClass = step.success ? 'step-success' : 'step-failed';
            const statusIcon = step.success ? '<i class="fas fa-check text-success"></i>' : '<i class="fas fa-times text-danger"></i>';
            
            return `
                <div class="step-item card ${statusClass}">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start">
                            <div class="flex-grow-1">
                                <div class="d-flex align-items-center mb-2">
                                    <span class="badge bg-primary me-2">${index + 1}</span>
                                    ${statusIcon}
                                    <strong class="ms-2">${step.action.toUpperCase()}</strong>
                                </div>
                                <p class="mb-2">${step.description}</p>
                                ${step.selector ? `<p class="mb-2"><strong>Selector:</strong> <code>${step.selector}</code></p>` : ''}
                                ${step.value ? `<p class="mb-2"><strong>Value:</strong> <code>${step.value}</code></p>` : ''}
                                ${step.error ? `<div class="alert alert-danger mt-2"><strong>Error:</strong> ${step.error}</div>` : ''}
                            </div>
                            <div class="text-end">
                                <small class="text-muted">${new Date(step.timestamp).toLocaleString()}</small>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderScreenshots(screenshots) {
        // Filter out general screenshots (those without stepNumber) and only keep step-specific screenshots
        const stepScreenshots = screenshots.filter(screenshot => screenshot.stepNumber);
        
        if (stepScreenshots.length === 0) {
            return `
                <div class="row mb-4">
                    <div class="col-12">
                        <div class="card">
                            <div class="card-header">
                                <h5><i class="fas fa-camera"></i> Screenshots by Test Step</h5>
                                <p class="text-muted mb-0">Screenshots captured before and after each test action</p>
                            </div>
                            <div class="card-body">
                                <p class="text-muted">No step-specific screenshots captured.</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Group screenshots by step number
        const screenshotsByStep = {};
        stepScreenshots.forEach(screenshot => {
            if (!screenshotsByStep[screenshot.stepNumber]) {
                screenshotsByStep[screenshot.stepNumber] = [];
            }
            screenshotsByStep[screenshot.stepNumber].push(screenshot);
        });
        
        return `
            <div class="row mb-4">
                <div class="col-12">
                    <div class="card">
                        <div class="card-header">
                            <h5><i class="fas fa-camera"></i> Screenshots by Test Step</h5>
                            <p class="text-muted mb-0">Screenshots captured before and after each test action</p>
                        </div>
                        <div class="card-body">
                            ${Object.keys(screenshotsByStep).map(stepKey => {
                                const stepScreenshots = screenshotsByStep[stepKey];
                                
                                return `
                                    <div class="step-screenshot-group mb-4">
                                        <h6 class="text-primary mb-3">
                                            Step ${stepKey} Screenshots
                                        </h6>
                                        <div class="row">
                                            ${stepScreenshots.map((screenshot, index) => {
                                                const statusBadge = screenshot.stepStatus === 'before' ? 'bg-info' : 
                                                                   screenshot.stepStatus === 'after' ? 'bg-success' : 
                                                                   screenshot.stepStatus === 'error' ? 'bg-danger' : 'bg-secondary';
                                                
                                                return `
                                                    <div class="col-md-6 mb-3">
                                                        <div class="card">
                                                            <div class="card-header bg-light">
                                                                <div class="d-flex justify-content-between align-items-center">
                                                                    <h6 class="mb-0">${screenshot.description}</h6>
                                                                    ${screenshot.stepStatus ? `<span class="badge ${statusBadge}">${screenshot.stepStatus.toUpperCase()}</span>` : ''}
                                                                </div>
                                                                <small class="text-muted">
                                                                    ${new Date(screenshot.timestamp).toLocaleString()}
                                                                    ${screenshot.stepAction ? ` | Action: ${screenshot.stepAction}` : ''}
                                                                </small>
                                                            </div>
                                                            <div class="card-body p-2">
                                                                <img src="data:image/png;base64,${screenshot.data}" 
                                                                     alt="${screenshot.description}" 
                                                                     class="img-fluid rounded"
                                                                     style="cursor: pointer;"
                                                                     onclick="openScreenshotModal(this)">
                                                            </div>
                                                        </div>
                                                    </div>
                                                `;
                                            }).join('')}
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Screenshot Modal -->
            <div class="modal fade" id="screenshotModal" tabindex="-1">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Screenshot</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body text-center">
                            <img id="modalScreenshot" src="" alt="Screenshot" class="img-fluid">
                        </div>
                    </div>
                </div>
            </div>
            
            <script>
                function openScreenshotModal(img) {
                    const modal = new bootstrap.Modal(document.getElementById('screenshotModal'));
                    document.getElementById('modalScreenshot').src = img.src;
                    modal.show();
                }
            </script>
        `;
    }

    renderErrors(errors) {
        return `
            <div class="row mb-4">
                <div class="col-12">
                    <div class="card border-danger">
                        <div class="card-header bg-danger text-white">
                            <h5><i class="fas fa-exclamation-triangle"></i> Errors</h5>
                        </div>
                        <div class="card-body">
                            ${errors.map(error => `
                                <div class="alert alert-danger">
                                    <div class="d-flex justify-content-between align-items-start">
                                        <div>
                                            <strong>Step:</strong> ${error.step}<br>
                                            <strong>Error:</strong> ${error.error}
                                        </div>
                                        <div>
                                            <small class="text-muted">${new Date(error.timestamp).toLocaleString()}</small>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

module.exports = new ReportGenerator();