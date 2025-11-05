// Simple logging utility
class Logger {
    static log(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            data
        };
        
        console.log(`[${timestamp}] [${level}] ${message}`, data || '');
        
        // Store logs in localStorage for persistence
        try {
            const logs = JSON.parse(localStorage.getItem('clinicLogs') || '[]');
            logs.push(logEntry);
            
            // Keep only last 1000 logs
            if (logs.length > 1000) {
                logs.shift();
            }
            
            localStorage.setItem('clinicLogs', JSON.stringify(logs));
        } catch (error) {
            console.error('Error storing log:', error);
        }
    }
    
    static info(message, data = null) {
        this.log('INFO', message, data);
    }
    
    static error(message, data = null) {
        this.log('ERROR', message, data);
    }
    
    static warn(message, data = null) {
        this.log('WARN', message, data);
    }
    
    static getLogs() {
        try {
            return JSON.parse(localStorage.getItem('clinicLogs') || '[]');
        } catch (error) {
            console.error('Error retrieving logs:', error);
            return [];
        }
    }
}

export default Logger;
