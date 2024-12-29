#!/bin/bash

# Function: Stop existing process
stop_app() {
    if [ -f .pid ]; then
        OLD_PID=$(cat .pid)
        if ps -p $OLD_PID > /dev/null; then
            echo "Stopping existing process (PID: $OLD_PID)..."
            kill $OLD_PID
            sleep 2
        fi
        rm .pid
    fi
}

# Function: Start application
start_app() {
    # Create logs directory if it doesn't exist
    mkdir -p logs

    # Get current timestamp for log filename
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    LOG_FILE="logs/app_$TIMESTAMP.log"

    # Start application with nohup and pass any arguments
    if [ $# -eq 0 ]; then
        # No arguments provided, start normally
        echo "Starting bot in normal mode..."
        nohup node src/index.js > "$LOG_FILE" 2>&1 &
    else
        # Pass all arguments to the Node.js application
        echo "Starting bot with arguments: $@"
        nohup node src/index.js "$@" > "$LOG_FILE" 2>&1 &
    fi

    # Get process ID
    PID=$!

    # Write PID to file
    echo $PID > .pid

    echo "Application started with PID: $PID"
    echo "Logs are being written to: $LOG_FILE"
}

# Main logic
case "$1" in
    start)
        shift  # Remove 'start' from arguments
        stop_app
        start_app "$@"  # Pass remaining arguments
        ;;
    restart)
        shift  # Remove 'restart' from arguments
        stop_app
        start_app "$@"  # Pass remaining arguments
        ;;
    stop)
        stop_app
        ;;
    *)
        echo "Usage: $0 {start|stop|restart} [--run-now|-r]"
        exit 1
        ;;
esac

exit 0 