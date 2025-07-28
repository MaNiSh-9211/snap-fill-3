# TestWeaver - AI-Powered Test Automation System

## Overview

TestWeaver is a backend service that automates the generation and execution of test cases based on user stories. The system uses AI to analyze HTML content, generate CSS selectors, create test scripts, and execute them using Playwright. It integrates with Jira via webhooks and provides comprehensive HTML reports.

## User Preferences

Preferred communication style: Simple, everyday language.
Browser preference: Use Playwright's built-in browser (no external system browser dependencies)
Testing requirement: Extract actual credentials from user stories, perform real browser automation
Local development: System must work on local machines without system browser installed
Screenshot requirement: Capture screenshots for each individual test step with proper labels (before/after/error states)

## System Architecture

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Architecture Pattern**: Layered architecture with clear separation of concerns
- **State Management**: LangGraph-based workflow engine for orchestrating test automation pipeline
- **API Design**: RESTful endpoints with asynchronous processing

### Workflow Engine
- **LangGraph Integration**: Uses `@langchain/langgraph` for defining and executing complex workflows
- **State Management**: Centralized state management through WorkflowState class
- **Error Handling**: Conditional edges and error recovery mechanisms

### AI/LLM Integration
- **Provider**: Groq API for language model interactions
- **Model**: Mixtral-8x7b-32768 for deterministic test generation
- **Use Cases**: Selector generation, test script creation, HTML analysis

## Key Components

### 1. Test Workflow (`src/services/langgraph/workflow.js`)
- **Initialize**: Sets up test execution context
- **HTML Processing**: Fetches and cleans HTML content
- **Selector Generation**: AI-powered CSS selector creation
- **Script Generation**: Converts selectors into executable test scripts
- **Test Execution**: Runs tests using Playwright
- **Report Generation**: Creates comprehensive HTML reports

### 2. Browser Automation (`src/services/playwright/`)
- **Browser Management**: Chromium-based browser orchestration
- **DOM Interaction**: Element selection and interaction utilities
- **Mutation Tracking**: Real-time DOM change monitoring
- **Screenshot Capture**: Evidence collection for test results

### 3. Data Models
- **TestResult**: Stores test execution data and results
- **TestReport**: Manages report generation and storage
- **MongoDB Collections**: `testResults`, `testReports`

### 4. API Controllers (`src/controllers/testController.js`)
- **Test Execution**: Asynchronous test processing
- **Status Monitoring**: Real-time test status updates
- **Report Retrieval**: HTML report generation and serving

## Data Flow

1. **Input**: User story received via API or Jira webhook
2. **HTML Processing**: Fetch and clean target website HTML
3. **AI Analysis**: Generate CSS selectors using Groq LLM
4. **Script Generation**: Create executable test scripts
5. **Execution**: Run tests using Playwright browser automation
6. **Evidence Collection**: Screenshots, DOM states, execution logs
7. **Report Generation**: Comprehensive HTML reports with test results
8. **Storage**: Persist results and reports in MongoDB

## External Dependencies

### Core Dependencies
- **Express.js**: Web framework for API endpoints
- **MongoDB**: Primary database for test results and reports
- **Playwright**: Browser automation and testing
- **@langchain/langgraph**: Workflow orchestration
- **Groq API**: AI-powered test generation
- **Zod**: Schema validation

### Supporting Libraries
- **JSDOM**: HTML parsing and manipulation
- **CORS**: Cross-origin resource sharing
- **Bootstrap**: Report UI styling

### Environment Variables
- `GROQ_API_KEY`: Required for AI-powered test generation
- `MONGODB_URI`: Database connection string
- `PORT`: Server port (default: 8000)
- `LOG_LEVEL`: Logging verbosity

## Deployment Strategy

### Development Setup
- **Entry Point**: `server.js` (updated with full API endpoints)
- **Start Command**: `npm start` (runs `node server.js`)
- **Dependencies**: All dependencies managed via npm
- **Note**: Consolidated `server-new.js` functionality into `server.js` for consistency

### Production Considerations
- **Database**: MongoDB with proper indexing for performance
- **Logging**: Structured JSON logging to files
- **Error Handling**: Comprehensive error recovery and reporting
- **Security**: Input validation using Zod schemas

### Scalability Features
- **Asynchronous Processing**: Non-blocking test execution
- **Resource Management**: Proper browser cleanup and connection pooling
- **Caching**: XPath and selector caching for performance
- **Report Storage**: File-based HTML reports with database metadata

### Integration Points
- **Jira Webhooks**: `/webhook/jira` endpoint for automated triggering
- **Static File Serving**: Reports and public assets
- **Health Monitoring**: `/health` endpoint for system status

The system is designed to be self-contained and can be deployed as a standalone service with minimal external dependencies beyond the database and AI API access.