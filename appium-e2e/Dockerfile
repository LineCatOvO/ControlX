# ControlX E2E Test Environment Dockerfile
# Based on Node.js 18 with Appium 2.x and Android SDK Platform Tools

FROM node:18-bullseye

LABEL maintainer="WMMT Team"
LABEL description="Docker environment for ControlX E2E testing with Appium 2.x"

ENV DEBIAN_FRONTEND=noninteractive
ENV ANDROID_HOME=/opt/android-sdk
ENV PATH="${PATH}:${ANDROID_HOME}/platform-tools"
ENV APPIUM_PORT=4723

RUN apt-get update && apt-get install -y \
    wget \
    unzip \
    openjdk-11-jre-headless \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p ${ANDROID_HOME} && \
    wget -q https://dl.google.com/android/repository/platform-tools-latest-linux.zip -O /tmp/platform-tools.zip && \
    unzip -q /tmp/platform-tools.zip -d ${ANDROID_HOME} && \
    rm /tmp/platform-tools.zip && \
    chmod -R 755 ${ANDROID_HOME}

RUN npm install -g appium@2.12.1

RUN appium driver install uiautomator2

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

EXPOSE ${APPIUM_PORT}

HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:${APPIUM_PORT}/status || exit 1

CMD ["appium", "server", "--address", "0.0.0.0", "--port", "4723", "--base-path", "/wd/hub"]
