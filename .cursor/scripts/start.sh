#!/usr/bin/env bash
set -euo pipefail

export PATH="/home/ubuntu/.local/bin:${PATH}"

start_mariadb() {
	if mariadb -u root -proot -e "SELECT 1" >/dev/null 2>&1; then
		return 0
	fi

	if ! pgrep -x mariadbd >/dev/null 2>&1; then
		sudo service mariadb start || sudo mysqld_safe --datadir=/var/lib/mysql &
		for _ in $(seq 1 30); do
			if mariadb -u root -e "SELECT 1" >/dev/null 2>&1 || sudo mariadb -u root -e "SELECT 1" >/dev/null 2>&1; then
				break
			fi
			sleep 1
		done
	fi

	if mariadb -u root -proot -e "SELECT 1" >/dev/null 2>&1; then
		return 0
	fi

	sudo mariadb -u root <<-SQL
		ALTER USER 'root'@'localhost' IDENTIFIED VIA mysql_native_password USING PASSWORD('root');
		FLUSH PRIVILEGES;
		SET GLOBAL character_set_server = 'utf8mb4';
		SET GLOBAL collation_server = 'utf8mb4_unicode_ci';
SQL

	mariadb -u root -proot -e "SELECT 1" >/dev/null
}

start_redis() {
	if redis-cli ping >/dev/null 2>&1; then
		return 0
	fi

	sudo service redis-server start 2>/dev/null || redis-server --daemonize yes

	for _ in $(seq 1 15); do
		if redis-cli ping >/dev/null 2>&1; then
			return 0
		fi
		sleep 1
	done

	echo "Redis failed to start" >&2
	exit 1
}

start_mariadb
start_redis
