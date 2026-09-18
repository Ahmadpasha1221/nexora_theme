FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
	&& apt-get install -y --no-install-recommends \
		build-essential \
		cron \
		curl \
		git \
		libffi-dev \
		libmariadb-dev \
		libssl-dev \
		mariadb-client \
		mariadb-server \
		pkg-config \
		python3 \
		python3-dev \
		python3-pip \
		python3-venv \
		redis-server \
		wget \
	&& rm -rf /var/lib/apt/lists/*

RUN useradd -m -s /bin/bash ubuntu || true
