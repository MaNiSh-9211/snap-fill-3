testAutomationWorkflow.runWorkflow(initialState)
    .then(finalState => {
        console.log('\n✅ Workflow completed successfully');
        console.log('🧠 Final State:', JSON.stringify(finalState, null, 2));
    })
    .catch(error => {
        console.error('❌ Workflow failed with error:', error.message || error);
    });