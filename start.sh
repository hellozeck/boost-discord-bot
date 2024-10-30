#!/bin/bash

# 创建logs目录（如果不存在）
mkdir -p logs

# 获取当前时间作为日志文件名
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="logs/app_$TIMESTAMP.log"

# 使用nohup启动应用
nohup npm start > "$LOG_FILE" 2>&1 &

# 获取进程ID
PID=$!

# 将PID写入文件
echo $PID > .pid

echo "Application started with PID: $PID"
echo "Logs are being written to: $LOG_FILE" 