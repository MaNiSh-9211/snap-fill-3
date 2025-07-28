// Utility to parse user story into individual testcases
function parseTestcases(userStory) {
    if (!userStory || typeof userStory !== 'string') return [];
    const lines = userStory.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    // Try numbered list
    let tcs = [];
    let current = '';
    for (const line of lines) {
        const match = line.match(/^(\d+)[\).\-:]\s*(.+)$/);
        if (match) {
            if (current) tcs.push(current.trim());
            current = match[2];
        } else if (line.match(/^[-*]\s*(.+)$/)) {
            if (current) tcs.push(current.trim());
            current = line.replace(/^[-*]\s*/, '');
        } else {
            current += (current ? ' ' : '') + line;
        }
    }
    if (current) tcs.push(current.trim());
    // If no list found, treat whole story as one testcase
    if (tcs.length === 0) return [userStory.trim()];
    return tcs;
}

module.exports = { parseTestcases }; 